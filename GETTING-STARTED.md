# Getting started

The engine runs on your own computer, inside Claude Code. Claude sets it up, edits your reels,
and makes changes when you ask in plain words. You watch it all happen in the visual editor.

**You need:** a Mac (macOS 13+) or Windows 10/11 PC, a paid Claude plan with Claude Code, and
about 10 GB of free space.

## 1. Open Claude Code

Open the **Claude desktop app** and go to **Code**. Pick a folder to start in (your Documents
folder is fine).

## 2. Ask Claude to get the engine

Paste this message and send it:

> Please download https://github.com/sbholweg/Content-Editor into my Documents folder.

Claude may ask permission to run commands. Say yes. If it says Git is missing, ask it to
install Git for you.

## 3. Open the engine folder and say "set me up"

In Claude Code, open the new **Content-Editor** folder (Documents › Content-Editor). Then send:

> set me up

Claude checks what's missing, installs it, asks you to pick a password, and starts the editor.
The first time takes a while, because it downloads the speech-to-text engine.

When it's done, open **http://localhost:3000** in your browser and log in.

## 4. Edit your first reel

1. Put a raw talking clip in the **inbox** folder (inside Content-Editor).
2. Tell Claude: **edit my new reels**
3. Watch the editor. When Claude is done, look it over and ask for anything you want changed:
   - "make the captions one word at a time"
   - "cut the first sentence"
   - "move the hook to the middle and make it softer"
   - "make it post-ready"
4. Finished reels and their captions land in the **outputs** folder.

## Every time after that

Open Claude Code in the **Content-Editor** folder and say **start the editor**, then edit away.
Say **update me** to get the newest version.

## Doing it by hand instead

Prefer to type the commands yourself? On Windows, see [SETUP-WINDOWS.md](SETUP-WINDOWS.md).
