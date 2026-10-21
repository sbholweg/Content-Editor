import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(root, "data")),
  whisperDir: path.resolve(process.env.WHISPER_DIR ?? path.join(root, "whisper.cpp")),
  // whisper.cpp release to build; see https://github.com/ggml-org/whisper.cpp/releases
  whisperVersion: process.env.WHISPER_VERSION ?? "1.7.6",
  // "base.en" is fast on a small server; "small.en" is more accurate but ~3x slower
  whisperModel: (process.env.WHISPER_MODEL ?? "base.en") as "base.en" | "small.en" | "medium.en",
  // Optional. When set, the app asks for this password before anyone can use it.
  appPassword: process.env.APP_PASSWORD ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  root,
};
