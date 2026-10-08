---
status: accepted
---

# The engine stays one script block in index.html; there is no build step

`index.html` is the build: the engine is one `<script id="engine">` block with the page's CSS and UI
script around it, and every consumer (the pages, the node tests, the daily-plate script, the
crowpanel-ha render service) takes that block as it is (README "Engine contract"). The 2026-10-07
architecture review rated "engine.js as source, index.html as a generated artifact" worth
exploring, because the single 4000-line file was where every parallel worktree collided and where
locality was worst. We decided (2026-10-08, issue #3) to keep the single file. The two things the
split would have bought arrived without it: #1 lifted every drawing section into its own
module-scope function on one context object, so a wing ticket touches one function and a body
ticket another, and #2 wrote the contract the five scrapers rely on and made `tests/check.js` assert
it. The split's remaining benefit, separate files in the editor and in diffs, did not justify a
build step that `README` promises not to have, a committed artifact that must be proven equal to
its build on every change, and a second place for the engine to drift from.

Alternative considered: `engine.js` + `ui.js` + a 20-line dependency-free `tools/build.js` inlining
them into a committed `index.html`, with `check.js` asserting the artifact equals the build output
and all consumers still fetching `index.html`. Rejected for now; revisit if the engine outgrows one
file for a reason the section functions do not solve, for instance a second renderer or a test that
needs to import one section alone.

## Consequences

- "No build step, no dependencies" stays true for the engine; `sharp` and Chromium remain test-only.
- New drawing code goes in as another section function on the context object, never inline in
  `drawPlate` and never in a separate file.
- Engine-wide refactors are proven with `tests/snapshot.js` (byte identity), not by reading diffs.
- Issue #3 is closed by this record; the implementation ticket it would have spawned is not filed.
