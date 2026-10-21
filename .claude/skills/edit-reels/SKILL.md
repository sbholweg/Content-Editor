---
name: edit-reels
description: Turn raw clips into finished, on-brand reels. Use when the person says "edit my new reels", "edit this", "make it post-ready", "a week of reels from this folder", or drops clips in the inbox.
---

# Edit reels

1. Make sure the editor is running (`npm run engine -- doctor`; start it per setup-engine if not).
2. Import: `npm run engine -- import`. It transcribes each clip and prints its words with numbers.
   For clips outside the inbox, pass their paths: `npm run engine -- import "C:\path\clip.mov"`.
3. For each reel, read `npm run engine -- looks` once (their business profile and default look),
   then decide the edit and apply it in one go with `apply <id> edits.json`:
   - **cutFillers: true** and **removePauses: true**.
   - **cut** false starts and repeated takes (a sentence they restart: keep the last, cleanest take).
     Don't cut content they clearly meant to say.
   - **keyWords**: about one per 5-8 words. Numbers, money, time, results, strong verbs, the key
     noun of each idea. Never filler (so, like, the, I, you).
   - **emojis**: at most one per ~15 seconds, only where it clearly fits.
   - **fixWords**: obvious transcription mistakes (names, brand terms, their business words).
   - **hookText**: 3-8 words, lowercase, conversational, in their voice, based only on what they say.
   - **postCaption**: hook line; 2-4 short lines for their ideal client; their call to action on its
     own line (from the business profile or saved calls to action); blank line; 3-5 hashtags.
     At most 2 emojis. Never invent results or numbers.
4. Tell them the reel is ready to look at: give the editor link from `show`, and summarize what
   you did in 2-3 lines (what you cut, the hook). Ask if they want changes.
5. Export when they're happy, or right away if they asked for it post-ready / hands off:
   `npm run engine -- export <id>`. Tell them it's in the outputs folder, with the caption file.
6. Offer trial reels: `npm run engine -- trials <id>` makes 3 versions with different hooks.

Several clips: do them one after another, then give one short summary list at the end.
