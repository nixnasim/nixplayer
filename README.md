# NixPlayer

A simple desktop video player built with Electron, with a clean custom top bar.

## Download

Get the newest `NixPlayer-Setup-x.y.z.exe` from the **[Releases](../../releases/latest)** page and run it. NixPlayer then updates itself ("Update now / Later").
Windows may say "Windows protected your PC" because the app is new and not code-signed yet: click **More info → Run anyway**.
Bugs and ideas: open an **Issue** on this page.

## Run it

1. Install Node.js (LTS) from https://nodejs.org
2. In this folder (the first `npm install` downloads ffmpeg and the HLS player, so run it again after updating):

```
npm install
npm start
```

`npm start` can also take a file: `npm start -- "D:\Videos\movie.mp4"`

## Build the Windows installer (.exe)

```
npm run dist
```

The installer appears in `dist/` (`NixPlayer-Setup-<version>.exe`). The first install lets you choose the folder (default: your user folder, no admin rights needed) and registers the player for mp4, mkv, webm, mov, avi, mp3, flac and more, so "Open with" and double-click work.

## Updates, versions and releases

- **Users:** NixPlayer checks for updates at start and every 6 hours (also Settings → About → Check for updates). When a new version exists it asks **Update now / Later**. "Update now" downloads it, installs it in the same folder as the current install and opens NixPlayer again.
- **You (developer):** the code is tracked with Git, so `git diff` / `git log` show exactly what changed. To publish a new version: `npm version patch`, then `git push --follow-tags`. GitHub Actions builds the installer and publishes it. Full steps and the one-time setup (one public repo, no token) are in [RELEASING.md](RELEASING.md).
- Version history: [CHANGELOG.md](CHANGELOG.md).

## Support, license, credits

- **Donate:** put your link in `package.json` → `nixplayer.donateUrl`; a "Donate" button then appears in Settings → About.
- **License:** freeware, © Nasimul Islam Nasim, see [LICENSE](LICENSE).
- **Third-party software** (Electron, ffmpeg, hls.js, Lucide icons ...): see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Features

- **Top bar:** NixPlayer menu on the left, file name in the middle, then Always on top · Minimize · Maximize/Restore · Fullscreen · Close on the right. Drag the bar to move the window.
- **Bottom bar:** Screenshot and Record sit at the far left; Speed and Brightness sit on the right side. There is a mute button with a volume slider next to Next; you can also change the volume with a swipe, the mouse wheel or ↑/↓, mute with M, and open Settings from the NixPlayer menu or with Ctrl+,
- **Icons:** every button, menu entry and on-screen message (skip ±5 s, bookmark, volume, brightness …) uses a clean SVG icon instead of emoji.
- **Record (R):** records the video + audio to a .webm file (Videos / NixPlayer by default; change it in Settings → General).
- **Playlist (L):** thumbnails + durations, close button (✕ or Esc). **Bookmarks (B):** thumbnail preview for every bookmark.
- **Time watched / time left:** the left label shows how much you have watched, the right one shows the total. Click either label to switch the right one to time left (-12:34). Hover for watched %, left and total.
- **Online video (Ctrl+U):** paste a link. Direct video/audio links (.mp4, .webm, .mp3 …) play right away. YouTube and other sites need **yt-dlp** (Windows: `winget install yt-dlp`, or put `yt-dlp.exe` next to `NixPlayer.exe` / in `bin/`). You can also paste a link with Ctrl+V, drop a link on the window, or run `npm start -- "https://…"`.
- **Open on NixPlayer from a browser:** the installer registers `nixplayer://open?url=<link>`. Bookmarklet: `javascript:location.href='nixplayer://open?url='+encodeURIComponent(location.href)`
- **Watch history (H):** every local and online video with thumbnail, date, progress; click to resume. Turn it off or clear it in Settings → General.
- **Appearance:** Settings → General → Appearance (System / Dark / Light / Glass; Glass makes the window see-through, real acrylic on Windows 11), or NixPlayer menu → Theme.
- Hidden by default (show them in Settings → Buttons): Open file, Open link, Pop-up play, Window / fit size. Open file / link still work with Ctrl+O / Ctrl+U and the NixPlayer menu.
- One **Subtitles** button: click it for on/off, load file, download and style. Y also toggles subtitles.
- **Speed keys:** X slower, Z back to 1.0×, C faster (step set in Settings → Playback, default 0.1×). `[` / `]` step through the Speed menu values (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x, 3x) and Backspace returns to 1x.
- Open files with Ctrl+O, drag & drop, "Open with", or the command line. Multiple files become a playlist; a single file queues the rest of its folder.
- Hold the left mouse button to play at 2x (speed configurable). Swipe **up/down** on the left side for brightness, on the right side for volume (only vertical swipes count; left/right or diagonal drags do nothing). Mouse wheel changes volume.
- Subtitles: .srt/.vtt, auto-loads a subtitle with the same file name, size / font / colors / background opacity / position, delay adjustment (D / F), on/off (Y), OpenSubtitles search button.
- Audio track selector, mute, volume up to 200% (opt-in), remembers volume.
- Resume where you left off, repeat one/all, shuffle, previous/next, frame step, speed up/down.
- Real always-on-top (T), pop-up play (P), window sizing presets, lock aspect ratio, fit window to video, fullscreen (Enter or F11, both rebindable).
- Screenshots (S) saved at the video's native resolution to a folder you choose. Recordings (R) go to their own folder.
- Bookmarks (B), timeline hover preview, keeps the screen awake while playing.
- Settings (Ctrl+,): organised in cards with icons and switches, plus a search box that looks through every tab. Tabs: General, Playback, Controls (gestures, hold-to-speed, skipping), Video, Audio, Subtitles, Capture (screenshots + recording), Shortcuts (rebindable, grouped) and Buttons.

## Default shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| Space | Play / pause | M | Mute |
| ← / → | Skip 5 s | Shift+← / → | Skip 10 s |
| ↑ / ↓ | Volume | Y | Subtitles on/off |
| D / F | Subtitle delay − / + | Enter / F11 | Fullscreen |
| P | Pop-up play | T | Always on top |
| B | Bookmark | S | Screenshot |
| PageUp / PageDown | Previous / next | X / Z / C | Slower / reset to 1.0× / faster |
| [ / ] / Backspace | Previous / next fixed speed / 1x | | |
| , / . | Previous / next frame | Alt+↑ / ↓ | Brightness |
| Ctrl+O | Open | L | Playlist |
| Ctrl+, | Settings | R | Record |
| Ctrl+U | Open link | H | Watch history |

All of them can be changed in Settings → Shortcuts.

## Limits (because the engine is Chromium)

- Online: HLS/DASH-only streams (.m3u8) are not supported; with yt-dlp NixPlayer picks a single-file MP4 stream, which on YouTube is usually up to 720p.

- Plays H.264, VP9, AV1 with AAC, MP3, Opus, FLAC in MP4/MKV/WebM. AC3/DTS audio, some older codecs (e.g. many AVI/WMV files) and subtitles embedded inside MKV are not supported.
- No audio-delay control.
- Subtitle files are read as UTF-8 (falls back to Windows-1252).

For full codec coverage later, the same UI can sit on top of libmpv.

## Files

- `main.js` – frameless window + window buttons, local file server (`media://`), always-on-top, dialogs, power management
- `preload.js` – safe bridge between the window and the main process
- `renderer/icons.js` – the SVG icon set (Lucide, ISC license)
- `renderer/player.html` – the player UI
- `renderer/desktop.js` – settings, playlist, shortcuts, resume, screenshots (only active inside the desktop app; `player.html` still works as a plain web page without it)
- `updater.js` – auto-update from GitHub Releases, "About" helpers (version, license, links)


## Recent changes

- New logo (renderer/logo.png, build/icon.ico).
- Fullscreen: top bar and control bar slide away; move the mouse to the top or bottom edge to bring them back.
- Right click on the video: the NixPlayer menu (Open file, Open link, Playlist, Watch history, Theme, Settings, Exit) plus "Picture settings…" (brightness, contrast, saturation, flip, aspect ratio).
- Maximum volume is 100% by default.
- Z resets speed to 1.0×; press Z again to go back to the previous speed.
- Volume button + slider can be hidden in Settings → Buttons.
- Windows taskbar: hover the NixPlayer icon to get Previous / Play-Pause / Next buttons.

## Audio tracks, embedded subtitles, online links (v1.4)

- **No sound / several audio tracks:** movies with AC3, E-AC3 or DTS audio (common in MKV / WEB-DL rips) were silent because Chromium cannot decode them. NixPlayer now uses a bundled ffmpeg (`ffmpeg-static`) to turn the selected audio track into a live AAC stream that is kept in sync with the video (seek, pause, speed, mute and volume all follow). The headphones button lists every audio track of the file; your language choice is remembered for the next file.
- **Subtitles inside the file:** text subtitles (SRT / ASS / WebVTT / mov_text) of an MKV / MP4 are listed under the Subtitles button ("Subtitles in this file") and the one matching your last choice (or English) loads automatically. A `.srt` with the same name next to the video still has priority. Picture subtitles (PGS / VobSub) cannot be shown.
- **Online links:** faster (known video sites go straight to yt-dlp, resolved links are cached for 20 minutes, stopped downloads are cancelled) and more reliable:
  - yt-dlp is downloaded automatically on first use and refreshed once when a site stops working.
  - HLS streams (`.m3u8`, and sites that only offer HLS) now play (hls.js). YouTube prefers 480p–1080p HLS over the 360p progressive file.
  - DASH-only sites are still not supported.


## Mouse buttons

Settings → Shortcuts → Mouse buttons: choose what a left **single click** (default: nothing) and **double click** (default: play / pause) do: None, Play / pause, Fullscreen or Mute.

## Controls

The control bar sits below the picture and never covers it. Settings → General → **Auto-hide controls** (off by default) makes it float over the video and fade when the mouse is still; the same switch is available as a rebindable shortcut. In fullscreen the controls always hide and return at the top / bottom edge.


## Word meanings in subtitles
- Move the mouse over any word of the subtitle: its meaning appears in the language chosen under Settings → Subtitles → Word meaning (default Bangla).
- Hold the left or right mouse button and drag over several words, then release: the meaning of that part of the sentence appears.
- Settings: on/off, language, hover on/off, drag on/off, pause the video while a meaning is shown. Needs an internet connection (Google Translate web service); results are cached while the app is open. Esc or a click elsewhere closes the meaning.
- While the feature is on, clicking directly on a subtitle word does not pause/play the video (click anywhere else as usual).

## Online links (v1.5 fixes)
- Links now go out with browser-like headers (Chrome user agent, Referer = the site itself, no compression), which many movie / FTP servers require.
- Up to 30 s wait for the server's answer and two automatic retries; wrong content types (octet-stream) are corrected from the file extension (.mkv → video/x-matroska).
- Before playing, a direct link is checked: refused (401/403), missing (404/410) or "web page instead of a video" now show a clear message instead of loading forever.
- "Connecting…", "Still waiting for the server…" and "Buffering…" messages while loading. If the player says the codec is unsupported, the file probably uses HEVC/H.265 video or AC3/DTS audio, which the built-in player cannot decode.


## Online playback fix (v1.5.1)
- New streaming proxy (`webproxy.js`) between the player and the server. Seek / pause / resume no longer leave old connections open (servers that allow only 1-2 connections per user used to make the next request wait forever).
- If the server drops the connection (idle while paused, timeout) the proxy reconnects by itself from the exact byte. If the connection still breaks, the player reloads and continues from the same second (3 tries).
- Servers that ignore "Range" can still seek. Redirects, `user:pass@` links and busy servers (429 / 503) are handled.
- Online MKV / MP4 files now also get the audio-track list and embedded text subtitles (ffmpeg reads the file through the proxy).

## Online files, v1.5.2
- Embedded subtitles of online MKV / MP4 files are read in the background and appear as soon as the first lines arrive (a jump to a later part restarts the reader there).
- After a seek the picture waits until the new audio stream plays, so sound and picture start together (no 1-2 s of silence).
- Timeline preview for online files (one frame per 5 s, cut by ffmpeg, cached).

## v1.5.3
- Online subtitles: parts that were read once are kept, so a skip inside them shows the subtitle at once; a skip to an unread part starts the reader there in 0.25 s.
- The page's fullscreen mode now follows the real window (no more hidden top / bottom bars after leaving fullscreen with the maximize button).
- History / playlist panels sit under the top bar and are never covered by it; the hidden top bar no longer captures clicks.

## v1.5.4
- Online files: a subtitle turned off stays off, and a subtitle you add (file or online search) is no longer replaced by the embedded English one a second later.

## v1.5.5
- Online files: the embedded subtitle is ON by default again (and can be switched off / on as usual).

## Unreleased
- **Loudness boost** (Settings → Audio): Off / Light / Medium / Strong. Quiet sound and dialogue come up about 3 / 6 / 9 dB, loud scenes stay about the same, a peak limiter prevents distortion. Default: Medium. The "Maximum volume" setting still works on top of it.
- Playback no longer pauses when the window is minimized or covered by another window.

## v1.6.0
- Release setup: per-user installer, auto-update ("Update now" installs in the same place), About page with version / license / donate, Git + GitHub Actions. Details in [CHANGELOG.md](CHANGELOG.md).
