import os from "node:os";

// Addresses this computer has on the home Wi-Fi / network, so a phone on the same network can
// open the editor. Private ranges only; virtual adapters (VPNs, Docker, WSL) are listed last.
export function phoneLinks(port: number): string[] {
  // PHONE_URL in .env overrides this, e.g. a private link for using the editor away from home.
  const custom = process.env.PHONE_URL?.trim().replace(/\/$/, "");
  const found: { url: string; rank: number }[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      const ip = a.address;
      const isPrivate = /^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
      if (!isPrivate) continue;
      const virtual = /vEthernet|virtual|vmware|vbox|docker|wsl|tailscale|zerotier|utun|bridge|veth/i.test(name);
      found.push({ url: `http://${ip}:${port}`, rank: (virtual ? 2 : 0) + (/^192\.168\./.test(ip) ? 0 : 1) });
    }
  }
  const links = found.sort((a, b) => a.rank - b.rank).map((f) => f.url);
  return custom ? [custom, ...links] : links;
}
