# AI_CONTEXT

> **Draft.** Sections marked **[YOU]** need your own words before submission. Everything else is taken from `docs/BUILD_LOG.md`, which has the full record.

## AI tools used

- **Claude (claude.ai):** research and fact-checking, then writing and testing the domain core (dates, money, NAV rules, the API client, the store's rules); later an audit of the whole app, the polish plan (`docs/POLISH_PLAN.md`) and a review of each Claude Code round before I accepted it.
- **Claude Code:** building the screens from a phased plan (`docs/BUILD_PROMPT.md`) under project rules in `CLAUDE.md`, then the product, design and polish rounds. I reviewed each phase before the next.
- **[YOU]** Name the tools behind the three earlier research reports I started from (for example ChatGPT or Gemini deep research).

## How I directed them

- AI output was a draft to verify. Each claim the design rests on was checked against a primary source: live mfapi.in responses, SEBI and AMFI rules, and Expo SDK 57's own source.
- Work was ordered by risk: dates, money and NAV rules first, as pure TypeScript with tests on real API data; screens afterwards, built against those functions.
- Rules for the coding agent were written down (`CLAUDE.md`): no floats for money, no `new Date('YYYY-MM-DD')`, nothing that doesn't run in Expo Go, a domain function plus tests for every new rule. Each phase had a gate: type-check, tests, bundle, and a check on a device.
- From Phase 5 on, Claude Code ran the test points itself on an Android emulator through adb (deep links, the accessibility tree, airplane mode, dark mode, 2× text) and reported what passed and what it couldn't check.

## Where AI helped

- Mapping what the API really does: an unknown code returns HTTP 200 with empty data, history lags `/latest` by a day, a NAV exists on Sunday 31 Mar 2024, closed schemes are still served.
- Exact-money and calendar code, with tests that use real holiday gaps.
- Building screens quickly against a precise spec, and walking through six investor personas (`docs/PERSONAS.md`) to find what was missing.
- **[YOU]** Anything else that saved you time.

## What needed correction

From the research reports: the purchase-NAV rule (below); libraries that don't run in Expo Go (`react-native-charts-wrapper`, MMKV); claims attributed to Groww that were Shopify's; an SDK 54 baseline.

Six examples from the build (the rest are in `docs/BUILD_LOG.md`):

1. **Search was assumed to match parts of words.** On my phone "par" found nothing. Claude Code checked the live API (`par` → 0, `parag` → 15) instead of guessing, and changed the copy rather than downloading all ~40,000 schemes.
2. **Money done in its head.** Its test notes said "Invested ≈ ₹9,390.80"; the exact figure is ₹9,390.91. The app was right because the figure comes from BigInt maths in `valueLot`. Rule since: expected money comes from the domain functions or the tests, never hand arithmetic.
3. **A skipped check.** A small fix was committed after only the type check. Rule since: `npm run check` before every commit.
4. **A fresh clone wouldn't install.** The lockfile carried `react-dom@19.3.0`, which needs React 19.3, while SDK 57 pins 19.2.3, so a reviewer's first `npm install` would have failed. Fixed with an `overrides` pin and verified with `npm ci` in an empty directory.
5. **Security reviews caught two leaks.** Scheme names from the API went straight into CSV cells (formula injection), and a "SIP ₹5,000" label showed money with amounts hidden. Both fixed, the first with tests.
6. **Invested didn't match the statement.** SIP instalments showed ₹4,999.99 because invested was units × NAV. Statements count the rupees paid, so purchases now store the amount (optional, backward-compatible).

**[YOU]** Say in your own words how you caught these (what you saw on the phone, what made you push back) and which ones mattered most to you.

## Key decisions and trade-offs

- **TanStack Query for server data, Zustand for user data:** different lifecycles; two small arrays don't need Redux.
- **Exact money:** BigInt scaled integers, rounded once at display, with our own Indian-format formatter.
- **Expo Go as a hard rule:** SVG chart, AsyncStorage, no Reanimated or Skia, so a reviewer can run it without a build.
- **Lots, not one holding per fund:** real purchases happen on different dates at different NAVs.
- **Tell the user about API limits** (whole-word search, the 15-result cap) instead of working around them.

Details are in `docs/ARCHITECTURE.md`.

## An example where I overrode the AI

All three research reports said a weekend or holiday purchase should use the **nearest previous NAV**. SEBI's applicable-NAV rules say a purchase gets the NAV of the day the money is realised before the cut-off, so money that arrives on a day with no NAV can only get the **next** NAV. Nearest-prior would price a Saturday purchase at Friday's NAV, a price it could never have got.

The app uses the first NAV on or after the purchase date, and saves a purchase as "Awaiting NAV" until that NAV is published. Trailing returns still use the NAV on or before each date, because they answer a different question. Tests use real dates: Independence Day 2023 maps to 16 Aug, and Good Friday 2024 to Sunday 31 Mar 2024, a real weekend NAV.

**[YOU]** Optionally add a second example from the Claude Code phases, such as whole-word search (your phone test disproved the plan's assumption).

## With more time

Import from a CAS statement; Maestro end-to-end tests and more screen tests; a development build with app-switcher privacy tied to the hide-amounts toggle; multiple portfolios (for example, one per family member).
