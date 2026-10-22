---
name: repurpose-old-content
description: Turn old posts and videos into new content. Use when the person wants to repurpose old reels, past Instagram content, an Instagram data download, or a folder of old videos into new reels, trial reels, carousels or stories.
---

# Repurpose old content

Instagram doesn't offer a simple way to pull someone's old reels into another app automatically
(its official API needs a Meta developer app and a business account, and scraping breaks its
terms). The reliable way is their own download:

1. **Get the videos.** Either:
   - Instagram's **Download your information** (Instagram app › Settings › Accounts Center ›
     Your information and permissions › Download your information; choose their media). It
     arrives as a zip by email, sometimes after a while. The reels are in a media folder inside.
     Menu names change, so if they can't find it, help them search Instagram's help center for
     "download your information".
   - Or they save old reels from their phone / drafts / CapCut exports into a folder.
2. **Import them:** `npm run engine -- import "<path to video 1>" "<path to video 2>" ...`
   (or have them copy the videos into the inbox and run `import`). Each gets transcribed and tightened.
3. **Pick the best ones** together: read each with `show`, and suggest which still hold up
   (evergreen tips, stories, client wins) vs. which are dated.
4. **Repurpose** each keeper, in any mix they want:
   - a fresh edit with a new hook and their current look (change-reel skill), then `export`
   - b-roll trial reels (`trials`), so old ideas reach new people
   - a carousel and stories (repurpose-reel skill)
   - a new post caption (`caption`)
5. Finish with `npm run engine -- plan` for a posting plan.

Old content already proved itself: lead with the ideas that got the most comments or saves (ask
them which ones did well, since the download doesn't always include stats).
