// Which edition is running.
// STORE = the Microsoft Store (MSIX) edition. Electron sets process.windowsStore for a packaged Store app;
// NIXPLAYER_STORE=1 lets you try the Store behaviour with "npm start".
// The Store edition has no self-updater (the Store updates the app) and does not download or run
// yt-dlp (Store policy: no downloading of executable code). Everything else is identical.
const STORE=!!process.windowsStore||process.env.NIXPLAYER_STORE==='1';
module.exports={STORE};
