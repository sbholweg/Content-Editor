import QRCode from "qrcode";
import React, { useEffect, useState } from "react";
import { api } from "./api";
import { Modal } from "./Media";

// "Open on phone": a QR code your phone's camera can scan to open the editor (logged in) on the
// same Wi-Fi, straight to this reel if you're in one. Then "Save video" puts it in your Photos.
export function PhoneButton({ className = "chip", label = "📱 Open on phone" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>{label}</button>
      {open ? <PhoneModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PhoneModal({ onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<string[] | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.phoneLink().then(
      async ({ links, token }) => {
        setLinks(links);
        if (!links.length) return;
        const target = `${links[0]}/${token ? `?k=${encodeURIComponent(token)}` : ""}${window.location.hash}`;
        setQr(await QRCode.toString(target, { type: "svg", margin: 1, color: { dark: "#111014", light: "#ffffff" } }));
      },
      (err) => setError((err as Error).message),
    );
  }, []);

  return (
    <Modal eyebrow="Your phone" title="Open The Cutroom on your phone" onClose={onClose}>
      {error ? <p className="error">{error}</p> : null}
      {links === null && !error ? <p className="muted">Finding this computer on your Wi-Fi…</p> : null}
      {links && !links.length ? (
        <p>This computer doesn't seem to be on a Wi-Fi or home network right now. Connect it to the same Wi-Fi as your phone, then try again.</p>
      ) : null}
      {qr ? (
        <div className="phone-link">
          <div className="phone-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <ol className="phone-steps">
            <li>Make sure your phone is on the <strong>same Wi-Fi</strong> as this computer.</li>
            <li>Open your phone's <strong>camera</strong> and point it at this code, then tap the link that pops up.</li>
            <li>When a reel is exported, tap <strong>Save video</strong> on your phone, then <strong>Save Video</strong> in the share sheet. It lands in your Photos, ready to post.</li>
          </ol>
          <p className="muted small">
            Or type this into your phone's browser: <span className="mono">{links![0]}</span> (you'll need your editor password).
            Keep the editor running on this computer while you use it.
          </p>
          <p className="muted small">
            Won't load? On Windows, the first time the editor ran it asked to allow Node.js through the firewall. It needs to be
            allowed on <strong>private networks</strong>. Ask Claude “my phone can't open the editor” and it will walk you through it.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
