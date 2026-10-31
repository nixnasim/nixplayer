# Releasing NixPlayer

Source code lives in a **private** repo. Installers go to a separate **public** repo
(`nixnasim/nixplayer-releases`), because the auto-updater has to download them without a password.

## One-time setup (about 10 minutes)

1. **Private source repo**: on GitHub create a repo (for example `nixplayer`), visibility **Private**, empty (no README).
   In this folder run:
   ```
   git remote add origin https://github.com/nixnasim/nixplayer.git
   git push -u origin main
   ```
2. **Public releases repo**: create `nixplayer-releases`, visibility **Public**. Upload the files from `nixplayer-releases-template/`
   (README, FUNDING.yml). It holds only installers and release notes, never the source.
3. **Token**: GitHub → Settings → Developer settings → Fine-grained tokens → new token, only repository `nixplayer-releases`,
   permission *Contents: Read and write*. In the private repo: Settings → Secrets and variables → Actions → new secret `RELEASES_TOKEN` = that token.
4. If your GitHub username or the repo names are different, change them in `package.json` (`build.publish`, `homepage`, `nixplayer.homepage`).

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
Add a line to `CHANGELOG.md` for each release; you can paste it into the release notes on GitHub.

**Build by hand instead (optional):** `npm install`, then `npm run dist` (installer in `dist/`, nothing published)
or `set GH_TOKEN=<token>` and `npm run release`.

## Important rules for updates

- Never change `appId` in `package.json` (`com.nixplayer.app`): it is how Windows and the updater know it is the same app.
  (If you rename the app, rename `productName`, but keep or consciously migrate the `appId`.)
- The version must always go up. Do not re-use a version number.
- Do not delete old releases in the releases repo while people may still run them.

## Windows SmartScreen

Without a code-signing certificate Windows shows "Windows protected your PC / Unknown publisher" on the first install
(More info → Run anyway). Updates through NixPlayer itself work fine. Options later: Microsoft Store (free signing for
individuals, needs an MSIX/AppX build and the store's review), or a code-signing certificate.

## Donate button

Set your link in `package.json` → `"nixplayer": { "donateUrl": "https://..." }`.
The "Donate" button appears in Settings → About only when this is filled. Also edit `nixplayer-releases-template/.github/FUNDING.yml`.
