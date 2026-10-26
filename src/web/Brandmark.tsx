import React from "react";
import { APP_NAME } from "../shared/app";
import { PhoneButton } from "./PhoneLink";

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

export function TopNav({ active, right }: { active: "reels" | "brand" | "prompter"; right?: React.ReactNode }) {
  return (
    <header className="topnav">
      <Brandmark />
      <nav className="topnav-links">
        <a className={active === "reels" ? "on" : ""} href="#">Reels</a>
        <a className={active === "brand" ? "on" : ""} href="#/brand">Brand kit</a>
        <a className={active === "prompter" ? "on" : ""} href="#/prompter">Teleprompter</a>
      </nav>
      <div className="topnav-right">
        <PhoneButton className="chip phone-btn" />
        {right}
      </div>
    </header>
  );
}
