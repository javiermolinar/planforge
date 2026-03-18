# Benchmark scorecard — API CLI (Rust)

- Date: 2026-03-18
- Task: minimal read-only Hacker News CLI (`hn top --limit N`)
- Language: Rust
- Final score: **96**

## Verification evidence

- `cargo fmt --check` — pass
- `cargo test` — pass
- `hn top --limit 3` (live HN API) — pass

## Notes

- Planned before implementation.
- Small dependency set (`serde`, `serde_json`, `ureq`).
- One formatting retry during development; final checks green.
