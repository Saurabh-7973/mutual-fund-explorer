# Mutual Fund Explorer: rules for Claude Code

A take-home assignment for a React Native role at PPFAS Asset Management: search Indian mutual funds (mfapi.in), view NAV history, keep a watchlist, record holdings and see their value and return. Expo SDK 57 (managed workflow), React Native 0.86, TypeScript 6, Expo Router, TanStack Query 5, Zustand 5. It must run in the store version of **Expo Go (SDK 57)**.

The build plan is `docs/BUILD_PROMPT.md`. Work through it one phase at a time.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies |
| `npm run typecheck` | `tsc --noEmit`; must report 0 errors |
| `npm test` | Jest (jest-expo); all suites must pass |
| `npm run check` | Typecheck, then tests; run after every phase |
| `npx expo start` | Dev server; scan the QR code with Expo Go |
| `npx expo install --check` | Dependency versions match SDK 57 |
| `npx expo-doctor` | Project health |
| `npx expo export --platform android` | Bundles the app; catches import errors that tsc misses |

Shell blocks in this repo's docs carry no inline `#` comments: zsh, the default macOS shell, doesn't treat `#` as a comment when you paste into it.

## Layers (keep them separate)

| Folder | What lives there | May import |
|---|---|---|
| `src/domain/` | Pure TypeScript rules: dates, money, NAV, returns, formatting, validation, chart geometry | nothing outside `src/domain` |
| `src/api/` | mfapi.in client: fetch, timeout, typed `ApiError`, response validation | `src/domain` |
| `src/store/` | Zustand store for the user's data; rules in `portfolioSchema.ts` | `src/domain` |
| `src/query/` | TanStack Query client, keys, options and data hooks | `src/api`, `src/domain` |
| `src/hooks/` | Shared React hooks | anything above |
| `src/theme/` | Tokens and `useTheme()` | — |
| `src/components/` | Reusable UI (`ui/`, `fund/`, `form/`, `search/`, `watchlist/`, `holdings/`) | anything above |
| `src/app/` | **Routes only** (Expo Router). Every file here becomes a screen | anything above |

- Screens get API data **only** through `src/query` hooks and options, user data **only** through `usePortfolioStore`, and all money, date and NAV logic **only** from `src/domain`.
- Never put a non-route file (component, helper, test) inside `src/app/`.

## Verified code: don't rewrite it

These files were written and tested before you started (140 tests), and type-checked against the real library sources:
`src/domain/*`, `src/api/*`, `src/store/portfolioSchema.ts`, `src/store/portfolioStore.ts`, `src/query/*`, `src/hooks/*`, `src/theme/*`, `src/components/fund/NavChart.tsx`, `src/components/form/DateField.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`.

Use them as they are. If one has a real bug, write a failing test that shows it, fix it with the smallest change, and record it in `docs/BUILD_LOG.md`. If a phase needs a new pure rule (for example a sort order), add a function plus tests in `src/domain` rather than writing the logic in a screen.

## Money and dates (non-negotiable)

- Rupee amounts are BigInt values from `valueLot` / `summarize` / `evaluateLot`, shown with `formatInr(value, VALUE_SCALE, mode)`. Never use `parseFloat`, `Number()`, `toFixed()` or `Intl.NumberFormat` on money.
- NAVs stay strings (`"88.92580"`). Show them with `formatNav`, changes with `formatNavChange`, units with `formatUnits`, percentages with `formatPercentHundredths` (exact) or `formatPercent` (float CAGR).
- Losses use the true minus sign; the formatters already do this. Gains use `'always'` mode to get a `+`.
- Dates are `IsoDate` strings (`"2026-10-09"`). Never call `new Date('2026-10-09')` or `new Date(apiDate)`. Use `src/domain/dates.ts`: `formatDate`, `todayInIndia`, `toLocalDate` / `fromLocalDate` (only at the date-picker edge).
- "Today" is always `todayInIndia()`, whatever the phone's time zone.
- Purchase pricing: `resolvePurchaseNavWithLatest(history.points, latest.point, purchaseDate, today)`, i.e. the **first NAV on or after** the purchase date. Pass the raw history points and the /latest point separately; don't pass the merged series. Trailing returns use `trailingReturns(points)` (the NAV **on or before** each start date). Don't mix the two rules.
- Every NAV on screen shows its date. Every return says whether it is absolute or p.a. (CAGR).
- Never put BigInt into query data, store state or route params. They must stay JSON-safe.

## Library gotchas (SDK 57)

- **Tabs**: `import { Tabs } from 'expo-router/js-tabs'`. The root `Tabs` export of `expo-router` is deprecated.
- `Stack`, `Link`, `router`, `useLocalSearchParams`, `useFocusEffect`, `ThemeProvider`, `DarkTheme`, `DefaultTheme` and the `Theme` type all come from `'expo-router'`. Don't install `@react-navigation/*`.
- Routes: `src/app/fund/[code]/index.tsx` (pathname `'/fund/[code]'`), `src/app/fund/[code]/navs.tsx`, and the modal `src/app/add-holding.tsx`. Navigate with objects, for example `router.push({ pathname: '/fund/[code]', params: { code: String(schemeCode), name } })`. Params arrive as strings: parse with `parseSchemeCode`.
- Colours come from `useTheme()` (it handles `useColorScheme()` returning `'unspecified'`). No hex values in screens.
- **Date picker** (`@react-native-community/datetimepicker` 9.1): use `onValueChange` and `onDismiss`. `onChange` is deprecated. Use the existing `DateField` component.
- **Gesture Handler**: `GestureHandlerRootView` is already at the root. A screen that contains `NavChart` must scroll with `ScrollView` from `'react-native-gesture-handler'`, so a horizontal drag scrubs and a vertical swipe scrolls. Without Reanimated, gestures need `.runOnJS(true)`.
- **Not allowed** (they don't run in Expo Go, or aren't needed): Reanimated, Skia, MMKV, FlashList, victory-native, react-native-charts-wrapper, NativeWind, any `@react-navigation/*` package. Don't add any dependency without asking; if one is approved, add it with `npx expo install <name>`.
- **Zustand 5**: select one field or primitive per call: `usePortfolioStore((s) => s.watchlist)`. A selector that returns a new array or object (`filter`, `map`, `{...}`) must be wrapped in `useShallow` from `'zustand/react/shallow'`, or React re-renders in a loop. Screens that show saved data wait for `usePortfolioStore((s) => s.hydrated)`.
- **TanStack Query 5**: `isPending` stays true for a disabled query; use `isLoading` (pending and fetching) for spinners and skeletons. `useSchemeSearch` returns `enabled`; check it before showing results, because `keepPreviousData` keeps old results in `data`. Use `isPlaceholderData` to dim stale results while a new search loads. Use `latestNavQuery` / `navHistoryQuery` / `queryKeys`; only `'nav-latest'` is persisted to disk.
- **Lists**: `FlatList` with fixed row heights and `getItemLayout`, a memoised row component, `renderItem` wrapped in `useCallback`, and a `keyExtractor`. Never nest a `FlatList` inside a vertical `ScrollView`.
- **TypeScript 6**: `types` defaults to `[]`, so Jest globals aren't ambient. Tests import `{ describe, expect, it, jest }` from `'@jest/globals'`.
- **BigInt**: don't use `**` with BigInt (a Babel transform can turn it into `Math.pow`). Use `pow10`.
- `Alert.alert` is fine for confirmations. `Alert.prompt` is iOS-only: don't use it.
- mfapi.in: an unknown scheme code returns HTTP 200 with empty data; the client turns that into `ApiError('not_found')`. The history endpoint can lag `/latest` by a day; `useFundSeries` merges them. Closed schemes are served normally; `isStale` flags NAVs older than 7 days.

## Code style

- TypeScript strict. No `any`, no `@ts-ignore`, no non-null `!` on data that can be missing.
- Components: named exports, PascalCase files (`SchemeRow.tsx`). Route files keep their default export. Hooks: `useX.ts`.
- `StyleSheet.create` for static styles; spacing, radius and type sizes from the theme tokens.
- Accessibility: every icon-only button has an `accessibilityLabel`; touch targets are at least 44 pt (`MIN_TOUCH`, or `hitSlop`); toggles set `accessibilityState`; gains and losses are never shown by colour alone (sign plus a word in the label).
- User-facing copy is short and plain. Errors say what happened and what to do next (`describeError` already does this).

## Workflow

1. Do one phase of `docs/BUILD_PROMPT.md` at a time. At the end of each phase, run `npm run check` (and `npx expo export --platform android` from phase 2 on), then stop and summarise: files changed, how to test on a phone, anything left open.
2. Keep `docs/BUILD_LOG.md` honest: one entry per phase with decisions, problems hit, what you changed in pre-built code and why. `AI_CONTEXT.md` is written from it at the end.
3. Commit after each phase: `git add -A && git commit -m "phase N: <summary>"`.
4. Ask before deleting files, adding dependencies, or changing a domain rule.
