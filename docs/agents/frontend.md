# Frontend: finish with an accessibility pass

Every frontend or design change ends with an accessibility pass before the PR is ready. Fix what it finds in the same PR, and list the findings and fixes in the PR body.

## Automated

- **Run axe-core** (WCAG 2.2 AA plus best practice) on the built site with `pnpm build && pnpm preview`. Load each page in a 390 px iframe, inject axe, and run it in both themes (set `data-theme="light"` on `<html>` for light).
- **Cover the states:** a show with linked matches, a show whose matches are all unlinked, a show with the summary open, and the 404 page.
- **Remove the probe files** from `dist` when done.

## By hand

axe can't judge text on gradients or blurred backdrops, so check these yourself:

- **Contrast:** text ≥ 4.5:1, and large text and icons ≥ 3:1, in dark and light. Check status colours against their 12% chip, not only the page background.
- **Keyboard:** Tab through the page. The order follows the layout and every stop shows the accent ring. Check that a scroller doesn't clip it.
- **Names:** each control has a short, unique name, and no text is read twice. Decorative images and name placeholders are `aria-hidden`.
- **Targets:** at least 24 × 24 px.
- **Reflow:** no horizontal page scroll at 320 px.
- **Motion:** animations respect `prefers-reduced-motion`.
- **Structure:** one `h1`, then `h2` per section. Lists are `ul`/`li`, and `main`, `header` and `footer` are landmarks.
