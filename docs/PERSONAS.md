# Investor personas and what they found

Six people who would use a long-term mutual fund tracker, from a first-time investor to a professional. Each one walked through the app (on the emulator, as that person would use it), and every finding was either fixed or recorded with a reason. The findings drove the product and UX passes in `docs/BUILD_LOG.md`.

## The personas

| | Who | Money | Knows | Wants from the app | Worries |
|---|---|---|---|---|---|
| **Riya**, 24, beginner | First job in Pune; started a ₹2,000 SIP after a friend's advice | One index fund, 8 months old | What a SIP is, roughly | "Is my money growing? Did I pick a good fund?" | Jargon: NAV, XIRR, IDCW, Direct vs Regular; feels stupid asking |
| **Arjun**, 32, SIP investor | Software engineer, Bengaluru | 5 SIPs, ₹40,000 a month, 4 years | Returns, XIRR from Groww | One honest number across all his SIPs; quick to keep up to date | Typing every monthly instalment by hand |
| **Meena**, 58, near retirement | School principal, Lucknow; moving money from FDs | Debt and hybrid funds, some IDCW plans | FD interest rates | Stability, how far a fund has fallen before, large clear text | IDCW payouts and "why did my NAV drop?" |
| **Farhan**, 29, privacy-first commuter | Checks on the Mumbai local, often with no signal | Flexi cap, gold | Comfortable | Works offline; numbers hidden from people beside him | Others seeing his balance |
| **Kavya**, 35, screen-reader user | Chartered accountant, uses TalkBack | Large-cap and ELSS | A lot | Every figure spoken with its meaning; no gesture-only actions | Apps where swipes and charts are invisible to TalkBack |
| **Vikram**, 41, expert | Ex-analyst, manages family money in a spreadsheet | 12 funds, direct plans only | Rolling returns, drawdowns, expense ratios | Dense, exact data; risk, not only return; codes and ISINs | Pretty apps that hide the numbers he needs |

## What each found, and what we did

### Riya (beginner)
- *"What's NAV? What's XIRR? What does IDCW mean on my fund?"* The app used the terms correctly but never explained them. → **Glossary:** key terms are tappable wherever they appear, and open a two-line plain explanation.
- *"Is 12.40% good?"* A number without context. → The fund page's consistency section already answers "how did holding it for 3 years usually go"; the glossary explains why a 3-year yearly return is the number to judge by.
- *"Direct or Regular, which is mine?"* → The Direct/Regular badge is explained in the glossary (same fund, lower costs in Direct).

### Arjun (SIP investor)
- *"I have 48 instalments. Am I supposed to type 48 purchases?"* The add-holding form took one purchase at a time. → **Add a SIP in one go:** monthly amount, start date and day; the app prices every instalment at its first NAV on or after the date, the same rule as a single purchase.
- *"Which of my SIPs is dragging?"* → Holdings already sorts by XIRR; with SIPs entered in one go, the XIRR is meaningful.
- *"The preview says ₹2,84,999.97 invested, but I paid ₹2,85,000."* Units are rounded to 4 decimals, so units × NAV fell 3 paise short. → The SIP preview shows the rupees actually paid and the gain against them (`sipGain`).
- *"My fund page is a 57-row list now."* → The purchase timeline shows the latest 4 and "Show 53 earlier purchases".
- *"The date picker looks like a different app, and scrolling back to 2022 takes forever."* → The app's own calendar: tap the month to jump to a year; dates outside the fund's data are greyed out.

### Meena (near retirement)
- *"How badly can this fall?"* Returns were shown, risk was not. → **Worst fall (maximum drawdown):** how far the NAV fell from a peak, when, and how long it took to recover, in the consistency section and its collapsed summary. For Parag Parikh Flexi Cap: −31.20% from 13 Feb to 24 Mar 2020, back above the old high by 7 Jul 2020.
- *"The text in the calendar is too small / too big for the circles."* → Calendar text is capped at 1.3× like every fixed-size cell.
- *"My IDCW fund's returns look low."* → Already footnoted (NAV-based, IDCW payouts not added back); the glossary repeats it in plain words.

### Farhan (privacy-first, offline)
- Amounts hide with the eye and stay hidden after a restart; the watchlist and holdings work offline from saved NAVs with their dates. No new issue found.

### Kavya (screen reader)
- Swipe-to-remove has a matching accessibility action; gains and losses are spoken as "gain of" and "loss of"; the chart has a spoken summary. → Checked that new controls (selectors, sections, glossary terms) announce role and state.

### Everyone
- *"There's no back arrow on the fund page until I scroll."* (found by the user) → A header title that rendered nothing also hid the back button; fixed.

### Vikram (expert)
- *"Show me the drawdown and recovery, not just CAGR."* → The maximum drawdown above.
- *"I want the ISIN and code without hunting."* → Key facts show the code, the footnote the ISIN; both are selectable text.
- *"Ten-year return?"* → Added 3M and 10Y periods in the earlier pass.
