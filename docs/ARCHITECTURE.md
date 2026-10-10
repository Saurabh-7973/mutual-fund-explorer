# Architecture and decisions

## Shape of the app

```
src/app (routes: screens only)
  │  reads API data through          reads and writes user data through
  ▼                                  ▼
src/query (TanStack Query)          src/store (Zustand + persist → AsyncStorage)
  │  calls                             │  applies rules from
  ▼                                    ▼
src/api (fetch, timeout,            src/store/portfolioSchema.ts (pure transitions,
 ApiError, response validation)      validation of saved data)
  │                                    │
  └──────────────► src/domain ◄────────┘
       pure TypeScript: dates, money, NAV rules, returns, formatting,
       validation, chart geometry. No React, no network. 140 unit tests.
```

Two kinds of state, two tools:

- **Server state** (search results, NAV histories, latest NAVs) belongs to mfapi.in. TanStack Query caches it, deduplicates requests, retries what can be retried, cancels what is no longer needed, and gives each query its own loading and error state. That last part is what keeps one failing watchlist row from breaking the others.
- **User state** (watchlist, holding lots) belongs to the user. It is two small arrays in a Zustand store, persisted to AsyncStorage with a version number and validated on every load.

Redux Toolkit would add ceremony for two arrays, and Context would re-render every consumer on each change. MMKV is faster than AsyncStorage but needs a native build, so it doesn't run in Expo Go.

## Data from mfapi.in

| Endpoint | Used for | Cache |
|---|---|---|
| `/mf/search?q=` | Explore | 1 day, memory |
| `/mf/{code}` (full history, thousands of rows) | Fund screen, NAV list, pricing a purchase | 1 hour fresh, dropped 10 min after the last screen using it closes; memory only |
| `/mf/{code}/latest` | Watchlist rows, holding values | 15 min fresh; **persisted for 7 days**, so the watchlist renders offline with its "as of" dates |

Full histories aren't persisted: a long one can exceed Android AsyncStorage's per-entry limit of about 2 MB, and refetching is cheap.

Quirks the code handles, all seen in live responses:

- An unknown scheme code returns HTTP 200, `status: "SUCCESS"`, `scheme_code: 0` and empty data. The parser turns that into a "not found" error instead of an empty fund.
- The history endpoint can lag `/latest` by a day. `mergeLatest` appends the fresher point for display.
- Closed schemes are served normally (100121's latest NAV is from 2018). Any latest NAV more than 7 days old is flagged as stale.
- Some NAVs fall on weekends (Sunday 31 Mar 2024, the financial year-end), so rules read the data, never a weekday calendar.
- Rows can be malformed or duplicated. They are skipped and counted; a response with no usable rows is an error.
- Search matches whole words, not parts of words: `hdfc` and `parag` find 15 schemes each, `hdf` and `par` find none. So the screen searches from 2 characters (enough for "JM", JM Financial) and its hint and empty state tell the user to type full words. Matching parts of words would mean downloading and filtering the full scheme list (about 40,000 names), which isn't worth it for this app.
- Search returns at most 15 results. When exactly 15 come back, Explore says so and suggests adding words.
- History accepts `startDate` and `endDate` and honours them. The app doesn't use them: it fetches the full history once and slices ranges locally.

Errors are typed (`timeout`, `network`, `rate_limited`, `http`, `not_found`, `bad_data`). Each kind decides two things: whether to retry (timeouts, network drops, HTTP 429 and 5xx retry twice with backoff; 404 and bad data don't) and what the screen says. Requests time out after 15 s (20 s for full histories). NetInfo drives TanStack's online state and AppState drives its focus state, so data refetches on reconnect and when the app returns to the foreground.

## Dates

NAV dates are Indian business dates, not instants. They are stored as `"YYYY-MM-DD"` strings, compared as strings, and counted with UTC arithmetic on calendar fields, so a phone in any time zone gets the same answer. "Today" is computed in India time (UTC+05:30). The date picker's `Date` objects are converted only at its edge.

Two lookups answer two different questions:

| Question | Rule | Used by |
|---|---|---|
| Which NAV did my purchase get? | The **first NAV on or after** the purchase date | Holdings |
| What was the NAV as of a date? | The **last NAV on or before** the date | Trailing returns, chart ranges |

The purchase rule follows SEBI's applicable-NAV rules (cut-off timings, in force since 1 Feb 2021): money realised on a day with no NAV, such as a weekend or holiday, can only be priced at the next NAV. "Nearest prior" would price it at a NAV no investor could have received. All three AI research reports I started from recommended nearest-prior; I checked the rule and didn't follow them.

Edge cases, each with a test:

- A future date is rejected ("today" in India time).
- A date before the earliest NAV in the data is rejected, and the message names that date. The data can start after a fund's real launch, so the copy says "earliest NAV available".
- A date with no NAV yet (today, before about 11 pm) is saved as **Awaiting NAV**. It is never valued with a guessed NAV, and it resolves by itself once the history contains a NAV on or after its date.
- A matched NAV more than 5 days after the purchase date triggers a warning that the history may have a gap.
- History lags `/latest` by up to a day, so `/latest` prices a pending purchase only when it is dated exactly on the purchase date. A later `/latest` date can't prove there was no NAV in between.

The form records a date, not a time, so it can't model the 3 pm cut-off. The form tells users to enter the allotment date from their statement.

## Money

- NAVs and units stay strings until they become scaled integers (BigInt): NAVs at 8 decimal places, units at 4. Units × NAV is then exact at 12 decimal places.
- Rounding happens once, at display, half away from zero, so gains and losses round symmetrically.
- Totals are summed exactly before rounding. A total can differ from the sum of the rounded rows by a paisa; the Holdings screen says so.
- Formatting is our own: Indian grouping (`₹1,23,45,678.90`), a true minus sign for losses, `+` for gains, NAVs to 4 decimals. `Intl.NumberFormat('en-IN')` was avoided because its output depends on the JS engine's locale data, and it would force a float conversion first.
- Returns follow SEBI's presentation norm: absolute below one year, compound annualised (CAGR) from one year. Every return on screen says which one it is. A single lot's CAGR equals its XIRR (one cash flow), so no solver is needed.

## Rendering performance

- A history is parsed and sorted once, in the query function. Screens derive everything with `useMemo` keyed on the series.
- The chart downsamples to about 150 points with Largest-Triangle-Three-Buckets, which keeps spikes and crashes that "every nth point" would drop. The x axis is proportional to calendar days, so a hole in the data shows as a long straight segment instead of disappearing.
- Scrubbing state lives inside the chart component, so dragging re-renders only the chart; the static path layer is memoised.
- The NAV list is a `FlatList` with one fixed row height for both row kinds (NAV and gap marker), `getItemLayout` and memoised rows. That is smooth for thousands of rows without adding FlashList.
- The chart is drawn with `react-native-svg` and scrubbed with Gesture Handler, both included in Expo Go. Skia and Reanimated were left out on purpose. They bring nothing at 150 points, and leaving them out sidesteps the Hermes memory regression that SDK 56 and early SDK 57 had in apps importing Reanimated or worklets (fixed in `expo@57.0.9`).

## Testing

The risky logic is pure TypeScript, so it is tested without a device: 140 Jest tests over dates, money, NAV rules, returns, formatting, validation, parsing, the API client (with a mocked `fetch`) and the store's transitions. Fixtures are real mfapi.in payloads captured on 10 Oct 2026, including real holiday gaps (Independence Day 2023, Good Friday 2024 with its Sunday NAV, Gandhi Jayanti 2026). UI behaviour is checked against a manual QA list on a real phone; component tests are listed as future work.

## Trade-offs

| Decision | Gave up | Why it's worth it |
|---|---|---|
| Expo Go compatibility for every library | Skia, Reanimated, MMKV, native chart libraries | Reviewers can open the app without a build |
| Persist only `/latest` answers | Offline fund screens | Small, safe storage; the offline watchlist still works |
| Lots instead of one "holding" per fund | A little more UI | Real purchases happen on different dates at different NAVs |
| Our own INR formatter | A dependency-free one-liner | Exact, identical on every engine, tested |
| No React Compiler | Automatic memoisation | Explicit memoisation where it matters is easier to reason about and to explain |
| Watchlist and holdings independent | A shortcut | Removing a fund from the watchlist never deletes typed-in purchases |

## What I'd do with more time

Portfolio XIRR across lots; import from a CAS statement; day change on watchlist rows (needs a second NAV per row); component tests with React Native Testing Library and end-to-end tests with Maestro; a development build with an app icon and splash; grouping lots by fund; a SIP calculator.
