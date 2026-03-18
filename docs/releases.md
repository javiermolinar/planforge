# Releases

Planforge uses tag-driven GitHub releases.

## Versioning

Use semantic version tags:

- `v0.x.y`
- `v1.0.0` (when stable)

Guideline:

- `feat` -> bump minor (`v0.3.0`)
- `fix/docs/test/chore` -> bump patch (`v0.2.1`)
- breaking behavior change -> bump major (or clearly call out while still pre-1.0)

## How to release

1. Ensure `main` is green.
2. Create an annotated tag:

```bash
git tag -a v0.3.0 -m "v0.3.0"
```

3. Push the tag:

```bash
git push origin v0.3.0
```

4. GitHub Actions `Release` workflow will:
   - run smoke tests
   - create a GitHub Release from that tag with generated notes

## CI

- `CI` workflow runs on pushes to `main` and pull requests.
- It executes:
  - `tests/test-plan-scripts.sh`
  - `tests/test-pi-package.sh`
