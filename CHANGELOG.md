# Changelog

All notable changes to NixPlayer. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org) (MAJOR.MINOR.PATCH).
Older notes (1.0 to 1.5.5) are in the "Recent changes" part of `README.md`.

## [Unreleased]

### Added
- Settings → Audio → **Loudness boost** (Off / Light / Medium / Strong, default Medium): lifts quiet sound and dialogue by about 3 / 6 / 9 dB while loud scenes stay about the same, and a peak limiter prevents distortion. Measured in Chromium with test signals.

### Fixed
- The video no longer pauses when the window is minimized or covered by another window. Chromium could pause a hidden video (mostly files whose own sound is replaced by the external audio stream, or muted video). Pauses by the user (keys, click, taskbar buttons, media keys) are never undone.

## [1.6.0] - 2026-10-31

### Added
- Windows installer: first install lets you choose the folder, installs for the current user (no admin needed), creates Desktop and Start menu shortcuts. Updates never ask: they install silently into the folder chosen at the first install.
- Auto-update: NixPlayer checks GitHub Releases at start and every 6 hours. When there is a new version it asks "Update now / Later". "Update now" downloads it, installs it in the same folder and opens NixPlayer again.
- Settings → About: installed version, "Check for updates", license, third-party notices, optional Donate and Downloads buttons.
- `LICENSE` (freeware), `THIRD-PARTY-NOTICES.md`, `CHANGELOG.md`, `.gitignore`, GitHub Actions workflows (check + release), `RELEASING.md`.
