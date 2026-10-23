---
name: setup-engine
description: First-time setup of the reel editing engine on this computer, or fixing it when something isn't working. Use when the person says "set me up", "install it", "it's not working", or the editor won't start.
---

# Set up the engine

Goal: the editor running at http://localhost:3000 and the person able to use it.

1. Run `npm run engine -- doctor` (if it fails because packages are missing, run `npm install` first).
2. Fix each ✗ in order. Tell the person in one short line what you're doing and why.
   - **Node.js or ffmpeg missing**: install them. Windows: `winget install OpenJS.NodeJS.LTS` /
     `winget install Gyan.FFmpeg`. Mac: `brew install node` / `brew install ffmpeg` (if Homebrew is
     missing, ask before installing it). Tell them a terminal restart may be needed, and if the new
     tool still isn't found, ask them to fully close and reopen Claude.
   - **.env missing**: copy `.env.example` to `.env`. Ask them to choose a password for the editor
     and put it after `APP_PASSWORD=`. Leave `ANTHROPIC_API_KEY` empty: you (Claude) do the writing.
   - **Speech-to-text engine**: run `npm run setup` (several minutes the first time; say so).
   - **Editor not running**: run `npm run local` in the background and wait until it prints
     "Content Editor running". Don't stop it afterwards.
3. Run `doctor` again until everything is ✓.
4. Tell them: open http://localhost:3000 in their browser and log in with their password, and
   that raw clips go in the `inbox` folder (give the full path from `doctor`).
5. Offer to fill in their business profile now (what they do, who they help, their usual call
   to action). Save it with `npm run engine -- brand edits.json` where edits.json is
   `{"business": {"what": "...", "audience": "...", "cta": "..."}}`.

If something fails, read the full error before retrying. Common fixes:
- `whisper-cli` missing on Windows: delete the `whisper.cpp` folder and run `npm run setup` again.
- Port 3000 busy: an editor is probably already running; check with `doctor`.

## "Use it on my phone" / "my phone can't open the editor"
- The phone must be on the same Wi-Fi as this computer, and the editor must be running here.
  `npm run engine -- phone` prints the link; in the editor, "📱 Open on phone" shows a QR code that
  logs the phone straight in. Exported reels: tap "Save to Photos" on the phone, then "Save Video".
- Windows blocks it until Node.js is allowed through the firewall on **private** networks. Check
  with `powershell -Command "Get-NetFirewallRule -DisplayName '*Node*' | Select DisplayName,Enabled,Profile,Direction,Action"`.
  If it's missing or blocked, explain in plain words, then ask before adding a rule (it changes a
  system setting): `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList 'New-NetFirewallRule -DisplayName ''The Cutroom'' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private'"`
  (Windows will show a yes/no prompt). Also make sure the Wi-Fi is set to a **Private** network
  (Settings › Network & internet › Wi-Fi › the network › Private), not Public.
- Some guest/public Wi-Fi (cafés, hotels) blocks devices from seeing each other; use home Wi-Fi.
- Away from home it won't connect: the editor lives on this computer. (Advanced option: a private
  network app like Tailscale on both devices, then set PHONE_URL in .env to the computer's Tailscale
  address with :3000. Only suggest this if they ask.)
