# AI_CONTEXT

> **Draft.** Sections marked **[YOU]** need your own words before submission. Everything else is taken from `docs/BUILD_LOG.md`, including Claude Code's corrections from phases 0–8.

## AI tools used

- **Claude (claude.ai):** research and fact-checking, then writing and testing the domain core (dates, money, NAV rules, the API client, the store's rules).
- **Claude Code:** building the screens from a phased plan (`docs/BUILD_PROMPT.md`), with project rules in `CLAUDE.md`. I reviewed each phase before starting the next.
- **[YOU]** Name the tools behind the three earlier research reports I started from (for example ChatGPT or Gemini deep research).

## How I directed them

- I treated AI output as a draft to verify. Each claim the design rests on was checked against a primary source: live mfapi.in responses, SEBI and AMFI rules, and Expo SDK 57's own source and docs.
- I ordered the work by risk. The logic that's easy to get subtly wrong (dates, money, NAV rules) was written first as pure TypeScript with tests built on real API data. The UI came afterwards, generated against those tested functions.
- I wrote the rules down for the coding agent (`CLAUDE.md`): no floats for money, no `new Date('YYYY-MM-DD')`, nothing that doesn't run in Expo Go, and verified modules left alone unless a failing test proves a bug. Each phase had a gate: type-check, tests, bundle and a check on a phone.
- When a phase needed a new rule (search result cap, chart range labels, gain/loss direction, holdings sort order), it went into `src/domain` with tests instead of into a screen. Every change to pre-built code is listed in the build log.
- I tested each phase on my phone and sent back what I saw. From Phase 5 on I had Claude Code run the test points itself on an Android emulator through adb, and report what passed and what it couldn't check.

## Where AI helped

- Mapping what the API really does: an unknown code returns HTTP 200 with empty data, history lags `/latest` by a day, a NAV exists on Sunday 31 Mar 2024, and closed schemes are still served.
- Exact-money and calendar code, with tests that use real holiday gaps from the data.
- Generating screens quickly against a precise spec.
- Checking assumptions against the live API instead of guessing (whole-word search, the 15-result cap, date ranges, two-letter queries such as "jm").
- Driving the emulator for QA: deep links, the accessibility tree, airplane mode, dark mode, the largest font size and frame timing. That pass found the large-font overflows in Phase 7.
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

During the Claude Code phases (details and dates in `docs/BUILD_LOG.md`):
- **Pasteable setup commands.** An AI-written setup guide put inline `#` comments in shell blocks. zsh doesn't treat `#` as a comment when pasted, and because the steps were separate lines, `git init` ran in `~/Documents` after `unzip` failed there. The docs now have no inline comments, and dependent steps are chained with `&&`.
- **Search was assumed to match parts of words.** On my phone "par" found nothing while "parag" found 15. Claude Code checked the live API (`par`, `hdf` → 0; `parag`, `hdfc` → 15) instead of guessing, then changed the hint and empty-state copy rather than downloading all ~40,000 schemes. A follow-up check showed `jm` returns 15 JM Financial schemes, so the minimum query length went from 3 to 2.
- **Money done in its head.** Claude Code's Phase 4 test notes said "Invested ≈ ₹9,390.80, Value ≈ ₹11,154.05". The exact figures are ₹9,390.91 and ₹11,154.14 (gain +₹1,763.24, +18.78%). The app showed the right numbers because they come from BigInt maths in `valueLot`, asserted in `valuation.test.ts`. Rule since: expected money values come from the domain functions or the tests, never hand arithmetic.
- **A skipped check.** One small fix was committed after only the type check, "to save resources". Rule since: `npm run check` before every commit.
- **Pull to refresh broken on Android.** The fund screen mixed Gesture Handler's `ScrollView` with React Native's `RefreshControl`; it needs Gesture Handler's `RefreshControl`.
- **Offline searches never ended.** TanStack Query pauses a query offline instead of failing it, so the screen showed neither an error nor a spinner, and with previous results kept it would show "Searching…" forever. Paused queries with no data now show the offline error.
- **Layout bugs I spotted on the phone:** filters stayed on after clearing the search; the empty state sat partly behind the keyboard (SDK 57 Android is edge-to-edge, so the keyboard overlaps instead of resizing); the "Stale" badge stacked under the date read as belonging to the next row; the empty fund header bar.
- **Found in the Phase 7 emulator pass:** at the largest font size, holdings rows overflowed (the signed amounts ignored the 1.3× cap) and NAV dates wrapped; list headers weren't counted in `getItemLayout` offsets; watchlist rows without plan badges didn't line up.
- **A security issue caught by an automated review.** The purchases CSV export copied scheme names (from an outside API) straight into cells; a name starting with `=` or `+` would run as a spreadsheet formula. A background security review flagged it; text cells are now neutralised, with tests.
- **A navigation bug I found on the phone:** the fund page had no back arrow until you scrolled. A header title that rendered nothing also removed the back button.
- **An edit that silently didn't apply.** After a formatter reflowed a line, a scripted text replacement matched nothing and the SIP banner kept its old wording; the emulator check caught it.
- **Agent tests with wrong assumptions:** two new tests failed because the test, not the code, was wrong (a holiday on the wrong day; a 31st-of-month SIP after a clamped February). The second one exposed a real gap in the SIP detection, which was then fixed.
- **Product gaps found by walking through six investor personas** (`docs/PERSONAS.md`): no explanations for beginners (now a glossary), no way to enter years of SIP instalments (now one form, plus "Add instalments due"), no risk measure (now the worst fall and recovery), no comparison (now Compare), and data that lived only on the phone (now backup, restore and CSV).
- **Not every surprise was a bug.** Expo Go's "Failed to download remote update" in airplane mode is development-only (it fetches the bundle from Metro at each launch); `adb reverse` made offline cold starts testable. The plan expected 3 Direct Growth Parag Parikh plans; the live data now has 4.

- **A fresh clone wouldn't install.** Adding a dependency exposed that `npm install` on a clean clone failed (ERESOLVE): the lockfile carried `react-dom@19.3.0`, an optional Expo peer that needs React 19.3, while SDK 57 pins 19.2.3. A reviewer's first command would have failed. Fixed with an `overrides` pin, verified with `npm ci` in an empty directory. The first attempted fix (`--legacy-peer-deps`) rewrote 500 lockfile lines and dropped packages, so it was reverted.
- **A formatter run without the repo's config.** `npx prettier` (no config in the repo) rewrote five files to double quotes; they were restored from git and edited again by hand.
- **A wrong first diagnosis.** Missing list dividers looked like a tall badge painting over the border; moving the divider changed nothing. Measuring row bounds showed the cause: 92 dp is 241.5 px at 420 dpi, so alternate rows overlapped by a pixel. Row heights are now rounded to whole pixels.
- **A privacy leak.** The new "SIP ₹5,000" row label showed money with amounts hidden; the background security review flagged it, and it now reads "SIP".
- **Invested didn't match the statement.** SIP instalments showed ₹4,999.99 because invested was units × NAV. Real apps and CAMS statements count the rupees paid; with approval, purchases now store the amount (optional, backward-compatible).
- **"Is the list I gave you mine or yours?"** When I asked whether the to-do list had anything Claude found itself, it admitted it was mostly my own asks, then did its own critical audit of every screen (16 findings: duplicated figures, labels repeated per row, a pinned title wasting space, dots misaligned, tips in subtitles) and fixed them.
- **A chart animation that stopped halfway.** The draw-in reveal was cancelled by re-renders; it now runs only when the range changes and finishes if interrupted.

**[YOU]** Say in your own words how you caught these (what you saw on the phone, what made you push back) and which ones mattered most to you.

## Key decisions and trade-offs

- **TanStack Query for server data, Zustand for user data.** Different lifecycles: the cache, retries, cancellation and per-row states come from TanStack, while two small arrays don't need Redux.
- **Exact money:** BigInt scaled integers, rounded once at display; our own Indian-format formatter instead of `Intl`.
- **Expo Go compatibility as a hard rule:** SVG chart, AsyncStorage, no Reanimated, no Skia. Reviewers can run it without a build.
- **Persist only latest NAVs** (offline watchlist), not full histories (they can exceed Android's per-entry storage limit).
- **Lots, not one holding per fund**, because real purchases happen on different dates at different NAVs.
- **Fixed-height list rows with a 1.3× font cap**, so long lists stay smooth and nothing overlaps at the largest font size; text truncates with an ellipsis instead.
- **Tell the user about API limits instead of working around them:** whole-word search and the 15-result cap are explained in the UI rather than solved by downloading the full scheme list.

Details are in `docs/ARCHITECTURE.md`.

## An example where I overrode the AI

All three research reports said a weekend or holiday purchase should use the **nearest previous NAV**. I checked SEBI's applicable-NAV rules. A purchase gets the NAV of the day the money is realised before the cut-off, so money that arrives on a day with no NAV can only be priced at the **next** NAV. Nearest-prior would value a Saturday purchase at Friday's NAV, a price that purchase could never have got.

The app uses the first NAV on or after the purchase date. If that NAV isn't published yet, the lot is saved as "Awaiting NAV" rather than valued with a guess. Trailing returns still use the NAV on or before each date, because they answer a different question: what the NAV was as of that day. The tests use real dates: Independence Day 2023 maps to 16 Aug, and Good Friday 2024 maps to Sunday 31 Mar 2024, a real weekend NAV.

**[YOU]** Optionally add a second example from the Claude Code phases. Candidates from the log: whole-word search (my phone test disproved the plan's assumption), or the hand-computed money figures that the tested code got right.

## What I'd improve with more time

Portfolio XIRR across lots; import from a CAS statement; day change on watchlist rows; component tests (React Native Testing Library) and end-to-end tests (Maestro); a development build with a proper icon and splash; grouping lots by fund; and a SIP calculator.
