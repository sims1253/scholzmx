# Vendored anti-slop rules

Source: https://github.com/dmmulroy/anti-slop
Commit: e8c4880471b23ab7f216fba7b27d173a6ef07d4c
Copied: 2026-09-06
License: MIT (see LICENSE)

The source files are unmodified. All 15 generic rules are enabled in `.oxlintrc.json`.
Effect rules are not enabled because this site does not use Effect.

Keep `oxlint` and `@oxlint/plugins` pinned to the same exact version. To update the
rules, review upstream changes, replace the copied source, preserve the license,
and run `bun run quality:check` and `bun run test:site`.

The vendored source is excluded from project linting, formatting, and Astro checks.
