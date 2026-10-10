# Design decisions

The app is for long-term investors in Indian mutual funds: people who check slowly compounding money, not traders. The one question it answers is **how is my money doing over years, and what am I following?**

Every component below was decided by the data it shows, then checked against how Groww shows the same data (studied on a real phone on 11 Oct 2026, with amounts hidden), and then given something of our own where the data allowed it.

## Direction: patient money

- **Palette:** a deep "banyan" green as the primary colour, ink text on a cool paper background, and saffron-gold only for the watch star. Gains and losses are muted, because long-term money shouldn't flash like a trading screen. Dark mode has its own tuned values, not an inverted palette. The colours are tokens in `src/theme/tokens.ts`; no screen hard-codes a colour.
- **Type:** the system font with tabular figures, so numbers line up in columns. Each screen's largest element is the number that matters.
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
| Explore idle state | where to start | recently viewed funds, then collections | Groww | each recent fund shows its NAV and today's move |

## What we deliberately left out

- **Ratings, rankings, "best funds" and category averages.** mfapi.in has no such data, and a made-up ranking would mislead.
- **Projected returns.** Every figure comes from published NAVs.
- **Logos.** None are available from mfapi.in; plan and option text does the identifying.
