# 6. Dark only, no light theme

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

The show page puts text over each show's poster, blurred into a backdrop with a glow (decision 0005). The site followed the phone's light or dark setting.

- Almost every contrast failure in the show page's accessibility passes (#17, #19) was in the light theme: dark posters turned its background muddy.
- Fixing them needed a washed-out backdrop and darker accent colours, which lost the look the design was built around.
- WCAG doesn't ask for a light theme, only readable contrast. The dark theme clears 4.5:1 over every poster tested.

## Decision

The site is dark only. It declares `color-scheme: dark` and stays dark when the phone is set to light.

## Consequences

- Every design change is tuned and tested once, and contrast over the backdrop has room to spare.
- People who read light-on-dark poorly (some with astigmatism, or outside in bright sun) get no light option. The text is short: a few lines of summary and one-line reasons.
- Forced colours (Windows High Contrast) is the setting that serves people who need more contrast, so it's tested: the backdrop is hidden there, and focus rings, badges and path chips keep their outlines.
