# Security and privacy

A one-page threat model for a phone app that keeps someone's mutual fund holdings.

## What is stored, and where

- **On the phone only:** the watchlist, purchases (units, date, the NAV applied, the amount paid), recently viewed funds, the hide-amounts setting and, while it's loaded, which items belong to the sample portfolio. All of it is in AsyncStorage inside the app's sandbox (`mfx.portfolio`, `mfx.preferences`), plus cached latest NAVs (`mfx.query-cache`).
- **Nothing on a server.** There are no accounts, no analytics and no crash reporting. The only network traffic is unauthenticated GET requests to `https://api.mfapi.in` for public NAV data; no user data is sent in them.

## Threats and how they're handled

| Threat | Handling | Where |
|---|---|---|
| Someone looking over your shoulder | An eye toggle hides every rupee amount of your own money (holdings, purchases, the SIP amount in labels and banners); percentages stay. Hypothetical amounts (Compare's ₹10,000, "If you had invested") are not your money and stay visible. | `PrivateAmount.tsx`, `preferencesStore.ts` |
| A lost or unlocked phone | The data is only as safe as the phone's lock screen and the app sandbox. There is no in-app lock. | residual risk, below |
| A malicious or corrupt backup | A restore is parsed, validated row by row (scheme codes, decimal strings, ISO dates, a positive NAV), and only valid rows are kept; the confirmation says how many damaged rows were left out. Every load from storage goes through the same validation, so corrupt saved data can't crash the app. | `backup.ts`, `portfolioSchema.ts` (`sanitizePortfolio`), tests in `src/store/__tests__` |
| A malicious or broken API response | Responses are treated as untrusted JSON: each field is type-checked, malformed NAV rows are skipped and counted, an unknown scheme (HTTP 200 with empty data) becomes a typed `not_found` error, and every request has a timeout (15 s, 20 s for full histories) and can be cancelled. Scheme names are only ever rendered as text. | `src/api/parse.ts`, `src/api/client.ts`, `src/api/errors.ts` |
| A malicious deep link | Route params are strings and are parsed strictly: a scheme code must be 1–9 digits and positive, or the screen shows "That link doesn't point to a scheme". Links can open screens but never write data; adding a purchase always needs the user to press Save. | `parseSchemeCode` in `src/domain/search.ts`, `InvalidSchemeLink` in `FundGate.tsx` |
| CSV formula injection | Scheme names come from an outside API and go into the purchases CSV. A text cell starting with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading apostrophe, so a spreadsheet reads it as text, not a formula. Found by a background security review; tested. | `holdingsCsv` in `src/store/backup.ts` |
| Amounts showing while hidden | A review found the "SIP ₹5,000" label and the SIP banner showed rupees with amounts hidden; both now read "SIP". | `FundHoldingRow.tsx`, `FundLots.tsx` |
| Dependencies | Expo SDK 57 packages plus TanStack Query (and its AsyncStorage persister) and Zustand; no native modules beyond what Expo Go ships. Versions are pinned by the lockfile and checked with `npx expo install --check`. | `package.json` |

## Residual risks

- **No encryption at rest beyond the app sandbox.** AsyncStorage is plain files in the app's private storage. Encrypting it needs a native module or a JS crypto dependency, which is a poor trade for data that is already sandboxed and holds no credentials.
- **Backups are plain text.** Anyone who gets a backup can read the holdings in it. The backup screen should say so (planned, `docs/POLISH_PLAN.md` P1-5).
- **The app switcher shows the last screen.** Hiding it needs `expo-screen-capture`, a new dependency (P2 in the plan).
- **`npm audit` reports 64 advisories (15 moderate, 49 high)** as of 11 Oct 2026. Traced against the app bundle (`npx expo export --platform android --source-maps`, then the `node_modules` packages named in the source map, intersected with `npm audit --json`):
  - Only five packages carry an advisory of their own: `braces`, `node-forge`, `sprintf-js`, `uuid` and `decode-uri-component`. The other 59 entries are flagged only because something they depend on is.
  - Four of the five (`braces`, `node-forge`, `sprintf-js`, `uuid`) are not in the app bundle: they are Expo CLI, Metro and test tooling that runs on the developer's machine.
  - **One ships in the app: `decode-uri-component` 0.2.2** (moderate, [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr): malformed percent-encoded input can take exponential time to decode). It arrives through `expo-router` → `query-string` 7, which decodes the query string of a link the app opens. The worst case is a crafted link that freezes the app until it is closed; no data is read or changed. The fix is in `decode-uri-component` 0.5.0, but `query-string` 7 expects 0.2.x, so forcing it with an npm override risks breaking routing, and `npm audit fix --force` would move to expo-router 58 (a different SDK). Left as is, to be picked up with the SDK 58 upgrade.
- **mfapi.in is a free community API over HTTPS** with no published guarantees; the app shows its data as-is, with the date on every NAV.
