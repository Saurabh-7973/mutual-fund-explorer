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

**Phone test (user, 10 Oct 2026):** Phase 4 passes.

- **For `AI_CONTEXT.md` (carry over):** my Phase 4 test notes gave hand-computed expected values for 125.432 units bought 31 Mar 2024: "Invested ≈ ₹9,390.80, Value ≈ ₹11,154.05". Both were wrong, by 11 and 9 paise. The exact figures are 125.432 × 74.8685 = 9,390.905692 → **₹9,390.91**, and 125.432 × 88.9258 = 11,154.1409456 → **₹11,154.14**, gain **+₹1,763.24 (+18.78%)**. The app showed the right values: they come from BigInt maths in `valueLot`, and these exact figures are asserted in `src/domain/__tests__/valuation.test.ts`. The agent got money wrong doing arithmetic in its head; the exact domain code and its tests got it right, which is why the money code was built and tested first. Rule from now on: expected money values in test notes come from the domain functions or the tests, never from hand arithmetic.

---

## Phase 5: Watchlist (10 Oct 2026, Claude Code)

**Built:** `src/app/(tabs)/watchlist.tsx` and `src/components/watchlist/WatchRow.tsx` (memoised, fixed 76 pt, own `useLatestNav` per row).

**Decisions**
- Each row has four states at the same height: skeleton while loading, "Couldn't load NAV" + Retry (refetches only that row; also covers a fetch paused offline with nothing saved), "No NAV published", or NAV + "as of" date + a "Stale" badge after 7 days.
- Remove → `unwatch` returns `{ item, index }`, kept in state for the Undo toast; Undo calls `undoUnwatch(item, index)` so the fund returns to the same position. The toast remounts per removal (`key` = scheme code), so removing two plans that share a title still restarts the 5-second timer. The list gets extra bottom padding while the toast shows, so it never covers the last row. Removing the last fund shows the empty state with the toast still available.
- The header copy and offline banner sit above the `FlatList`, not in `ListHeaderComponent`, so `getItemLayout` offsets are exact. The same mistake existed in Explore (the "Open scheme code" row is a list header of row height); its `getItemLayout` now adds one row of offset when that row shows.
- Pull to refresh: `refetchQueries({ queryKey: ['nav-latest'], type: 'active' })`, plus `useRefreshOnFocus('nav-latest')` for returning to the tab. Plain React Native `FlatList` and `RefreshControl` here (no chart, so no Gesture Handler scroll view).
- Empty-state chips navigate to Explore with `q`, which Explore copies into the search field.

**Pre-built code changed:** none.

**Checks:** `npm run check`: typecheck 0 errors; 16 suites, 146 tests passed. `npx expo export --platform android`: clean. Rule greps: nothing found.

**Phone test feedback (user, 10 Oct 2026)**
- The "Stale" badge was a third stacked line in the row's right column; in a 76 pt row it crowded the bottom edge and read as if it belonged to the next row (it looked like only the last row had it). It now sits on the same line as "as of <date>", so every row is two lines on the right. Fixed.
- Row alignment and general polish: user wants to revisit later (Phase 7).
- Step 7 (offline after relaunch) not checked: the emulator misbehaved. Still open.

**Emulator check of step 7 (Claude Code, 10 Oct 2026)**
- The user's emulator showed Expo Go's "Something went wrong" after relaunching in airplane mode. Error log: `java.io.IOException: Failed to download remote update`. Not an app bug: in development, Expo Go downloads the app's JavaScript from Metro on the Mac at every cold start, and airplane mode cuts that link too. A release build carries its bundle and wouldn't hit this.
- Way to test offline cold starts in Expo Go: `adb reverse tcp:8081 tcp:8081`, then open `exp://127.0.0.1:8081`. The bundle comes over the adb tunnel, which airplane mode doesn't cut, while mfapi.in stays unreachable (`ping: unknown host api.mfapi.in`). Note that Expo Go keeps AsyncStorage per project URL, so data saved under the LAN URL isn't visible under `127.0.0.1`; set up test data under the same URL.
- Results, driven with adb on the emulator: starred 122639, 100121 and 152469 online. Airplane mode on, force-stopped Expo Go, relaunched → Watchlist showed all three with saved NAVs and dates, "Offline: showing saved NAVs", and 100121's "Stale" badge on the same line as "as of 01 Jun 2018". **Step 7 passes.** Remove then Undo restored the fund to its position (step 4). A first Undo attempt arrived after the 5-second timer and correctly did nothing.

**User feedback:** the Stale badge should follow the date, not precede it. Now "as of 01 Jun 2018 [Stale]" (`2fdd449`).

---

## Phase 6: Holdings (10 Oct 2026, Claude Code)

**Built:** `src/app/(tabs)/holdings.tsx` and `src/components/holdings/LotRow.tsx` (memoised, fixed 132 pt). New pure rule `sortLots` in `src/domain/holdings.ts` (fund title, then plan/option, then purchase date), with 2 tests, rather than sorting in the screen.

**Decisions**
- One `useQueries` over the unique scheme codes (`latestNavQuery`), kept in a `Map`. Per lot: no applied NAV → pending; no latest data → unavailable (the row shows skeletons on first load, otherwise "Couldn't load latest NAV" + Retry for that scheme only); else `evaluateLot`. `summarize` gives the totals. While any lot's NAV is on its first load the summary shows skeleton figures, never partial totals.
- The summary card is the list header, so its measured height (`onLayout`) is added to `getItemLayout` offsets; `extraData` carries the row states so rows update when NAVs arrive although the lots array doesn't change.
- The remove button's label names the lot ("Remove holding: <title>, bought <date>") rather than the plan's bare "Remove holding", so a screen reader can tell lots apart. Confirmation uses `Alert.alert` with the plan's copy.
- Holdings has no offline banner (the plan doesn't ask for one); values simply use the saved NAVs with their "as of" date.

**Pre-built code changed:** none (new file `src/domain/holdings.ts`).

**Checks:** `npm run check`: typecheck 0 errors; 17 suites, 148 tests passed. `npx expo export --platform android`: clean. Rule greps: nothing found.

**Emulator test (Claude Code, adb-driven, Phases 4 and 6)**
- Add holding, units messages after leaving the field: `0` and `-1` → "Units must be greater than zero."; `1.23456` → "at most 4 decimal places"; `1,000` → "without commas"; `abc` and `.` → "Enter a number such as 125.432." All correct. Observation: closing the keyboard with Android's back button doesn't blur the field, so the message appears only on tapping elsewhere or Save (per the plan's "once touched" rule).
- Dates for 122639: Sat 3 Oct and Fri 2 Oct 2026 → "No NAV on that day, so the next one applies: 05 Oct 2026", priced ₹88.7620. Today (10 Oct) → "Awaiting NAV". 31 Mar 2024 → "Priced at the NAV of 31 Mar 2024", ₹74.8685.
- Preview for 125.432 units on 31 Mar 2024, as rendered by the app: Invested ₹9,390.91, Value as of 09 Oct 2026 ₹11,154.14, Gain +₹1,763.24, +18.78% (matching `valuation.test.ts`).
- Holdings with that lot plus 10 units dated today: totals ₹11,154.14 / ₹9,390.91 / +₹1,763.24 +18.78%, "as of 09 Oct 2026", "1 awaiting NAV isn't included in these totals." The valued row shows +7.05% p.a. (held over a year); the pending row shows "Awaiting NAV for 10 Oct 2026".
- Remove → dialog "Remove holding? 10 units of Parag Parikh Flexi Cap Fund, bought 10 Oct 2026. This can't be undone." → Remove deleted the lot and the note.
- Airplane mode, force-stop, relaunch (adb-tunnelled Metro): the remaining lot is still valued from the saved NAV with the same figures.
- Not checked: the "Couldn't load latest NAV" row state (needs a fund whose NAV was never cached, offline).

---

## Phase 7: Hardening pass (10 Oct 2026, Claude Code, emulator via adb)

Every item was driven on the Android emulator (Expo Go, SDK 57) with adb: deep links (`exp://127.0.0.1:8081/--/<route>`), `uiautomator dump` for text and accessibility labels, screenshots, airplane mode, `cmd uimode night`, and `settings put system font_scale`.

**Checked and passing**
- States: 152469 (launched Feb 2024) shows 3Y and 5Y chips disabled and "—" for 3Y/5Y returns; 99999999 → "No NAV data for this scheme"; `fund/abc` → "That link doesn't point to a scheme" + Go to Explore; 100121 → stale banner (01 Jun 2018).
- Reconnect: airplane mode on, opened an uncached fund (118989) → "You're offline" + Retry; airplane mode off → the fund loaded about 4 s later with no tap (NetInfo → `onlineManager`).
- Persistence and offline: watchlist and holdings survive a force-stop and relaunch in airplane mode, valued from saved NAVs (Phases 5 and 6).
- Formatting: a lot of 1,254.3219 units bought at the 27 Oct 2025 high (₹95.7732) shows −₹8,588.84, −7.15% with the true minus sign; totals ₹1,22,695.72 / ₹1,29,521.33 / −₹6,825.61 −5.27% with Indian grouping; no p.a. figure under a year (347 days). Figures as rendered by the app.
- Accessibility tree: gains and losses read "gain of ₹1,763.24", "loss of 7.15%"; chips and the star expose `selected`; the chart reads "NAV down 4.55% from ₹93.1663 on 09 Oct 2025 to ₹88.9258 on 09 Oct 2026"; returns read "1 month: down 0.52% absolute"; every icon button has a label.
- Dark mode: all screens readable, no hard-coded colours (grep clean).
- Performance: HDFC Flexi Cap Regular Growth (101762), 5,052 NAVs. Eight fast flings: no blank rows in any frame. `dumpsys gfxinfo` over ten flings: median frame 17 ms, 95th percentile 30 ms, 9% janky. That's a debug JS bundle on an emulator; a release build on a phone should do better.
- Console: no JavaScript warnings or errors in the device log for the whole session. Metro's terminal output wasn't visible to me.

**Found and fixed**
1. At the largest font size (2.0), Holdings rows overflowed their fixed height: `SignedAmount`/`SignedPercent` ignored the 1.3 font cap, and the stacked layout outgrew the row, clipping the title. The signed components now accept `maxFontSizeMultiplier`; `LotRow` is four left | right lines (title | value, badges | gain, units · date | return · p.a., NAV used | as-of date) at 148 pt. At 2.0 it fits; only the units line truncates with an ellipsis when a p.a. figure shares its line.
2. NAV list: the 96 pt date column wrapped "30 Sep / 2026" at 1.3× and clipped it. Now 116 pt, one line.
3. Returns card: "—not enough history" had no space; added the row gap.
4. Watchlist alignment (user's earlier note): rows with no plan/option badges (e.g. Dynamic Asset Allocation) had their title vertically centred while others sat on the first line. `WatchRow` is now two left | right lines (title | NAV, badges | as-of date + Stale), with a minimum height for the second line, so all rows line up.
5. The holding row's "p.a." now reads "+7.05% per year" to a screen reader instead of "· +7.05% p.a.".

**Not verified on the emulator (and why)**
- Timeout copy under a slow network: the emulator's `network delay`/`speed` settings had no effect on the API 36 image's Wi-Fi (a search still returned normally). The 15 s/20 s timeout and its "taking too long" copy are covered by `client.test.ts` and `errors.test.ts`.
- Foreground refetch after minutes in the background: latest NAVs are fresh for 15 minutes, so this needs a long wait; not run.
- "Awaiting NAV" lots resolving: needs tomorrow's NAV to be published.
- Holdings "Couldn't load latest NAV" row: needs a fund whose latest NAV was never cached, opened offline.
- TalkBack speech itself: labels verified through the accessibility tree, not by listening.
- Typing speed vs requests: the 300 ms debounce is in `useDebouncedValue`; requests weren't counted.

**Checks:** `npm run check`: typecheck 0 errors; 17 suites, 148 tests passed. `npx expo export --platform android`: clean. Rule greps: nothing found.

---

## Phase 8: Tests, docs, final verification (10 Oct 2026, Claude Code)

**Store test:** `src/store/__tests__/portfolioStore.test.ts`, 4 tests against the real persisted store with the AsyncStorage Jest mock: `unwatch` returns `{ item, index }` and `undoUnwatch` restores the order (and `unwatch` of an unknown code returns null); `addLot` then `removeLot`; storage holds JSON under `mfx.portfolio` with `version: 1` and only `watchlist` and `lots` (no `hydrated`); corrupt saved JSON (a lot with units "abc") is dropped on `persist.rehydrate()` and `hydrated` becomes true.

**Docs**
- `README.md`: test count, project structure (new `signed` and `holdings` domain files), and a troubleshooting entry for Expo Go's "Failed to download remote update" in airplane mode (with the `adb reverse` workaround). No screenshots section was filled: none were provided.
- `docs/ARCHITECTURE.md`: test count and what the tests cover; fixed row heights and the 1.3× font cap; list headers in `getItemLayout`; Gesture Handler's `RefreshControl`; the edge-to-edge keyboard; how UI was verified (phone plus adb-driven emulator) and how to test offline cold starts in Expo Go.
- `AI_CONTEXT.md`: filled from this log. Added how the agent was directed during the build, where AI helped, the list of Claude Code's mistakes and corrections from phases 0–8 (including the three "carry over" items: inline `#` comments in zsh, whole-word search, hand-computed money), and two decisions. The five **[YOU]** markers are left for the user's own words; nothing was invented.

**Final verification**
- `npm run check`: typecheck 0 errors; 18 suites, 152 tests passed.
- `npx expo export --platform android`: clean.
- `npx expo-doctor`: 21/21 checks passed. `npx expo install --check`: dependencies up to date.
- Rule greps on `src/app` and `src/components`: nothing found. `src/app` holds route files only.
- The Phase 7 list was run on the emulator in Phase 7 (results above). **Still open:** one full pass on the user's real phone in Expo Go, and the items Phase 7 couldn't verify on the emulator.

---

## Product and UX pass (10–11 Oct 2026, Claude Code)

The user asked for the best UI/UX possible, with every component decided by the data it shows and by how live MF apps present it, plus something of our own. Decisions are in `docs/DESIGN.md`.

**Research**
- Web: Groww's fund page leads with "3Y annualised" plus the 1D move, has an Annualised/Absolute toggle and a SIP/one-time calculator; Groww offers Active vs Lifetime XIRR. Review sites call Kuvera dense and Coin minimal; no reliable source covered watchlist UX.
- On the user's phone, read-only, with the user's permission and amounts hidden by Groww's eye toggle: Groww MF Explore, Dashboard, Watchlist and a fund page. Learned: a key/value summary (1D returns, Total returns, Invested, XIRR), dots for hidden amounts with percentages kept, two-line fund rows with one switchable value column, a fund page that collapses everything below the key facts, and a sticky primary action. No buy, sell or redeem control was touched; an action sheet opened by a row tap was dismissed.
- Not studied: Motilal (no way to hide the user's real amounts).

**Built (all logic in `src/domain` with tests)**
- `fetchNavRange` (date-window history), `recentNavQuery` and `dayChange`: today's change on watchlist rows, recently viewed and the holdings summary, from two weeks of NAVs plus `/latest`.
- `xirrPercent` (bisection, tested against CAGR and a known NPV), `holdingsByFund`, `annualisedReturn` (XIRR only once a year old), `allocation`, `portfolioDayGain`, `headlineReturn`.
- `replayInvestment` (SIP and one-time, real NAVs, the purchase rule, units to 4 decimals) and `rollingReturns`.
- `usePreferencesStore` (eye toggle and recently viewed, validated on load, kept apart from the portfolio).
- Components: `SwipeRow` (Gesture Handler pan with React Native `Animated`, since the library's `Swipeable` is deprecated in favour of a Reanimated one), `Section` (collapsible with a takeaway), `PrivateAmount`, `FundHero`, `KeyFacts`, `ReturnsBars`, `InvestReplay`, `Consistency`, `AllocationBar`, `FundHoldingRow`, `RecentFundRow`; the palette changed to the "patient money" tokens.

**Checks:** `npm run check` before every commit: 18 → 21 suites, 152 → 178 tests. Android export clean. Each screen checked on the emulator (light and dark), and the fund page on the user's phone over `adb reverse` (Wi-Fi to Metro was failing on the phone: "Cannot connect to Expo CLI").

**Open:** `src/components/fund/LatestNavCard.tsx` is no longer used (the hero and key facts replaced it). Not deleted: CLAUDE.md asks for approval before deleting files.

### UX pass, round 2 (11 Oct 2026)

- **Header and tab bar** (user: "the bottom and the header look the worst"): both were React Navigation defaults, a white bar with a shadow on the tinted page. Tabs now draw a large title on the page (`ScreenHeader`), stacked screens use a page-coloured header with no shadow, and the tab bar uses the surface colour, a soft pill behind the active icon, and the bottom inset (the first try fixed its height and the labels collided with the gesture bar on edge-to-edge Android).
- **Design patterns:** a holding card with a header over a strip of cells, a quick-sort row, and a holding history timeline. Applied as the three-cell strip and purchase timeline in "Your investment" (`purchaseTimeline`, tested) and a sort arrow on Holdings (`sortHoldings`, tested).
- **Asset allocation by asset class** (`assetClassOf`, `allocationByAssetClass`, tested against real AMFI categories). A first rule read the category before the name, so "Bharat Bond ETF FOF" under "Other Scheme - Index Funds" counted as equity; the name is now read first for those. Chart colours come from the dataviz skill's reference palette and passed its validator on our light and dark card surfaces (light: contrast warning, covered by printed labels).
- **Periods:** 3M and 10Y added to trailing returns and 3M to the chart (user asked for 1M/3M/6M; domain change made on that request, tests updated).
- **Consistency:** `SegmentedRow` replaces bordered chip rows on the fund page; a `labelStrong` type token replaces six inline `fontWeight: '600'` overrides; header and tab labels read their sizes from tokens.
- Also: an empty watchlist offers recently viewed funds to star in one tap.
- Checks: `npm run check` 22 suites, 184 tests; Android export clean; rule greps clean. Unused after this pass and awaiting approval to delete: `src/components/fund/LatestNavCard.tsx`, `src/components/holdings/LotRow.tsx`.

### Persona-driven pass (11 Oct 2026)

- `docs/PERSONAS.md`: six investors, beginner to expert, and what each found.
- Riya (beginner): glossary behind an ⓘ wherever a term appears (`src/domain/glossary.ts`, `Term`, `InfoSheet`).
- Arjun (SIP investor): "Monthly SIP" mode in Add holding adds every instalment up to today in one go (`planSip`, `validateSipAmount`, tested). Checked on the emulator: ₹5,000 from 10 Jan 2022 in HDFC Mid Cap → 57 instalments, XIRR +15.67%; 10 Oct 2026 left out with a note (NAV not yet published). The preview shows the amount actually paid (₹2,85,000), because units rounded to 4 decimals × NAV came to ₹2,84,999.97.
- Open: the SIP preview's gain is a subtraction in the component (`current − paid`); move it into `src/domain/sip.ts`. Not yet done: Meena's/Vikram's maximum drawdown (glossary entry exists), and a device pass of this round. Unused files awaiting approval to delete: `LatestNavCard.tsx`, `LotRow.tsx`.
- Follow-ups done: fund-page back button (a `headerTitle` returning `null` also hid the back button; it now returns an empty view); the app's own `CalendarSheet` replaces the system date dialog (`accentColor` is iOS-only, so Android drew Expo Go's colours; calendar maths in `src/domain/calendar.ts`); `sipGain` moved the SIP preview's gain into the domain; `maxDrawdown` and `formatDuration` add the worst fall; long SIP timelines collapse to the latest 4 purchases. Checks: 25 suites, 199 tests.
