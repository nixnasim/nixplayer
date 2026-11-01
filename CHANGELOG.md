# Changelog

All notable changes to NixPlayer. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org) (MAJOR.MINOR.PATCH).
Older notes (1.0 to 1.5.5) are in the "Recent changes" part of `README.md`.

## [Unreleased]

### Changed
- Files opened from outside the player (Explorer, "Open with", a link, starting NixPlayer again) now open in a NEW window; everything done inside a player window (Open file / link, playlist, history, drag and drop) stays in that window. Each window has its own taskbar thumbnail buttons and sleep blocker.
- Playlist / Watch history in fullscreen: the bottom control bar now behaves like the top bar (the panel shortens above it, no extra empty space at the end of the list).
- Swipe up / down gestures are now off by default; turn them on in Settings, Controls, Gestures.
- The control bar always stays on one row: the window's minimum width is measured from the visible buttons.
- License and Third-party notices are shown inside Settings, About (Show / Hide), no external file opens.
- Double click on the title bar in fullscreen leaves fullscreen and returns to the last window size.
- A movie name that is too long for the title bar scrolls (marquee) instead of being cut.
- Mouse wheel over the Speed button steps through the Speed menu values (now with 1.75x); over Brightness it changes by 5%.
- Bookmark markers no longer peek out at the screen edge while the control bar is hidden in fullscreen.

### Added
- Bookmarks are shown on the timeline as small markers; click one to jump to it.
- Subtitle position can now go lower than the picture (into the black bar), but never out of the window.
- The Subtitles and Audio track panels open on the left side.
- Clicking the picture closes the Playlist / Watch history panel.

### Fixed
- Fullscreen / auto-hide: the Playlist and Watch history panels no longer slide under the bottom bar.
- Bookmark markers on the timeline are now small flags with a tick on the line.
- Subtitle position: press and hold Lower / Higher to move it slowly; a click is one step.
- Watch history panel: the progress bar and time follow the video live, also when you drag the timeline.
- Subtitles / Audio panel: a subtitle you add (or a track found later) appears in the track list immediately.
- New home screen (light and dark): drop zone, Open file / Open link, "Continue watching" cards from the watch history. While the home screen is shown the top and bottom bar use the NixPlayer colours; when a video is open they go back to the normal grey light / dark look.
- New installer wizard: Welcome page with logo sidebar, license, install folder (pre-selected, Browse to change, a `NixPlayer` folder is always created inside), options page with **Set NixPlayer as default player**, then a Finish page. NixPlayer is also registered in Windows "Default apps".
- Taskbar icon now shows a small play / pause badge and the playback progress along the taskbar button.
- Logo, `.exe` icon and video/audio file icon are now transparent (no dark square), so the small logo badge on video thumbnails looks clean.
- Settings → Audio → **Loudness boost** (Off / Light / Medium / Strong, default Medium): lifts quiet sound and dialogue by about 3 / 6 / 9 dB while loud scenes stay about the same, and a peak limiter prevents distortion. Measured in Chromium with test signals.

### Fixed
- The video no longer pauses when the window is minimized or covered by another window. Chromium could pause a hidden video (mostly files whose own sound is replaced by the external audio stream, or muted video). Pauses by the user (keys, click, taskbar buttons, media keys) are never undone.

## [1.6.0] - 2026-10-31

### Added
- Windows installer: first install lets you choose the folder, installs for the current user (no admin needed), creates Desktop and Start menu shortcuts. Updates never ask: they install silently into the folder chosen at the first install.
- Auto-update: NixPlayer checks GitHub Releases at start and every 6 hours. When there is a new version it asks "Update now / Later". "Update now" downloads it, installs it in the same folder and opens NixPlayer again.
- Settings → About: installed version, "Check for updates", license, third-party notices, optional Donate and Downloads buttons.
- `LICENSE` (freeware), `THIRD-PARTY-NOTICES.md`, `CHANGELOG.md`, `.gitignore`, GitHub Actions workflows (check + release), `RELEASING.md`.
