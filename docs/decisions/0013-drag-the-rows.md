# 13. Drag the rows with a mouse

- **Status:** accepted, 2026-11-21
- **Deciders:** Sohab Sk

## Context

The rows scroll sideways: the matches, a step further out, and the home page's time rows. On a phone a finger swipes them. With a mouse there were arrows that paged the row. On a wide screen they skipped cards, and paging by whole cards (PR #36) still didn't feel right.

Five desktop takes were tried on the `rail-prototype` branch, switched with `?r=`:

- **Now:** the arrows, paging by whole cards (#36).
- **Grid:** no sideways scrolling; rows wrap, with "Show all".
- **Paddles:** tall edge paddles, as streaming apps have, and a page indicator.
- **Drag:** grab the row with the mouse and fling it, with a scrubber under it.
- **Ranked list:** the matches as a numbered list. It was dropped: the AI's order isn't a ranking.

Drag won.

## Decision

With a mouse, the row is grabbed, not paged. There are no arrows.

- **It follows the mouse.** Past 6 px a press is a drag, and the row moves with the mouse. Let go and it flings on at the speed it was let go at, slows down, then snaps to the nearest card.
- **A press that barely moves is a click**, and a press held still is a peek (decision 0007), as before. Once a peek is open, the mouse drags the peek, not the row under it.
- **Releasing after a drag follows nothing.** The browser's own drag of a link or poster is off.
- **A scrubber under the row** shows how much of it is in view, and where. Click it to jump there, or drag along it. It's the single-click way to move a row (WCAG 2.5.7), next to a trackpad's or a wheel's sideways scroll.
- **Keyboard users Tab along the cards**, which scroll themselves into view. So the scrubber is for the pointer only: it's hidden from screen readers and isn't in the Tab order.
- **Only for a mouse.** The grab cursor and the scrubber show on `(hover: hover) and (pointer: fine)`. A finger swipes natively and flings freely, with no snapping (PR #40).
- **Reduced motion:** the row still follows the mouse, since that's the gesture itself. There's no fling.
- **Forced colours:** the scrubber is drawn in system colours.

## Consequences

- PR #36 (arrow paging) is superseded.
- A mouse user who doesn't think to grab a row can still click the scrubber, scroll sideways with a trackpad, or Tab.
