import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const accent = "#E0852F"; // Dawn accent
const cream = "#FBF1DC";

// A sunrise-over-horizon mark (matches the in-app "Today" icon) on a warm tile.
function svg(size, scale, rounded) {
  const k = (size * scale) / 24;
  const tx = size / 2 - (24 * k) / 2;
  const ty = size / 2 - (24 * k) / 2;
  const rx = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${accent}"/>
  <g transform="translate(${tx} ${ty}) scale(${k})" fill="none" stroke="${cream}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 18h18"/>
    <path d="M7 18a5 5 0 0 1 10 0"/>
    <path d="M12 3.5v2.5M5 8.8l1.6 1.6M19 8.8l-1.6 1.6"/>
  </g>
</svg>`;
}

async function render(size, scale, file, rounded) {
  await sharp(Buffer.from(svg(size, scale, rounded)))
    .png()
    .toFile(join(OUT, file));
  console.log("wrote", file);
}

await render(192, 0.56, "icon-192.png", true);
await render(512, 0.56, "icon-512.png", true);
await render(512, 0.4, "icon-512-maskable.png", false); // full-bleed for OS masking
await render(180, 0.58, "apple-touch-icon.png", false); // iOS rounds it itself
console.log("done ->", OUT);
