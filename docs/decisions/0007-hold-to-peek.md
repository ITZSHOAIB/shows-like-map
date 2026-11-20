# 7. Hold a poster to peek

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

On a show page, a match's card says why it's like the show and how long it takes to finish. To learn more, or to see where that match leads, you had to hop to it and come back. Epic #3 planned a hold gesture to look before hopping. Two questions came with it: what the hold reveals, and how it opens.

Two rounds of prototypes, kept on the `peek-prototype` branch, were tried on a phone:

- **What:** a fan of the match's own matches around the finger, or details about the match. The fan overlapped and ran off the edge on a phone, and the "Leads to" row covers the same ground. Details won.
- **How:** a sheet from the bottom, a panel opening inside the row, or the card popping out over the page. The sheet felt detached from the card that was held, and the inline panel pushed the row around. The pop-out won.
- On Android, holding a link opened the browser's own menu ("Open in new tab" and so on) over the prototype.

## Decision

Holding a match's poster for 420 ms grows it into a card over the dimmed page. It shows the poster, the facts (status, hours to finish, year, network), why it's a match, the summary, and up to four shows it leads to. **Open** hops to it, and the poster morphs into the next page's hero. A "Leads to" show hops two steps down, and the "Your path" strip keeps the show in between.

- The hold is a shortcut. Everything in the peek is also on the match's own page, so keyboard and screen-reader users lose nothing by never seeing it. A tap still hops at once.
- It's a modal `<dialog>`. Open has focus, and Escape, Close or a tap on the dimmed page closes it. Focus goes back to the held card.
- 420 ms is under Android's long-press menu (about 500 ms). On a touch screen the menu, the link callout and the tap made by lifting the finger are all swallowed. With a mouse, right-click keeps the browser's menu, and a press-and-hold peeks.
- A finger that moves more than 10 px is scrolling the row, so it doesn't peek.
- On touch screens, a "Hold a poster to peek" line shows until the first peek.
- With reduced motion it opens and closes without the grow.

## Consequences

- Looking ahead costs one hold instead of a hop there and back.
- Each show page carries its matches' peek data as JSON: about 9 KB before compression, 16 KB at most.
- The long-press fix can't be tested headless: Chrome's emulated touch doesn't fire the long-press menu. It's checked by hand on a phone.
- A hold is hidden by nature. The one-time hint is the only clue, so nothing should ever be reachable through the peek alone.
