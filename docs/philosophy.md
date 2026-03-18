# Planforge philosophy

Planforge is optimized for long-term software quality, not just short-term velocity.

## Deep modules over shallow modules

Planforge prefers deep modules.

- **Deep module**: simple interface, substantial hidden implementation complexity.
- **Shallow module**: interface complexity is high relative to the functionality provided.

A shallow module is a red flag. It adds cognitive load and obscurity without enough payoff.

Small modules are not automatically good. Splitting code too aggressively often creates shallow wrappers and forces readers to chase behavior across many files.

## Why this matters

By separating interface from implementation well, we hide complexity where it belongs.

A classic example is the Linux file interface: a small set of core system calls provides access to a very complex implementation beneath. The interface is relatively simple while the implementation carries the depth.

## Tactical vs strategic balance

Planforge uses a pragmatic 80/20 tactical-to-strategic split:

- Tactical (~80%): deliver the requested behavior.
- Strategic (~20%): reduce future complexity in the touched area.

Strategic work should be local, high-leverage, and justified.

## Broken-window rule

If you touch an area with visible quality debt, do one of these:

- fix one small local issue now, or
- explicitly log it for follow-up

Ignoring obvious debt silently is discouraged.

## Red flags

Treat these as red flags during planning and review:

- shallow module decomposition (complex interface, little functionality)
- tiny pass-through wrappers that mostly forward calls
- one behavior spread across many files without boundary benefit
- callers needing implementation knowledge to use an interface safely
- dependency growth without clear leverage
- hidden control flow or unclear ownership
- unknown unknowns left unstated in plans

## Practical rule of thumb

A module is probably deep enough when:

- callers can use it through a small, clear interface
- callers do not need to understand its internals
- internals can evolve without forcing widespread call-site changes

If changing one behavior requires touching many modules, you likely have shallow boundaries and rising change amplification.
