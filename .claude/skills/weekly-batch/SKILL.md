---
name: weekly-batch
description: Edit a whole batch of clips at once and plan the week. Use when the person says "a week of reels from this folder", "batch my reels", "I filmed a bunch", "plan my week", or drops several clips in the inbox.
---

# Weekly batch

1. Make sure the editor is running (`npm run engine -- doctor`).
2. `npm run engine -- import` (or `import --do-it-all` if they want it hands-off). Import tightens
   every clip automatically.
3. For each new reel, follow the edit-reels skill: review the cut, key words, hook, post caption,
   then `export`. Keep them consistent with their default look unless they say otherwise.
4. Offer to repurpose each one (repurpose-reel skill): carousel, stories, b-roll trial reels.
5. `npm run engine -- plan 7` writes a numbered posting plan (one reel a day, with captions,
   carousels, stories and trial reels) to the outputs folder. Tell them where it is and summarize
   the week in a short list.

Keep it moving: do the whole batch, then give one summary at the end instead of asking after each.
