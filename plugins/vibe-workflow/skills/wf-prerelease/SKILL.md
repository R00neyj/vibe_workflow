---
name: wf-prerelease
description: vibe-workflow stage 10 (Release). Deploy a pre-release for internal testing and record the version and URL. Use when the user says "pre-release", "deploy to staging", "put it on the test server", "preview deploy", "beta deploy".
---

# wf-prerelease — 10. Pre-release [Release]

Before starting, Read `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` and follow the common procedure. Stage key: `prerelease`.

## Steps

1. **Pre-deploy check** — all `WFCTL check` pass; no secrets in the repository (check whether `.env` is committed). Mark results in the checklist.
2. **Deploy target** — if `deploy.prerelease` in `.workflow/config.json` is empty, choose a target (Vercel/Netlify/GitHub Pages/own server/other) via `AskUserQuestion` and fill in the command. If the user wants manual deploy, leave it empty.
3. **Deploy** — this goes outside, so confirm via `AskUserQuestion` right before running, then `WFCTL deploy prerelease`. If manual, guide the user through the steps and collect the resulting URL.
4. **Post-deploy check** — actually open the URL and perform one core task. If it fails, fix and redeploy.
5. **Record** — version (default `0.x.0-rc.N`), date/time, URL, method. Also fill the marker's `version` and `url`.

## Done

Once access is confirmed: `status: deployed` → Decision log → `WFCTL sync` → `/wf-internal-test`.
