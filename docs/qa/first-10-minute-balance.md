# First 10-minute Fishing balance measurement

This is a post-1.0 measurement pass. Do not tune balance until device samples are collected.

## Target ranges

- Casts: 4–8
- Catches: 2–4
- Hook success: 55–85%
- Battle catch rate: 60–90%
- Rare-or-better encounter rate: 8–25%
- Stamina spent: 4–8
- First Town upgrade: not guaranteed within the first 10 minutes; it should become a visible near-term goal
- Score earned: compare against `npm run qa:first10-balance` for the current data set

## Manual device sample

Record one row per 10-minute session.

| Field | Value |
| --- | --- |
| Device / iOS | |
| Safari or installed PWA | |
| Location / bait / rod | |
| Casts | |
| Wait actions | |
| Twitch actions | |
| Slow-reel actions | |
| Hook attempts / successes | |
| Battles / catches / escapes | |
| Common / uncommon / rare / legendary | |
| Stamina spent | |
| Score earned | |
| First Town upgrade reached? | |
| Notes / confusion / dead time | |

## Decision rule

Do not react to one run. Collect at least 5 sessions across at least 2 devices before changing economy, bite rates, Battle balance, or stamina. Treat visual/UX friction separately from numeric balance.
