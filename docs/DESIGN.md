# Design decisions

The app is for long-term investors in Indian mutual funds: people who check slowly compounding money, not traders. The one question it answers is **how is my money doing over years, and what am I following?**

Every component below was decided by the data it shows, then checked against how Groww shows the same data (studied on a real phone on 11 Oct 2026, with amounts hidden), and then given something of our own where the data allowed it.

## Direction: patient money

- **Palette:** a deep "banyan" green as the primary colour, ink text on a cool paper background, and saffron-gold only for the watch star. Gains and losses are muted, because long-term money shouldn't flash like a trading screen. Dark mode has its own tuned values, not an inverted palette. The colours are tokens in `src/theme/tokens.ts`; no screen hard-codes a colour.
- **Type scale** (system font, tabular figures so numbers line up): `display` 28 for a tab's title, `figure` 32 for the one number a screen is about, `title` 20 for a fund's name, `heading` 16 for section titles, `body` 15, `labelStrong` 13/600 for a fund's name in a list, `label` 13 for values and meta, `caption` 12 for dates and footnotes. No screen sets its own font size or weight.
- **Chrome:** no separate header bar. Each tab draws a large title on the page with its one action on the right (Holdings: hide amounts); stacked screens use a header the colour of the page, without a shadow. The tab bar uses the surface colour with a soft pill behind the active icon, the pattern Android users know from Material 3, and clears the gesture bar.
- **One selector style:** ranges, amounts, periods and holding views all use the same equal-width row with a soft pill on the choice, instead of a mix of bordered chips.
- **Show the takeaway first, the detail on request.** Nothing is put on screen just because the data exists.

## Components

| Component | Data | Representation | Reference | Our addition |
|---|---|---|---|---|
| Holdings summary | current value, today's change, total return, invested, XIRR | a big figure, then labelled key/value rows | Groww dashboard | XIRR only once the oldest purchase is a year old (no annualising short periods, as for CAGR); an allocation bar when you hold 2 or more funds; "saved on this phone, nowhere else" |
| Hide amounts (eye) | your rupee amounts | `•••••`; percentages stay visible | Groww | remembered across launches; covers the fund page and each purchase too |
| Holdings rows | one fund: value, invested, return, XIRR | two lines (fund, then plan · option · purchases) and **one** figure on the right | Groww | a switch above the list chooses Current (invested), Returns (%) or XIRR; swipe left to remove all of a fund's purchases, after a confirmation |
| Watchlist rows | latest NAV, its date, today's change | three aligned lines: name and NAV; plan badges and today's change; fund house and "as of" date | Groww shows 3Y return; Kite and Coin show the day's change | a Stale badge after 7 days without a NAV; swipe to remove with Undo instead of an ✕ on every row; a screen-reader action for the same |
| Fund page hero | identity, the return to judge it by, today's move | name, then "Direct · Growth · Equity · Flexi Cap", then the **3Y annualised** return as the figure, then today's move | Groww | falls back to 1Y or since start when the history is short; a closed scheme's warning sits here, not below the fold |
| Chart | NAV over a range | the line on the page, not in a card, with the ranges right under it | Groww | scrub to read any date; low and high from the full range |
| Key facts | NAV with its date, fund house, data since, code | 2 × 2 grid, label above value | Groww | — |
| Your investment | your value, return, XIRR, each purchase | first after the facts when you hold the fund; one compact row per purchase | Groww's per-fund detail | swipe a purchase to remove it after confirming |
| Returns | 1M to since start | a bar chart from a shared zero line, with the exact figure and "absolute" or "a year" on each row | Groww's table | bar length makes periods comparable at a glance |
| If you had invested | a SIP or one-time investment replayed | chips for amount and period, then the value today, the gain and XIRR | Groww's return calculator | replays the fund's **real NAVs** with the same purchase rule as a holding (first NAV on or after each date), not an assumed rate |
| How consistent were returns? | rolling 3- and 5-year CAGR | a worst–best range with the typical result marked, and how often a holding period lost money | none of the apps studied show this | answers "had I bought on any day and held N years?", which suits long-term investors better than one trailing number |
| Sections | everything below the facts | collapsible, Returns open by default | Groww collapses everything | a closed section still states its takeaway ("3-year holds: +0.74% to +37.64% a year") |
| Primary action | add a purchase | a sticky bar at the bottom | Groww's One-time / Start SIP bar | the label becomes "Add another purchase" when you hold the fund |
| Header on scroll | the fund and its headline | name plus "+12.40% 3Y annualised" | Groww | — |
| Asset allocation | current value by asset class, or by fund | one stacked bar with every slice named and its share printed; a switch between **Asset class** (first) and **Fund** | Groww shows equity/debt splits | asset class from AMFI's category, with the scheme name for index funds and ETFs filed under "Other"; colours run through the dataviz validator on both card surfaces (colour-blind separation passes); colour follows the class, so Equity is always the same blue |
| Holdings list order | the figure in view | a sort arrow beside the column switch reverses it; funds without that figure stay last | a quick-sort row (a label plus a glyph showing what is sorted and which way) | — |
| Your investment | value, return, XIRR, invested, today's change, units, each purchase | a header, then a three-cell strip (Invested · 1D · Units), then the purchases on a timeline | a holding card (header over a cell strip) and a history timeline | each purchase shows your average cost after it, and the timeline ends at today's NAV beside your average: a statement-style view no MF app we studied shows |
| Returns periods | 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y, since start | as above | Groww (1M–All), Value Research (adds 3M and 10Y) | 10Y shows only when the history reaches back that far |
| Empty watchlist | where to start | recently viewed funds with a star each, then collections | Groww's trending list with bookmark buttons | uses funds you've already looked at instead of a "trending" list we have no data for |
| Compare | two funds' growth, returns, consistency, worst fall | growth of ₹10,000 from the same day on **one** axis (rebased, never two scales) in the validated chart colours, then a two-column table | Value Research's fund comparison, Groww's "compare similar funds" | the risk rows (worst fall, share of losing 3-year holds) sit next to the return rows, so a higher return's cost is visible |
| Monthly SIP entry | amount, start date → every instalment | one form, a preview with instalments, value, gain against rupees paid and XIRR | none of the apps studied (they import statements instead) | each instalment priced with the same purchase rule as a single purchase; unpublished NAVs are left out with a note |
| Date picker | a purchase or SIP start date | the app's own calendar sheet: tap the month to jump years, out-of-range dates greyed, Today shortcut | Material date pickers | colours and type from the app; the system dialog drew in the host app's colours |
| Glossary | NAV, XIRR, CAGR, absolute, 1D, Direct/Regular, Growth/IDCW, stale, awaiting NAV, rolling, drawdown, asset class, average cost | a small ⓘ beside the term opens a two-to-three sentence explanation | Groww's info buttons | written for the beginner persona; the expert ignores a 14-point icon |
| Worst fall | maximum drawdown and recovery | a red figure, the peak and trough with dates, and the recovery time in words | Value Research's risk measures | in the consistency section and its collapsed summary, so risk is never more than one look away |
| Holding periods | each purchase's allotment date, the scheme's category | one quiet line under the strip, only when something is pending: units still locked (ELSS) or short-term (equity), the next date and the last; "Lock-in ends …" on each ELSS purchase | — (not checked in the apps studied) | dates run from allotment (the NAV date); silent for categories whose tax treatment the data can't tell |
| Large text | the same figures at 2× | three-cell strips become label/value rows above 1.3×; fixed-height chrome (tab bar, list rows) caps at 1.3× | Android accessibility guidance | checked at font scale 2.0 on every screen we changed |
| Explore idle state | where to start | recently viewed funds, then collections | Groww | each recent fund shows its NAV and today's move |

## Studio pass (11 Oct 2026)

| Component | Data | Representation | Reference | Our addition |
|---|---|---|---|---|
| Typeface | every word and figure | Inter (bundled, four weights), tabular figures for money | Revolut, Linear | each weight its own family, so Android draws the right weight |
| Brand mark | the app's identity | a compounding curve rising from its ground line, white on banyan green | — | generated by `scripts/make-icons.py`, adaptive and monochrome variants |
| Fund-house monogram | the scheme's AMC | a muted badge with two or three letters (PP, HD, UTI) at the start of every fund row and on the fund page | Groww's AMC logos | mfapi.in has no logos; colour stable per house, six tones tuned for light and dark |
| Selectors | a mode or a value | a sliding track with a raised thumb for modes (One purchase / SIP, Calendar / List, Asset class / Fund); a sliding soft pill for values (ranges, amounts) | iOS segmented control | one component, the marker slides (220 ms), off with reduced motion |
| Holdings sort | any figure, either way | a sheet: one choice per row, direction under the chosen one ("A to Z" for names) | Groww's sort sheet | independent of the column shown; Day change added as a fourth column |
| Large titles | the tab's name and status | the title scrolls away; a slim bar fades in a small title and a hairline | iOS / Material large titles | subtitle is status ("NAVs as of 09 Oct 2026"), never a tip |
| NAV chart | NAV over a range | high and low marked on the line at their dates; a quiet fixed-height readout; draws in left to right on a new range | Groww, Kite | while scrubbing, the change from the range's start |
| Returns | trailing returns | two groups headed by their glossary term (Absolute, Annualised (CAGR)), one line each, the zero line placed by the data | — | half the height of the earlier two-line rows |
| NAV history | every NAV | a month calendar of business days, each tinted by the size and direction of its move, the % always printed; List one tap away | the app's own purchase calendar | a month's rhythm at a glance; holidays and gaps visible |
| Holding periods | allotment dates, AMFI category | "Short-term ₹1,11,541.58 of ₹1,22,695.72 · Next turns long-term 28 Oct 2026"; ELSS lock-in per purchase | Groww's investment details | from the allotment (NAV) date; silent where the tax class can't be told |
| Sheets | a short task or explanation | the dim fades while the sheet glides up; reverses on close | Material bottom sheets | shared by glossary, calendar, sort |
| Haptics | touch | tick for choices and scrubbing, tap for toggles, success on save | iOS / Android guidelines | three kinds only, so the app feels consistent |
| Explore collections | starting points | a two-column grid of cards with an icon and one line on what each holds | Groww's collections | no return claims; each just runs a search |
| Copy | explanations | one line on screen; the rest behind ⓘ | — | seven paragraphs cut |

## Polish pass (11 Oct 2026)

| Component | Data | Representation | Reference | Our addition |
|---|---|---|---|---|
| Corner radius | every surface | one scale by role: tags 4, chips and selector thumbs 6, buttons, inputs, tracks and the tab highlight 10, cards 14; fully round only for data bars | Material 3 shape scale | a tag is boxier than a card, so size and role read together |
| Watchlist status slot | today's move, or that there is no recent NAV | the right of the middle line holds the day's change; a fund with no NAV for 7 days shows **Stale** there instead | — | every row reads name / NAV, tags / status, house / date; tags have a fixed 20 pt height so they line up with text |
| NAV dates in lists | the date each latest NAV is from | the section header carries the date most rows share ("NAV · 1D · as of 09 Oct 2026"); a row on another day prints its own date, a stale row "Stale · 01 Jun 2018" | Groww's watchlist | a weekend NAV (liquid funds) doesn't push every other row to print a date |
| Fund hero | the NAV and its date | "NAV ₹88.9258 +₹1.2703 (+1.45%) as of 09 Oct 2026" under the 3Y figure, above the chart | Groww, Kite | the NAV was below the fold before |
| Yearly figures | annualised returns | "p.a." on screen ("+12.40% p.a.", "since start, p.a."), "per year" for screen readers | AMC factsheets | one convention instead of five |
| Disclaimers | — | SEBI's past-performance sentence on every returns footnote; the market-risk line once, at the foot of the fund page | SEBI advertisement code | — |
| Platform chrome | the same screens on Android and iOS | everything the app draws (layout, type, colour, spacing, figures) is identical; the system's own chrome follows each platform: iOS 26's glass capsules for header buttons, centred stack titles, the edge swipe back and sheet-style modals on iOS; plain icons, left titles and system Back on Android | Apple's and Google's platform guidelines | the Add holding sheet gets a Cancel button on iOS, where a sheet has no back arrow |
| Sample portfolio | real funds priced from real NAVs | a secondary button on the empty Holdings screen; a blue banner with Clear on Holdings and Watchlist while any sample item is saved | product tours | priced by the same domain rules as a typed purchase; Clear removes only what it added |

### Motion and haptics, as built

Motion tokens are `fast` 150 ms, `base` 220 ms and `slow` 320 ms, on the native driver only; reduced motion makes all of it instant (`useReducedMotion`).

| Moment | Motion | Haptic |
|---|---|---|
| A selector changes | the marker slides (`base`) | tick |
| A section opens or closes | the page eases apart (`LayoutAnimation`), the chevron turns | tap |
| A sheet opens or closes | the dim fades while the sheet glides by its own height | — |
| A chart range changes | the line draws in left to right; snaps to drawn if interrupted | tick |
| Scrubbing a chart (NAV and Compare) | crosshair and readout follow the finger | tick on each new point over 1M and 3M, on each new month over longer ranges, and on reaching the marked high or low (`scrubTickKey`) |
| Star, eye | — (cross-fade and a small scale are plan P1-1) | tap |
| Save a purchase or SIP; load the sample; a restore finishes | — | done |
| Save on an invalid form; a confirmation before removing or replacing data | — | warning |
| Button press | scales to 0.97 and back | — |

Never animated: money and percentages (a counting number shows wrong values on the way), and screen transitions (they stay native to each platform).

## What we deliberately left out

- **Ratings, rankings, "best funds" and category averages.** mfapi.in has no such data, and a made-up ranking would mislead.
- **Projected returns.** Every figure comes from published NAVs.
- **Logos.** None are available from mfapi.in; plan and option text does the identifying.
