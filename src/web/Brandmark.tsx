import React from "react";
import { APP_NAME } from "../shared/app";

// The Cutroom wordmark: a little scissors-cut tile plus the name.
export function Brandmark({ size = 22 }: { size?: number }) {
  return (
    <a className="brandmark" href="#" style={{ fontSize: size }}>
      <span className="brandmark-tile" aria-hidden>
        <svg viewBox="0 0 24 24" width="0.9em" height="0.9em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="6" cy="7" r="3" />
          <circle cx="6" cy="17" r="3" />
          <path d="M8.6 8.6 20 18M8.6 15.4 20 6" />
        </svg>
      </span>
      <span>{APP_NAME}</span>
    </a>
  );
}

export function TopNav({ active, right }: { active: "reels" | "brand"; right?: React.ReactNode }) {
  return (
    <header className="topnav">
      <Brandmark />
      <nav className="topnav-links">
        <a className={active === "reels" ? "on" : ""} href="#">Reels</a>
        <a className={active === "brand" ? "on" : ""} href="#/brand">Brand kit</a>
      </nav>
      <div className="topnav-right">{right}</div>
    </header>
  );
}
