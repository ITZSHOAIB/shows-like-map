# 5. The show page is "Drill down": rows, hold-to-peek, path map

- **Status:** accepted, 2026-11-19 (the visual polish is still open)
- **Deciders:** Sohab Sk

## Context

Four UI prototypes were tried on a phone: A Orbit, B Reason rows, C Deck and D Drill down. They live on the `prototype` branch.

- **B** was preferred.
- An early D added inline branching rows, threads between copies, a long-press fan and a force-layout map. That was rejected: confusing, laggy on the phone, and long-press opened the phone's own menu.
- The simplified D kept only what helped people follow their shows.

## Decision

The show page uses:

- **A hero:** poster, status, hours to finish, platform, summary.
- **Rows of matches:** "Closest matches" first, then rows named after a shared reason. Every card shows a short "why".
- **Tap to go deeper:** a normal page navigation, where the tapped poster morphs into the next page's hero and the old show shrinks into a "Your path" strip.
- **Hold to peek:** the top matches fan out; slide onto one and let go to jump there. The native long-press menu is suppressed.
- **Path map:** the shows you went through in order, with a few roads not taken. Kept light: no blur, no shadows, at most about 30 posters.

## Consequences

- **Performance budget:** a tap must show the next page in under 300 ms on a mid-range Android phone. That means prefetch on touch, lazy rows, and keeping the per-card scroll animation to the first row at most.
- All of this is client-side progressive enhancement. Plain links still work without JavaScript.
