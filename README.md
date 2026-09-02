# ⚡ YTDown Pro — Professional Windows Desktop Media Downloader & Converter

<p align="center">
  <a href="https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/📥%20DOWNLOAD%20YTDown%20Pro%20Setup%20v1.0.0%20(.EXE)-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows Installer (.exe)" height="48">
  </a>
</p>

<p align="center">
  <a href="https://github.com/infovirtuspk-png/YTDown-Pro/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-0078D6.svg?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/framework-Electron%2033-47848F.svg?style=for-the-badge" alt="Electron">
  <img src="https://img.shields.io/badge/database-SQLite3-003B57.svg?style=for-the-badge" alt="SQLite">
</p>

---

**YTDown Pro** is a state-of-the-art, high-performance desktop media downloading suite for Windows. Powered by dual engines (`yt-dlp` and a custom **Universal HTTP Range Downloader**), YTDown Pro captures videos, playlists, audio tracks, archives, documents, software, and images from over 1,000+ supported websites and direct download mirrors with real-time tracking, background downloading, and seamless browser integration.

---

## 📥 Direct Installer Download

Click either link or button below to immediately start downloading the official standalone Windows Installer executable:

<p align="center">
  <a href="https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/⚡%20CLICK%20HERE%20TO%20DOWNLOAD%20YTDown.Pro.Setup.1.0.0.exe%20(283%20MB)-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Download YTDown Pro Setup Executable" height="52">
  </a>
</p>

### 🔗 Direct File Link:
👉 [**https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe**](https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe)

> **Note**: Pre-packaged with `yt-dlp`, `FFmpeg`, `FFprobe`, and the companion Chrome/Edge extension. No extra setup required!

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

## 🚀 Installation & Browser Extension Setup

1. Click the download button above or use the direct link: [**YTDown.Pro.Setup.1.0.0.exe**](https://github.com/infovirtuspk-png/YTDown-Pro/releases/download/v1.0.0/YTDown.Pro.Setup.1.0.0.exe).
2. Double-click the `.exe` installer to launch the Setup Wizard.
3. Select your desired installation folder, shortcut options, and click **Install**.
4. Launch YTDown Pro directly from your Desktop or Start Menu!

### 🧩 Loading the Browser Companion Extension

1. Open YTDown Pro and go to the **Settings** tab.
2. Under **Chrome Extension Integration**, click **`Open Extension Folder`**.
3. Open your browser (`chrome://extensions` or `edge://extensions`).
4. Enable **Developer Mode** (toggle switch in the top-right corner).
5. Click **Load Unpacked** and select the opened `extension` directory.

---

## 🛠️ Project Structure

```
YTDown-Pro/
├── extension/                 # Chrome & Edge Companion Extension
│   ├── background.js          # Service worker & context menus
│   ├── content.js             # Magnetic floating badge & DOM grabber
│   ├── content.css            # Floating badge glassmorphism styles
│   └── manifest.json          # Extension Manifest V3
├── src/
│   ├── database/              # SQLite Database & Repositories
│   │   ├── database.js        # Schema initialization & migrations
│   │   └── repositories/      # Downloads & Settings CRUD queries
│   ├── engines/               # Bundled Executables
│   │   ├── yt-dlp/            # yt-dlp.exe
│   │   └── ffmpeg/            # ffmpeg.exe & ffprobe.exe
│   ├── main/                  # Electron Main Process
│   │   ├── main.js            # App entry point & single-instance lock
│   │   ├── window-manager.js  # Main window, splash, tray & native menu
│   │   ├── ipc/               # IPC handlers
│   │   └── services/          # Download manager, URL analyzer, Universal downloader
│   ├── preload/               # Electron Preload script
│   │   └── preload.js         # ContextBridge API exposure
│   └── renderer/              # Web Frontend (HTML, CSS, JS)
│       ├── index.html         # Single Page App shell
│       ├── css/app.css        # Premium glassmorphism design system
│       └── js/                # App, Dashboard, Downloads, History, Settings scripts
├── scripts/                   # Build & Diagnostic Scripts
├── package.json               # Dependencies & electron-builder NSIS config
└── README.md                  # Project documentation
```

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
