# Build plan for Claude Code

This is the full plan for finishing the app. Read `CLAUDE.md` first: its rules apply to every phase.

**What already exists (verified, 140 passing tests):** the domain core (`src/domain`), the mfapi.in client (`src/api`), the portfolio store (`src/store`), TanStack Query setup and data hooks (`src/query`), shared hooks (`src/hooks`), theme tokens (`src/theme`), the NAV chart (`src/components/fund/NavChart.tsx`), the date field (`src/components/form/DateField.tsx`), the root layout with providers (`src/app/_layout.tsx`), the tab layout, and placeholder screens for every route.

**What you build:** the small UI kit, the five screens, a store test, and the final docs.

Work one phase at a time. At the end of each phase: run the phase's checks, commit, add an entry to `docs/BUILD_LOG.md`, then stop and summarise (files changed, how to test it on a phone, anything open). Wait for the user before starting the next phase.

---

## Phase 0: Verify the starter

Make no feature changes in this phase.

1. Check `node -v`: React Native 0.86 needs Node ^20.19.4, ^22.13.0 or ^24.3.0 (22 LTS recommended). Run `npm install`.
2. Run `npx expo install --check`. If it reports mismatches, run `npx expo install --fix` and record what changed.
3. Run `npx expo-doctor` and fix what it reports (record each fix).
4. Run `npm run typecheck`. It must report 0 errors. If a pre-built file fails against the installed library versions, make the smallest fix and record it.
5. Run `npm test`. 140 tests in 15 suites must pass. If Jest reports that the React Native preset has moved, run `npm install --save-dev @react-native/jest-preset@^0.86.3` and retry.
6. Run these two API checks and record the output in `docs/BUILD_LOG.md`:
   ```bash
   curl -s 'https://api.mfapi.in/mf/122639?startDate=2026-09-01&endDate=2026-09-30' | head -c 400
   curl -s 'https://api.mfapi.in/mf/search?q=nifty%2050%20index' | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
   ```
   The first shows whether the history endpoint honours date ranges (the app doesn't depend on it). The second shows whether search caps results at 15; phase 2 uses the answer.
7. Run `npx expo start`, open the app in Expo Go (SDK 57) on a phone, and confirm the three tabs (Explore, Watchlist, Holdings) render their placeholders.

**Done when:** install, typecheck, tests and Expo Go all work, and the log records every fix and both curl results.

---

## Phase 1: UI kit

Create small, typed, themed building blocks in `src/components/ui/` (plus two in `src/components/search/`). Every component takes its colours, spacing and type from `useTheme()`; none hard-codes a hex value.

| Component | Props | Behaviour |
|---|---|---|
| `AppText` | `variant?: keyof typography` (default `'body'`), `tone?: 'default' \| 'muted' \| 'primary' \| 'gain' \| 'loss' \| 'warning' \| 'danger'`, `numeric?: boolean`, plus `TextProps` | Applies the typography token and colour; `numeric` adds `tabularNumbers`. Passes `maxFontSizeMultiplier` through (rows use 1.3). |
| `Card` | `children`, `style?` | Surface background, hairline border, `radius.lg`, `spacing.lg` padding. |
| `Badge` | `label: string`, `tone?: 'neutral' \| 'info' \| 'warning' \| 'gain' \| 'loss'` | Small pill; text is the meaning (never colour alone). |
| `Chip` | `label`, `onPress`, `selected?`, `disabled?` | Pill button; `accessibilityRole="button"` and `accessibilityState={{ selected, disabled }}`; at least 36 pt high with `hitSlop` to reach 44. |
| `Button` | `label`, `onPress`, `variant?: 'primary' \| 'secondary' \| 'destructive' \| 'ghost'`, `disabled?`, `loading?`, `icon?: IoniconName` | At least `MIN_TOUCH` high; shows an `ActivityIndicator` while loading and is then disabled. |
| `IconButton` | `name: IoniconName`, `onPress`, `accessibilityLabel: string` (required), `color?`, `size?` (22), `selected?`, `disabled?` | `hitSlop` so the target is at least 44 × 44. `IoniconName = ComponentProps<typeof Ionicons>['name']`. |
| `Skeleton` | `width?: DimensionValue`, `height: number`, `radius?` | `surfaceMuted` block with an opacity pulse (`Animated.loop`, `useNativeDriver: true`); no animation when `AccessibilityInfo.isReduceMotionEnabled()` is true. `accessibilityElementsHidden`. |
| `SkeletonRows` | `count?: number` (6), `rowHeight: number` | A column of skeleton rows matching the real row height; the container has `accessibilityLabel="Loading"`. |
| `EmptyState` | `icon: IoniconName`, `title`, `body?`, `action?: { label; onPress }`, `children?` | Centred block for "nothing here yet" with one next step. |
| `ErrorState` | `error: unknown`, `onRetry?: () => void`, `compact?: boolean` | Title and detail from `describeError(error, useOnline())`; a Retry button when `onRetry` is given. `compact` fits inside a list row or card. |
| `Banner` | `tone: 'info' \| 'warning' \| 'error'`, `text`, `action?: { label; onPress }` | Full-width notice using the `*Surface` colours, with an icon that matches the tone. |
| `SignedAmount` | `value: bigint`, `scale: number`, `variant?` | `formatInr(value, scale, 'always')`; tone gain, loss or muted by the sign **after rounding to the paisa** (`rescale(value, scale, 2)`); `accessibilityLabel` "gain of ₹1,763.24", "loss of ₹100.00" or "no change". |
| `SignedPercent` | `hundredths: bigint`, `variant?` | Same idea with `formatPercentHundredths`. |
| `UndoToast` | `message: string \| null`, `onUndo`, `onHide`, `durationMs?` (5000) | Bar pinned above the tab bar (`useSafeAreaInsets` from `react-native-safe-area-context`); hides itself after the duration; `accessibilityLiveRegion="polite"`. Rendering a new message restarts the timer. |
| `search/SchemeBadges` | `name: string`, `size?: 'sm' \| 'md'` | From `describeScheme(name)`: a Direct/Regular badge and a Growth/IDCW badge; renders nothing for unknown parts. |
| `search/WatchToggle` | `schemeCode: number`, `schemeName: string` | Star `IconButton` bound to the store: `isWatched` via a boolean selector; calls `watch` / `unwatch`. Label "Add <title> to watchlist" or "Remove <title> from watchlist"; `accessibilityState={{ selected }}`. |

**Checks:** `npm run check`. Components aren't routed anywhere yet, so there's no device test in this phase.

---

## Phase 2: Explore (search), `src/app/(tabs)/index.tsx`

**Data:** `const [text, setText] = useState('')`, `const debounced = useDebouncedValue(text, 300)`, `const { query, normalized, enabled } = useSchemeSearch(debounced)`, `const online = useOnline()`.

**Layout, top to bottom:**

1. **Search field.** A `TextInput` with a leading search icon, placeholder "Search funds, e.g. Parag Parikh Flexi Cap", `autoCorrect={false}`, `autoCapitalize="none"`, `returnKeyType="search"`, `accessibilityLabel="Search mutual funds"`, and a clear `IconButton` ("Clear search") when there is text. If the route has a `q` param (`useLocalSearchParams<{ q?: string }>()`), copy it into `text` whenever it changes; the Watchlist empty state uses this.
2. **Offline banner** (`!online`): "You're offline. Search needs a connection; your watchlist still shows saved NAVs."
3. **Body**, in this order of precedence:
   - **Before searching** (`!enabled`): when the trimmed text has 1–2 characters, a hint "Type at least 3 characters". Below it, "Start with a collection" and one `Chip` per `SEARCH_SUGGESTIONS` item; tapping one sets `text` to its `query`.
   - **Scheme code typed** (`schemeCodeInQuery(normalized)` is a number): a first row "Open scheme code 122639" that goes to the fund screen. Name search can't find codes, and this is also how to test an unknown code. When this row shows, skip the "No results" state below it.
   - **First load** (`query.isLoading` and no data): `SkeletonRows` at the row height.
   - **Error with no data:** `ErrorState` with `onRetry={() => query.refetch()}`.
   - **No results** (data is an empty array): `EmptyState` titled “No schemes match “<normalized>””, body "Try the fund house (for example HDFC), a category (liquid, index) or fewer words."
   - **Results:**
     - Filter chips "Direct only" and "Growth only" (local state) plus a caption "Showing X of Y". Filter with `filterSchemes`. If filters hide everything, show `EmptyState` "No matching plans in these results" with the action "Clear filters".
     - A `FlatList` of `SchemeRow` (`src/components/search/SchemeRow.tsx`, fixed height 76, `getItemLayout`). Row content: the title from `describeScheme` (`numberOfLines={2}`), `SchemeBadges`, and "Code 122639" as a caption, all in one `Pressable` that pushes `{ pathname: '/fund/[code]', params: { code: String(schemeCode), name: schemeName } }`. A `WatchToggle` sits beside the `Pressable`, not inside it, so tapping the star doesn't open the fund.
     - `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="on-drag"`.
     - While a new search loads over old results (`query.isPlaceholderData`), dim the list (opacity 0.6) and show "Searching…" with a small spinner above it.
     - If Phase 0 showed that search caps results at 15, then when exactly 15 come back show a footer: "Showing the first 15 matches. Add more words to narrow the search." If Phase 0 showed no cap, skip this footer.

**Checks:** `npm run check` and `npx expo export --platform android`.
**On a phone:** search "parag parikh" (15 results with badges); toggle both filters (3 Direct Growth plans remain); star one fund (the star fills); type "ab" (the hint shows); type "zzzzqqq" (the empty state shows); type "99999999" and tap "Open scheme code" (the fund screen placeholder opens); turn on airplane mode and search (offline copy, Retry).

---

## Phase 3: Fund screen and NAV history list

### `src/app/fund/[code]/index.tsx`

**Data:** `const schemeCode = parseSchemeCode(params.code)`. If it is null, show `ErrorState`-style copy "That link doesn't point to a scheme" with a button back to Explore, and render nothing else. Otherwise `const { history, latest, points } = useFundSeries(schemeCode)`. The name is `history.data?.meta.schemeName ?? latest.data?.meta.schemeName ?? params.name ?? \`Scheme ${code}\``.

**Header:** `<Stack.Screen options={{ title: '', headerRight: () => <WatchToggle … /> }} />`. The long name goes in the content, not the header.

**States:**
- **Loading** (history loading with no data): skeletons for the title block, a 200-pt chart box, and returns rows.
- **Not found** (`isApiError(history.error) && history.error.kind === 'not_found'`): `EmptyState` "No NAV data for this scheme", body "mfapi.in has no NAV history for code <code>. It may be closed, merged or mistyped."
- **Other errors with no data:** `ErrorState` whose Retry refetches both history and latest.
- **No NAVs** (`points.length === 0`): `EmptyState` "This scheme hasn't published a NAV yet."

**Content.** Use `ScrollView` from `'react-native-gesture-handler'` (required for chart scrubbing), with a `RefreshControl` that refetches history and latest. Sections:

1. **Title block:** the title from `describeScheme` (`variant="title"`), the variant text, `SchemeBadges`, "fund house · category" (muted), and "Code 122639 · ISIN INF879O01027" as a caption (add the IDCW ISIN when present).
2. **Latest NAV card:** label "Latest NAV", `formatNav(last.nav)` as a figure, "as of <formatDate(last.date)>". Under it, from `latestChange(points)`: "<formatNavChange(diff)> (<formatPercentHundredths(pct)>) since <formatDate(from.date)>", toned by sign, with an accessibility label that says "up" or "down". Then:
   - If `isStale(last.date, todayInIndia())`: a warning `Banner` "The latest NAV is from <date>. This scheme may be closed, merged or no longer publishing."
   - If `history.data.skipped > 0`: a caption "<n> malformed or duplicate rows in the source data were skipped."
   - A primary `Button` "Add a holding", which pushes `{ pathname: '/add-holding', params: { code, name } }`.
3. **Chart:** a row of `Chip`s from `CHART_RANGES`. A chip is disabled when `!rangeCovered(points, months)` (All is always enabled). The default range is `'1Y'` when covered, otherwise `'ALL'`. Compute `const ranged = useMemo(() => sliceRange(points, months), [points, months])` and render `<NavChart points={ranged} rangeLabel={…} />`, where `rangeLabel` is "1 month", "6 months", "1 year", "3 years", "5 years", or "since <formatDate(points[0].date)>" for All.
4. **Returns card** (title "Trailing returns (NAV based)"): one row per `trailingReturns(points)` item: the label, `formatPercent(percent)` toned by sign, and a small tag "absolute" or "p.a.". A null percent shows "—" with "not enough history". Footnote: "Under 1 year: absolute change. 1 year and longer: compound annual growth (CAGR). Based on NAV only; IDCW payouts are not added back. Past returns don't predict future returns."
5. **Your holdings in this fund:** lots for this scheme (`useShallow((s) => s.lots.filter(…))`). Each shows units, purchase date, the applied NAV with its date, and a value from `evaluateLot(lot, last)`. Pending lots show an "Awaiting NAV" badge. Then a button "Add another purchase". If there are no lots, show nothing here (the button in section 2 covers it).
6. **Recent NAVs:** the first 5 rows of `navRowsNewestFirst(points)` (date, NAV, change), then a `Button` "See all <count> NAVs" that pushes `{ pathname: '/fund/[code]/navs', params: { code, name } }`.
7. **Source note:** "Source: mfapi.in (AMFI data). Earliest NAV in the data: <date>. NAVs are published after market close; funds of funds and overseas funds publish a day later."

Memoise every derived value (`latestChange`, `trailingReturns`, rows) on `points`.

### `src/app/fund/[code]/navs.tsx`

- The same code parsing and the same loading, error and empty states (reuse small components, don't copy-paste).
- `const items = useMemo(() => navListItems(points), [points])`.
- Above the list (not inside it): the scheme title, "<n> NAVs from <first date> to <last date>", and a column header row: Date | NAV | Change.
- A `FlatList` with **one fixed height of 48 for both item kinds**, `getItemLayout`, `keyExtractor` (`nav-<date>` or `gap-<to>`), `initialNumToRender={25}`, `maxToRenderPerBatch={25}`, `windowSize={11}`, and `removeClippedSubviews` on Android. Memoised row components:
  - **NAV row:** `formatDate(date)` | `formatNav(nav)` (numeric) | change as `formatNavChange(diff)` with `formatPercentHundredths(pct)`, toned by sign, "—" for the first NAV.
  - **Gap row** (muted, italic): "No NAV for <days> days (<from> to <to>): holidays or missing data".
- Footer: "Earliest NAV in the data: <date>."

**Checks:** `npm run check` and `npx expo export --platform android`.
**On a phone:** open Parag Parikh Flexi Cap Direct Growth (122639). Check the latest NAV and its date, switch chart ranges, drag across the chart (the readout shows the date and NAV, and vertical swipes still scroll), check the returns labels, open "See all NAVs" and fling-scroll quickly (no blank rows, no stutter). Open 100121 (a closed HDFC scheme): the stale banner shows. Open 99999999: "No NAV data for this scheme".

---

## Phase 4: Add holding, `src/app/add-holding.tsx` (modal)

**Data:** `parseSchemeCode(params.code)` (invalid → error copy and a Close button), `useFundSeries(schemeCode)`, and `const today = useMemo(() => todayInIndia(), [])`.

**Form state:** `unitsText`, `unitsTouched`, `purchaseDate: IsoDate | null`, `submitted`.

**Rules (all from `src/domain`):**
- `const units = validateUnits(unitsText)`. Show `units.error` under the field once the field is touched or the user has pressed Save.
- `const resolution = history.data && purchaseDate ? resolvePurchaseNavWithLatest(history.data.points, latest.data?.point ?? null, purchaseDate, today) : null`. Pass the raw history points, not the merged `points`.
- Date message: `describePurchaseDate(resolution)` when a date is chosen; "Choose the purchase date." (error tone) after a Save attempt with no date.
- Save is allowed only when `units.ok` and `resolution.kind` is `'matched'` or `'pending'`.

**Layout:** `KeyboardAvoidingView` (`behavior="padding"` on iOS) around a `ScrollView` with `keyboardShouldPersistTaps="handled"`.

1. The scheme title and badges.
2. **Units:** a `TextInput` with `keyboardType="decimal-pad"`, `inputMode="decimal"`, placeholder "e.g. 125.432", `accessibilityLabel="Units"`, and a helper "Up to 4 decimals, exactly as on your statement."
3. **Purchase date:** `<DateField label="Purchase date" value={purchaseDate} onChange={setPurchaseDate} minimumDate={history.data?.points[0]?.date ?? null} maximumDate={today} message={dateMessage} disabled={!history.data} />`. While the history loads, add the caption "Loading NAV history to price your purchase…". If it fails, show `ErrorState compact` with Retry, and keep Save disabled.
4. A note: "Use the allotment date from your account statement. A purchase made after the 3 pm cut-off gets the next business day's NAV."
5. **Preview card**, only when `units.ok`:
   - matched: "Priced at <formatNav(nav)> (NAV of <date>)". Then `valueLot({ units: units.normalized, appliedNav, appliedDate, latestNav: last.nav, latestDate: last.date })`, where `last = lastPoint(points)`: Invested, "Value as of <date>", and gain as `SignedAmount` plus `SignedPercent`.
   - pending: "Saved as Awaiting NAV. It will be valued once the NAV for <date> is published."
6. **Save** (primary, full width). On press: if the form is invalid, `setSubmitted(true)` and return. Otherwise call `addLot({ id: newLotId(), schemeCode, schemeName, units: units.normalized, purchaseDate, applied: resolution.kind === 'matched' ? { navDate: resolution.point.date, nav: resolution.point.nav } : null, createdAt: new Date().toISOString() })`, then `router.back()`.

Saving a holding doesn't add the fund to the watchlist; the two lists are independent, and removing a fund from the watchlist never deletes holdings.

**Checks:** `npm run check` and `npx expo export --platform android`.
**On a phone (fund 122639):** units "0", "-1", "1.23456", "1,000", "abc" and "." each show the right message. Dates: a Saturday → next Monday's NAV; Fri 2 Oct 2026 (Gandhi Jayanti) → Mon 5 Oct; Sun 31 Mar 2024 → the same day (a real Sunday NAV); today → "Awaiting NAV"; the picker won't go before the earliest NAV or after today. Save, and the lot appears on the fund screen.

---

## Phase 5: Watchlist, `src/app/(tabs)/watchlist.tsx`

**Data:** `watchlist`, `hydrated`, `unwatch` and `undoUnwatch` from the store (separate selectors), `useOnline()`, `useRefreshOnFocus('nav-latest')`.

- **Before hydration:** `SkeletonRows`.
- **Empty:** `EmptyState` with the star icon, title "Your watchlist is empty", body "Tap ☆ on any fund to follow its latest NAV here." Below it, `SEARCH_SUGGESTIONS` chips that call `router.navigate({ pathname: '/', params: { q: query } })`.
- **List:** `FlatList` of `WatchRow` (`src/components/watchlist/WatchRow.tsx`, a memoised component with fixed height 76 and `getItemLayout`). Each row runs its own `useLatestNav(item.schemeCode)`, so one failure never blocks the rest:
  - Left: the title (1 line) and `SchemeBadges size="sm"`.
  - Right: `formatNav(point.nav)` (numeric) and "as of <formatDate(point.date)>"; a warning `Badge` "Stale" when `isStale(point.date, todayInIndia())`.
  - Loading: skeleton blocks in place of the NAV. Error: "Couldn't load NAV" plus a small Retry that refetches that row only. A scheme with no NAV: "No NAV published". The row height never changes.
  - A trailing remove `IconButton` ("close-circle-outline", label "Remove <title> from watchlist"). Tapping the row opens the fund.
- **Remove with Undo:** `const removed = unwatch(code)`; keep `{ item, index }` in state and show `UndoToast` "Removed <title>" with Undo → `undoUnwatch(item, index)`. A second removal replaces the first toast; the first removal stays.
- **Pull to refresh:** `queryClient.refetchQueries({ queryKey: ['nav-latest'], type: 'active' })`.
- **Header text:** "Latest NAVs from mfapi.in. A NAV is published after market close, so each date shows the business day it's for." Offline: an info `Banner` "Offline: showing saved NAVs".

**Checks:** `npm run check` and `npx expo export --platform android`.
**On a phone:** add 3 funds from Explore, including 100121 (it shows the Stale badge). Pull to refresh. Remove one, tap Undo, and it returns to the same position. Kill and reopen the app: the list is still there. Airplane mode, then reopen: the saved NAVs show with their dates and the offline banner.

---

## Phase 6: Holdings, `src/app/(tabs)/holdings.tsx`

**Data:** `lots`, `hydrated` and `removeLot` from the store; the unique scheme codes; `const results = useQueries({ queries: codes.map((code) => latestNavQuery(code)) })`, kept in a `Map` by code. For each lot:

```ts
lot.applied === null           → { status: 'pending' }
result?.data === undefined     → { status: 'unavailable' }      // loading or failed; the row tells which
otherwise                      → evaluateLot(lot, result.data.point)
```

`const totals = summarize(statuses)`. Compute these in the render; lots are few and the work is cheap.

- **Before hydration:** skeletons. **Empty:** `EmptyState` "No holdings yet", body "Record a purchase from any fund's page to see its value and return here.", action "Find a fund" → `router.navigate('/')`.
- **Summary card** (the list header):
  - While any lot's latest NAV is on its first load, show skeleton figures, never partial totals.
  - "Current value" as a figure (`formatInr(totals.current, VALUE_SCALE)`); "Invested <formatInr>"; "Gain" as `SignedAmount` plus `SignedPercent` (`totals.returnHundredths`).
  - `formatAsOf(totals.oldestNavDate, totals.newestNavDate)` as a caption.
  - When `pendingCount` or `unavailableCount` is above 0: "<n> awaiting NAV and <m> not loaded aren't included in these totals."
- **Lot rows** (`src/components/holdings/LotRow.tsx`, memoised, fixed height, sorted by scheme title then purchase date):
  - Left: the title and badges; "<formatUnits> units · bought <formatDate(purchaseDate)>"; "NAV <formatNav(applied.nav)> of <formatDate(applied.navDate)>", adding "(next NAV after the purchase date)" when `navDate` differs from `purchaseDate`.
  - Right (valued): current value, `SignedAmount` gain, `SignedPercent` return, then "<formatPercent(cagr)> p.a." when `cagrPercent` isn't null, and "as of <date>".
  - Pending: an "Awaiting NAV" `Badge` and "for <formatDate(purchaseDate)>". Loading: skeletons. Failed: "Couldn't load latest NAV" plus Retry.
  - A remove `IconButton` ("trash-outline", label "Remove holding"). It confirms with `Alert.alert('Remove holding?', '<units> units of <title>, bought <date>. This can't be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeLot(id) }])`. Tapping the row opens the fund.
- Pull to refresh and `useRefreshOnFocus('nav-latest')`.
- **Footnote:** "Values use each fund's latest published NAV. Return is absolute; p.a. (CAGR) appears for holdings of a year or more. Totals are summed before rounding, so they can differ from the rows by a paisa."

**Checks:** `npm run check` and `npx expo export --platform android`.
**On a phone:** add a lot on 31 Mar 2024 (125.432 units of 122639) and check the figures by hand: units × applied NAV, units × latest NAV. Add a lot dated today (Awaiting NAV, left out of the totals with a note). Remove a lot (the confirmation appears). Airplane mode: saved NAVs still value the lots.

---

## Phase 7: Hardening pass

Go through the list, fix what fails, and record each fix in the build log.

- **Every data screen** has loading, empty, error and content states. Check each one deliberately: airplane mode, a slow network (the emulator's network throttling), an unknown code (99999999), a closed scheme (100121), and a scheme with a short history (152469, Parag Parikh Dynamic Asset Allocation Fund, launched in 2024: its 3Y and 5Y chips are disabled and those returns show "—").
- **Timeouts:** with a throttled network, a request ends after 15 s (20 s for full histories) with "mfapi.in is taking too long" and Retry.
- **Reconnect:** turn airplane mode off with a screen open; data refetches on its own (NetInfo → `onlineManager`).
- **Foreground:** background the app for a few minutes, return; stale latest NAVs refetch (AppState → `focusManager`).
- **Persistence:** kill and reopen the app. The watchlist and holdings survive, and "Awaiting NAV" lots resolve once the NAV exists (`usePendingLotResolver`).
- **Formatting:** check negative values (a lot bought at a recent high), `₹1,23,456.78` grouping, units with 4 decimals, and percentages with signs.
- **Accessibility:** turn on TalkBack or VoiceOver. Every icon button announces its label; chips announce selected; the chart announces its summary; gains and losses are announced as "gain of …" or "loss of …". Set the largest font size: list rows clip at most to their `numberOfLines`, and nothing overlaps (`maxFontSizeMultiplier={1.3}` on row text).
- **Dark mode:** every screen is readable, with no hard-coded colours.
- **Performance:** open the NAV list of an old fund with thousands of NAVs (search "hdfc flexi cap" and open the Regular growth plan) and fling to the end with the Perf Monitor on (dev menu): JS FPS stays near 60 and there are no blank rows. Typing fast in Explore doesn't send a request per keystroke (300 ms debounce).
- **Console:** no warnings in Metro while using the app (keys, missing routes, deprecated APIs).

**Checks:** `npm run check` and `npx expo export --platform android`.

---

## Phase 8: Tests, docs, final verification

1. **Store test**, `src/store/__tests__/portfolioStore.test.ts`. Mock AsyncStorage with `jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))`. Test:
   - `watch` → `unwatch` returns `{ item, index }` → `undoUnwatch` restores the order.
   - `addLot` then `removeLot`.
   - After an action, storage holds JSON under `mfx.portfolio` with `version: 1` and no `hydrated` field.
   - Corrupt saved JSON (for example a lot with units "abc") → after `await usePortfolioStore.persist.rehydrate()` the bad lot is gone and `hydrated` is true.
   Reset the store between tests with `usePortfolioStore.setState({ watchlist: [], lots: [] })`.
2. **README.md:** update the "Run it" steps if anything changed, and fill in the screenshots section if the user provides images. Keep the requirement-to-implementation table accurate.
3. **docs/ARCHITECTURE.md:** update it if the implementation differs from it anywhere.
4. **AI_CONTEXT.md:** fill each section from `docs/BUILD_LOG.md`: real problems, real corrections, real decisions. Leave the `[YOU]` markers for the user to write in their own words. Invent nothing.
5. **Final run:** `npm run check`, `npx expo export --platform android`, `npx expo-doctor`, and one full pass through the Phase 7 list on a real phone in Expo Go.

---

## Out of scope (say so in the README, don't build)

Sign-in or cloud sync, web support, SIP calculators or SIP tracking, portfolio XIRR across lots, CAS statement import, notifications, multiple portfolios, and any ratings, rankings or "best fund" claims (mfapi.in has no such data).
