# Content Studio (working name)

A phone-friendly editor for talking reels. Upload a video from your camera roll and it:

1. Converts it to a standard format (iPhone HEVC/.mov works).
2. Lets you cut it by the word, remove pauses, and cut "um"s and "uh"s.
3. Transcribes every word with exact timing (whisper.cpp, runs on your own server, free).
4. Picks the words to highlight and adds a few emojis (Claude, with a built-in fallback if no API key is set).
5. Writes a hook title for the top of the reel (you can change it).
6. Shows a live preview with your brand fonts and colors. Tap any word in the transcript to make it a key word, fix it, or add an emoji.
7. Exports a 1080×1920 MP4 you can save straight to your camera roll.

## How it fits together

| Part | Folder | What it does |
|---|---|---|
| Web app | `src/web` | The screens you use on your phone |
| Video design | `src/remotion` | How captions look and animate (same code for preview and export) |
| Server | `server` | Uploads, transcription, AI highlights, exporting |

## Run it on a computer (for development)

Needs Node 22+ and ffmpeg.

```bash
npm install
npm run setup     # one-time: downloads the export browser + builds speech-to-text
npm run dev       # open http://localhost:5173
```

## Put it online

The editor needs a host that can run a Docker container with a saved disk. Railway is one simple option:

1. Create a Railway project and pick **Deploy from GitHub repo**. Choose this repo. It finds the `Dockerfile` on its own.
2. Add a **Volume** mounted at `/data`, so your videos and brand survive restarts.
3. Under **Variables**, set `APP_PASSWORD`, and optionally `ANTHROPIC_API_KEY` (see `.env.example`).
4. Under **Settings → Networking**, add a custom domain such as `editor.yourdomain.com`, then add the CNAME record it shows you at your domain provider.

Exporting video is CPU-heavy. Plan on at least 2 vCPU / 4 GB RAM.

## Add it to your HeyClients site

Copy a snippet from `embed/heyclients-snippet.html` into a Custom HTML block, swapping in your editor's address.
On phones, the button (Option A) gives the best experience.
