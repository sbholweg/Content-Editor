---
name: change-reel
description: Make plain-words changes to a reel, e.g. "make it softer", "cut the first sentence", "hook lower", "captions one word at a time", "use my bold look", "add the laptop clip when I talk about clients". Use for any edit request about an existing reel.
---

# Change a reel

1. `npm run engine -- show <id|latest>` to see the words (numbered), hook, look and media.
2. Translate the request into edits, write them to `edits.json`, run
   `npm run engine -- apply <id> edits.json`. The editor updates live; tell them to look.
3. Confirm in one line what changed. If the request is ambiguous, make your best choice and
   mention the alternative ("I made it softer with a shadow instead of an outline; want serif key words too?").

## Edit format (all fields optional; word numbers come from `show`)
```json
{
  "hookText": "nobody's saying it, so i will",
  "postCaption": "...",
  "removePauses": true,
  "keyWords": [3, 9, 14],
  "addKeyWords": [20], "removeKeyWords": [9],
  "cut": [0, 1, 2], "uncut": [2],
  "cutFillers": true,
  "emojis": {"9": "💰", "14": null},
  "fixWords": {"5": "Canva"},
  "look": "default",
  "style": {
    "font": "DM Sans", "displayFont": "Instrument Serif",
    "hookColor": "#FFFFFF", "hookPosition": "top|middle|bottom", "hookDurationMs": 5000,
    "textColor": "#FFFFFF", "outlineColor": "#000000",
    "highlightColor": "#8656F6", "highlightTextColor": "#FFFFFF",
    "style": "pill|color|serif", "captionMode": "phrase|single", "textEffect": "shadow|outline",
    "position": "top|middle|bottom", "wordsPerLine": 4, "uppercase": false, "fontSize": 64
  },
  "addMedia": [{"asset": "library item name", "fromWord": 10, "toWord": 14, "placement": "middle|top|bottom|full"}],
  "removeMedia": ["ov-..."]
}
```
`hookDurationMs: 0` keeps the hook on for the whole video. `style: "pill"` = colored bubble behind
key words; `"color"` = key words change color; `"serif"` = key words in the hook font.

Fonts: captions use DM Sans, Inter, Montserrat, Poppins, Courier Prime, Anton, Bebas Neue,
Archivo Black. Hooks/serif words use Instrument Serif, Bodoni Moda, DM Serif Display, Fraunces,
Playfair Display, Caveat, Pacifico.

## Translating common requests
- "softer / calmer": textEffect shadow, style serif or color, smaller fontSize (56-62), a softer
  displayFont (Instrument Serif, Fraunces).
- "bolder / louder": textEffect outline, style pill, captionMode single, fontSize 80+, Anton or Montserrat.
- "karaoke / one word at a time": captionMode single.
- "my brand colors": use `looks` to read their default look and saved looks; prefer those colors.
- "cut the first sentence": cut the word numbers up to and including its last word.
- "add <clip> when I talk about X": find the words in `show`, find the item with `library`, use addMedia.
- "save this as my default / as a look": use the `brand` command with
  `{"defaultStyle": {...}}`, or ask them to tap "Save this as a look" in the Visuals tab.

After a change they like, ask if they want it exported (`export`).
