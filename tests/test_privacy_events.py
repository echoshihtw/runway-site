import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PrivacyEventsTest(unittest.TestCase):
    def test_the_page_lists_exactly_the_events_in_events_json(self):
        # events.json is what the app checks its own events against, so the
        # page and the app can only agree through it.
        page = (ROOT / "privacy" / "index.html").read_text(encoding="utf-8")
        listing = re.search(r'<ul id="analytics-events">(.*?)</ul>', page, re.S).group(1)
        listed = set(re.findall(r"<li><code>(\w+)</code>", listing))
        promised = set(json.loads((ROOT / "privacy" / "events.json").read_text(encoding="utf-8")))
        self.assertEqual(listed, promised)


if __name__ == "__main__":
    unittest.main()
