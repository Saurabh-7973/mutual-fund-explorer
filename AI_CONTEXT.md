# AI_CONTEXT

> **Draft.** Sections marked **[YOU]** need your own words before submission. Everything else is taken from `docs/BUILD_LOG.md`; keep only what really happened, and add Claude Code's corrections from phases 0–8.

## AI tools used

- **Claude (claude.ai):** research and fact-checking, then writing and testing the domain core (dates, money, NAV rules, the API client, the store's rules).
- **Claude Code:** building the screens from a phased plan (`docs/BUILD_PROMPT.md`), with project rules in `CLAUDE.md`. I reviewed each phase before starting the next.
- **[YOU]** Name the tools behind the three earlier research reports I started from (for example ChatGPT or Gemini deep research).

## How I directed them

- I treated AI output as a draft to verify. Each claim the design rests on was checked against a primary source: live mfapi.in responses, SEBI and AMFI rules, and Expo SDK 57's own source and docs.
- I ordered the work by risk. The logic that's easy to get subtly wrong (dates, money, NAV rules) was written first as pure TypeScript with tests built on real API data. The UI came afterwards, generated against those tested functions.
- I wrote the rules down for the coding agent (`CLAUDE.md`): no floats for money, no `new Date('YYYY-MM-DD')`, nothing that doesn't run in Expo Go, and verified modules left alone unless a failing test proves a bug. Each phase had a gate: type-check, tests, bundle and a check on a phone.

## Where AI helped

- Mapping what the API really does: an unknown code returns HTTP 200 with empty data, history lags `/latest` by a day, a NAV exists on Sunday 31 Mar 2024, and closed schemes are still served.
- Exact-money and calendar code, with tests that use real holiday gaps from the data.
- Generating screens quickly against a precise spec.
- **[YOU]** Anything else that saved you time.

## What needed correction or redesign

From the research reports:
- The purchase-NAV rule (see the example below).
- Libraries that don't run in Expo Go: `react-native-charts-wrapper` and MMKV.
- Claims attributed to Groww that are really Shopify's (the Redux Toolkit migration and FlashList), an outdated debugging tool (Flipper), wrong example dates, and an SDK 54 baseline.

Found while building and checking the core (tests, type-checks against the real library sources, and reading the Babel preset):
- Scheme-name parsing labelled a "Dividend Yield" fund as IDCW; plan and option are now read only from the part after the fund's name.
- `10n ** x` on BigInt can be compiled to `Math.pow`, which throws; replaced.
- The compact formatter could print "₹100.00 L" instead of "₹1.00 Cr".
- Pricing a purchase from history merged with `/latest` could skip a NAV the history hadn't caught up with yet; `/latest` is now used only on an exact date match.
- APIs that changed in this SDK: datetimepicker 9's `onChange` is deprecated, `Tabs` moved to `expo-router/js-tabs`, and TypeScript 6 no longer loads global test types.

**[YOU]** Add what Claude Code got wrong in phases 0–8 (from `docs/BUILD_LOG.md`) and how you caught it.

## Key decisions and trade-offs

- **TanStack Query for server data, Zustand for user data.** Different lifecycles: the cache, retries, cancellation and per-row states come from TanStack, while two small arrays don't need Redux.
- **Exact money:** BigInt scaled integers, rounded once at display; our own Indian-format formatter instead of `Intl`.
- **Expo Go compatibility as a hard rule:** SVG chart, AsyncStorage, no Reanimated, no Skia. Reviewers can run it without a build.
- **Persist only latest NAVs** (offline watchlist), not full histories (they can exceed Android's per-entry storage limit).
- **Lots, not one holding per fund**, because real purchases happen on different dates at different NAVs.

Details are in `docs/ARCHITECTURE.md`.

## An example where I overrode the AI

All three research reports said a weekend or holiday purchase should use the **nearest previous NAV**. I checked SEBI's applicable-NAV rules. A purchase gets the NAV of the day the money is realised before the cut-off, so money that arrives on a day with no NAV can only be priced at the **next** NAV. Nearest-prior would value a Saturday purchase at Friday's NAV, a price that purchase could never have got.

The app uses the first NAV on or after the purchase date. If that NAV isn't published yet, the lot is saved as "Awaiting NAV" rather than valued with a guess. Trailing returns still use the NAV on or before each date, because they answer a different question: what the NAV was as of that day. The tests use real dates: Independence Day 2023 maps to 16 Aug, and Good Friday 2024 maps to Sunday 31 Mar 2024, a real weekend NAV.

**[YOU]** Optionally add a second example from the Claude Code phases.

## What I'd improve with more time

Portfolio XIRR across lots; import from a CAS statement; day change on watchlist rows; component tests (React Native Testing Library) and end-to-end tests (Maestro); a development build with a proper icon and splash; grouping lots by fund; and a SIP calculator.
