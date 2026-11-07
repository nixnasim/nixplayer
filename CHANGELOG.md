# Changelog

All notable changes to NixPlayer. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org) (MAJOR.MINOR.PATCH).
Older notes (1.0 to 1.6.0) are at the bottom of this file.

## [Unreleased]

## [1.7.4] - 2026-11-07

### Fixed
- Settings: the title box had a coloured background in every theme (a name clash with the new thumbnail placeholder).
- The audio animation is dimmed behind Settings, so it no longer shows through the Glass panel.

## [1.7.3] - 2026-11-07

### Added
- **SRT and VTT file association.** Double-clicking a subtitle opens NixPlayer; the video with the same name in that folder is loaded together with it.
- **Update screen.** After "Update now" a progress screen shows the download (percent, size, speed) and then "Installing the update".
- **Audio animation.** Audio files (MP3, M4A, FLAC and so on) show the logo with moving sound bars instead of a black screen.

### Fixed
- History, Continue watching and playlist thumbnails: black frames are no longer saved; items without a picture (MKV/HEVC, online links, audio) show the logo with the format name.
- Installer: Browse now suggests a `NixPlayer` folder in the chosen location.
- "Set NixPlayer as the default player" is no longer ticked by default, so Windows Default apps does not open after install unless you choose it.

### Changed
- **New NixPlayer logo** everywhere: top bar, home screen, window and taskbar icon, desktop shortcut, the installer and uninstaller (icon, side image and header image).
- **File icons in Windows Explorer:** every format now has its own icon, the logo without a background and the format name beside it (MP4, MKV, MP3 and so on). On files that show a video thumbnail, Windows adds the small logo in the corner. Icons are refreshed when NixPlayer is installed or updated.

## [1.7.1] - 2026-11-05

### Added
- **Glass theme.** Settings, Appearance, Theme now has a fourth choice, "Glass" (also in the NixPlayer menu, Theme). Layout, buttons, top bar and home screen stay exactly the same; they simply become see-through. On Windows 11 the whole window turns into real acrylic glass (the desktop shows through, blurred); on other systems NixPlayer paints its own soft glass backdrop instead. Menus, panels and tooltips are frosted, fullscreen stays black.
- Next / Previous frame (`.` / `,`) now shows a message on the screen: the new time (hh:mm:ss.mmm), the frame number and the frame rate.
- Click the NixPlayer logo (top left) to go back to the home screen (the current video stops, its position is saved).
- Glass theme: no light edge line above / below the bars while a video is open (the home screen keeps it).
- **Glass tint** slider (Settings, Appearance): how frosted the bars and panels are.
- Bookmarks are shown on the timeline as small markers; click one to jump to it.
- Subtitle position can now go lower than the picture (into the black bar), but never out of the window.
- The Subtitles and Audio track panels open on the left side.
- Clicking the picture closes the Playlist / Watch history panel.

### Changed
- Shortcuts: Watch history is now just `H`; Subtitle delay − is `D` and Subtitle delay + is `F` (they were G / H). Reset all shortcuts in Settings to pick up the new keys if you changed them before.
- Files opened from outside the player (Explorer, "Open with", a link, starting NixPlayer again) now open in a NEW window; everything done inside a player window (Open file / link, playlist, history, drag and drop) stays in that window. Each window has its own taskbar thumbnail buttons and sleep blocker.
- Playlist / Watch history in fullscreen: the bottom control bar now behaves like the top bar (the panel shortens above it, no extra empty space at the end of the list).
- Swipe up / down gestures are now off by default; turn them on in Settings, Controls, Gestures.
- The control bar always stays on one row: the window's minimum width is measured from the visible buttons.
- License and Third-party notices are shown inside Settings, About (Show / Hide), no external file opens.
- Double click on the title bar in fullscreen leaves fullscreen and returns to the last window size.
- A movie name that is too long for the title bar scrolls (marquee) instead of being cut.
- Mouse wheel over the Speed button steps through the Speed menu values (now with 1.75x); over Brightness it changes by 5%.
- Bookmark markers no longer peek out at the screen edge while the control bar is hidden in fullscreen.

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
- The video no longer pauses when the window is minimized or covered by another window. Chromium could pause a hidden video (mostly files whose own sound is replaced by the external audio stream, or muted video). Pauses by the user (keys, click, taskbar buttons, media keys) are never undone.

## [1.6.0] - 2026-10-31

### Added
- Windows installer: first install lets you choose the folder, installs for the current user (no admin needed), creates Desktop and Start menu shortcuts. Updates never ask: they install silently into the folder chosen at the first install.
- Auto-update: NixPlayer checks GitHub Releases at start and every 6 hours. When there is a new version it asks "Update now / Later". "Update now" downloads it, installs it in the same folder and opens NixPlayer again.
- Settings → About: installed version, "Check for updates", license, third-party notices, optional Donate and Downloads buttons.
- `LICENSE` (freeware), `THIRD-PARTY-NOTICES.md`, `CHANGELOG.md`, `.gitignore`, GitHub Actions workflows (check + release), `RELEASING.md`.

## Earlier versions (1.0 to 1.6.0)

Moved here from the README, unchanged.

### Early notes (from the old README)

- New logo (renderer/logo.png, build/icon.ico).
- Fullscreen: top bar and control bar slide away; move the mouse to the top or bottom edge to bring them back.
- Right click on the video: the NixPlayer menu (Open file, Open link, Playlist, Watch history, Theme, Settings, Exit) plus "Picture settings…" (brightness, contrast, saturation, flip, aspect ratio).
- Maximum volume is 100% by default.
- Z resets speed to 1.0×; press Z again to go back to the previous speed.
- Volume button + slider can be hidden in Settings → Buttons.
- Windows taskbar: hover the NixPlayer icon to get Previous / Play-Pause / Next buttons.

### Audio tracks, embedded subtitles, online links (v1.4)

- **No sound / several audio tracks:** movies with AC3, E-AC3 or DTS audio (common in MKV / WEB-DL rips) were silent because Chromium cannot decode them. NixPlayer now uses a bundled ffmpeg (`ffmpeg-static`) to turn the selected audio track into a live AAC stream that is kept in sync with the video (seek, pause, speed, mute and volume all follow). The headphones button lists every audio track of the file; your language choice is remembered for the next file.
- **Subtitles inside the file:** text subtitles (SRT / ASS / WebVTT / mov_text) of an MKV / MP4 are listed under the Subtitles button ("Subtitles in this file") and the one matching your last choice (or English) loads automatically. A `.srt` with the same name next to the video still has priority. Picture subtitles (PGS / VobSub) cannot be shown.
- **Online links:** faster (known video sites go straight to yt-dlp, resolved links are cached for 20 minutes, stopped downloads are cancelled) and more reliable:
  - yt-dlp is downloaded automatically on first use and refreshed once when a site stops working.
  - HLS streams (`.m3u8`, and sites that only offer HLS) now play (hls.js). YouTube prefers 480p–1080p HLS over the 360p progressive file.
  - DASH-only sites are still not supported.


### Mouse buttons

Settings → Shortcuts → Mouse buttons: choose what a left **single click** (default: nothing) and **double click** (default: play / pause) do: None, Play / pause, Fullscreen or Mute.

### Controls

The control bar sits below the picture and never covers it. Settings → General → **Auto-hide controls** (off by default) makes it float over the video and fade when the mouse is still; the same switch is available as a rebindable shortcut. In fullscreen the controls always hide and return at the top / bottom edge.


### Word meanings in subtitles
- Move the mouse over any word of the subtitle: its meaning appears in the language chosen under Settings → Subtitles → Word meaning (default Bangla).
- Hold the left or right mouse button and drag over several words, then release: the meaning of that part of the sentence appears.
- Settings: on/off, language, hover on/off, drag on/off, pause the video while a meaning is shown. Needs an internet connection (Google Translate web service); results are cached while the app is open. Esc or a click elsewhere closes the meaning.
- While the feature is on, clicking directly on a subtitle word does not pause/play the video (click anywhere else as usual).

### Online links (v1.5 fixes)
- Links now go out with browser-like headers (Chrome user agent, Referer = the site itself, no compression), which many movie / FTP servers require.
- Up to 30 s wait for the server's answer and two automatic retries; wrong content types (octet-stream) are corrected from the file extension (.mkv → video/x-matroska).
- Before playing, a direct link is checked: refused (401/403), missing (404/410) or "web page instead of a video" now show a clear message instead of loading forever.
- "Connecting…", "Still waiting for the server…" and "Buffering…" messages while loading. If the player says the codec is unsupported, the file probably uses HEVC/H.265 video or AC3/DTS audio, which the built-in player cannot decode.


### Online playback fix (v1.5.1)
- New streaming proxy (`webproxy.js`) between the player and the server. Seek / pause / resume no longer leave old connections open (servers that allow only 1-2 connections per user used to make the next request wait forever).
- If the server drops the connection (idle while paused, timeout) the proxy reconnects by itself from the exact byte. If the connection still breaks, the player reloads and continues from the same second (3 tries).
- Servers that ignore "Range" can still seek. Redirects, `user:pass@` links and busy servers (429 / 503) are handled.
- Online MKV / MP4 files now also get the audio-track list and embedded text subtitles (ffmpeg reads the file through the proxy).

### Online files, v1.5.2
- Embedded subtitles of online MKV / MP4 files are read in the background and appear as soon as the first lines arrive (a jump to a later part restarts the reader there).
- After a seek the picture waits until the new audio stream plays, so sound and picture start together (no 1-2 s of silence).
- Timeline preview for online files (one frame per 5 s, cut by ffmpeg, cached).

### v1.5.3
- Online subtitles: parts that were read once are kept, so a skip inside them shows the subtitle at once; a skip to an unread part starts the reader there in 0.25 s.
- The page's fullscreen mode now follows the real window (no more hidden top / bottom bars after leaving fullscreen with the maximize button).
- History / playlist panels sit under the top bar and are never covered by it; the hidden top bar no longer captures clicks.

### v1.5.4
- Online files: a subtitle turned off stays off, and a subtitle you add (file or online search) is no longer replaced by the embedded English one a second later.

### v1.5.5
- Online files: the embedded subtitle is ON by default again (and can be switched off / on as usual).

### Unreleased
- **Loudness boost** (Settings → Audio): Off / Light / Medium / Strong. Quiet sound and dialogue come up about 3 / 6 / 9 dB, loud scenes stay about the same, a peak limiter prevents distortion. Default: Medium. The "Maximum volume" setting still works on top of it.
- Playback no longer pauses when the window is minimized or covered by another window.

### v1.6.0
- Release setup: per-user installer, auto-update ("Update now" installs in the same place), About page with version / license / donate, Git + GitHub Actions. Details in [CHANGELOG.md](CHANGELOG.md).
