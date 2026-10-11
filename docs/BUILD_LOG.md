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
- `mfx-CLAUDE.md` and `mfx-RUNBOOK.md` were already gone: they had been moved over `CLAUDE.md` and `docs/RUNBOOK.md` in `d271da4`. `git status` was clean.
- Corrected the wrong "substring match" claim. The `MIN_QUERY_LENGTH` comment in `src/domain/search.ts` now describes whole-word matching; `docs/ARCHITECTURE.md` lists it with the other API quirks, along with the 15-result cap and date-range support from Phase 0; the README's known limitations say it too.
- **Domain rule changed (user-approved): `MIN_QUERY_LENGTH` 3 → 2.** With whole-word matching, a two-letter fund house couldn't be searched at all. Checked live: `q=jm` returns 15 (JM Financial schemes), `q=ab` 9 (Birla "Series AB" plans), `q=a` 0. Test updated (`j` no, `JM` yes); the screen's hint now reads the constant.
- Process correction: commit `71db758` ran only the type check, not the tests, "to save resources". From now on `npm run check` runs before every commit, including small fixes; it takes seconds.
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

**User feedback:** the Stale badge should follow the date, not precede it. Now "as of 01 Jun 2018 [Stale]" (`445c33f`).

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
- Follow-ups done: fund-page back button (a `headerTitle` returning `null` also hid the back button; it now returns an empty view); the app's own `CalendarSheet` replaces the system date dialog (`accentColor` is iOS-only, so Android drew Expo Go's colours; calendar maths in `src/domain/calendar.ts`); `sipGain` moved the SIP preview's gain into the domain; `maxDrawdown` and `formatDuration` add the worst fall; long SIP timelines collapse to the latest 4 purchases. Checks: 24 suites, 199 tests.
- **Back up, restore, CSV** (all personas; data lived only on the phone): `src/store/backup.ts` (`makeBackup`, `readBackup` reusing `sanitizePortfolio`, `holdingsCsv`, tested) and a `replaceAll` store action (tested). "Your data" screen: Share backup (system share sheet), Share purchases as CSV, Restore by pasting with a confirmation that states what is replaced. Emulator: share sheet opened with the JSON; a typed backup produced "Restore 1 watched fund and 0 purchases? This replaces the 1 watched fund and 60 purchases on this phone."; cancelled. Copy-and-paste through the share sheet couldn't be driven over adb.
- **Compare** (expert): `compareGrowth`/`comparisonCovers` (tested), `CompareChart`, compare screen; entry in the fund page's Returns section.
- **Search ranking** (beginner): `rankSearchResults` (tested).
- **Large font, round 3:** returns bars and glossary labels capped at 1.3×; the holdings swipe hint moved to the screen subtitle.
- Observed once, not reproducible in 8 attempts (screen opens, font and dark-mode changes): React's "state update on a component that hasn't mounted yet", seconds after a code save; most likely Fast Refresh during navigation.
- **Security:** the background commit review flagged CSV formula injection in the purchases export (scheme names come from an outside API). Text cells starting with =, +, -, @, tab or CR now get a leading apostrophe; tested.
- **SIP continuation** (Arjun): `detectSip` and `ordinalDay` (tested; the first version broke on 31st-of-month SIPs after a clamped February, fixed by comparing consecutive months and month-end days). "Your investment" names the SIP; "Add instalments due" prefills the SIP form via route params, offered only once a NAV on or after the next date exists. The SIP form now explains an unpriceable instalment even when there is nothing to save. Emulator: HDFC Mid Cap, ₹5,000 on the 10th → "The 10 Oct 2026 instalment can be added once its NAV is published." (10 Oct was a Saturday).
- **Final verification (11 Oct 2026):** `npm run check` 26 suites, 215 tests; Android export clean; `expo-doctor` 21/21; dependencies match SDK 57; rule greps clean; `src/app` holds route files only. README screenshots in `docs/screenshots` (emulator, Expo Go's tools button turned off).

## Round: compare scrubbing (persona: Vikram)

- *"At the 2024 peak, which fund was ahead?"* The compare chart only showed end values. Now a drag (or touch and hold) reads both funds on any date, and the legend shows the exact rupees (`growthAt` in `src/domain/compare.ts`, BigInt from the two NAVs, tested against `endA`/`endB` on the last point). The legend says which date it shows ("Value on …" / "On …").
- The dashed baseline is labelled ₹10,000.
- Bug found on the way: the compare screen used React Native's `ScrollView`, so a chart gesture would have fought the page scroll. Switched to Gesture Handler's, as the fund page does. Checked on the emulator: horizontal drag scrubs, vertical swipe over the chart scrolls, release restores end values.

## Round: holding periods, large text, links (personas: Kavya, Arjun, Vikram, Meena)

- **ELSS lock-in and long-term units** (`src/domain/holdingPeriod.ts`, tested). Kavya holds ELSS: *"Which of my SIP instalments can I redeem?"* Arjun: *"If I sell now, is it short-term?"* "Your investment" now shows, only when it applies, one line: "In lock-in ⓘ 1,390.3029 of 1,766.57 units · Next unlocks 05 Nov 2026 · all free by 05 Oct 2029" for ELSS, or "Short-term ⓘ … Next turns long-term …" for equity schemes; each ELSS purchase says when its lock-in ends. Decisions:
  - Periods run from the **allotment** date (the applied NAV's date), not the order date: a Sunday order is allotted Monday.
  - Long-term = held more than 12 months, so from the day after the 12-month anniversary.
  - Only categories AMFI files as "Equity Scheme(s)" get the long-term line. Index funds and FoFs ("Other Scheme") and hybrids are taxed by rules this data can't separate, so the app says nothing rather than something wrong. No tax amounts are computed.
  - ELSS shows no short-term line: the 3-year lock-in outlasts 12 months.
  - Found on the way: mfapi.in writes both "Equity Scheme - …" and "Equity Schemes - ELSS- Tax Saver Fund"; the first regex missed the plural (caught by checking real categories with curl before the emulator run; tested).
- **Large text (Meena, font scale 2.0 on the emulator):**
  - The Invested · 1D · Units strip broke figures mid-number ("₹1,29,521.\n33"). Above 1.3× it now stacks as label/value rows.
  - Key facts: a selectable one-line value was clipped by Android ("PPFAS Mutual" with "Fund" cut). Values now wrap; plain labels are capped at 1.3× like the glossary labels beside them.
  - Tab labels ran into the gesture bar: capped at 1.3× (the bar has a fixed height).
  - Explore's placeholder is "Search funds" at large sizes (the example name was cut).
- **Links straight to a fund** (cold start) had no back arrow, because nothing was beneath the fund screen. `unstable_settings = { anchor: '(tabs)' }` in the root layout puts the tabs underneath; Back now lands on Explore. (Small change to pre-built `_layout.tsx`.)
- Process slip: running `npx prettier` without a repo config reformatted files to double quotes; the files were restored from git and edited again without a formatter.
- **Missing dividers in lists.** On the watchlist, the row under a fund had no divider while the others did. My first guess (a tall Stale pill painting over the border) was wrong: moving the divider on top changed nothing. uiautomator bounds showed the cause: at 2.625× (420 dpi) a 92 dp row is 241.5 px, so rows alternated 241/242 px and every other row started one pixel early, covering the hairline above it. All five fixed row heights (watchlist, search, recent, holdings, NAV list) are now `PixelRatio.roundToNearestPixel(…)`, which `getItemLayout` uses too. Checked: rows at 358–600, 600–842, 842–1084, every divider visible.

## Round: amount paid per purchase (approved saved-data change)

The user asked how real apps handle "invested". Answer: an account statement (CAMS/KFintech) records amount, NAV and units for each purchase, and apps count the amount as invested; units × NAV is always slightly under it (units are rounded, and 0.005% stamp duty is taken before allotment). The user approved saving the amount.

- `HoldingLot.amount?: string`: rupees, up to 2 decimals. Optional and additive, so `PORTFOLIO_VERSION` stays 1 and existing data loads unchanged (tested). A malformed amount drops only the amount, not the purchase (tested).
- `valuation.ts`: `parseAmount`, `lotInvested` (amount paid, else units × NAV, null while awaiting a NAV), and `valueLot`/`evaluateLot` take the amount. CAGR is now (current ÷ invested), which equals the NAV ratio when no amount is saved. This changes pre-built verified code, with the user's approval; all earlier valuation tests still pass unchanged.
- Everything that showed a purchase's cost now goes through `lotInvested`: the purchase timeline and average cost, `detectSip`, the CSV export. The CSV now always writes two decimals ("9391.00"); before, `toPlainString` trimmed zeros despite the comment saying two decimals.
- `planSip` puts `amount` on each instalment; the SIP form saves it. Single purchase: optional "Amount paid" with `validateAmountPaid` (tested) and `amountLooksOff` (more than 2% from units × NAV → a warning naming the units × NAV figure; tested).
- Old purchases are not back-filled. Inferring an amount from a detected SIP could be wrong for a one-off purchase of the same size.
- Checked on the emulator: 125.432 units on 09 Oct 2026 with ₹10,000 typed → warning "125.432 units × this NAV is ₹11,154.14"; ₹11,154.70 → no warning, gain −₹0.56 (the stamp-duty-sized gap real apps also show); "9,390" → save blocked with the commas message; a new ₹1,500 SIP in UTI Nifty 50 from 07 Feb 2024 → 33 instalments, fund page Invested ₹49,500.00, value and XIRR the same as the preview.


## Round: studio pass, part 1 (selectors and motion)

- Research (user's phone, with permission, view only; no orders; screenshots showing personal details deleted): Groww holdings has a sort sheet (Current value, Returns %, Day change %, XIRR %, Fund name, each High to low / Low to high), a column that cycles Current (Invested) → Returns (%) → Day change (%), and per-holding details with Long term (>1Y) / Short term (<1Y) in rupees and "Invested for N months". The PPFAS app needs a login; only its welcome screen was seen (pill buttons, bold statement type).
- `motion` tokens (150/220/320 ms) and `useReducedMotion` (system "remove animations").
- `SegmentedRow` now has one marker that slides to the choice (native-driver `Animated`), with a `track` variant (a raised thumb on a recessed track, new `raised` colour token for dark mode) for mode switches: One purchase / Monthly SIP and the allocation Asset class / Fund switch (which had its own hand-made control). The `plain` variant keeps the chart ranges light.
- Next (not done yet): Groww-style sort sheet and Day change column on Holdings; long/short-term in rupees and "Invested for"; NAV history calendar view; section open/close animation; pill buttons; alignment audit.

## Round: studio pass, part 2 (own audit of the fund page and Holdings)

The user asked whether the to-do list held anything I'd found myself; mostly it didn't. So this round started from a critical walk through our own screens. Findings and fixes (all checked on the emulator):

1. Two change lines stacked under the fund hero (day change in green, the chart's 1Y change in red) competed, and the 1Y one repeated Returns. → The chart readout is label-size and fixed-height; it reads "−₹4.2405 (−4.55%) over 1 year, absolute".
2. Low/High text sat between the chart's dates and its range picker. → High and Low are drawn on the line at their dates (exact values from the full range, placed on the downsampled line); the ranges sit right under the chart. While scrubbing, the markers step aside and the second line shows the change from the range's start.
3–5. Returns rows were two lines (figure, then "absolute"/"a year"), the zero line was fixed mid-track, and "absolute"/"a year" was said three ways. → Two groups headed by their glossary term (Absolute change; A year (CAGR)), one line per row, the zero line placed by the data (flex on the negative and positive extents), one short footnote. Half the height.
7. Timeline dots were centred on each three-line purchase block, beside the units line. → Dots sit on the date line; the spine still runs continuously.
8–9. The large tab title never scrolled away (about 200 px pinned), and its subtitle was a gesture tip. → `TopBar` + `LargeTitle` + `useCollapsingTitle` (native-driver scroll): the large title scrolls with the content and the bar fades in a small title and a hairline edge. The subtitle is status ("NAVs as of 09 Oct 2026"); the swipe tip moved to the footer.
12. Rows said "57 purchases" when the app knew it was a ₹5,000 SIP. → "SIP ₹5,000" (from `detectSip`), as Groww tags SIP holdings.
13. Sorting was tied to the shown column, with no sort by name or day change. → Groww-style sort sheet (Current value, Returns %, Day change %, XIRR %, Fund name; the direction under the chosen option, "A to Z" for names), independent of the column; a fourth column, Day change (%), with a dashed underline marking the column label as tappable. `sortHoldings` gained 'day' and 'name' (tested).
   - Found while testing: the sort control stretched over all free space, so after the column label shortened, a tap meant for it opened the sort sheet. The control now hugs its content.
14. Every bottom sheet slid its dark backdrop up with it, as one slab. → `BottomSheet`: the dim fades while the sheet glides up by its own height, both reverse on close, instant with reduced motion. The glossary sheet and the calendar use it.
15. The Watchlist opened with a permanent explainer above the funds. → Moved to the list footer with the swipe tip; Watchlist uses the collapsing title, its subtitle is the fund count.
- **Security review (background, on commit d08006f): privacy-control bypass.** The new "SIP ₹5,000" row label, and the fund page's "SIP of ₹2,000 on the 5th" banner, showed a rupee amount with amounts hidden. Both now read "SIP" while hidden (checked on the emulator: three rows read "Direct · Growth · SIP"). Rupee figures left visible on purpose: hypotheticals (Compare's ₹10,000, "If you had invested") and amounts typed into the add-holding forms.
16. Rupee holding periods and "Invested for" (from the Groww study): "Short-term ⓘ ₹1,11,541.58 of ₹1,22,695.72" (amounts private with the eye; `unitsValue`, tested), and "Invested for 2 years 6 months" under Your investment.
17. Sections opened with a jump. → `LayoutAnimation` eases the page apart; the chevron turns 180° (native driver); both off with reduced motion. The "If you had invested" mode switch joined the track variant: every selector is now either a track (mode switch) or plain (value picker).
18. **NAV history as a calendar** (user's idea, built from the purchase calendar's look). `src/domain/navCalendar.ts` (tested): business-day grid, Monday first, 5 columns unless a fund published on a weekend; each day's change from the previous published NAV (the 1st compares with the month before); month change, high, low; a 4-step intensity for the tint. `NavCalendar`: diverging gain/loss tint whose strength follows the size of the move, the percentage always printed (colour never alone), "—" for a weekday without a NAV, faded dates outside the data, tap a day for its NAV, month arrows bounded by the data. Calendar | List track at the top; List is the existing exact table. Checked light and dark: September 2026 shows the 8–9 Sep run of falls and −1.09% on the 28th at a glance.

## Round: dependencies (approved: expo-haptics; Inter typeface)

- **Fresh-clone install was broken, found while adding expo-haptics.** `npm install` and `npm ci` on a clean clone of the committed repo failed with ERESOLVE: the lockfile carried `react-dom@19.3.0` (an optional peer of `expo`, pulled in automatically), which needs `react@^19.3.0`, while SDK 57 pins `react@19.2.3`. A reviewer's first command would have failed. Fix: `"overrides": { "react-dom": "19.2.3" }` in package.json, matching React. Checked in a clean directory: `npm ci` installs 831 packages; `npm install` on a fresh clone works; `npx expo install --check` is clean and all tests pass there.
- First attempts that were rolled back: `--legacy-peer-deps` rewrote 500 lockfile lines and dropped peer packages (react-native-reanimated, @react-native/jest-preset), so it was reverted. `expo-haptics` went in with a 10-line lockfile change.
- A remaining npm *warning* (not an error): `expo-modules-core` lists `react-native-worklets` up to 0.10 while expo-router's `@expo/ui` brings 0.13. It is optional and Expo's own; left alone.
- **Inter** (user's choice): four static weights from the Inter 4.1 release with its OFL licence in `assets/fonts`, loaded with `expo-font` in the root layout (a blank themed page for the moment they register). Tokens carry `fontFamily` per weight (Android picks weight by family, not `fontWeight`); the three ad-hoc `fontWeight`s (tab labels, badges, header title) and the chart's SVG labels now use the tokens.
- **Haptics** (`src/components/ui/haptics.ts`): tick for moving between choices (selectors, chart and compare scrubbing per date, calendar days), tap for toggles (star, eye, sections, swipe-to-remove), done on saving a purchase or SIP. Verified on the emulator through `dumpsys vibrator_manager`: Expo Go's vibration count went 21 → 23 for two range taps (CLICK effect).
- **Brand mark** replacing Expo's template icon: a compounding curve rising from a ground line, white with a soft-green end dot on banyan green (the palette's primary). Icon, adaptive foreground/background/monochrome, favicon and splash image, generated by `scripts/make-icons.py` (Pillow, drawn at 4× and downsampled; the first draw had hairline seams from PIL's line joins, so the stroke is stamped with round dabs). Adaptive icon background colour set to the same green. Expo Go's loading screen shows this icon.
- **Fund-house monograms** (`src/domain/fundHouse.ts`, tested; `FundMark`): mfapi.in has no logos, so each house gets a monogram (PP, HD, UTI…) in one of six muted badge colours (new `mark` token pairs, light and dark), stable per house via a small hash. 42 houses mapped from the most common scheme-name prefixes in the full mfapi.in list (37,954 schemes), with renamed houses filed under today's name (Reliance → Nippon India, IDFC → Bandhan) and look-alike prefixes kept apart (Bank of India/Bandhan, Quant/Quantum). On search, recently viewed, watchlist and holdings rows, and the fund page header. Hidden from screen readers: the name beside it says the same.
- **Pill buttons**: one button shape app-wide (fully rounded, 48 pt), with a 0.97 press scale on the native driver (off with reduced motion).
- **Copy cut**: seven explanatory paragraphs (110–260 characters) cut to one line each. The detail moved behind ⓘ: "How these figures are worked out" (Holdings) and "Which NAV does my purchase get?" (Add holding) are new glossary entries; the watchlist's NAV-date note was already the NAV entry's text.
- **Chart draw-in**: a new range reveals left to right (a page-coloured cover slides away, native driver, 640 ms). First version got stuck a third of the way: the effect's cleanup stopped the animation whenever the chart re-rendered. Now it runs only when the range itself changes (first date and length), never on the first paint or with reduced motion, and an interrupted reveal snaps to fully drawn.
- **Explore audit**: collections were a ragged wrap of chips; now a two-column grid of cards, each with an icon and one plain line on what it holds ("Tax deduction, 3-year lock-in"; `blurb` added to `SEARCH_SUGGESTIONS`). "1D" was printed on every recently viewed row; the section header says "NAV · 1D" once. Checked: the Gold card runs the "gold" search.
- **Large text + dark sweep (font scale 2.0, dark) over this round's work**, all fixed and re-checked:
  - Holdings: "Total returns" broke into "To/tal/retu/rns" → summary rows stack (label above figure) above 1.3×, plain labels capped like the ⓘ ones; the allocation switch read "Asset cla.." → it moves under its label; legend and list-header labels capped at 1.3× like the rows; shares right-aligned in a fixed column.
  - NAV calendar: cells clipped their percentage (fixed 52 pt) → minimum height, cells grow; weekday header capped.
  - Fund page: the scrolled header's name and return wrapped into the star → one line each, capped; category and "is ₹… a unit" capped to match their neighbours.
  - Checked and fine: sort sheet, collection cards, compare table, pill buttons, monograms (dark tones readable).
- **Boxy shapes and the stale row** (user: "the stale msg and the row don't look good… chips might look better with a little radius and boxy design"):
  - One radius scale (`radius.xs` 4 added): tags 4, chips and selector thumbs 6, buttons, inputs and tracks 10, cards 14. Pill is kept only for data bars. Chips, badges, buttons, both selector variants, the tab pill, calendar year chips and fund marks moved off full circles.
  - Badges have a fixed 20 pt height, so a tag lines up with the text beside it.
  - Watchlist: "Stale" now takes the status slot on the middle line (right of the plan badges, where the day's change sits for other funds) instead of trailing the date; an old day's change is meaningless for a fund without a NAV for a week. Every row's three lines now read name | NAV, tags | status, house | date.
- **Empty tag line on a watchlist row** (user). Not a layout bug: two PPFAS Dynamic Asset Allocation plans (152467, 152469) are named in AMFI's data with no plan or option at all. Their metadata still tells the option: only an IDCW-reinvestment ISIN is published. `optionFromIsins` (tested with the real ISINs) fills in Growth or IDCW when the name doesn't say, on the watchlist, holdings, recently viewed rows and the fund page; with both ISINs or neither it stays blank. Direct or Regular can't be read from an ISIN, so it isn't guessed. Checked: the row now reads "IDCW", holdings "IDCW · 1 purchase".

## Polish pass (docs/POLISH_PLAN.md, approved by the user)

- **P0-1. Hygiene.** Deleted, with approval: `src/components/fund/LatestNavCard.tsx` and `src/components/holdings/LotRow.tsx` (unused since the fund hero and the by-fund holdings rows replaced them; nothing imports them) and `docs/screenshots/05-consistency.png` (unused, and it shared the `05-` prefix with the calendar shot). Earlier entries that mention them describe what was built at the time and are left as written. `docs/POLISH_PLAN.md` committed with this item.
- **P0-2. Data honesty and copy.**
  - Recently viewed showed NAVs with no date, so HDFC Balanced Fund's 2018 NAV read as current. The section header now says "NAV · 1D · as of 09 Oct 2026" (new `currentNavDate` in `src/domain/nav.ts`, tested; changed in P0-6 to the date most current NAVs share, see below). A stale row shows a "Stale" tag and its own date in place of the 1D move; a current NAV from another day prints its date after the move.
  - Fund hero: "NAV ₹88.9258 +₹1.2703 (+1.45%) as of 09 Oct 2026" under the 3Y headline, above the chart. Before, the NAV only appeared in key facts below the fold.
  - One convention for yearly figures: "p.a." on screen ("XIRR +11.03% p.a.", "since start, p.a.", "3 years (p.a.)"), "Annualised (CAGR)" and "Absolute" as the returns group heads, "per year" for screen readers. `grep -rn "a year" src` now finds only code comments.
  - SEBI wording: "Past performance may or may not be sustained in future." replaces "Past returns don't predict future ones." (returns, replay, consistency, compare). The market-risk line sits once, under the source note at the foot of the fund page.
  - Checked on the emulator: Explore (header date, the Stale row), the fund hero, Holdings' XIRR row.
- **P0-3. Sample portfolio.** "Explore with a sample portfolio" on the empty Holdings screen, under "Find a fund".
  - Scheme codes checked with curl against mfapi.in on 11 Oct 2026, with the names in AMFI's data: 122639 Parag Parikh Flexi Cap Direct Growth; 118989 HDFC Mid Cap Direct Growth; 120716 UTI Nifty 50 Index Direct Growth; 135781 Mirae Asset ELSS Tax Saver Direct Growth; 143269 Parag Parikh Liquid Direct Growth; watchlist 122639, 152469 (Parag Parikh Dynamic Asset Allocation, no plan in its name) and 100121 (HDFC Balanced Fund, last NAV 01 Jun 2018). Also checked: 122639 has a NAV on Sun 31 Mar 2024 (74.86850) and 27 Oct 2025 is its 1-year high (95.7732).
  - `src/domain/sample.ts` (tested): `buildSamplePortfolio` prices each purchase with the existing rules: `planSip` for the SIPs, and a new `buyRupees` in `sip.ts` for single purchases (the first NAV on or after the date, units to 4 decimals, amount saved). `buyRupees` shares its unit maths with `planSip` through one helper; `planSip`'s tests pass unchanged. The HDFC SIP stops on 10 Aug 2026 so the fund page offers "Add instalments due"; the liquid purchase is dated a week before today. A fund that can't be priced fails the whole load rather than saving half a portfolio.
  - Clear removes only the sample. What was added (lot ids, and only the watched funds the user didn't already have) is recorded in the preferences store before the lots are saved, so a crash in between can't leave sample lots that Clear doesn't know about. New pure `removeItems` / `hasAnyOf` in `portfolioSchema.ts`, `addMany` / `removeItems` actions, and tests for the schema, the store (clear keeps the user's own lot and watched fund) and the saved record (survives a reload; a corrupt one is dropped).
  - States: spinner and "Pricing from real NAVs…"; `ErrorState` with Retry on failure; disabled with a line saying why when offline. While any sample item is saved, Holdings and Watchlist show "Sample portfolio, priced from real NAVs" with Clear. A haptic "done" on load.
  - Checked on the emulator, with Expo Go's data cleared first (approved open item 5): one tap fills Holdings (5 funds, invested ₹5,67,000.00 = 56 × ₹5,000 + 41 × ₹2,000 + ₹1,30,000 + ₹50,000 + ₹25,000, XIRR in p.a.) and Watchlist (Flexi Cap, Dynamic Asset Allocation with its IDCW tag, HDFC Balanced Stale). HDFC Mid Cap shows "SIP of ₹5,000 on the 10th" with "Add instalments due", and its Sun 10 May 2026 instalment is priced at Mon 11 May's NAV. Clear brings back both empty states.
  - Found on the way: the Holdings subtitle read "NAVs NAVs from 09 Oct 2026 to 11 Oct 2026" whenever funds were valued on different days (here the liquid fund's Sunday NAV), because `formatAsOf` already says "NAVs from…". The screen now adds "NAVs" only to "as of …".
  - The index fund is counted as equity in the allocation (its AMFI category is "Other Scheme - Index Funds"; the existing asset-class rule files Nifty 50 index funds under equity), so the bar shows Equity and Debt.
- **P0-4. Clean data.** Expo Go's data cleared on the emulator (`pm clear host.exp.exponent`), the app relaunched and the sample portfolio loaded; screenshots from here on come from it.
- **P0-5. Platform pass, Android.** Every screen (Explore, Watchlist, Holdings, fund page, NAV history, Add holding, Compare, Your data) on the emulator in light and dark, at text size 1.0 and 2.0. One fix: Compare's fund picker rows had a minimum height and no vertical padding, so at 2.0 each subtitle touched the next fund's name; rows now have padding and cap their text at 1.3× like every other fund row. The rest held: rows with fixed heights cap their text, the fund hero's NAV line wraps cleanly, dark tints in the NAV calendar keep their figures readable.
- **P0-6. Submission docs.**
  - Screenshot pass found one more data-honesty issue: with the liquid fund's Sunday NAV (11 Oct) in Recently viewed, the header said "as of 11 Oct 2026" and four rows each had to print "09 Oct 2026". `currentNavDate` now takes the date most current NAVs share (the newest on a tie); only the liquid fund prints its own date. Test added.
  - README: a two-minute tour (sample portfolio, the Sunday 31 Mar 2024 purchase, the SIP's "Add instalments due", a purchase on Fri 2 Oct 2026 priced at Mon 5 Oct, offline watchlist with the stale fund), a 28 s screen recording as a 2.3 MB GIF (`docs/screenshots/tour.gif`, from `adb shell screenrecord` and ffmpeg), a "Beyond the brief, and why" table (each extra, its persona, the domain file holding its rule), the real test count (265 in 30 suites), the full structure, backup and the sample in Features, and the SEBI lines under Known limitations. The sample's totals aren't quoted, because the UTI SIP adds an instalment every month.
  - Screenshots retaken from the sample portfolio on a cleared emulator, at 1080 × 2400 with a demo status bar and Expo Go's tools button hidden; renumbered 01–09 with Consistency back as `05-consistency.png` (`git mv` for the renamed four).
  - `docs/SECURITY.md` (new): what's stored and where, seven threats with their handling and file references, and residual risks (no encryption beyond the sandbox, plain-text backups, the app switcher, `npm audit`'s 64 advisories in the Expo/Metro toolchain, left unfixed because `--force` downgrades below SDK 57; not traced to the bundle).
  - `docs/DESIGN.md`: the radius scale, the watchlist status slot, NAV dates in lists, the fund hero line, "p.a.", the disclaimers, the sample portfolio, and the motion and haptics map as built (with the P1 changes marked as planned).
  - `AI_CONTEXT.md` cut from 90 to about 70 lines: six corrections kept with one or two lines each, the rest pointed to this log; "with more time" refreshed (it listed things already built); every **[YOU]** marker kept, none filled in.
  - Commit hashes cited in this log are the ones after the history rewrite.
