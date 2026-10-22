---
name: repurpose-reel
description: Turn a reel into a carousel and/or Instagram stories (and trial reels). Use when the person says "make a carousel", "turn this into stories", "repurpose this", "six ways to post it", or "write my carousel".
---

# Repurpose a reel

1. `npm run engine -- show <id|latest>` and `npm run engine -- looks` (business profile, calls to action).
2. Write the slides yourself (better than the automatic draft) to `slides.json`, then run
   `npm run engine -- carousel <id> slides.json` or `npm run engine -- stories <id> slides.json`.
   It renders the images in the reel's fonts and colors and saves them to the outputs folder.
   (Running it without a file makes a quick draft from the reel's key words.)
3. Tell them the images are ready in the outputs folder and in the Finish tab, where they can
   tweak any slide and tap "Make the images" again.
4. Offer trial reels too: `npm run engine -- trials <id>`.

## Slide format
```json
[
  {"id": "c1", "kind": "cover", "eyebrow": "", "title": "3 reasons your reels stall", "body": "", "pills": [], "frameMs": 0},
  {"id": "c2", "kind": "point", "eyebrow": "reason one: your", "title": "hook", "body": "say who it's for in the first 2 seconds", "pills": ["say who it's for", "make a promise"], "frameMs": 4200},
  {"id": "c9", "kind": "cta", "eyebrow": "if this helped", "title": "save it", "body": "Comment VA for my checklist", "pills": [], "frameMs": 30000}
]
```
- `title` is the big word(s), shown in their hook font: keep it to 1-3 words on point slides.
- `eyebrow` is a short lead-in that reads into the title ("reason one: your" → "hook").
- `pills` are optional short tags (2-4 words each, max 3).
- Wrap the list as `{"design": "photo|framed|clean|bold", "slides": [...]}` to choose a design:
  photo (full-bleed photo), framed (photo on their brand color), clean (no photo, light brand
  background), bold (no photo, their main color). Clean/bold suit text-heavy carousels.
- `bgAssetId` (optional) uses a photo from their library instead of a video frame (`library` lists ids).
- `frameMs` picks the background: the start time of a word from `show` (the original video's
  time, before cuts). Pick moments where they're looking at the camera, matching the point.
- **Carousel**: cover (the hook as a promise), 3-6 point slides (one idea each, in order),
  then a CTA slide with their call to action.
- **Stories**: 2-3 frames: a teaser ("stuck at / 200 views?" style, makes them want the post),
  one takeaway, then "new post" with a nudge to watch it.
- Use only what they actually said. Lowercase, conversational, their voice.
