# Quarto to Astro blog pipeline

Write Quarto posts at `src/content/blog/YEAR/POST/index.qmd`. Run commands from the repository root. The renderer needs Python 3, Quarto, R, and the R packages listed in `.github/workflows/content-render.yml`.

```bash
bash build-blog.sh                                      # Render when inputs change
bash build-blog.sh src/content/blog/2022/POST/index.qmd   # Render one post
bash build-blog.sh --force                              # Ignore local render hashes
bun run test:site                                       # Build and audit the rendered site
```

Quarto produces `index.md` and figures. The script puts generated figures beside the post and rewrites Markdown image references to relative paths. Generated HTML figures with Quarto alt text become Markdown images so Astro can resolve their files. Authored asset paths remain unchanged. Astro then builds the site and optimizes images. Authored sources stay in Git; generated Markdown and figures do not.

## CI and deployment

`ci.yml` runs on every pull request targeting main/master, every push to those branches, and manual dispatch. There are no path filters that can silently skip site changes.

1. Workflow linting, renderer regression tests, and code quality checks run alongside the reusable content-render workflow.
2. The renderer restores an exact-input cache or installs R and Quarto and renders all posts. Failed renders fail the job. The artifact contains only generated Markdown and images.
3. The site job downloads that same run's artifact into a staging directory. It validates every Quarto post and refuses to overwrite tracked sources or restore output for deleted posts.
4. The complete content collection is typechecked. Astro builds once; browser smoke tests visit every built blog post as well as the main pages at desktop and mobile widths. Pa11y checks representative pages. Both tools use an isolated preview server on an automatically assigned port.
5. `CI passed` requires every prerequisite job to succeed. A failed, skipped, or cancelled prerequisite fails this check. On main/master, deployment publishes the tested Pages artifact from this run. PRs cannot deploy. New PR commits cancel older PR runs; main runs finish without interrupting an active deployment.
6. After successful main/master CI and deployment, production monitoring runs Lighthouse budgets and Pa11y. These are post-deployment alerts; they do not roll back a release. Audit reports are retained for 14 days.

The deploy workflow can only be called by another workflow. To deploy manually, run **Code Quality CI** on main/master. This runs the same checks as a push.

## Caches and reproducibility

The content cache has no fallback restore key and no cross-run artifact lookup. Its fingerprint includes the names and contents of blog sources, bibliographies, assets, public files, scripts, Quarto configuration, and the render workflow. Renaming or deleting a source changes the key. Expired or missing caches cause a fresh render.

R and Quarto versions and the CRAN snapshot date are pinned in the render workflow. Change those values together when updating the rendering toolchain; the workflow change invalidates the content cache. Only packages used by executable post chunks are installed. The `bayesim` example is not evaluated and does not require installing its development dependencies.

Local render hashes also include the installed Quarto version and R package versions. A changed input causes rerendering with Quarto's execution cache refreshed. `--force` bypasses the local hashes.

To bypass the CI content cache, manually run **Code Quality CI** with **force-render** enabled. This run uses newly rendered output but does not replace an immutable existing cache entry. Delete the matching GitHub Actions cache or change the rendering inputs if subsequent runs must rebuild too.

## Dependency updates and checks

Dependabot checks Bun packages and GitHub Actions weekly. Minor and patch updates are grouped; major updates remain separate. Updates require review and CI; there is no automatic merge workflow. Action references use commit SHAs with version comments, except the separately managed Pullfrog workflow and the versioned actionlint container.

`bun audit` currently reports [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) in the browser tooling's transitive `extract-zip` dependency. As of September 7, 2026, the advisory lists no patched release. CI disables Puppeteer's browser downloads and supplies Chrome separately. Keep the alert open until upstream replaces or fixes the dependency; this mitigation does not make the dependency audit clean.

Use `CI passed` as the required branch status check. It remains a single stable check while individual jobs change. Pages write and OIDC permissions are granted only to the deployment job. Other CI jobs use a read-only token and do not retain checkout credentials.

```bash
actionlint
python3 -m unittest discover -s scripts/tests -v
bun run quality:check
```

## Troubleshooting

- **Render failed:** the job prints Quarto's error log and exits unsuccessfully. Locally, the log is in the post's `.blog-cache/last-error.log`.
- **Missing R package:** add it to the render workflow's `extra-packages` list. This invalidates cached content.
- **Missing generated post or source collision:** fix the artifact producer. Restore refuses incomplete or unsafe artifacts instead of using older output.
- **Missing image:** check whether it is an authored asset that belongs in Git or a figure generated during rendering. The artifact cannot supply missing authored sources.
