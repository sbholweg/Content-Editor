import { APP_NAME } from "../shared/app";
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
    <form
      className="center stack"
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
      <h1 className="serif">{APP_NAME}</h1>
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      <button className="btn primary" type="submit">Log in</button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
