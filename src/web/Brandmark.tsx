import React from "react";
import { APP_NAME } from "../shared/app";

// The Cutroom wordmark: no icon, just the name with "cut" in a violet block.
export function Brandmark({ size = 22 }: { size?: number }) {
  return (
    <a className="brandmark" href="#" style={{ fontSize: size }} aria-label={APP_NAME}>
      <span aria-hidden>The</span>
      <span className="brandmark-cut" aria-hidden>Cut</span>
      <span aria-hidden>room</span>
    </a>
  );
}

// Decorative brand shapes: a starburst and a four-point sparkle.
export function Starburst({ className, fill = "var(--lime)" }: { className?: string; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <polygon
        points="50,0 58.4,29.7 85.4,14.6 70.3,41.6 100,50 70.3,58.4 85.4,85.4 58.4,70.3 50,100 41.6,70.3 14.6,85.4 29.7,58.4 0,50 29.7,41.6 14.6,14.6 41.6,29.7"
        fill={fill}
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function Sparkle({ className, fill = "var(--violet)" }: { className?: string; fill?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={fill} />
    </svg>
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
