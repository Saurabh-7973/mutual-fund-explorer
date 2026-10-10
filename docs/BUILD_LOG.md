# Build log

One entry per phase: what was decided, what went wrong, and what was changed and why. `AI_CONTEXT.md` is written from this log, so keep it factual.

---

## Before Claude Code: research and verified starter (10 Oct 2026, Claude chat)

**Research**
- Checked the mfapi.in endpoints live: search, full history and `/latest` for 122639, an unknown code (99999999), a closed scheme (100121), 152469 and the scheme list. Found the quirks the code now handles: HTTP 200 for unknown codes, history lagging `/latest` by a day, a real Sunday NAV (31 Mar 2024), repeated NAVs on consecutive days, names without a plan or option, and unpublished rate limits.
- Fact-checked three earlier AI research reports. Rejected: "nearest prior NAV" for weekend purchases (SEBI's applicable-NAV rules point to the next NAV); `react-native-charts-wrapper` and MMKV (neither runs in Expo Go); claims about Groww that are really Shopify's (the Redux Toolkit migration and FlashList); Flipper for debugging (replaced by React Native DevTools); example dates that were wrong (15 Aug 2023 was a Tuesday); and an SDK 54 baseline (Expo Go runs SDK 57).
- Product research: Groww, Zerodha Coin and PPFAS SelfInvest pair every NAV with its date and label every return's kind. Themed stock baskets in a broking app inspired the "Start with a collection" chips, which only run searches and make no return claims. An unlabelled "upside potential" figure on those basket cards is why this app shows no projections. Kotak Neo's basket orders and SIP pause/skip controls are noted as future ideas only.

**Built and verified**
- `src/domain`, `src/api`, `src/store`, `src/query`, `src/hooks`, `src/theme`, `NavChart`, `DateField`, the root and tab layouts, and placeholder routes.
- 140 tests. The sandbox couldn't reach the npm registry, so they ran on Node's test runner through a small `@jest/globals` stand-in, and every file was type-checked with TypeScript 6.0.3 against library sources cloned from GitHub: Expo Router 57, React Native 0.86.3 types, Gesture Handler 2.32.0, react-native-svg 15.15.4, datetimepicker 9.1.0, @expo/vector-icons 15.0.2, TanStack Query 5.104.1 and Zustand 5.0.15. Deliberate-error probes confirmed those types were enforced, not silently `any`.
- **Not yet verified:** a real `npm install`, Jest under jest-expo, Metro bundling, and running on a device. Phase 0 covers these.

**Corrections made along the way**
1. `describeScheme` labelled "ICICI Prudential Dividend Yield Equity Fund - Direct Plan - Growth" as IDCW, because "Dividend" is part of the fund's name. It now reads plan and option only from the part after the first " - ".
2. Test fixtures placed inside `__tests__` would have run as an empty, failing suite. Moved to `src/api/__fixtures__`.
3. `pow10` used `10n ** BigInt(e)`. A Babel exponentiation transform would compile that to `Math.pow`, which throws on BigInt. It now builds the power from a string.
4. `formatInrCompact` could print "₹100.00 L" at the lakh-to-crore boundary. It switches to crore when rounding reaches 100 lakh.
5. Pricing a purchase from the history merged with `/latest` could skip a NAV the history hadn't caught up with yet. `resolvePurchaseNavWithLatest` uses `/latest` only when it is dated exactly on the purchase date.
6. The real React Native types rejected `fontVariant` declared `as const` (a readonly tuple). It is now typed as `TextStyle`.
7. The chart's low and high labels came from the downsampled points, which can miss the true extreme. They now come from the full range.
8. API changes in this SDK: datetimepicker 9 deprecates `onChange` (use `onValueChange` and `onDismiss`); `Tabs` moved to `expo-router/js-tabs`; TypeScript 6 no longer loads global type packages by default, so tests import from `@jest/globals`.

**Open questions for Phase 0**
- Does `/mf/{code}?startDate=&endDate=` honour date ranges? The app doesn't depend on it.
- Does search cap results at 15? Phase 2's footer depends on it.

---

## Phase 0

_(Claude Code: add entries below this line.)_
