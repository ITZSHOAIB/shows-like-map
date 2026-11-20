# 12. Swipe the peek: right to keep, left to close

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

The peek (decision 0007) shows a match before you hop to it. Keep (decision 0011) lives on a show's own page. So deciding a match was worth keeping meant hopping to it first. The peek also had nothing to do with your finger once it opened.

Prototypes on the `motion-prototype` and `gesture-prototype` branches were tried on a phone:

- **Motion on the rows** (a cover-flow tilt, a centre card that grows, a hero that recedes, cards that pile up or deal over each other): none were wanted. The rows stay as they are.
- **The peek as a bottom sheet** you drag down to close (pure-web-bottom-sheet): it worked, but it felt detached from the card, as it did in 0007.
- **Hold, then drag up to keep or down to close:** up and down is also how the peek's text scrolls. On a phone, a long press on the text started a selection, the browser took over the finger, and the drag got stuck with no way to start it again.
- **Hold, then drag sideways:** this won.

## Decision

In the peek, a sideways drag decides. Right keeps the show and left closes the peek. Up and down still scroll the peek.

- **It follows the finger.** The peek moves and tilts with your finger. Past 80 px the side you're heading for lights up and the phone ticks. Let go there and the peek flies off that way. Let go short of it and it springs back and stays open.
- **The opening finger can drag straight away**, without lifting. A fresh sideways drag on an open peek works the same, so if anything interrupts a drag, you just drag again.
- **Nothing in the peek can be selected.** That stops a long press on its text from taking the finger over. Everything in the peek is also on the show's own page, where text selects as normal.
- **Releasing after a drag follows nothing:** not Open, and not a Leads-to show.
- **Keep is also a button**, between Open and Close, since dragging can't be the only way (WCAG 2.5.7). On a show already kept it reads "Kept" (`aria-pressed`) and takes the show off, as the Keep on a show's page does.
- **A keep is announced:** "Kept <show>." goes to a live region once the peek has closed.
- **Reduced motion:** the peek still follows the finger, since that's the gesture itself. There's no tilt, no fly-off and no spring.
- **Forced colours:** the armed side shows in the system highlight colours.

## Consequences

- Keeping a match takes one hold and a flick, with no hop there and back.
- A show kept from the peek counts in the header and shows on `/kept/`, the same as one kept from its page.
- The drag is tested with Chrome's emulated touch: keep, close, a fresh drag after letting go, and an up-down drag that doesn't decide. The long-press selection that broke the up-and-down version can't be reproduced headless. It's checked by hand on a phone.
