# Changelog

All notable changes to NixPlayer. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org) (MAJOR.MINOR.PATCH).
Older notes (1.0 to 1.5.5) are in the "Recent changes" part of `README.md`.

## [1.6.0] - 2026-10-31

### Added
- One-click Windows installer: no folder question, installs for the current user (no admin needed), creates Desktop and Start menu shortcuts.
- Auto-update: NixPlayer checks GitHub Releases at start and every 6 hours. When there is a new version it asks "Update now / Later". "Update now" downloads it, installs it in the same folder and opens NixPlayer again.
- Settings → About: installed version, "Check for updates", license, third-party notices, optional Donate and Downloads buttons.
- `LICENSE` (freeware), `THIRD-PARTY-NOTICES.md`, `CHANGELOG.md`, `.gitignore`, GitHub Actions workflows (check + release), `RELEASING.md`.
