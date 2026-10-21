import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.ts";

// A single shared password keeps strangers from using the server (and running up costs).
// The browser trades the password for a token, which works inside an iframe and on media URLs.
export const accessToken = config.appPassword
  ? crypto.createHmac("sha256", config.appPassword).update("content-editor-access").digest("hex")
  : "";

export function checkPassword(password: string) {
  if (!config.appPassword) return true;
  const a = Buffer.from(password);
  const b = Buffer.from(config.appPassword);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!accessToken) return next();
  const header = req.headers.authorization?.replace(/^Bearer /, "");
  const token = header ?? (typeof req.query.t === "string" ? req.query.t : "");
  if (token === accessToken) return next();
  res.status(401).json({ error: "Please log in" });
}
