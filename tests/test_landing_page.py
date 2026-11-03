import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
V1 = (ROOT / "v1" / "index.html").read_text(encoding="utf-8")

# Assertions match against a whitespace-normalised copy: a reformat must never
# fail a test about behaviour.
HTML_FLAT = re.sub(r"\s+", " ", HTML)
STORE = "https://apps.apple.com/app/apple-store/id6778675088?pt=128981651&amp;ct={}&amp;mt=8"


class LandingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.headings = []
        self._heading = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag in ("h1", "h2", "h3"):
            self._heading = [int(tag[1]), ""]

    def handle_data(self, data):
        if self._heading is not None:
            self._heading[1] += data

    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3") and self._heading is not None:
            self.headings.append((self._heading[0], " ".join(self._heading[1].split())))
            self._heading = None


class LandingPageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = LandingParser()
        cls.parser.feed(HTML)

    def test_story_sections_exist_in_order(self):
        expected = ["top", "problem", "solution", "how-it-works", "trust",
                    "faq", "pricing", "founder", "get-it"]
        positions = [HTML.index(f'id="{section}"') for section in expected]
        self.assertEqual(positions, sorted(positions))

    def test_the_story_is_told_by_its_headings_in_order(self):
        h = self.parser.headings
        self.assertEqual(h[0], (1, "How long will your money last?"))
        self.assertEqual([t for level, t in h if level == 1], [h[0][1]])
        top = [t for level, t in h if level == 2]
        self.assertEqual(top, [
            "When life changes shape, money becomes time.",
            "So I built Runway to keep the answer current.",
            "Check up, see the month, try a what-if.",
            "Your numbers stay with you.",
            "What people ask.",
            "Free to see how long your money lasts. Pro to keep it safe.",
            "Know the time you have.",
        ])
        # No level is skipped on the way down.
        levels = [level for level, _ in h]
        self.assertTrue(all(b - a <= 1 for a, b in zip(levels, levels[1:])), levels)

    def test_every_store_link_carries_its_own_campaign(self):
        links = re.findall(r'href="(https://apps\.apple\.com/[^"]*)"', HTML)
        self.assertEqual(links, [STORE.format(ct) for ct in (
            "landing-hero", "landing-screens", "landing-pricing", "landing-footer")])

    def test_safari_offers_the_same_listing(self):
        self.assertIn('<meta name="apple-itunes-app" content="app-id=6778675088" />', HTML)

    def test_navigation_and_footer_reach_every_page(self):
        for href in ("#how-it-works", "#pricing", "privacy/", "support/",
                     "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"):
            self.assertIn(href, self.parser.links)

    def test_page_has_landmarks_a_skip_link_and_a_language(self):
        self.assertIn('<html lang="en">', HTML)
        self.assertIn('href="#main"', HTML)
        for tag in ("<header", "<nav", '<main id="main"', "<footer"):
            self.assertIn(tag, HTML)

    def test_nothing_fake_ships(self):
        for text in ("PLACEHOLDER", "review goes here", "What people say",
                     "0:00", "{price}", "ct=", "Sticky at the foot"):
            self.assertNotIn(text, re.sub(r"&amp;ct=[a-z-]+", "", HTML), text)

    def test_pro_is_one_payment_with_no_invented_price(self):
        self.assertIn("One payment, no subscription.", HTML_FLAT)
        self.assertIsNone(re.search(r"\$\d+\.\d\d", HTML))

    def test_trust_names_the_backup_exception(self):
        self.assertIn("Unless you back them up to a file of your own.", HTML_FLAT)

    def test_faq_answers_five_questions(self):
        faq = HTML[HTML.index('id="faq"'):HTML.index('id="pricing"')]
        self.assertEqual(faq.count("<h3"), 5)

    def test_no_em_dashes(self):
        for path in [ROOT / "index.html", ROOT / "assets" / "home.css", ROOT / "assets" / "home.js"]:
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("—", text, path.name)
            self.assertNotIn("&mdash;", text, path.name)

    def test_page_uses_only_the_app_face(self):
        self.assertNotIn("newsreader", HTML.lower())
        self.assertNotIn("jetbrains", HTML.lower())
        self.assertIn("InterTight", (ROOT / "assets" / "home.css").read_text(encoding="utf-8"))
        self.assertTrue((ROOT / "assets" / "fonts" / "InterTight-OFL.txt").exists())

    def test_motion_respects_reduced_motion_and_needs_no_script_to_read(self):
        css = (ROOT / "assets" / "home.css").read_text(encoding="utf-8")
        self.assertIn("prefers-reduced-motion: reduce", css)
        # The waiting state is set by the script, so without it the page shows its final state.
        self.assertIn("classList.add('wait')", (ROOT / "assets" / "home.js").read_text(encoding="utf-8"))
        self.assertIn('<script src="assets/home.js" defer></script>', HTML)

    def test_icon_is_the_circle_and_star_mark(self):
        self.assertIn('<link rel="icon" type="image/svg+xml" href="assets/icon.svg" />', HTML)
        self.assertTrue((ROOT / "assets" / "icon.svg").exists())

    def test_first_site_stays_at_v1_out_of_search(self):
        self.assertIn('<meta name="robots" content="noindex" />', V1)
        self.assertIn("../assets/landing.css", V1)
        self.assertTrue((ROOT / "assets" / "landing.css").exists())


class LinkPreviewTest(unittest.TestCase):
    """The og: tags are what every chat app and social platform reads.

    Nothing here is visible on the page, so a broken one is silent: the
    preview falls back to scraping the first large image it finds, which is a
    portrait screenshot cropped to a tall tile.
    """

    BASE = "https://echoshihtw.github.io/runway-site/"
    PAGES = {"": ROOT / "index.html",
             "privacy/": ROOT / "privacy" / "index.html",
             "support/": ROOT / "support" / "index.html"}

    def _meta(self, html, prop):
        match = re.search(
            r'<meta\s+(?:property|name)="%s"\s+content="([^"]*)"' % re.escape(prop),
            re.sub(r"\s+", " ", html),
        )
        return match.group(1) if match else None

    def test_every_shareable_page_declares_a_preview(self):
        for slug, path in self.PAGES.items():
            html = path.read_text(encoding="utf-8")
            for prop in ("og:type", "og:site_name", "og:title", "og:description",
                         "og:image", "og:image:alt", "twitter:card"):
                self.assertIsNotNone(
                    self._meta(html, prop), f"{slug or 'index'} has no {prop}")

    def test_each_page_points_at_itself(self):
        # A shared /privacy/ link that says og:url is the home page resolves to
        # the wrong place.
        for slug, path in self.PAGES.items():
            html = path.read_text(encoding="utf-8")
            self.assertEqual(self._meta(html, "og:url"), self.BASE + slug)
            self.assertIn(f'rel="canonical" href="{self.BASE + slug}"',
                          re.sub(r"\s+", " ", html))

    def test_descriptions_are_not_all_the_same(self):
        seen = {self._meta(p.read_text(encoding="utf-8"), "og:description")
                for p in self.PAGES.values()}
        self.assertEqual(len(seen), len(self.PAGES))

    def test_the_image_is_absolute_and_exists(self):
        for slug, path in self.PAGES.items():
            url = self._meta(path.read_text(encoding="utf-8"), "og:image")
            # Scrapers do not resolve relative paths.
            self.assertTrue(url.startswith("https://"), f"{slug}: {url}")
            self.assertTrue((ROOT / url[len(self.BASE):]).exists(),
                            f"{slug}: {url} is not in site/")

    def test_declared_size_matches_the_file_and_the_expected_ratio(self):
        html = self.PAGES[""].read_text(encoding="utf-8")
        width = int(self._meta(html, "og:image:width"))
        height = int(self._meta(html, "og:image:height"))
        url = self._meta(html, "og:image")
        data = (ROOT / url[len(self.BASE):]).read_bytes()

        actual = _jpeg_size(data) if url.endswith(".jpg") else _png_size(data)
        self.assertEqual((width, height), actual, "declared size is not the file's")
        self.assertAlmostEqual(width / height, 1.91, delta=0.02)

    def test_the_image_is_small_enough_to_scrape(self):
        # X caps at 5 MB, LinkedIn 5 MB, Facebook 8 MB. Staying far under keeps
        # the first scrape fast; a well-encoded 1200x630 card is under 100 KB.
        url = self._meta(self.PAGES[""].read_text(encoding="utf-8"), "og:image")
        size = (ROOT / url[len(self.BASE):]).stat().st_size
        self.assertLess(size, 300_000, f"{size} bytes: re-encode rather than ship this")

    def test_the_image_is_at_least_the_size_every_platform_wants(self):
        # 1200x630 is the documented minimum for a large card. Below 600x315
        # platforms fall back to a small square thumbnail.
        html = self.PAGES[""].read_text(encoding="utf-8")
        width = int(self._meta(html, "og:image:width"))
        height = int(self._meta(html, "og:image:height"))
        self.assertGreaterEqual(width, 1200)
        self.assertGreaterEqual(height, 630)

    def test_the_declared_type_matches_the_file(self):
        html = self.PAGES[""].read_text(encoding="utf-8")
        declared = self._meta(html, "og:image:type")
        url = self._meta(html, "og:image")
        expected = "image/jpeg" if url.endswith((".jpg", ".jpeg")) else "image/png"
        self.assertEqual(declared, expected)


class PrivacyPolicyTest(unittest.TestCase):
    """The event list itself is matched to the code by
    app/test/firebase_analytics_service_test.dart, which runs on every pull
    request. This keeps the promise made about all of them."""

    HTML_FLAT = re.sub(
        r"\s+", " ", (ROOT / "privacy" / "index.html").read_text(encoding="utf-8")
    )

    def test_the_page_says_no_event_carries_money_or_text(self):
        self.assertIn(
            "No event carries an amount, balance, name, note or anything you type.",
            self.HTML_FLAT,
        )


def _png_size(data):
    return (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))


def _jpeg_size(data):
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            return (int.from_bytes(data[i + 7:i + 9], "big"),
                    int.from_bytes(data[i + 5:i + 7], "big"))
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        i += 2 + int.from_bytes(data[i + 2:i + 4], "big")
    raise AssertionError("no JPEG dimensions found")


class HeroDemoTest(unittest.TestCase):
    """The hero phone plays a check-up loop, so it needs WCAG 2.2.2's pause control."""

    def setUp(self):
        hero = HTML[HTML.index('id="top"'):HTML.index('id="problem"')]
        self.hero = re.sub(r"\s+", " ", hero)
        self.css = (ROOT / "assets" / "home.css").read_text(encoding="utf-8")

    def test_pause_button_is_labelled_and_pressable(self):
        button = re.search(r'<button[^>]*class="demo-toggle"[^>]*>', self.hero)
        self.assertIsNotNone(button)
        self.assertIn('type="button"', button.group(0))
        self.assertIn('aria-label="Pause the demo"', button.group(0))
        self.assertIn('aria-pressed="false"', button.group(0))

    def test_demo_is_one_image_with_a_one_sentence_label(self):
        shot = re.search(r'<div class="shot"[^>]*>', self.hero).group(0)
        self.assertIn('role="img"', shot)
        self.assertIn('aria-label="', shot)
        label = re.search(r'data-demo-label="([^"]+)"', shot)
        self.assertIsNotNone(label)
        self.assertEqual(label.group(1).count(". "), 0)
        # Everything inside is hidden, so the loop's changing text is never read out.
        self.assertIn('<div aria-hidden="true" class="demo-stage">', self.hero)

    def test_reduced_motion_hides_the_pause_button(self):
        flat = re.sub(r"\s+", " ", self.css)
        self.assertRegex(flat, r"@media \(prefers-reduced-motion: reduce\) \{[^}]*\.demo-toggle \{ display: none; \}")

    def test_demo_screens_come_from_the_page_itself(self):
        self.assertIn('data-demo="check-up"', HTML)
        self.assertIn('data-demo="result"', HTML)
