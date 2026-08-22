# Releases

Planforge uses tag-driven GitHub releases.

## Versioning

Use semantic version tags:

- `v0.x.y`
- `v1.0.0` when stable

Guideline:

- feature: bump minor
- fix or documentation change: bump patch
- breaking behavior: bump major, or call it out clearly while pre-1.0

## Release process

1. Review the package contents and current diff.
2. Create an annotated tag:

```bash
git tag -a v0.2.0 -m "v0.2.0"
```

3. Push the tag:

```bash
git push origin v0.2.0
```

4. GitHub Actions creates a release with generated notes.

The repository does not run an automated test or validation suite.
