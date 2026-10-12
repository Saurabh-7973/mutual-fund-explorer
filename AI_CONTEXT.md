# AI_CONTEXT

## AI tools used

- **Claude (claude.ai):** research and fact-checking, then writing and testing the domain core (dates, money, NAV rules, the API client, the store's rules); later an audit of the whole app, the polish plan (`docs/POLISH_PLAN.md`) and a review of each Claude Code round before I accepted it.
- **Claude Code:** building the screens from a phased plan (`docs/BUILD_PROMPT.md`) under project rules in `CLAUDE.md`, then the product, design and polish rounds. I reviewed each phase before the next.
- **Earlier AI research reports:** three deep-research reports from other AI assistants, which I started from before any code; what they got wrong is listed below.

## How I directed them

- AI output was a draft to verify. Each claim the design rests on was checked against a primary source: live mfapi.in responses, SEBI and AMFI rules, and Expo SDK 57's own source.
- Work was ordered by risk: dates, money and NAV rules first, as pure TypeScript with tests on real API data; screens afterwards, built against those functions.
- Rules for the coding agent were written down (`CLAUDE.md`): no floats for money, no `new Date('YYYY-MM-DD')`, nothing that doesn't run in Expo Go, a domain function plus tests for every new rule. Each phase had a gate: type-check, tests, bundle, and a check on a device.
- From Phase 5 on, Claude Code ran the test points itself on an Android emulator through adb (deep links, the accessibility tree, airplane mode, dark mode, 2× text) and reported what passed and what it couldn't check.

## Where AI helped

- Mapping what the API really does: an unknown code returns HTTP 200 with empty data, history lags `/latest` by a day, a NAV exists on Sunday 31 Mar 2024, closed schemes are still served.
- Exact-money and calendar code, with tests that use real holiday gaps.
- Building screens quickly against a precise spec, and walking through six investor personas (`docs/PERSONAS.md`) to find what was missing.
- Running the QA I'd otherwise do by hand: deep links into every screen, light and dark, the largest text size, airplane mode, and a 600-purchase stress test with frame timings.
- A visual pass from a drawn target: Claude in claude.ai drew the redesign, Claude Code built it phase by phase, and I compared each phase on the emulator before accepting it.

## What needed correction

From the research reports: the purchase-NAV rule (below); libraries that don't run in Expo Go (`react-native-charts-wrapper`, MMKV); claims attributed to Groww that were Shopify's; an SDK 54 baseline.

Six examples from the build (the rest are in `docs/BUILD_LOG.md`):

1. **Search was assumed to match parts of words.** On my phone "par" found nothing. Claude Code checked the live API (`par` → 0, `parag` → 15) instead of guessing, and changed the copy rather than downloading all ~40,000 schemes.
2. **Money done in its head.** Its test notes said "Invested ≈ ₹9,390.80"; the exact figure is ₹9,390.91. The app was right because the figure comes from BigInt maths in `valueLot`. Rule since: expected money comes from the domain functions or the tests, never hand arithmetic.
3. **A skipped check.** A small fix was committed after only the type check. Rule since: `npm run check` before every commit.
4. **A fresh clone wouldn't install.** The lockfile carried `react-dom@19.3.0`, which needs React 19.3, while SDK 57 pins 19.2.3, so a reviewer's first `npm install` would have failed. Fixed with an `overrides` pin and verified with `npm ci` in an empty directory.
5. **Security reviews caught two leaks.** Scheme names from the API went straight into CSV cells (formula injection), and a "SIP ₹5,000" label showed money with amounts hidden. Both fixed, the first with tests.
6. **Invested didn't match the statement.** SIP instalments showed ₹4,999.99 because invested was units × NAV. Statements count the rupees paid, so purchases now store the amount (optional, backward-compatible).

How I caught them: most came from using the app on my phone after each phase. "par" finding nothing made me ask whether search really matched parts of words. The ₹4,999.99 SIP instalment made me ask how real apps count the amount invested, which led to storing what was paid. I also noticed a fund page with no back arrow, an empty tag line on a watchlist row (a scheme whose name has no plan or option), and rows that didn't line up. When I asked whether the to-do list held anything Claude had found itself, it admitted it was mostly my own asks, and only then ran its own audit. The ones that mattered most to me were the money ones: an invested figure that doesn't match the statement, or a rupee value worked out in someone's head, is exactly what a user would stop trusting the app over.

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

A second example: the build plan assumed mfapi.in's search matched parts of words, so the screen promised results after three characters. On my phone "par" returned nothing while "parag" returned 15. Instead of accepting a workaround (downloading all ~40,000 schemes and searching locally), I had Claude Code test the live API and change the copy to say search matches whole words, and lower the minimum to two characters once it found "jm" returns JM Financial's schemes. The constraint is the API's; the app now tells the user about it instead of hiding it.

## With more time

Import from a CAS statement; Maestro end-to-end tests and more screen tests; a development build with app-switcher privacy tied to the hide-amounts toggle; multiple portfolios (for example, one per family member).
