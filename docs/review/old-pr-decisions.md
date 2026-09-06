# What to keep from PRs #6 and #7

This proposal adds reading controls to the current site and keeps its existing layout, typography, and botanical illustrations. It does not merge either old branch wholesale.

## Sources inspected

- [#6: UI changes](https://github.com/sims1253/scholzmx/pull/6), `dev` at `493d12a3afb586c9a37f46b0ef9e7943a3a3a3fd`.
- [#7: Chore/astro6 migration](https://github.com/sims1253/scholzmx/pull/7), `chore/astro6-migration` at `1e4f55d535d4d944659817deeb5649122ba7aecc`.
- Baseline: main at `6c836a26d1f4848b35083a59fb822ef890fbdd1e` (Astro 7).

I inspected the changed-file inventories and the relevant UI, layout, script, content, and pipeline changes. This is a selection of useful work, not a certification of every research script or of the replacement publishing pipeline. The screenshots compare the current main build with this proposal; they are not screenshots of the two old branches.

## Decisions

| Work in the old PRs                                                                         | Recommendation                         | Reason / implementation                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contents and breadcrumbs (#6, #7)                                                           | Keep, rewritten                        | Build-time heading links, native disclosure, and collection links on blog posts, recipes, and notes. Works without JavaScript. Only show contents for two or more level-two sections.                        |
| Font-size control (#6, #7)                                                                  | Keep, rewritten                        | A native select offers Original, Larger, and Largest. Scale the article body and headings, remember the choice, and retain browser zoom. Hide the control without JavaScript.                                |
| Content sidebar and reading layout (#7)                                                     | Adapt                                  | Put contents and text size together in the article flow. The old desktop rails hide at narrow widths; this version keeps the controls available on phones and preserves the space used by margin notes.      |
| Unique divider SVG IDs (#6, #7)                                                             | Keep                                   | Main reproduces a duplicate `simpleTexture` ID on a note page. Give each divider its own filter IDs and mark its artwork decorative.                                                                         |
| Code-copy initialization guard (#6, #7)                                                     | Keep                                   | Skip blocks that already have a copy button.                                                                                                                                                                 |
| Local project logos (#6)                                                                    | Keep                                   | Bundle the huerd and hrvester images so rendering does not depend on their documentation hosts. Astro optimizes them.                                                                                        |
| Reading progress (#6, #7)                                                                   | Leave out of this proposal             | Contents provide useful destinations. A fixed progress indicator adds persistent chrome and measures scroll position rather than comprehension. Reconsider if wanted for long essays.                        |
| Swipe navigation (#6)                                                                       | Leave out                              | Hidden navigation gestures can conflict with horizontal reading of code and tables. In #6, an ignored touch start can also leave stale coordinates for touch end. Existing previous/next links are explicit. |
| Animated sunlight and torch glow (#7)                                                       | Leave out                              | Keep the existing botanical illustration as the visual accent. More motion competes with reading.                                                                                                            |
| Broad homepage, listing-card, footer, and image-frame redesign (#7)                         | Save as a separate design option       | It changes the whole site's composition and card system. The reading improvements can be assessed independently. The existing homepage portrait framing has regression coverage.                             |
| Shared card adapters and hero normalization (#6, #7)                                        | Save for a focused refactor            | Useful consolidation, but no new card abstraction is needed for these changes.                                                                                                                               |
| Astro 6 migration, dependency and lint configuration (#7; tooling also in #6)               | Superseded in scope                    | Main already has Astro 7 and the current quality tools. Bringing old configuration across would undo newer work.                                                                                             |
| Quarto build planner, dependency fingerprints, publishing and Markdown-transform tests (#7) | Preserve for a separate pipeline PR    | Substantial potentially useful work. It needs checks against real Quarto/R outputs, cache invalidation, and publication behavior. Do not couple it to a visual decision.                                     |
| CI and deployment changes (#6, #7)                                                          | Review separately                      | Current PR #9 already addresses CI and deployment. This proposal does not mix the old workflows into it.                                                                                                     |
| New research, data, model binaries, and articles (#6)                                       | Preserve on the source branch          | Authored material needs an editorial decision. Nothing here publishes or deletes it. The productivity research alone includes large fitted models and compiled executables.                                  |
| Content edits, image moves, and deletion of five notes (#7)                                 | Preserve for an editorial/content pass | These are content decisions, not prerequisites for the UI. Existing notes remain available.                                                                                                                  |

## Design plan and critique

The subject is Grotto: a personal site for statistics, programming, notes, and recipes, with a botanical/manuscript identity already documented in the repository. Its primary reading task is to follow a piece comfortably and find a section again.

Use existing tokens: parchment `#fdfbf6`, ink `#2a2318`, walnut `#5b4639`, moss `#586a51`, lichen `#cfd7cb`. Cormorant Garamond carries headings; ET Book carries serious articles, and Alegreya carries personal writing and controls. Keep the existing reading measure and left-align the controls.

```text
Grotto / Recipes
            Article title
            Description

│ On this page ▸       Text size [Original]
│ Section links when opened

Article body at the chosen size
```

The first candidate was #7's desktop sidebar. The revision places a single moss rule beside inline controls: it remains available on phones and does not compete with margin notes. The palette and serif fonts come from this site's established identity. No additional textures, shadows, animated accents, or new typefaces are needed.

## Visual review

Open [the comparison](show-me-reading-review.html). It includes baseline and proposal screenshots, a phone view at the largest text size, a dark-theme view, and links to try the actual pages locally.

The independent implementation choices are easy to retain or remove: reading tools, collection trail, local logos, and divider/copy fixes. None requires the old migration or publishing pipeline.

## Closing the old PRs

Review this proposal first. If it captures the desired UI, close #6 and #7 with a link to the replacement PR. Keep their branches, or archive them with tags, until the content and pipeline decisions are made. The exact source commits above also identify the reviewed versions. This work leaves both old PRs open.

## Validation

- `bun run quality:check`: Astro diagnostics, JS/CSS lint, 16 lint-rule test files, and formatting pass.
- `bun run build`: 19 pages built from the checked-in content.
- Browser smoke checks cover existing routes, search, images, theme, feeds, and the new reading controls at desktop and 390px/320px widths. They check text scaling, persistence, keyboard disclosure, heading destinations, no-JavaScript contents, blocked storage, and divider-ID uniqueness.
- Pa11y WCAG2AA: all eight audited routes pass, including a blog post, recipe, and note detail page. The original notes-page duplicate SVG ID was reproduced on main before fixing it.
- Visual checks: desktop, phone with largest text, and dark theme. The comparison itself has no horizontal overflow at 390px.

These checks use the checked-in Markdown content. Quarto/R rendering and the deferred replacement publishing pipeline were not run. The existing local preview occupied port 4321, so this proposal uses 4322; browser checks accept `SITE_TEST_URL` to select it.
