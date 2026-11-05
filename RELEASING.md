# Releasing NixPlayer

Everything lives in ONE public repo (`nixnasim/nixplayer`): the code, the history and the installers (GitHub "Releases").
The auto-updater downloads from that repo's Releases page, so no password or token is needed.

## One-time setup (about 5 minutes, no commands)

1. Install GitHub Desktop (desktop.github.com), sign in, then File → Add local repository → this folder.
2. Publish repository → **untick** "Keep this code private" → Publish.
3. On github.com open the repo → Actions tab → enable workflows → Release → Run workflow. In 5-10 minutes the installer
   appears under the repo's Releases.
4. If your GitHub username or the repo name is different, change them in `package.json` (`build.publish`, `homepage`, `nixplayer.homepage`).
   If the build fails with a 403 error: repo → Settings → Actions → General → Workflow permissions → "Read and write permissions".

Because the repo is public, the source code is visible to everyone (the `LICENSE` still forbids copying or modifying it).

## Every update

```
# 1. make your changes, then see exactly what changed
git status
git diff

# 2. save them
git add -A
git commit -m "Describe the change"

# 3. bump the version, tag it and publish (npm version edits package.json, commits and creates the tag v1.6.1)
npm version patch        # 1.6.0 -> 1.6.1   (use "minor" for new features: 1.7.0)
git push --follow-tags
```

GitHub Actions builds the installer and publishes it. Users with NixPlayer installed see
"NixPlayer 1.6.1 is available → Update now" within 6 hours (or at once via Settings → About → Check for updates).
**Release notes are automatic:** before each release, write what changed in `CHANGELOG.md` under a heading like `## [1.7.1] - 2026-11-05`
(sections Added / Changed / Fixed). The release workflow copies exactly that section into the GitHub Release, the "update available"
box shows it ("What's new:"), and after the update the first start shows "What's new in NixPlayer x.y.z" once.
If the section for the version is missing, no notes are shown.

**Build by hand instead (optional):** `npm install`, then `npm run dist` (installer in `dist/`, nothing published)
or set `GH_TOKEN` to a personal access token and run `npm run release`.

## Important rules for updates

- Never change `appId` in `package.json` (`com.nixplayer.app`): it is how Windows and the updater know it is the same app.
  (If you rename the app, rename `productName`, but keep or consciously migrate the `appId`.)
- The version must always go up. Do not re-use a version number.
- Do not delete old releases while people may still run them.

## Windows SmartScreen

Without a code-signing certificate Windows shows "Windows protected your PC / Unknown publisher" on the first install
(More info → Run anyway). Updates through NixPlayer itself work fine. Options later: Microsoft Store (free signing for
individuals, needs an MSIX/AppX build and the store's review), or a code-signing certificate.

## Donate button

Set your link in `package.json` → `"nixplayer": { "donateUrl": "https://..." }`.
The "Donate" button appears in Settings → About only when this is filled. Also edit `.github/FUNDING.yml` (shows a Sponsor button on the repo).
