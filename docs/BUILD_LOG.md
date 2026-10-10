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

### Phase 0: verify the starter (10 Oct 2026, Claude Code)

**Results**
- Node `v24.13.1` (inside the supported `^24.3.0` range). `npm install`: 831 packages added, no errors. npm audit reports 64 advisories (15 moderate, 49 high) in transitive dev/build tooling; left alone, since `npm audit fix --force` would move packages off the SDK 57 versions.
- `npx expo install --check`: "Dependencies are up to date". No `--fix` needed.
- `npx expo-doctor` (1.20.4): 21/21 checks passed, no issues.
- `npm run typecheck`: 0 errors.
- `npm test` (jest-expo): 15 suites, 140 tests passed. The jest preset warning did not appear, so `@react-native/jest-preset` was not added.
- Extra check: `npx expo export --platform android` bundled cleanly (one 4.1 MB Hermes bundle), so Metro resolves every import.

**Fixes:** none. No pre-built file changed. The only new file is `package-lock.json` from the first real install; it is committed so installs are reproducible.

**API checks**

1. History with a date range:
   ```
   $ curl -s 'https://api.mfapi.in/mf/122639?startDate=2026-09-01&endDate=2026-09-30' | head -c 400
   {"meta":{"fund_house":"PPFAS Mutual Fund","scheme_type":"Open Ended Schemes","scheme_category":"Equity Scheme - Flexi Cap Fund","scheme_code":122639,"scheme_name":"Parag Parikh Flexi Cap Fund - Direct Plan - Growth","isin_growth":"INF879O01027","isin_div_reinvestment":null},"data":[{"date":"30-09-2026","nav":"88.83550"},{"date":"29-09-2026","nav":"88.71880"},{"date":"28-09-2026","nav":"88.97700"},
   ```
   Follow-up count: the ranged call returned 21 rows, 30-09-2026 down to 01-09-2026; the unranged call returned 3,289 rows, 09-10-2026 down to 28-05-2013. **Answer: the endpoint honours date ranges.** The app still fetches full history and doesn't depend on this.

2. Search result count:
   ```
   $ curl -s 'https://api.mfapi.in/mf/search?q=nifty%2050%20index' | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
   15
   ```
   Broad queries also return exactly 15 (`parag parikh` 15, `hdfc` 15, `fund` 15). **Answer: search caps results at 15.** Phase 2 shows the "Showing the first 15 matches" footer.

**Expo Go (step 7):** done. The user ran `npx expo start`, opened the app in Expo Go (SDK 57) on their phone and saw the Explore, Watchlist and Holdings tabs with their placeholders.

**Clean-up after Phase 0**
- The first setup attempt ran from `~/Documents`, where the ZIP wasn't; unzip failed but `git init` still ran, leaving a stray, commit-less repo at `~/Documents/.git`. The user deleted it. The project's own repo was never affected.
- Shell blocks in `README.md`, `CLAUDE.md` and `docs/RUNBOOK.md` no longer carry inline `#` comments, because zsh (the default macOS shell) doesn't treat `#` as a comment when pasted interactively. Commands with notes became tables; the runbook's setup steps became one `&&` chain so nothing runs in the wrong folder if a step fails.
- **For `AI_CONTEXT.md` (carry over):** an AI-written setup guide put inline `#` comments in shell blocks meant for pasting. In an interactive zsh session `#` isn't a comment (`interactivecomments` is off), so the comment text became arguments, and the guide's separate lines let `git init` run in the wrong folder after `unzip` failed. Lesson: give pasteable commands with no inline comments, and chain dependent steps with `&&`.

---

## Phase 1: UI kit (10 Oct 2026, Claude Code)

**Built:** `src/components/ui/` `AppText`, `Card`, `Badge`, `Chip`, `Button`, `IconButton`, `Skeleton` + `SkeletonRows`, `EmptyState`, `ErrorState`, `Banner`, `SignedAmount`, `SignedPercent`, `UndoToast`, and `icons.ts` (the shared `IoniconName` type). `src/components/search/` `SchemeBadges`, `WatchToggle`.

**Decisions**
- The gain/loss/no-change rule for signed values became a pure function, `src/domain/signed.ts` (`changeDirection`, `spokenChange`), with 3 tests, instead of living in the components. It judges the sign on the value already rounded for display (paise for amounts), so a sub-paisa amount is "no change", never a green "+₹0.00".
- `UndoToast` uses the surface colour with a border and Android elevation. A dark bar (text colour) would have put the primary-coloured Undo button on near-black in light mode, which fails contrast; an iOS shadow would need a hard-coded colour. It applies only the side safe-area insets: inside a tab screen the content already ends above the tab bar, so adding the bottom inset would float it too high.
- `Chip` is 36 pt high with vertical `hitSlop` to reach 44. `IconButton` computes its `hitSlop` from the icon size so the target is at least 44 × 44.
- `Skeleton` follows the reduce-motion setting live (`reduceMotionChanged`), not only at mount.
- `WatchToggle` selects a boolean (`watchlist.some(...)`), so it needs no `useShallow` and re-renders only when its own state flips.

**Pre-built code changed:** none.

**Checks:** `npm run check`: typecheck 0 errors; 16 suites, 143 tests passed. Nothing is routed yet, so no device test.

---

## Phase 2: Explore (10 Oct 2026, Claude Code)

**Built:** `src/app/(tabs)/index.tsx` (search screen) and `src/components/search/SchemeRow.tsx` (memoised, fixed 76 pt, star beside the pressable area).

**Decisions**
- Added `SEARCH_RESULT_CAP = 15` and `mayBeTruncated(count)` to `src/domain/search.ts` (with a test) from the Phase 0 finding, rather than a magic 15 in the screen. Additive only; no existing function changed.
- Offline: TanStack Query pauses a new search instead of failing it, so `isLoading` and `isError` are both false. The screen treats a paused fetch with no data as the error state (`describeError` gives the offline copy, with Retry). With `keepPreviousData`, a paused search would otherwise show the old results dimmed under "Searching…" forever, so placeholder data from a paused fetch is dropped too.
- The "Type at least 3 characters" hint shows only for 1–2 typed characters, not during the 300 ms debounce after typing a longer query.
- Scheme title in rows uses the `label` size (semi-bold) so two lines plus the badge row fit 76 pt at the 1.3× font cap.
- The "Open scheme code" row appears above the skeleton, error, and results; when it shows, an empty result list shows nothing else.

**Pre-built code changed:** `src/domain/search.ts` (additions above).

**Checks:** `npm run check`: typecheck 0 errors; 16 suites, 144 tests passed. `npx expo export --platform android`: bundled cleanly.

**Phone test feedback (user, 10 Oct 2026) and fixes**
- "par" showed "No schemes match". Cause: mfapi.in search matches whole words, not prefixes (checked live: `par` 0, `para` 0, `parik` 0, `hdf` 0; `parag` 15, `flexi` 15, `hdfc` 15). Not fixable on the client without downloading the full scheme list, so the copy now says so: the hint reads "Type at least 3 characters. Search matches whole words." and the empty state says "Search matches whole words, so type “parag”, not “par”…".
- The empty and error states sat at the top of the body; they are now centred vertically.
- "parag parikh" with both filters leaves **4** plans, not the 3 the build plan expected: Flexi Cap, Liquid, ELSS Tax Saver and Conservative Hybrid (Direct Growth). The plan's figure predates the current data; the filter is correct.
- Offline, a search typed earlier still shows results under the offline banner. Expected: search results stay in memory for a day (`staleTime`), so only a new, uncached query shows the offline error.
- "Searching…" dimming not observed by the user (hard to catch by hand on a fast connection); left as is.
- Second round: filters stayed on after clearing the search and resurfaced on the next search. They now reset whenever the field is emptied (clear button or backspace).
- Second round: the empty state still looked low. Cause: SDK 57 Android is edge-to-edge, so the keyboard draws over the screen instead of resizing it, and the "centred" block was centred partly behind the keyboard. New hook `src/hooks/useKeyboardOverlap.ts` measures how much of the view the keyboard covers (`measureInWindow` against the keyboard's `screenY`) and pads it out, so the empty and error states centre in the visible area.

### Before Phase 3: whole-word search follow-ups (10 Oct 2026, Claude Code)

- The user confirmed both Phase 2 fixes on the phone (filters reset on clear; empty state centred above the keyboard).
- `mfx-CLAUDE.md` and `mfx-RUNBOOK.md` were already gone: they had been moved over `CLAUDE.md` and `docs/RUNBOOK.md` in `edacb1f`. `git status` was clean.
- Corrected the wrong "substring match" claim. The `MIN_QUERY_LENGTH` comment in `src/domain/search.ts` now describes whole-word matching; `docs/ARCHITECTURE.md` lists it with the other API quirks, along with the 15-result cap and date-range support from Phase 0; the README's known limitations say it too.
- **Domain rule changed (user-approved): `MIN_QUERY_LENGTH` 3 → 2.** With whole-word matching, a two-letter fund house couldn't be searched at all. Checked live: `q=jm` returns 15 (JM Financial schemes), `q=ab` 9 (Birla "Series AB" plans), `q=a` 0. Test updated (`j` no, `JM` yes); the screen's hint now reads the constant.
- Process correction: commit `178ca49` ran only the type check, not the tests, "to save resources". From now on `npm run check` runs before every commit, including small fixes; it takes seconds.
- Checks: `npm run check`: typecheck 0 errors; 16 suites, 144 tests passed.

---

## Phase 3: Fund screen and NAV history list (10 Oct 2026, Claude Code)

**Built**
- `src/app/fund/[code]/index.tsx`: title block, latest NAV card (change since the previous NAV, stale banner, skipped-rows note, "Add a holding"), range chips + `NavChart`, trailing returns, this fund's holdings, the 5 most recent NAVs with "See all <n> NAVs", and the source note. Gesture Handler `ScrollView` with pull to refresh (history and latest together). Star in the header.
- `src/app/fund/[code]/navs.tsx`: title, "<n> NAVs from … to …", a fixed Date | NAV | Change header outside the list, then a `FlatList` of NAV and gap rows at one fixed height (48), `getItemLayout`, 25-item batches, `windowSize` 11, clipped subviews on Android.
- `src/components/fund/`: `FundGate` (loading, not found, error/offline, no NAV; shared by both screens instead of copy-pasting), `InvalidSchemeLink`, `fundDisplayName`, `FundTitle`, `LatestNavCard`, `ReturnsCard`, `FundLots`, `NavRows` (`NavRowView`, `GapRowView`, `NavHeaderRow`; the fund screen's recent NAVs reuse the list's row).

**Decisions**
- Added `defaultChartRange(points)` and `chartRangeLabel(range, points)` to `src/domain/nav.ts` with 2 tests, rather than writing the "1Y if covered, else All" rule and the label words in the screen. Additive only.
- The screen parses the code first and renders a separate inner component only for a valid code, so `useFundSeries` is never called with a bad code and no hook runs conditionally.
- `FundGate` treats "no data and not loading" as the error state, which covers a history fetch paused offline (same lesson as Explore in Phase 2).
- Screen-reader labels: the NAV change reads "NAV up ₹0.43, 0.49%, since …"; each return row reads "1 year: up 12.34% per year" (or "absolute"); each NAV row reads date, NAV and direction. Colour is never the only signal.

**Pre-built code changed:** `src/domain/nav.ts` (additions above).

**Checks:** `npm run check`: typecheck 0 errors; 16 suites, 146 tests passed. `npx expo export --platform android`: bundled cleanly. Rule greps (`parseFloat|toFixed(|Intl.NumberFormat|new Date('` and hex colours in `src/app` and `src/components`): nothing found.

**Phone test feedback (user, 10 Oct 2026) and fixes**
- Everything else in the Phase 3 list worked. Pull to refresh on the fund screen misbehaved. Cause: the screen used Gesture Handler's `ScrollView` (needed for chart scrubbing) with React Native's `RefreshControl`. Gesture Handler's `ScrollView` clones its refresh control with a gesture ref and waits on it (`waitFor`); only Gesture Handler's own `RefreshControl` is a gesture handler, so the pull never resolved properly on Android. Fix: import `RefreshControl` from `react-native-gesture-handler` too (confirmed in `GestureComponents.tsx`).
- The user asked why the header is unused. The plan put the long name in the content and left the header title empty, which left an empty bar. Now the header stays empty while the title block is visible and shows the short fund title (from `describeScheme`) once it scrolls out of view, so the bar always says which fund you're in. The star stays at the right.
- Checks: `npm run check` 146 passed; Android export clean.

---

## Phase 4: Add holding (10 Oct 2026, Claude Code)

**Built:** `src/app/add-holding.tsx` (modal). Units field with live validation (`validateUnits`, shown once touched or after Save), purchase date via `DateField` bounded by the earliest NAV and today in India, the pricing message from `describePurchaseDate`, the cut-off note, a preview card (matched: priced-at NAV with its date, invested, value as of the latest NAV, gain as `SignedAmount` + `SignedPercent`; pending: the "Awaiting NAV" note), and Save.

**Decisions**
- Pricing uses `resolvePurchaseNavWithLatest(history.data.points, latest.data?.point ?? null, purchaseDate, today)`: raw history and /latest kept separate, as CLAUDE.md requires. The preview values against `lastPoint` of the merged series, which is the freshest NAV on screen.
- If the history fails or is paused offline, a compact `ErrorState` with Retry shows under the date field, the date field stays disabled, and Save can't succeed (no resolution).
- After a Save attempt with errors, Save is disabled until the form becomes valid, so repeated taps don't do anything confusing.
- Reused `fundDisplayName` from `FundGate` for the name fallback chain.
- Live data for the phone test (122639): no NAV on Fri 2 Oct 2026 (Gandhi Jayanti) or Sat 3 Oct; Mon 5 Oct 88.76200; Sun 31 Mar 2024 74.86850 (a real Sunday NAV); latest 9 Oct 88.92580, nothing yet for 10 Oct.

**Pre-built code changed:** none.

**Checks:** `npm run check`: typecheck 0 errors; 16 suites, 146 tests passed. `npx expo export --platform android`: clean. Rule greps: nothing found.
