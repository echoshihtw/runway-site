import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "landing.css").read_text(encoding="utf-8")

# The source is prettier-formatted, so assertions match against whitespace-
# normalised copies: a reformat must never fail a test about behaviour.
HTML_FLAT = re.sub(r"\s+", " ", HTML)
CSS_TIGHT = re.sub(r"\s+", "", CSS)


class LandingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))


class LandingPageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = LandingParser()
        cls.parser.feed(HTML)

    def test_story_sections_exist_in_decision_order(self):
        expected = ["why-now", "problem", "solution", "how-it-works", "why-runway", "pricing"]
        positions = [HTML.index(f'id="{section}"') for section in expected]
        self.assertEqual(positions, sorted(positions))

    def test_every_store_link_is_the_app_store_listing(self):
        # Each button carries its own campaign, so App Store Connect can tell
        # which one brought a download without the page tracking anyone.
        links = re.findall(r'href="(https://apps\.apple\.com/[^"]*)"', HTML)
        self.assertEqual(
            links,
            [
                "https://apps.apple.com/app/apple-store/id6778675088?pt=128981651&amp;ct=landing-hero&amp;mt=8",
                "https://apps.apple.com/app/apple-store/id6778675088?pt=128981651&amp;ct=landing-footer&amp;mt=8",
            ],
        )
        self.assertNotIn("testflight", HTML.lower())
        self.assertNotIn("Coming soon", HTML)
        self.assertNotIn("In App Store review", HTML)
        self.assertIn('href="#how-it-works"', HTML)

    def test_safari_offers_the_same_listing(self):
        self.assertIn('<meta name="apple-itunes-app" content="app-id=6778675088" />', HTML)

    def test_life_chapter_line_is_inclusive_not_segmented(self):
        self.assertIn(
            "A study plan, a new direction, something you are building, "
            "or an adventure you are not ready to give up.",
            HTML_FLAT,
        )
        self.assertNotIn('class="trigger-list"', HTML)
        # The same four situations used to be stated twice, once in the hero
        # and once here. One of them was padding.
        self.assertNotIn('class="chapter-line"', HTML)

    def test_page_tells_the_study_story_without_outline_labels(self):
        for phrase in (
            "two years abroad",
            "spreadsheet",   # the story mentions it; the sentence around it keeps moving
            "So I built Runway",
            "Your money story stays with you",
        ):
            self.assertIn(phrase, HTML)
        for internal_label in (
            "Why people come",
            "The problem",
            "The answer",
            "How it works",
            "Why this app",
            "Simple on purpose",
            "Why I built it",
        ):
            self.assertNotIn(f'<p class="eyebrow">{internal_label}', HTML)

    def test_privacy_section_leads_with_control_not_missing_features(self):
        self.assertIn("Your records stay on your phone.", HTML)
        # The claim must name a mechanism a sceptic can check, and must not
        # invent a company: this page is first person singular throughout.
        self.assertIn("AES-256", HTML)
        self.assertIn("Keychain", HTML)
        self.assertNotRegex(HTML, r"\bsent to us\b")
        self.assertIn("No bank connection.", HTML)
        self.assertNotIn("No sign-in, no cloud sync", HTML)
        self.assertNotIn("No judgment mechanics", HTML)
        self.assertNotIn("No subscription for Pro", HTML)
        self.assertIn('class="trust-scene"', HTML)

    def test_real_product_images_and_accessible_motion_are_preserved(self):
        for image in ("01-runway.png", "02-living.png", "03-log.png", "04-plan.png"):
            self.assertIn(f"assets/device/{image}", HTML)
        self.assertIn("prefers-reduced-motion: reduce", CSS)

    def test_how_it_works_uses_one_sticky_stage_and_cumulative_scroll_stack(self):
        section = HTML[HTML.index('<section class="stories"'):HTML.index('</section>', HTML.index('<section class="stories"'))]
        # The wording of this section has changed four times; its shape has not.
        # Assert the intro carries an eyebrow, a heading and a standfirst.
        self.assertRegex(
            re.sub(r"\s+", " ", section),
            r'class="story-intro"> ?<p>[^<]+</p> ?<h2>[^<]+</h2> ?<span>[^<]+</span>',
        )
        # Match the class token, not the exact attribute: the first screen also
        # carries is-active so the stage is not blank before any scrolling.
        screens = re.findall(r'class="story-screen(?:\s[^"]*)?"', section)
        self.assertEqual(len(screens), 3)
        self.assertEqual(section.count("story-screen is-active"), 1)
        # Token match again: the prefix also hits the story-point-stack wrapper.
        points = re.findall(r'class="story-point(?:\s[^"]*)?"', section)
        self.assertEqual(len(points), 3)
        self.assertEqual(section.count("story-point is-shown"), 1)
        self.assertEqual(section.count('class="story-trigger"'), 3)
        self.assertIn('class="story-product-stage"', section)
        self.assertIn('class="story-point-stack"', section)
        self.assertIn("updateStoryFromScroll", HTML)
        self.assertIn("is-shown", HTML)
        self.assertNotIn('class="story reverse"', section)

    def test_step_labels_rest_on_the_first_step_and_are_script_driven(self):
        # The label shows twice, over the detail crop and in the progress rail.
        # Both must start on step 01 and both must be updated from data-label,
        # or one of them silently states a step the page is not on.
        first = re.search(r'class="story-point is-shown"[^>]*data-label="([^"]+)"', HTML).group(1)
        rail = re.search(r'class="story-progress">.*?<b>([^<]*)</b>', HTML, re.S).group(1)
        aside = re.search(r'class="story-detail-frame">.*?<p>([^<]*)</p>', HTML, re.S).group(1)
        self.assertEqual(rail, first)
        self.assertEqual(aside, first)
        self.assertIn(".story-detail-frame p, .story-progress b", HTML)

    def test_scroll_threshold_is_measured_in_the_same_unit_as_the_layout(self):
        # The section is laid out entirely in vh, which is locked to the
        # viewport with the address bar retracted and does not move. Deriving
        # the threshold from window.innerHeight instead put it on the address
        # bar, which slid it about 63px while the triggers stayed still: three
        # bands of scroll where the bar alone decided which screen showed, so
        # the page changed with no scrolling at all.
        self.assertIn("height:100vh", HTML_FLAT.replace(" ", ""))
        marker = re.search(r"const marker = ([^;]+);", HTML).group(1)
        self.assertNotIn("innerHeight", marker)
        self.assertIn("viewportProbe", marker)

    def test_revealing_a_step_cannot_change_its_height(self):
        # .story-point-stack is sticky, so it still takes its normal-flow
        # space, and .story-triggers sits after it. A step that opened pushed
        # every trigger down, and the script decides which step is current by
        # testing those same triggers: showing a step moved the trigger that
        # had just qualified back out of range, the next scroll event un-showed
        # it, and that moved it back in. The two states alternated for as long
        # as scroll events kept arriving, which after a flick on a phone is
        # about a second. Measured at 120px per step before the fix, 0 after.
        #
        # Assert the property rather than the spelling: whatever .is-shown
        # changes, none of it may affect the box's height, at any width.
        affects_height = (
            "height", "max-height", "min-height", "padding", "padding-top",
            "padding-bottom", "border-top-width", "border-bottom-width",
            "border-top", "border-bottom", "border", "margin", "margin-top",
            "margin-bottom", "display", "line-height", "font-size",
        )
        rules = re.findall(r"([^{}]*\.story-point\.is-shown[^{}]*)\{([^}]*)\}", CSS)
        self.assertTrue(rules, "no .story-point.is-shown rule found")
        for selector, body in rules:
            for declaration in body.split(";"):
                if ":" not in declaration:
                    continue
                prop = declaration.split(":", 1)[0].strip()
                self.assertNotIn(
                    prop,
                    affects_height,
                    f"{selector.strip()} sets {prop}, which resizes the step it "
                    f"reveals and so un-reveals it",
                )

    def test_phone_scroll_rests_on_a_step_and_never_on_the_boundary(self):
        # proximity, never mandatory: snap points sit only on the triggers, so
        # the rest of the page scrolls normally instead of being pulled back
        # toward the section. scroll-margin-top puts a resting trigger at 40vh
        # while the script makes one current at 62vh, so the position the
        # scroll settles on is never the line it is being tested against.
        self.assertIn("html{scroll-snap-type:yproximity;}", CSS_TIGHT)
        self.assertIn("scroll-snap-align:start;scroll-margin-top:40vh;", CSS_TIGHT)
        # Snapping moves the page unasked, so it comes off with reduced motion,
        # and that rule has to come after the one that turns it on.
        self.assertLess(
            CSS_TIGHT.index("html{scroll-snap-type:yproximity;}"),
            CSS_TIGHT.index("html{scroll-snap-type:none;}"),
        )

    def test_mobile_layout_has_a_deliberate_breakpoint(self):
        self.assertRegex(CSS, r"@media\s*\(max-width:\s*48rem\)")

    def test_opaque_icon_is_clipped_inside_a_separate_glow_frame(self):
        self.assertIn('class="app-mark"', HTML)
        self.assertIn('class="app-mark app-mark-large"', HTML)
        self.assertRegex(CSS, r"\.app-mark\s+img\s*\{[^}]*clip-path:\s*inset\((?!0(?:px|%|\s))")

    def test_runway_result_uses_an_app_card_not_a_circle(self):
        self.assertIn('class="status-badge"', HTML)
        runway_rule = re.search(r"\.runway-answer\s*\{([^}]*)\}", CSS)
        self.assertIsNotNone(runway_rule)
        self.assertNotIn("border-radius:50%", re.sub(r"\s+", "", runway_rule.group(1)))

    def test_editorial_redesign_uses_layered_shape_language(self):
        for class_name in (
            "hero-field",
            "hero-shape",
            "life-transition",
            "cut-shape",
            "story-field",
            "story-shape",
        ):
            self.assertIn(f'class="{class_name}', HTML)

    def test_life_moments_are_an_editorial_transition_not_category_cards(self):
        self.assertIn("When life changes shape, money becomes time.", HTML)
        self.assertIn("A study plan, a new direction, something you are building", HTML)
        self.assertIn('class="life-transition"', HTML)
        self.assertIn('class="cut-shape cut-leaf"', HTML)
        self.assertIn('class="cut-shape cut-star"', HTML)
        self.assertNotIn('class="problem-grid"', HTML)
        self.assertNotIn('class="chapter-card"', HTML)

    def test_redesign_keeps_real_product_screens_as_the_visual_proof(self):
        hero_field = HTML[HTML.index('class="hero-field"'):HTML.index('</section>', HTML.index('class="hero-field"'))]
        self.assertIn("assets/device/01-runway.png", hero_field)
        self.assertRegex(CSS, r"\.hero-field\s*\{[^}]*overflow:\s*hidden")

    def test_navigation_is_a_plain_header(self):
        # It floated, with two colour states and a blur, to keep a wordmark
        # and three links in reach over the section showing the product.
        # Nothing in it was actionable. It earns the sticky back when
        # it has an App Store link to carry.
        header_rules = re.findall(r"\.landing header\.site\s*\{([^}]*)\}", CSS)
        self.assertTrue(header_rules)
        combined = re.sub(r"\s+", "", "".join(header_rules))
        self.assertNotIn("position:sticky", combined)
        self.assertNotIn("blur(22px)", CSS_TIGHT)  # the hero card keeps its own blur
        self.assertNotIn("is-scrolled", CSS)
        self.assertNotIn("is-scrolled", HTML)
        self.assertNotIn("window.scrollY", HTML)

    def test_large_one_corner_radius_is_not_repeated_across_surfaces(self):
        # Matched against the whitespace-stripped copy. Written against CSS it
        # searched for "border-radius:1rem ..." with no space after the colon,
        # which prettier does not produce, so the guard could never fire and
        # the shape it exists to keep out could have come back unnoticed.
        for repeated_shape in (
            "border-radius:1rem2.8rem1rem1rem",
            "border-radius:1.4rem4.6rem1.4rem1.4rem",
            "border-radius:1.7rem4rem1.7rem1.7rem",
            "border-radius:1.4rem4.5rem1.4rem1.4rem",
        ):
            self.assertNotIn(repeated_shape, CSS_TIGHT)


if __name__ == "__main__":
    unittest.main()


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
