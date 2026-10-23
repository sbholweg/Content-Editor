import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { TopNav } from "./Brandmark";

const SCRIPT_KEY = "cutroom.prompterScript";
const SETTINGS_KEY = "cutroom.prompterSettings";

const load = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const keep = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing: just don't remember it.
  }
};

// Teleprompter: write (or have Claude write) a script, then read it as it scrolls. On a computer
// (or any secure page) it can also record from the camera and send the take straight in as a reel.
export function Teleprompter({ onAuthError, onOpenReel }: { onAuthError: (err: unknown) => void; onOpenReel: (id: string) => void }) {
  const [script, setScript] = useState(() => load(SCRIPT_KEY, ""));
  const [idea, setIdea] = useState(() => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("idea") ?? "");
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, { wpm: 150, size: 44, mirror: false }));
  const [reading, setReading] = useState(false);

  useEffect(() => keep(SCRIPT_KEY, script), [script]);
  useEffect(() => keep(SETTINGS_KEY, settings), [settings]);

  const write = async () => {
    if (!idea.trim()) return;
    setWriting(true);
    setError("");
    try {
      setScript((await api.writeScript(idea)).script);
    } catch (err) {
      onAuthError(err);
      setError((err as Error).message);
    }
    setWriting(false);
  };

  const words = script.trim() ? script.trim().split(/\s+/).length : 0;

  if (reading) {
    return <Prompter script={script} settings={settings} onSettings={setSettings} onClose={() => setReading(false)} onAuthError={onAuthError} onOpenReel={onOpenReel} />;
  }

  return (
    <div className="site">
      <TopNav active="prompter" />
      <main className="page wide stack">
        <div>
          <span className="eyebrow">Teleprompter</span>
          <h1 className="display small">Read it. <span className="accent-text">Nail</span> it.</h1>
          <p className="lede">Fewer retakes means less to cut. Write your script (or let Claude), then read it as it scrolls.</p>
        </div>
        <section className="panel-card">
          <h3>Start from an idea</h3>
          <div className="row">
            <input value={idea} placeholder="e.g. why I stopped charging hourly" onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && write()} aria-label="Reel idea" />
            <button className="btn primary small-btn" disabled={writing || !idea.trim()} onClick={write}>{writing ? "Writing…" : "✨ Write my script"}</button>
          </div>
          <p className="muted small">Claude writes it in your voice from your brand kit, and leaves [brackets] where only you know the real detail.</p>
          {error ? <p className="error small">{error}</p> : null}
        </section>
        <section className="panel-card">
          <div className="row">
            <h3 className="grow">Your script</h3>
            <span className="muted small mono">{words} words · about {Math.max(1, Math.round((words / settings.wpm) * 60))}s</span>
          </div>
          <textarea className="script-box" value={script} placeholder="Paste or type your script. One sentence per line reads best." onChange={(e) => setScript(e.target.value)} rows={12} />
          <button className="btn primary big" disabled={!script.trim()} onClick={() => setReading(true)}>▶ Start the teleprompter</button>
        </section>
      </main>
    </div>
  );
}

type Settings = { wpm: number; size: number; mirror: boolean };

function Prompter({ script, settings, onSettings, onClose, onAuthError, onOpenReel }: {
  script: string;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onClose: () => void;
  onAuthError: (err: unknown) => void;
  onOpenReel: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [upload, setUpload] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  // Recording needs camera access, which phones only allow on secure (https) pages.
  const canRecord = typeof window !== "undefined" && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

  // Keep the screen awake while reading.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  // Scroll at the reading speed: words per minute, measured against the script's length.
  useEffect(() => {
    if (!running) return;
    const el = scroller.current;
    if (!el) return;
    const words = Math.max(1, script.trim().split(/\s+/).length);
    const total = el.scrollHeight - el.clientHeight;
    const pxPerMs = total / ((words / settings.wpm) * 60000);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      el.scrollTop += pxPerMs * (now - last);
      last = now;
      if (el.scrollTop < total - 1) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, settings.wpm, script]);

  const start = useCallback(() => {
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setCountdown(0);
      setRunning(true);
      if (cameraOn && recorder.current && recorder.current.state === "inactive") {
        chunks.current = [];
        recorder.current.start();
        setRecording(true);
      }
    }, 3000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [cameraOn]);

  const toggleCamera = async () => {
    if (cameraOn) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      recorder.current = null;
      setCameraOn(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        void video.current.play().catch(() => {});
      }
      recorder.current = new MediaRecorder(s);
      recorder.current.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      setCameraOn(true);
    } catch {
      setNote("Couldn't open the camera. Check that this browser is allowed to use it.");
    }
  };

  const stopAndSend = async () => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return;
    setRunning(false);
    const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
    rec.stop();
    await done;
    setRecording(false);
    const type = rec.mimeType || "video/webm";
    const file = new File(chunks.current, `teleprompter-take.${type.includes("mp4") ? "mp4" : "webm"}`, { type });
    setUpload(0);
    try {
      const project = await api.upload(file, false, setUpload);
      stream.current?.getTracks().forEach((t) => t.stop());
      onOpenReel(project.id);
    } catch (err) {
      onAuthError(err);
      setNote((err as Error).message);
      setUpload(null);
    }
  };

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="prompter">
      <video ref={video} className="prompter-cam" hidden={!cameraOn} autoPlay muted playsInline />
      <div className="prompter-text" ref={scroller} onClick={() => setRunning((r) => !r)} style={{ fontSize: settings.size, transform: settings.mirror ? "scaleX(-1)" : undefined }}>
        <div className="prompter-pad" />
        {script.split("\n").map((line, i) => (
          <p key={i}>{line || " "}</p>
        ))}
        <div className="prompter-pad" />
      </div>
      <div className="prompter-guide" aria-hidden />
      {countdown ? <div className="prompter-count">{countdown}</div> : null}
      <div className="prompter-controls">
        <button className="chip" onClick={onClose}>‹ Script</button>
        <button className="btn primary small-btn" onClick={() => (running ? setRunning(false) : start())}>{running ? "❚❚ Pause" : "▶ Start"}</button>
        <button className="chip" onClick={() => scroller.current?.scrollTo({ top: 0 })}>↺ Top</button>
        <label className="prompter-slider">
          Speed
          <input type="range" min={90} max={220} value={settings.wpm} onChange={(e) => onSettings({ ...settings, wpm: Number(e.target.value) })} />
        </label>
        <label className="prompter-slider">
          Size
          <input type="range" min={28} max={72} value={settings.size} onChange={(e) => onSettings({ ...settings, size: Number(e.target.value) })} />
        </label>
        <button className={`chip ${settings.mirror ? "accent" : ""}`} onClick={() => onSettings({ ...settings, mirror: !settings.mirror })}>Mirror</button>
        {canRecord ? (
          recording ? (
            <button className="btn primary small-btn rec" onClick={stopAndSend}>■ Stop & make a reel</button>
          ) : (
            <button className={`chip ${cameraOn ? "accent" : ""}`} onClick={toggleCamera}>{cameraOn ? "✓ Camera on (records on Start)" : "● Record here"}</button>
          )
        ) : null}
        {upload !== null ? <span className="small">Sending your take… {Math.round(upload * 100)}%</span> : null}
        {note ? <span className="small error">{note}</span> : null}
      </div>
    </div>
  );
}
