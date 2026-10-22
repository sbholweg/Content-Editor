import { spawn } from "node:child_process";

// Uses the Claude Code command line (`claude -p`) that comes with the buyer's own Claude plan,
// so the editor's ✨ buttons work without an API key. Returns null if it isn't installed or fails.
let available: boolean | null = null;

export async function askClaudeCode(prompt: string, timeoutMs = 180_000, extraArgs: string[] = []): Promise<string | null> {
  if (process.env.CLAUDE_CLI === "off" || available === false) return null;
  return new Promise((resolve) => {
    const child = spawn(process.env.CLAUDE_CLI || "claude", ["-p", "--output-format", "text", ...extraArgs], {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.on("error", () => {
      available = false;
      clearTimeout(timer);
      resolve(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) available = true;
      // "command not found" exits with 127 (or 1 on Windows' shell) and prints nothing.
      else if (!out.trim()) available = available ?? false;
      resolve(code === 0 && out.trim() ? out.trim() : null);
    });
    child.stdin.end(prompt);
  });
}

// Asks Claude Code for JSON and parses the first JSON object or array in its reply.
export async function askClaudeCodeJson<T>(prompt: string, extraArgs: string[] = [], timeoutMs = 180_000): Promise<T | null> {
  const reply = await askClaudeCode(`${prompt}\n\nReply with only the JSON, no other text.`, timeoutMs, extraArgs);
  if (!reply) return null;
  const match = reply.match(/[[{][\s\S]*[\]}]/);
  try {
    return match ? (JSON.parse(match[0]) as T) : null;
  } catch {
    return null;
  }
}

export const claudeSource = () => (process.env.ANTHROPIC_API_KEY ? "api" : available === false ? "rules" : "claude-code");
