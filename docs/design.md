# Design

The rules the home page is built on. Change a rule here first, then the page.

## The story

- **Form shows the mood:** love is a heart, joy a flower or sun, pride a star, pressure a triangle, shock a burst, relief a pebble.
- **Colour shows the runway state,** as in the app: runway blue above 6 months, attention from 3 to 6, act under 3.
- **The number shows how long.** A change is rounded to the safe side.
- **Each life starts with its own shape:** working a square, studying a hexagon, between jobs a diamond, retired a pebble.
- **The story ends on the runway circle,** a true circle and never softened, because it is the brand mark.

## One circle

One circle carries the page, from the nav logo to the footer logo:

1. On load it grows out of the nav logo's circle and lands as the life's starting shape.
2. The story changes its shape, then it becomes the runway circle.
3. It becomes the full stop of "Wait.", then the last dot of "What if".
4. It becomes the planner's circle.
5. It becomes the full stops of "What people ask." and "Know the time you have.".
6. It lands in the footer logo, and the logo's star lights.

- **Blue belongs to the circle.** Nothing else near its path is runway blue, except the planner's month dots, which show a real state.
- **Every full stop it visits is a real "."** for screen readers and search. Empty, it shows in ink, or in paper on the footer.
- **The star is never explained.** It only lights; no words promise it.

## Motion

- **The visitor drives it.** Scroll is the timeline, and scrolling back plays it in reverse.
- **Only one thing moves at a time,** and the number never travels: it fades out before a move and in after.
- **Every move bows sideways by a fifth of its length:** to the open right side when it runs down the page, up into a hop when it runs across. It stays 16 px inside the screen.
- **Timing:** position `cubic-bezier(.3, 0, 0, 1)`, a soft start and a long landing. Size follows a beat behind, `cubic-bezier(.45, 0, .15, 1)`.
- **Weight:** it swells a little before the story's moves, stretches a little along its path while fast, and squashes as it lands.
- **Small full stops** grow to 16 px while the circle travels between them, so it can be followed.
- **Places too far apart to share the screen:** the circle waits near the edge of the screen until the next place scrolls in.
- **The entrance** is 300 ms of stillness, then a 900 ms move. Motion that plays by itself stays under five seconds (WCAG 2.2.2), and any scroll, key or tap stops it.
- **Reduce Motion:** no entrance and no travel. The full stops show as dots.

## Layout

- **One spacing scale:** 8, 12, 16, 24, 32, 48, 64, 96.
- **The frame is 824 px:** the words are 420 px, the gap 64 px and the shape 340 px.
- **"What people ask."** shows only the questions. An answer opens on tap, and the answers stay in the page.
- **The footer is one column.** The three promises stack under the heading, and the right side stays clear for the logo.

## Keys

- Up and Down move between stops.
- Left and Right change the choice on screen.
