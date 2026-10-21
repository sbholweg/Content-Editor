import { ensureBrowser } from "@remotion/renderer";
import { setupWhisper } from "./setup-whisper.ts";

// One-time setup, run during the Docker build: downloads the headless browser used for
// exporting and builds the speech-to-text engine.
await ensureBrowser({ browserExecutable: process.env.REMOTION_BROWSER || null });
await setupWhisper();
console.log("Setup complete");
