# Microsoft Store listing: texts to paste into Partner Center

Keep the listing about what NixPlayer is: a player for the user's own files. Do not mention downloading movies, torrents,
FTP movie servers, YouTube or "free movies": that kind of wording attracts content-policy questions.

## Product name
NixPlayer

## Short description (one line)
A clean, fast video and audio player with subtitles, audio-track switching and a custom themed interface.

## Description
NixPlayer is a simple, modern video and audio player for Windows.

Drop a file on the window, press Ctrl+O, or choose "Open with" and it plays. A clean custom top bar, dark, light and glass themes and
keyboard shortcuts keep the focus on what you are watching.

• Plays common formats: MP4, MKV, WebM, MOV, AVI, MP3, FLAC, WAV, OGG, M4A and more
• Subtitles: load .srt and .vtt files, read subtitles stored inside MKV files, or search for subtitles online
• Several audio tracks: switch between them; AC3, E-AC3 and DTS audio are supported
• Word help: tap a subtitle word for a translation or a dictionary meaning
• Direct links: open an address that points straight to a video or audio file, or an HLS (.m3u8) stream
• Resume where you stopped, with watch history and bookmarks
• Take screenshots and record short clips
• Always on top, timeline previews, keep-awake while playing

NixPlayer has no ads, no account and no tracking.

## Product features (up to 20 short lines)
- MP4, MKV, WebM, MOV, AVI, MP3, FLAC and more
- SRT and VTT subtitles, subtitles inside MKV
- Online subtitle search
- Multiple audio tracks, AC3 / DTS audio
- Translate or look up subtitle words
- Direct video / audio links and HLS streams
- Resume playback, history and bookmarks
- Screenshots and short clip recording
- Dark, light and glass themes
- No ads, no account, no tracking

## Search terms (up to 7)
video player, media player, mkv player, subtitles, audio player, srt, movie player

## Category
Photo & video (or Music, if you prefer: pick one)

## Screenshots (at least 1; 3 to 5 is good; PNG, 1366x768 or larger)
Use the files in `docs/` as a starting point (theme-dark.png, theme-light.png, theme-glass.png, banner.png), but take
fresh full-window screenshots of the app playing something you own the rights to (for example a Blender open movie).
Do not show copyrighted films or trademarked content in screenshots.

## Privacy policy URL
https://github.com/nixnasim/nixplayer/blob/main/docs/PRIVACY.md
(In "Properties" the question "Does this product access, collect or transmit personal information?" -> answer Yes and give this URL.)

## Support contact info / Website
https://github.com/nixnasim/nixplayer/issues

## Copyright and trademark info
© 2026 Nasimul Islam Nasim. FFmpeg is a trademark of Fabrice Bellard.

## Additional license terms
Leave empty to use Microsoft's standard license terms, or paste the contents of LICENSE.
Third-party licenses (including the FFmpeg GPL text and source location) are in Settings -> About inside the app.

## Notes for certification (up to 2,000 characters)
NixPlayer is an Electron (Chromium) desktop media player. It needs no sign-in.
How to test: start the app, press Ctrl+O (or drag a video or audio file onto the window) to play a local file.
Press Ctrl+U (or the link button) and paste a direct media URL to play it, for example
https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4 (please check that this sample link still works).
Subtitles: Settings has a subtitle search that queries OpenSubtitles. Word help sends only the selected word to translation
and dictionary services. Nothing is uploaded without the user choosing the feature. Privacy policy: see the URL in the listing.
This Store edition has no self-updater (the Store updates it) and does not download or run any executable code.
It includes an unmodified FFmpeg program (GPL-3.0-or-later) that NixPlayer starts as a separate process to handle audio
tracks and embedded subtitles. The license text and source location are in Settings -> About -> FFmpeg license.

## Restricted capability: runFullTrust (Partner Center asks you to justify it)
NixPlayer is an Electron desktop application (Chromium + Node). Electron apps run as full-trust desktop processes and need
runFullTrust to start. The app only reads media files the user opens and writes screenshots / recordings / subtitles
to folders the user chooses.

## Age rating (IARC questionnaire)
Answer honestly. NixPlayer has no content of its own. It can open web links the user types, so answer the question about
accessing the internet / third-party content truthfully; the resulting rating may be higher than "3+". That is normal.

## Pricing
Free. Markets: all, or the ones you choose.

## Before pressing Submit: checklist
- [ ] Privacy policy link opens in a private browser window
- [ ] Issues are enabled on the GitHub repo
- [ ] The `.appx` is from the green "Store package" workflow, version is higher than any earlier submission
- [ ] Screenshots are your own and show no copyrighted films
- [ ] The listing text does not mention YouTube, downloading, torrents or movie servers
