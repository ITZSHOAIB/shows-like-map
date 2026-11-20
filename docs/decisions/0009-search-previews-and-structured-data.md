# 9. How the site reads to search engines and link previews

- **Status:** accepted, 2026-11-20
- **Deciders:** Sohab Sk

## Context

Epic #4's outcome is that show pages are found by "shows like X" searches. The site already had a sitemap, `robots.txt`, a title per page and canonical links. Every show page shared one template description, two shows could share a title (The Office, 2001 and 2005), and a shared link showed no picture.

## Decision

- **A description that is the page's own.** It leads with as many match names as fit in 155 characters ("Shows like Breaking Bad: Better Call Saul, The Sopranos, Ozark, The Wire and 6 more, each with why it's similar…"), because the names are what a searcher scans for. Names go before the promise does.
- **The year where a name repeats.** About 20 names are shared by two shows. Those get "(2001)" in the title and description, and no other page does.
- **Link previews use the poster, not a card made per show.** A show's `og:image` is its TVmaze poster on the compact card. The home page, and any show with no poster, use one designed 1200×630 card (`public/og.png`). Making 1,989 cards would add an image library and build time, and would re-host posters while the question of hotlinking them (#4) is open.
- **Structured data on show pages:** a `TVSeries` and a `BreadcrumbList`. Breadcrumbs are the type that changes how a result looks. A list of matches isn't marked up, since search engines have no result type for it, and neither is a site-search box.
- **Nothing is `noindex` but the 404 page.** Measured: every show has matches, and the 17 with only unlinked matches still have content.

## Consequences

- `tests/seo.spec.ts` reads the built site and checks titles are unique, descriptions fit, canonicals match `og:url`, preview pictures are absolute, structured data parses, and the sitemap matches the pages.
- Custom share cards per show stay a possible follow-up once the poster question is settled.
- Getting pages found still needs Google Search Console: verify the domain and submit the sitemap.
