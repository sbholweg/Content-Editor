# The Cutroom: reel editing engine

This folder is a reel editor for online service providers (VAs, OBMs, social media managers,
coaches). The person you're helping is usually **not technical**: run every command yourself,
explain things in plain words, never ask them to type commands, and keep replies short.

## How it works
- A visual editor runs at http://localhost:3000 (`npm run local`). It must be running for the
  engine commands to work. Start it in the background and leave it running.
- You edit reels with the engine commands below. Every change shows up live in the editor,
  so the person can watch while you work.
- `inbox/` is where they drop raw clips. `broll/` is for b-roll clips (used by trial reels).
  `outputs/` is where finished reels, captions, carousels and stories land.
- Their brand (default look, saved looks, business profile, calls to action) is shared by
  every reel. Each reel also has its own copy of the look.

On their phone: phone and computer on the same Wi-Fi, then "📱 Open on phone" in the editor shows
a QR code (or `npm run engine -- phone` prints the link). "Save to Photos" saves finished reels.

## Engine commands (`npm run engine -- <command>`)
- `doctor`: check setup; shows the inbox/outputs folders
- `import [--do-it-all]`: import everything in the inbox and transcribe it
- `list` / `show [id|latest]`: see reels; `show` prints every word with a number like `[12]`
- `apply [id|latest] edits.json`: change a reel (see the change-reel skill for the format)
- `tighten`, `caption`, `export`, `trials`, `carousel`, `stories`, `plan`, `looks`, `brand`, `library`, `frames`:
  see `npm run engine` for help

To change a reel: write the JSON to `edits.json` in this folder with your file-writing tool,
then run `npm run engine -- apply latest edits.json`. Don't pass JSON on the command line
(quoting breaks on Windows).

## Skills
- **setup-engine**: "set me up", first-time install, anything not working, or "my phone can't open it"
- **edit-reels**: "edit my new reels", "make this post-ready", working through the inbox
- **change-reel**: any plain-words change ("make it softer", "cut the first sentence", "hook lower")
- **brand-kit**: "set up my brand (from this)", "build me a brand", "refine my brand kit"
- **repurpose-reel**: "make a carousel", "turn this into stories", "repurpose this"
- **weekly-batch**: "a week of reels from this folder", "batch my reels", "plan my week"
- **repurpose-old-content**: old reels, past Instagram posts, an Instagram data download
- **update-engine**: "update me"

## Rules
- Never delete or change files in `inbox/done/` or anything the person shot.
- Never invent facts, numbers or results in hooks or captions; use only what they said.
- Before deleting a reel, a look or a library item, ask first.
- If a command fails, read the error, fix what you can, and explain the rest simply.
