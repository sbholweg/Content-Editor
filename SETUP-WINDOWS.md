# Run the editor on your Windows PC, by hand

The easy way is to let Claude do this for you: see [GETTING-STARTED.md](GETTING-STARTED.md).
These are the same steps, typed yourself.

This runs the whole editor on your own computer. Your phone can use it too, as long as your
PC is on and the editor is running.

You'll type a few commands into **PowerShell**. Copy and paste each line, then press Enter.
If anything shows an error, take a screenshot and send it to Claude.

## 1. Install the tools (one time, ~10 minutes)

Open PowerShell: press the Windows key, type **PowerShell**, and click it. Then run:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Gyan.FFmpeg
```

Click **Yes** if Windows asks for permission. When all three finish, **close PowerShell and open
it again** (so it finds the new tools). Check they worked:

```powershell
node -v
ffmpeg -version
```

Each should print a version number.

## 2. Download the editor (one time)

```powershell
cd $HOME
git clone https://github.com/sbholweg/Content-Editor.git
cd Content-Editor
npm install
```

If a GitHub sign-in window pops up, sign in.

## 3. Add your settings (one time)

```powershell
copy .env.example .env
notepad .env
```

In Notepad:
- After `APP_PASSWORD=`, type a password you'll use to open the editor.
- (Optional) After `ANTHROPIC_API_KEY=`, paste your Claude API key. Without it, everything still
  works, but hooks, key words, captions and trial reels use simple built-in rules.

Save and close Notepad.

## 4. Start it

```powershell
npm run local
```

The **first time**, it downloads the speech-to-text engine (a few minutes). When you see
`Content Editor running on http://localhost:3000`, open that address in your browser.

Leave the PowerShell window open while you use the editor. To stop it, click the window and
press **Ctrl + C**.

## 5. Use it from your phone

**On the same Wi-Fi as your PC:**
1. In a second PowerShell window, run `ipconfig` and find the **IPv4 Address** (something like
   `192.168.1.23`).
2. On your phone, open `http://192.168.1.23:3000` (use your number).
3. If Windows asks whether to allow Node.js on networks, choose **Private networks** and **Allow**.

Over plain Wi-Fi, a couple of phone features may not work (the "Save video" share sheet and
"Copy caption"), because phones only allow them on secure (https) links. Use the option below
if you want those, or to use it away from home.

**From anywhere (secure link, free):**
```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```
It prints a link ending in `trycloudflare.com`. Open it on your phone. The link changes each
time you run this, and anyone with it can reach your editor, so make sure you set a password
in step 3.

## Next time

```powershell
cd $HOME\Content-Editor
git pull
npm install
npm run local
```

`git pull` grabs the latest version Claude has built.

## Good to know
- Your PC needs to stay on and awake while you edit.
- Exporting uses a lot of your computer's power; a 60-second reel may take a few minutes.
- Your videos, library and settings are saved in the `data` folder inside `Content-Editor`.
