---
name: brand-kit
description: Set up, import or refine the person's brand kit (colors, fonts, logo, voice, business). Use when they say "set up my brand", "set up my brand from this" (with a brand guide, screenshot or PDF), "build me a brand", "refine my brand kit", "use my brand colors", or share brand files.
---

# Brand kit

The brand kit lives in the editor at http://localhost:3000/#/brand. Every new reel, carousel and
story starts from it, and you follow its voice when writing.

## From their brand guide, screenshot, PDF or website
1. Read what they shared (images and PDFs you can view directly). Pull out:
   - **Colors**: exact hex codes. If only shown visually, estimate carefully and say they're
     estimates. Pick one `primary` (their signature color), an `accent`, a light `background`,
     a dark `text`, and any `extra` colors. 3-6 colors total.
   - **Fonts**: names of their headline and body fonts (and a script/handwritten one if any).
     Match each to the closest font in `src/shared/fonts.ts` (exact names, e.g.
     "Instrument Serif (upright)"). If they own the real font files, tell them they can upload
     them in Visuals › Fonts & colours (or the logo/fonts can be uploaded on the brand kit page).
   - **Voice**: tone words, phrases they use, words they avoid.
   - **Business**: what they do, who they help, their call to action.
2. Save it all at once: write `brand.json` and run `npm run engine -- brand brand.json`:
```json
{
  "name": "The Calm Inbox Co.",
  "tagline": "inbox zero, without the stress",
  "setUp": true,
  "palette": [
    {"hex": "#8656F6", "name": "Signature purple", "role": "primary"},
    {"hex": "#E85BDB", "name": "Pink", "role": "accent"},
    {"hex": "#F2EFFC", "name": "Lavender", "role": "background"},
    {"hex": "#1E1533", "name": "Ink", "role": "text"}
  ],
  "fonts": {"headline": "Instrument Serif (upright)", "body": "DM Sans", "accent": "Caveat"},
  "voice": {"tone": ["calm & soft", "warm & friendly"], "phrases": ["let's get you some time back"], "avoid": ["hustle"]},
  "business": {"what": "...", "audience": "...", "cta": "..."},
  "defaultStyle": {"font": "DM Sans", "displayFont": "Instrument Serif (upright)", "highlightColor": "#8656F6"}
}
```
   (`palette` replaces the whole list. Include `defaultStyle` so new reels use the brand.)
3. Tell them to open the brand kit page to see it, and that they can tweak anything there.

## Building a brand from scratch / refining
Ask (briefly) what they do, who they help, 2-3 vibe words, and a color they love, unless the
brand kit page already has answers (`npm run engine -- looks` shows the current kit). Choose a
cohesive palette (one signature color, one accent, a very light background, a deep text color),
a font trio that fits the vibe (headline + clean body + optional script accent), and voice notes.
Explain your choices in 2-3 short lines and save as above.

Keep it cohesive: few colors, one signature color doing the "pop", lots of light space.
