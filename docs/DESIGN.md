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
| Explore idle state | where to start | recently viewed funds, then collections | Groww | each recent fund shows its NAV and today's move |

## What we deliberately left out

- **Ratings, rankings, "best funds" and category averages.** mfapi.in has no such data, and a made-up ranking would mislead.
- **Projected returns.** Every figure comes from published NAVs.
- **Logos.** None are available from mfapi.in; plan and option text does the identifying.
