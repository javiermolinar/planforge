---
name: forge-verify
description: Best-effort verification skill that reports exactly what was and was not verified.
---

# Verification

Use this before claiming something is fixed, done, or ready.

## Rules

- Run the most relevant checks you reasonably can.
- State exactly what you ran.
- State what passed.
- State what was not verified.
- Do not overstate confidence.
- For external API or networked tools, explicitly ask whether verification covered timeout handling, malformed external payload handling, and at least one automated failure-path test.

## Output

- commands run
- results
- remaining uncertainty
- missing network-hardening checks, if any
