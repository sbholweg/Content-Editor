---
name: update-engine
description: Update the engine to the latest version. Use when the person says "update me", "get the latest version", or asks about a new feature they heard about.
---

# Update the engine

1. Stop the running editor (the background `npm run local` task) if it's running.
2. Run `git pull`, then `npm install`, then `npm run setup` (quick if nothing changed).
3. Start the editor again with `npm run local` in the background.
4. Tell them it's updated, and summarize new features from `git log --oneline -10` in plain words
   (skip technical commits).

If `git pull` complains about local changes, don't discard anything. Run `git stash`, pull,
then `git stash pop`, and explain if something conflicts. Their reels, library and settings
live in `data/`, `inbox/` and `outputs/`, which updates never touch.
