# Frontend: finish with an accessibility pass

Every frontend or design change ends with an accessibility pass before the PR is ready. Fix what it finds in the same PR, and list the findings and fixes in the PR body.

## Automated

`pnpm a11y` runs the accessibility checks in `tests/a11y.spec.ts` and `tests/contrast.spec.ts` against the built site (`pnpm build` first). `pnpm e2e` runs every browser test, and CI runs it after the build. They load each page at 390 px, in the dark and light system themes, and check:

- **axe-core** (WCAG 2.2 AA plus best practice), with the summary closed and open.
- **Reflow:** no sideways scroll at 320 px.
- **Keyboard:** the summary toggle's name, its 24 px target and Enter to open it, the visible focus ring, and that a row with no links is focusable.
- **Reduced motion:** transitions stop.
- **Contrast over the backdrop:** every hero text element against the real pixels behind it (blurred poster, glow, shadow), on white, yellow and dark posters. axe can't see through those, and plain-background maths missed it twice.

The pages are Breaking Bad (linked matches), Planet Earth (only unlinked matches), The Office (white poster) and the 404. When a change adds a new page or state, add it to `PAGES` or write a test for it.

The first time, run `pnpm exec playwright install chromium`.

## By hand

Look at the change on a phone, then check what the tests can't:

- **Contrast:** text ≥ 4.5:1, and large text and icons ≥ 3:1, in dark and light. Measure against what's really behind the text, not the page background. New text over an image or gradient goes into `TEXT` in `tests/contrast.spec.ts`.
- **Keyboard:** Tab through the page. The order follows the layout and every stop shows the accent ring. Check that a scroller doesn't clip it.
- **Names:** each control has a short, unique name, and no text is read twice. Decorative images and name placeholders are `aria-hidden`.
- **Targets:** at least 24 × 24 px.
- **Reflow:** no horizontal page scroll at 320 px.
- **Motion:** animations respect `prefers-reduced-motion`.
- **Structure:** one `h1`, then `h2` per section. Lists are `ul`/`li`, and `main`, `header` and `footer` are landmarks.
