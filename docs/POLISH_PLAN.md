# Polish plan: the studio pass before submission (11 Oct 2026)

Written after an audit of the app as it stands: 75 commits, typecheck clean, 29 suites and 255 tests passing, screenshots and code read screen by screen. `CLAUDE.md` still applies.

**Goal.** Make what exists feel built by a well-resourced studio, and make it effortless for a reviewer to evaluate, without widening the scope the brief warns about ("practical implementation and clear decision-making rather than over-engineering"). The one new feature here is a sample portfolio, because it lets anyone see the existing features in one tap.

**Ground rules for this pass**
- No new screens or features beyond this plan. A persona idea that needs one goes under "with more time" in AI_CONTEXT.md.
- The brief's priorities stay first: correct dates and money; loading, empty and error states; smooth large lists; validation; clear decisions.
- Everything keeps running in store Expo Go (SDK 57). No native additions (Reanimated, Skia, new native modules) without asking.
- Every animation has a reduced-motion path. Money values never animate.
- `npm run check` before every commit, one commit per item, a BUILD_LOG entry per item.

---

## 1. Audit findings

Strengths to keep: exact BigInt money and India-time dates tested on real data; typed errors and offline states; each persona feature backed by domain tests; one token system (no hex outside the theme, no `any`); a build log that shows every decision.

| # | Area | Finding | Evidence | Fix | Pri |
|---|---|---|---|---|---|
| A1 | Data honesty | Recently viewed shows NAVs without dates. On the first screen, HDFC Balanced Fund's 2018 NAV reads as current | `RecentFundRow.tsx`, screenshot 01 | Section header "NAV · 1D · as of 09 Oct"; a row whose NAV is stale shows "Stale · 01 Jun 2018" in place of the 1D move | P0 |
| A2 | Hierarchy | The fund page never shows the NAV above the chart. The hero has a return and a change; the NAV sits in key facts below the fold | `FundHero.tsx`, screenshot 02 | Hero line "NAV ₹88.9258 · 09 Oct 2026" with the 1D move beside it | P0 |
| A3 | Coherence | The hero says "+12.40% 3Y annualised" in green; the chart under it opens on 1Y and is red | screenshot 02 | Open the chart on the hero's period (3Y when available), so the first view tells one story | P1 |
| A4 | Copy | Annualised figures are written five ways: "a year", "A year (CAGR)", "3 years, a year", "a year since start", "annualised" | `grep -rn "a year" src`; screenshots 03, 04, 08 | One convention (section 6) | P0 |
| A5 | Domain language | Footnotes say "Past returns don't predict future ones", and there's no market-risk line anywhere. An AMC reviewer knows SEBI's standard wording | `ReturnsBars.tsx`, `InvestReplay.tsx`, `Consistency.tsx`, `compare.tsx` | Section 6 wording; the market-risk line once at the foot of the fund page and in the README | P0 |
| A6 | First run | A fresh install has empty Holdings and Watchlist. To see XIRR, allocation, the timeline, SIP detection or lock-in, a reviewer has to type purchases first | `holdings.tsx` empty state | Sample portfolio (P0-3) | P0 |
| A7 | Haptics | The chart ticks on every point while scrubbing, about 150 ticks across a 1Y swipe; the compare chart does the same | `NavChart.tsx` and `CompareChart.tsx` `scrubTo` | Section 5 haptic map | P1 |
| A8 | Motion | Rows appear and disappear instantly on remove, undo and add; the eye toggle and the star swap instantly | `watchlist.tsx`, `holdings.tsx`, `PrivateAmount.tsx`, `WatchToggle.tsx` | Section 5 motion spec | P1 |
| A9 | Hygiene | `LatestNavCard.tsx` and `LotRow.tsx` are unused; `docs/screenshots/05-consistency.png` is unused and shares its prefix with `05-nav-calendar.png` | open items 1 and 2 | Delete them; number screenshots in order | P0 |
| A10 | Docs | README says 150+ tests (255 now); its structure omits compare and backup; features omit backup; no reviewer tour; no motion demo | `README.md` | P0-6 | P0 |
| A11 | Docs | AI_CONTEXT's "with more time" lists things already built (portfolio XIRR, day change, grouping by fund, the icon); the brief asks for a *short* note | `AI_CONTEXT.md` | P0-6 | P0 |
| A12 | Platforms | Every device check so far ran on Android. A reviewer may open the app on an iPhone | `BUILD_LOG.md` | iOS Simulator pass (P0-5) | P0 |
| A13 | Scale | Large lists are proven for NAV history (5,052 rows), not for a large portfolio (holdings rows, XIRR, hydration) | phase 7 log | 40 funds / 600 purchases stress test (P1-3) | P1 |
| A14 | Security | Backups are plaintext with no warning; the restore field has no size cap; no written threat model | `backup.tsx`, `backup.ts` | P1-5 and `docs/SECURITY.md` (P0-6) | P1 |
| A15 | Testing | 255 unit tests, but no component or end-to-end test of a screen | `src/**/__tests__` | P1-4; Maestro flows in P2 | P1 |
| A16 | Readability | `FundLots.tsx` (511 lines) and `holdings.tsx` (441) each hold several components | file sizes | Split with no behaviour change (P1-6) | P1 |
| A17 | Data | Old test data shows ₹2,84,999.97 invested in the README's holdings screenshot | open item 5 | Clear the emulator's data; retake screenshots from the sample portfolio | P0 |

---

## 2. Personas

The six in `docs/PERSONAS.md` stay, and nothing they found may regress: re-run their tasks after P0 and after P1. Eight more, chosen to break things the first six didn't reach:

| Persona | Situation | Drives | Passes when |
|---|---|---|---|
| **Sandeep**, NRI in New Jersey | Phone on US Eastern time | Adds a purchase at 11:30 pm his time, already the next morning in India | "Today" is India's date; the picker offers it; nothing calls it a future date |
| **Neha**, budget Android | 3 GB RAM, Android 12, patchy 4G | Cold start, a long-history fund, the NAV list | Saved data shows at once; skeletons, never a blank screen; the list keeps up with a fling |
| **Imran**, QA tester | Wants to break it | Double-taps Save; toggles the star fast; pastes " 1,000 ", "1e3", "٣", "0.00001", a 12-digit number; backs out mid-save; kills the app mid-save | No duplicate purchase; every input accepted correctly or explained; no crash |
| **Aisha**, one hand, small phone | 360 × 640 dp, thumb only | Every screen | Nothing clips or overlaps; primary actions within thumb reach; targets at least 44 pt |
| **Gopal**, reads at night | Dark mode, low brightness | Every screen | Text and chart colours hold their contrast; no white flash between screens |
| **Ravi**, family CFO | 40 funds and 600 purchases from a restored backup | Holdings, sort, column switch, fund pages | Opens in about a second; scrolling and sorting stay smooth |
| **Lata**, back after a month away | Opens the app offline after 30 days | Watchlist and Holdings | Every row says what it knows ("offline", "NAV from 09 Oct") or why it can't; never an endless skeleton |
| **Zoya**, iPhone user | iOS, Expo Go | Every screen; swipes a half-filled Add holding sheet down | Feels native on iOS; a half-filled form isn't silently lost (log it if it is; fix only if `usePreventRemove` makes it simple) |

---

## 3. P0: before submission, in this order

**P0-1. Hygiene (A9).** Delete `src/components/fund/LatestNavCard.tsx`, `src/components/holdings/LotRow.tsx` and `docs/screenshots/05-consistency.png` (approved). Confirm nothing imports them, `npm run check` passes, and `git status` is clean.

**P0-2. Data honesty and copy (A1, A2, A4, A5).**
- Recently viewed: as in A1. Stale means `isStale(point.date, todayInIndia())`.
- Fund hero: NAV and its date above the chart, as in A2. Keep the 3Y headline.
- Apply the section 6 copy conventions everywhere, screen-reader labels included.
- Replace "Past returns don't predict future ones" with SEBI's wording, and add the market-risk line once, at the foot of the fund page's source note.
- Done when `grep -rn "a year" src --include=*.tsx` finds nothing user-facing, screenshots 01, 02, 04 and 08 read consistently, and tests pass.

**P0-3. Sample portfolio (A6).**
- On the empty Holdings screen, a secondary button "Explore with a sample portfolio" under "Find a fund".
- It fetches real histories and builds purchases with the existing domain rules: `planSip` for SIPs; the first NAV on or after the date for lump sums; units to 4 decimals; amount paid saved. The builder is a pure function in `src/domain/sample.ts` with tests on fixture histories; the hook only fetches and saves.
- Contents, chosen so every feature shows something. Verify each code with curl first and log the names:
  - Parag Parikh Flexi Cap Direct Growth (122639): ₹10,000 on Sun 31 Mar 2024 (a real weekend NAV) and ₹1,20,000 on 27 Oct 2025 (bought near the high, so a loss shows).
  - HDFC Mid-Cap Opportunities Direct Growth (118989): a ₹5,000 monthly SIP from 10 Jan 2022 (SIP detection and "Add instalments due").
  - UTI Nifty 50 Index Direct Growth (120716): a ₹2,000 monthly SIP from 5 Jun 2023 (the "Other" asset class).
  - Mirae Asset ELSS Tax Saver Direct Growth (135781): ₹50,000 on 15 Feb 2024 (the lock-in line).
  - Parag Parikh Liquid Direct Growth (143269): ₹25,000 on a recent weekday (debt in the allocation).
  - Watchlist: 122639, 152469 (no plan in its name) and 100121 (closed in 2018, so Stale).
- Sample items are recorded in the preferences store (lot ids and watched codes). While they exist, Holdings and Watchlist show an info Banner "Sample portfolio, priced from real NAVs" with the action "Clear". Clear removes exactly those items and nothing the user added.
- States: a spinner with "Pricing from real NAVs…"; an `ErrorState` with Retry on failure; disabled with a reason while offline.
- Done when one tap fills Holdings and Watchlist on the emulator, every figure matches the domain tests' rules, Clear restores the empty states, and the store test covers clear-only-sample.

**P0-4. Clean data for screenshots (A17).** Clear the emulator's app data (Expo Go: `adb shell pm clear host.exp.exponent`), relaunch, load the sample portfolio.

**P0-5. Platform pass (A12).** On the Android emulator, and on the iOS Simulator if Xcode is installed (`npx expo start`, then `i`). Visit every screen in light and dark mode at text size 1.0 and at the largest size. On iOS use deep links and `xcrun simctl io booted screenshot`; set text size with `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`. Fix what breaks; log the rest. Keep screenshots out of the repo, except the README set.

**P0-6. Submission docs (A10, A11, A14).**
- README:
  - a "Two-minute tour" at the top: load the sample portfolio, open Parag Parikh Flexi Cap, read the Sunday purchase, add a purchase on Fri 2 Oct 2026 and see it priced at Mon 5 Oct, go offline and reopen Watchlist;
  - a short "Beyond the brief, and why" table (each extra, the persona it serves, where its rule lives);
  - the real test count; the full structure (compare, backup, sample); backup in Features;
  - screenshots retaken from the sample portfolio at one resolution (put Consistency back as its own shot if it earns the space);
  - a 20–30 s screen recording (`adb shell screenrecord`, converted to a GIF under 8 MB if ffmpeg is installed, otherwise an MP4 linked from the README).
- DESIGN.md: the boxy radius scale, the Stale slot, the sample portfolio, and section 5's motion and haptic map (open item 9).
- New `docs/SECURITY.md`, one page: what's stored (holdings on the device, nothing on a server); the threats (lost or unlocked phone, someone looking over a shoulder, a malicious backup, a malicious API response, a malicious deep link, CSV formula injection, dependencies); how each is handled, with file references; residual risks (no encryption at rest beyond the app sandbox, plaintext backups, npm audit warnings in build-time tooling only).
- AI_CONTEXT.md: cut to a short note (about 70 lines). Keep the six strongest corrections with one line each and point to BUILD_LOG for the rest; refresh "with more time" (CAS import, Maestro end-to-end tests, a development build with app-switcher privacy, multiple portfolios); keep the author's-own-words sections and write none of their content.

---

## 4. P1: studio polish, after P0

- **P1-1. Motion (A8):** section 5.
- **P1-2. Haptics (A7):** section 5.
- **P1-3. Large portfolio (A13):** generate a backup with 40 funds and 600 purchases (real scheme codes from search, dates spread over 5 years), restore it, and measure hydration time, Holdings first render, scroll frame times (`dumpsys gfxinfo`) and sort-change time. Fix hot spots (memoise per-fund XIRR on its inputs; avoid recomputing allocation on unrelated renders), and log before and after numbers.
- **P1-4. Component tests (A15):** ask before adding `@testing-library/react-native` (a dev dependency only). Then three or four tests through `expo-router/testing-library`:
  - Add holding: invalid units show their message and block Save; a holiday date shows "next one applies";
  - Watchlist: remove, then Undo, restores the position;
  - Holdings: hidden amounts render as dots, percentages stay;
  - Explore: an offline search shows the offline error, not "Searching…".
- **P1-5. Backup hardening (A14):** a line on the backup screen ("A backup is plain text: anyone with it can see your holdings"); `maxLength` of 1,000,000 on the restore field; the restore confirmation keeps its counts.
- **P1-6. Split large files (A16):** `FundLots.tsx` into the timeline, the holding-period line and the SIP banner; `holdings.tsx` into the summary card and the list header. No behaviour change; tests and a screenshot comparison prove it.
- **P1-7. Chart opens on the hero's period (A3).**

## P2: only if everything above is done
- App-switcher privacy tied to the eye toggle (`expo-screen-capture`, which is in Expo Go; ask first).
- Maestro flows in `.maestro/` for search → fund → add purchase, and watchlist remove → undo, with run steps in the README.
- The chart's "Drag across the chart" hint disappears after the first scrub.

---

## 5. Motion and haptics

**Motion.** Tokens stay `fast 150`, `base 220` and `slow 320` ms, native driver only:
- entrances decelerate; exits accelerate; movement eases in and out;
- **list rows** inserted or removed (watchlist remove and undo, holdings remove, sample load and clear) use `LayoutAnimation` easeInEaseOut at `base`;
- **content replacing a skeleton** fades from 0 to 1 at `fast`;
- **the star**, on watch, scales 1 → 1.2 → 1 (a spring of about 180 ms);
- **the eye toggle** cross-fades amount and dots at `fast`;
- sheets, sections, selectors and the chart draw-in keep what they have.

Never animated:
- **money and percentages.** A counting number shows wrong values on the way, screen readers announce the final one anyway, and it costs frames. This is why open item 7 is declined.
- **screen transitions.** They stay native, because they're what each platform's users expect.

Reduced motion makes all of it instant through the existing hook.

**Haptics.** Keep the three kinds and add one:
- **tick (selection):** a selector moves; a calendar day is picked; the chart scrub crosses into a new month (ranges of 6M and longer) or a new point (1M and 3M); the scrub reaches the high or low mark.
- **tap (light impact):** star; eye; a section opens or closes; a swipe passes its remove threshold.
- **done (success):** a purchase or SIP saved; a restore finished; the sample portfolio loaded.
- **warning (new, notification warning):** Save tapped while the form is invalid; a destructive confirmation appears (remove holding, restore over existing data).
- **never:** scrolling, pull-to-refresh, typing.

## 6. Copy conventions

| Thing | Write | Not |
|---|---|---|
| Annualised figure | "+12.40% p.a." | "+12.40% a year" |
| Hero label | "3Y annualised" | |
| Returns groups | "Absolute" and "Annualised (CAGR)" | "A year (CAGR)" |
| Compare rows | "3 years (p.a.)" | "3 years, a year" |
| XIRR | "XIRR +11.03% p.a." | |
| Since start | "since start, p.a." | "a year since start" |
| Past performance | "Past performance may or may not be sustained in future." | "Past returns don't predict future ones." |
| Market risk (fund page foot, README) | "Mutual fund investments are subject to market risks, read all scheme related documents carefully." | |
| Screen readers | "per year" for p.a.; "gain of", "loss of" | |

Dates stay "09 Oct 2026", with "as of" for NAV dates. Copy stays one line on screen, with detail behind ⓘ.

## 7. Not doing, and why
- **Animated counting numbers** (open item 7): section 5.
- **New features from persona ideas** (notifications, CAS import, multiple portfolios, more calculators): out of the brief's scope; listed under "with more time".
- **Custom screen transitions:** the native ones fit each platform.
- **Encryption at rest:** AsyncStorage lives in the app's sandbox. Real encryption needs a native module or a JS crypto dependency for little gain on this data, so it's a documented residual risk in SECURITY.md.
