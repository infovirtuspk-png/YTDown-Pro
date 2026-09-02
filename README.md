<<<<<<< HEAD
# YTDown-Pro
=======
# ⚡ YTDown Pro — Professional Windows Desktop Media Downloader & Converter

![YTDown Pro Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D6.svg?style=for-the-badge)
![Electron](https://img.shields.io/badge/framework-Electron%2033-47848F.svg?style=for-the-badge)
![SQLite](https://img.shields.io/badge/database-SQLite3-003B57.svg?style=for-the-badge)

**YTDown Pro** is a state-of-the-art, high-performance desktop media downloading suite for Windows. Powered by dual engines (`yt-dlp` and a custom **Universal HTTP Range Downloader**), YTDown Pro captures videos, playlists, audio tracks, archives, documents, software, and images from over 1,000+ supported websites and direct download mirrors with real-time tracking, background downloading, and seamless browser integration.

---

## 🌟 Key Features

### 1. ⚡ Dual Smart Download Engines
* **`yt-dlp` Engine**: High-speed extraction for YouTube (4K/8K 60fps), TikTok, Instagram, Vimeo, Dailymotion, Facebook, X/Twitter, Soundcloud, and 1,000+ media platforms.
* **Universal HTTP Downloader**: Multi-chunk segmented downloading with `HTTP Range` resumption for direct files (`.mp4`, `.zip`, `.rar`, `.pdf`, `.exe`, `.iso`, `.dmg`, `.docx`, etc.).
* **Bundled Binaries**: Comes pre-packaged with `yt-dlp.exe`, `ffmpeg.exe`, and `ffprobe.exe` — requires no external dependencies.

### 2. 🧲 1-Second Real-Time Clipboard Poller
* Continuously monitors the Windows clipboard every 1,000ms.
* Automatically identifies media or file links without cluttering or double-capturing.
* Renders a **Magnetic Capture Card** on the Dashboard with domain badges, media format tags, and 1-click **Paste & Analyze**.

### 3. 🧩 Modern Chrome & Edge Companion Extension
* **Draggable Floating Badge**: Interactive, moveable badge on any web page with 1-click instant download triggering.
* **Right-Click Context Menu**: Right-click any link, video, audio, image, page, or text selection to send directly to YTDown Pro.
* **Local HTTP API Server**: Connects locally via port `18492` or protocol fallback (`ytdownpro://`).

### 4. 🔄 Persistent Background System Tray Engine
* Closing the window (✕ button) keeps YTDown Pro active in the **System Tray**.
* Active downloads, background link poller, and HTTP API continue running without interruption.
* System tray context menu offers single-click restore, active download counters (`⚡ Active Downloads (X)`), **Pause All**, **Resume All**, and **Quit**.

### 5. 📊 Real-Time Downloads & Queue Management
* Complete individual job controls: **Pause**, **Resume**, **Cancel**, **Retry**, **Delete**, **Play**, and **Open Folder**.
* Batch controls: **Pause All**, **Resume All**, and **Clear Completed**.
* Live shimmer progress bars, download speed calculation (`MB/s`), ETA countdown, and file size formatting (`formatBytes`).

### 6. 📜 Searchable History & Multi-Category Filter
* Full download history backed by SQLite (`ytdownpro.db`).
* Multi-category dropdown filter: `All`, `MP4`, `WEBM`, `MP3`, `M4A`, `PDF`, `ZIP/RAR`, `Software`, `Images`.
* Live debounced search by title, filename, or URL.

### 7. 📂 Settings & Location Persistence
* **`[x] Remember Location`**: Save location selection persists automatically across sessions.
* **Engine Diagnostics**: Live status indicators for `yt-dlp`, `FFmpeg`, and `FFprobe`.
* **Dark / Light Glassmorphism Themes**: Modern, high-DPI UI with smooth animations and Radar Orb visual effects.

---

## 🖥️ System Requirements

* **Operating System**: Windows 10 / Windows 11 (64-bit)
* **Architecture**: x64
* **Disk Space**: ~350 MB free space

---

## 🚀 Download & Installation

1. Download the latest release installer: [**YTDown Pro Setup 1.0.0.exe**](https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe) (or check [GitHub Releases](https://github.com/infovirtuspk-png/YTDown-Pro/releases)).
2. Double-click the `.exe` installer to launch the Setup Wizard.
3. Select your desired installation folder, shortcut options, and click **Install**.
4. Launch YTDown Pro directly from your Desktop or Start Menu!

---

## 👨‍💻 Development Setup

If you wish to build or modify YTDown Pro from source:

```bash
# 1. Clone the repository
git clone https://github.com/infovirtuspk-png/YTDown-Pro.git
cd YTDown-Pro

# 2. Install dependencies
npm install

# 3. Download / verify bundled binaries
npm run download-engines

# 4. Run application in development mode
npm start

# 5. Build standalone production NSIS installer
npm run dist
```

The output installer will be generated at `dist/YTDown Pro Setup 1.0.0.exe`.

---

## 👤 Author & Credits

* **Developer**: Engineer Qasim Ahmad (*Epic Developer*)
* **Contact Email**: `info.virtuspk@gmail.com`
* **License**: [MIT License](LICENSE)

---

<p align="center">
  <b>YTDown Pro © 2026 Engineer Qasim Ahmad. All Rights Reserved.</b>
</p>
>>>>>>> 785a275 (feat: Release YTDown Pro v1.0.0 — Complete Desktop Media Downloader & Companion Extension)
