import { APP_TAGLINE } from "../shared/app";
import { Brandmark, Sparkle, Starburst } from "./Brandmark";
import React, { useCallback, useEffect, useState } from "react";
import { api, AuthError, setToken } from "./api";
import { BrandKitPage } from "./BrandKit";
import { Editor } from "./Editor";
import { Home } from "./Home";

function currentRoute() {
  if (window.location.hash.startsWith("#/brand")) return "brand";
  const match = window.location.hash.match(/^#\/p\/([a-z0-9-]+)/);
  return match ? match[1] : null;
}

// Scanning the "Open on phone" QR code lands here with ?k=<token>: log the phone straight in,
// then drop the token from the address bar.
function adoptLinkToken() {
  const params = new URLSearchParams(window.location.search);
  const k = params.get("k");
  if (!k) return;
  setToken(k);
  params.delete("k");
  const rest = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
}
adoptLinkToken();

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [projectId, setProjectId] = useState<string | null>(currentRoute());

  useEffect(() => {
    const onHash = () => setProjectId(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    api.listProjects().then(
      () => setAuthed(true),
      (err) => setAuthed(err instanceof AuthError ? false : true),
    );
  }, []);

  const onAuthError = useCallback((err: unknown) => {
    if (err instanceof AuthError) setAuthed(false);
  }, []);

  if (authed === null) return <div className="center muted">Loading…</div>;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  if (projectId === "brand") return <BrandKitPage onBack={() => (window.location.hash = "")} onAuthError={onAuthError} />;

  return projectId ? (
    <Editor key={projectId} id={projectId} onBack={() => (window.location.hash = "")} onAuthError={onAuthError} />
  ) : (
    <Home onOpen={(id) => (window.location.hash = `#/p/${id}`)} onAuthError={onAuthError} />
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="login">
      <aside className="login-art">
        <Starburst className="login-burst" />
        <Sparkle className="login-sparkle" />
        <Brandmark size={26} />
        <div>
          <span className="eyebrow">{APP_TAGLINE}</span>
          <h1 className="display">Film it.<br />We'll <span className="accent-text">cut</span> it.</h1>
          <p className="lede">Talking reels, carousels, stories and trial reels, all in your brand.</p>
        </div>
        <div className="login-chips">
          <span className="sticker lime">Cuts the pauses</span>
          <span className="sticker violet">Captions in your fonts</span>
          <span className="sticker">One reel, six posts</span>
        </div>
      </aside>
    <form
      className="login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const { token } = await api.login(password);
          setToken(token);
          onDone();
        } catch (err) {
          setError(String((err as Error).message));
        }
      }}
    >
      <h2 className="display small">Welcome back</h2>
      <p className="muted">Enter your editor password to open your cutroom.</p>
      <label className="field-label" htmlFor="pw">Password</label>
      <input id="pw" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      <button className="btn primary big" type="submit">Open The Cutroom</button>
      {error ? <p className="error">{error}</p> : null}
      <p className="muted small">Forgot it? It's the APP_PASSWORD in your .env file. Ask Claude “what's my editor password?”</p>
    </form>
    </div>
  );
}
