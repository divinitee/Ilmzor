import qrcode from "qrcode-generator";

// Redraws the bank's payment QR in a plan's style (2026-10-03).
//
// Only the LOOK changes. The text inside — the bank's own EMV payment string,
// set by the admin — is encoded unchanged, so the money goes exactly where
// the original QR sends it. Error correction is H (30%), which is what lets
// the VIRORA mark sit in the middle.
//
// Light-on-dark (inverted) codes were tested by Tee on 2026-10-02 with Click,
// Kapital bank and other bank apps: all scanned and paid. If a bank app ever
// struggles, the admin can switch the page back to the plain uploaded image.

const STYLES = {
  learner: { bg: "#120B22", g1: "#EFE6FF", g2: "#C9B8F0", finder: "#EFE6FF", finderCore: "#DCC08A", tile: "#0F0C07", ring: "#8C66D4" },
  vip: { bg: "#0E0B07", g1: "#F6E7BE", g2: "#D9B572", finder: "#F6E7BE", finderCore: "#E3C68A", tile: "#0F0C07", ring: "#B08D57" },
};

export function qrMatrix(payload) {
  const qr = qrcode(0, "H");
  qr.addData(String(payload));
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
    m.push(row);
  }
  return m;
}

// Returns a complete <svg> string. Only numbers and fixed colours go in —
// never the payload text itself — so it is safe to inject as markup.
export function qrArtSvg(payload, style = "learner", logoHref = "/virora-mark-v2.svg") {
  const s = STYLES[style] || STYLES.learner;
  const m = qrMatrix(payload);
  const n = m.length;
  const pad = 4;
  const S = n + pad * 2;
  const finders = [[0, 0], [n - 7, 0], [0, n - 7]];
  const inFinder = (x, y) => finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const c = n / 2;
  const logo = n * 0.22;
  const dots = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!m[y][x] || inFinder(x, y)) continue;
      if (Math.abs(x + 0.5 - c) < logo / 2 + 0.6 && Math.abs(y + 0.5 - c) < logo / 2 + 0.6) continue;
      dots.push(`<rect x="${(x + pad + 0.06).toFixed(2)}" y="${(y + pad + 0.06).toFixed(2)}" width="0.88" height="0.88" rx="0.36"/>`);
    }
  }
  const fs = finders.map(([fx, fy]) =>
    `<rect x="${fx + pad + 0.5}" y="${fy + pad + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${s.finder}" stroke-width="1"/>` +
    `<rect x="${fx + pad + 2}" y="${fy + pad + 2}" width="3" height="3" rx="0.9" fill="${s.finderCore}"/>`,
  ).join("");
  const L = logo + 1.2;
  const id = `qa${style}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="100%" height="100%" role="img" aria-label="QR">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.g1}"/><stop offset="1" stop-color="${s.g2}"/></linearGradient></defs>` +
    `<rect width="${S}" height="${S}" rx="${(S * 0.06).toFixed(2)}" fill="${s.bg}"/>` +
    `<g fill="url(#${id})">${dots.join("")}</g>${fs}` +
    `<rect x="${(c + pad - L / 2).toFixed(2)}" y="${(c + pad - L / 2).toFixed(2)}" width="${L.toFixed(2)}" height="${L.toFixed(2)}" rx="${(L * 0.24).toFixed(2)}" fill="${s.tile}" stroke="${s.ring}" stroke-width="0.35"/>` +
    `<image href="${logoHref}" x="${(c + pad - logo / 2).toFixed(2)}" y="${(c + pad - logo / 2).toFixed(2)}" width="${logo.toFixed(2)}" height="${logo.toFixed(2)}"/>` +
    `</svg>`;
}

// Styled QR as a PNG Blob, for "save QR image" (paying on the same phone:
// save, then pick it from the gallery in the bank app). The logo is inlined
// as a data URI because an SVG drawn into a canvas can't load outside files.
export async function qrArtPng(payload, style = "learner", size = 1024) {
  let logo = "";
  try {
    const txt = await (await fetch("/virora-mark-v2.svg")).text();
    logo = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(txt)))}`;
  } catch { /* no logo is fine: error correction H covers the gap */ }
  const svg = qrArtSvg(payload, style, logo || "data:,")
    .replace('width="100%" height="100%"', `width="${size}" height="${size}"`);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(img, 0, 0, size, size);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
