# Issue tracker: GitHub

Issues live in this repo on GitHub. Use the `gh` CLI.

## Ticket granularity

- **Work is tracked in domain epics.** Each one is a single issue labelled `epic`, in a milestone, with one demoable outcome.
- **Slices are a checklist in the epic body.** Each slice is a thin tracer bullet through every layer. Don't open separate implementation issues, sub-issues, research tickets or planning tickets.
- **Research and open questions** go under "Open questions" in the epic they block. Answer them with a short grill or research when that epic starts, then move the answer to "Decisions". Write a decision record in `docs/decisions` only if the choice outlives the epic.
- **When a skill such as `/to-tickets` would create several small issues,** add the work as slices on an existing epic, or create one new epic if the outcome is new.

## Pull requests

- **One PR may cover several slices.** Tick each slice it delivers.
- **Linking:** write `Part of #<epic>` for every epic the PR touches. Only the PR that finishes an epic says `Closes #<epic>`.
- **Merging:** the "Checks / Required" job must pass before merging to `main`.
- **Prototype work** stays on the `prototype` branch. `main` only gets validated decisions.
