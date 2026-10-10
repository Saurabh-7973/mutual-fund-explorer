# Runbook: building the rest with Claude Code

How to drive `docs/BUILD_PROMPT.md` with Claude Code and review each phase. About 3–5 hours of agent time plus your reviews.

## 1. One-time setup

Check Node first: it must be ^20.19.4, ^22.13.0 or ^24.3.0 (22 LTS recommended).

```bash
node -v
```

If Claude Code isn't installed yet (it needs a Pro, Max, Team, Enterprise or Console account), install it. On macOS, Linux or WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

On Windows PowerShell, use `irm https://claude.ai/install.ps1 | iex` instead. Then check it with `claude --version`.

Unzip and commit the starter as one chain, so nothing runs in the wrong folder if a step fails. Run it from the folder that holds the ZIP (on Windows, unzip with `Expand-Archive mutual-fund-explorer.zip .` instead):

```bash
unzip mutual-fund-explorer.zip && cd mutual-fund-explorer && git init && git add -A && git commit -m "Starter: verified domain core, API client, store, query layer, chart, date field"
```

Paste shell commands without inline `#` comments: zsh, the default macOS shell, doesn't treat `#` as a comment in an interactive session.

On your phone, install **Expo Go** from the Play Store or App Store. Keep the phone and the computer on the same Wi-Fi.

## 2. Kick off (Phase 0)

Start Claude Code in the project folder with the first instruction:

```bash
claude "Read CLAUDE.md and docs/BUILD_PROMPT.md. Do Phase 0 only. Log every fix and both curl results in docs/BUILD_LOG.md, commit, then stop and report: what passed, what you changed, and the curl results. Don't start Phase 1 until I say so."
```

While it runs, start the app yourself in a second terminal (`npx expo start`) and open it in Expo Go.

## 3. Each next phase

After you've reviewed a phase (section 4), send:

```text
Phase N looks good. Do Phase N+1 from docs/BUILD_PROMPT.md. Follow CLAUDE.md, run the phase's checks, add a docs/BUILD_LOG.md entry, commit, then stop and tell me exactly what to test on the phone.
```

If you're short on time, phases 1 and 2 can run together:

```text
Do Phases 1 and 2. Run npm run check after each, commit each separately, then stop after Phase 2.
```

## 4. Review each phase (10–15 minutes)

1. Read the diff: `git show --stat HEAD`, then open the screen files. You'll be asked about this code, so read it.
2. Run `npm run check` yourself.
3. Do the "On a phone" steps listed for that phase in `docs/BUILD_PROMPT.md`.
4. Check the rules held. The first command should print nothing (or only changes explained in BUILD_LOG); the second and third should find nothing, because money and dates go through `src/domain` and colours live in `src/theme`:
   ```bash
   git diff HEAD~1 --stat -- src/domain src/api src/store src/query
   grep -rnE "parseFloat|toFixed\(|Intl\.NumberFormat|new Date\('" src/app src/components
   grep -rnE "#[0-9A-Fa-f]{6}" src/app src/components
   ```
5. Change one small thing yourself (a label, a spacing token) so you've touched every part of the code before the interview.

## 5. Corrections to send when needed

- **It rewrote a verified file:** "Revert your changes to <file>. CLAUDE.md says verified modules change only with a failing test that proves a bug. If you believe there is one, show me the test first."
- **Money or date shortcuts:** "Replace <code> with the domain function (formatInr / valueLot / todayInIndia / resolvePurchaseNavWithLatest). No floats or Date parsing for money or NAV dates."
- **A new dependency appeared:** "Remove <package>. Ask before adding dependencies; everything must run in Expo Go."
- **Typecheck or tests fail:** "Stop adding features. Fix npm run check first and explain the root cause in BUILD_LOG."
- **Something looks wrong on the phone:** describe what you saw ("the chart readout overlaps the range chips on a 360-dp-wide screen") and attach a screenshot if you can.

Every correction you make here belongs in `AI_CONTEXT.md` under "what needed correction". These are the best examples to talk about in the interview.

## 6. Finish and submit

1. Phase 8 done, `npm run check` green, `npx expo export --platform android` succeeds.
2. Rewrite every **[YOU]** part of `AI_CONTEXT.md` in your own words, and remove anything you didn't do.
3. Take 3–4 screenshots (Explore, Fund, Watchlist, Holdings), add them to the README if you like, and then delete this runbook if you'd rather not submit it. Keeping it shows how you directed the AI, which the brief asks about.
4. Do a fresh clone test: `git clone <repo> /tmp/check && cd /tmp/check && npm install && npm run check && npx expo start`.
5. Push to GitHub (public, or private with access granted), make a ZIP without `node_modules` as a backup, and reply to the email with the link and the run command (`npm install && npx expo start`).
