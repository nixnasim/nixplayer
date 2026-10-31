# Third-party notices

NixPlayer is built with the open-source components below. Each one stays under its own license.

| Component | Used for | License | Source |
|---|---|---|---|
| Electron (includes Chromium) | App shell, video decoding | MIT (Electron), BSD-style and others (Chromium; full list in `LICENSES.chromium.html` inside the installed app folder) | https://github.com/electron/electron |
| ffmpeg (via `ffmpeg-static`) | Audio tracks, embedded subtitles, timeline previews | GPL-3.0-or-later (the `ffmpeg-static` package declares this license for the binaries it downloads; the Windows x64 build comes from https://www.gyan.dev/ffmpeg/builds/) | https://ffmpeg.org, https://github.com/eugeneware/ffmpeg-static |
| hls.js | Playing HLS (.m3u8) streams | Apache-2.0 | https://github.com/video-dev/hls.js |
| electron-updater | Updates from GitHub Releases | MIT | https://github.com/electron-userland/electron-builder |
| Lucide icons | Button and menu icons | ISC | https://lucide.dev |

## Notes

- **ffmpeg** runs as a separate program (`ffmpeg.exe`); NixPlayer starts it and reads its output. The ffmpeg source code is available at https://ffmpeg.org/download.html, and the exact build used is described at the gyan.dev page above. You may replace `ffmpeg.exe` inside the installed app with your own build.
- **yt-dlp** (Unlicense, https://github.com/yt-dlp/yt-dlp) is **not** bundled. NixPlayer downloads it on first use when you open a link from a site such as YouTube.
- **Online services** NixPlayer can contact when you use the matching feature: OpenSubtitles (subtitle search), Google Translate and MyMemory (word meanings), dictionaryapi.dev and Wiktionary (dictionary). They are separate services with their own terms.

To list the license of every npm package used, run `npx license-checker --production` in the project folder.
