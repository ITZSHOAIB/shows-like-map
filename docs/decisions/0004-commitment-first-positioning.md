# 4. Position as "one you'll actually finish", not just "shows like X"

- **Status:** accepted, 2026-11-19
- **Deciders:** Sohab Sk

## Context

"Shows like X" on its own is a crowded space: listicles, Reddit, TasteDive, chatbots. Good matches are necessary but not enough to be worth building. The question nobody answers up front is what you're committing to.

## Decision

- **Tagline:** "Find your next show, one you'll actually finish."
- **Every card and show page leads with:**
  - finished, ongoing or cancelled, with cancelled shows called out
  - total hours to finish, computed from TVmaze episode runtimes
  - seasons
  - the platform it's on
- **Filters people can actually act on:** finished only, under N hours, my platforms, language.
- **India-first:** Indian web series are first-class, and Indian shows favour Indian picks.

## Consequences

- Hours to finish and status must be accurate, so episode data is part of the core pipeline, not a nice-to-have.
- Similarity stays the engine, but the home page and SEO copy sell commitment, not just similarity.
