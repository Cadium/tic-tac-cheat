// The shareable Verdict Card — drawn to a <canvas> in the same Swiss-brutalist
// language as the site. Download works (real site, not a sandboxed artifact);
// Web Share is used when the browser offers it.

const W = 1200;
const H = 1500;

const C = {
  ink: '#121212', paper: '#f4efdf', red: '#ed3d2b', yellow: '#ffd438', muted: '#777164',
};

export function drawVerdictCard(canvas, v) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);

  // frame
  g.strokeStyle = C.ink;
  g.lineWidth = 10;
  g.strokeRect(24, 24, W - 48, H - 48);

  // giant ghost O
  g.save();
  g.translate(W - 250, H - 120);
  g.rotate(0.1);
  g.fillStyle = C.yellow;
  g.font = '900 720px "Space Grotesk", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('O', 0, 0);
  g.restore();

  const pad = 96;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';

  mono(g, 'OFFICIAL VERDICT — CERTIFIED BY THE HOUSE', pad, 150, 26, C.ink);
  mono(g, `CASE #${v.caseNo}`, pad, 188, 26, C.muted);

  g.fillStyle = C.ink;
  g.font = '700 150px "Space Grotesk", Arial, sans-serif';
  g.fillText('THE HOUSE', pad, 360);

  g.fillStyle = C.red;
  g.font = '700 200px "Space Grotesk", Arial, sans-serif';
  g.fillText('GUILTY', pad, 560);

  g.fillStyle = C.ink;
  g.font = '600 60px "Space Grotesk", Arial, sans-serif';
  g.fillText(`on ${v.counts} count${v.counts === 1 ? '' : 's'}.`, pad, 640);

  // top exhibit quote
  g.strokeStyle = C.ink;
  g.lineWidth = 4;
  g.strokeRect(pad, 720, W - pad * 2, 230);
  mono(g, 'EXHIBIT ' + v.topExhibit.letter, pad + 28, 770, 24, C.muted);
  wrapMono(g, `“${v.topExhibit.quote}”`, pad + 28, 820, W - pad * 2 - 56, 40, 30, C.ink);

  // record
  mono(g, 'HUMAN RECORD (W–D–L)', pad, 1080, 26, C.muted);
  g.fillStyle = C.ink;
  g.font = '700 110px "Space Grotesk", Arial, sans-serif';
  g.fillText(`0 – 0 – ${v.losses}`, pad, 1180);

  mono(g, `HUMANITY: 0     THE HOUSE: ${v.houseTotal ?? '∞'}`, pad, 1250, 30, C.red);

  // footer strip
  g.fillStyle = C.ink;
  g.fillRect(24, H - 110, W - 48, 86);
  mono(g, v.url, pad, H - 56, 26, C.paper);

  return canvas;
}

function mono(g, text, x, y, size, color) {
  g.fillStyle = color;
  g.font = `500 ${size}px "DM Mono", ui-monospace, monospace`;
  g.fillText(text, x, y);
}
function wrapMono(g, text, x, y, maxW, lh, size, color) {
  g.fillStyle = color;
  g.font = `500 ${size}px "DM Mono", ui-monospace, monospace`;
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) g.fillText(line, x, yy);
}

export function cardToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export async function shareOrDownload(canvas, filename) {
  const blob = await cardToBlob(canvas);
  if (!blob) return 'error';
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'The House — Guilty' }); return 'shared'; }
    catch { /* user cancelled — fall through to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
