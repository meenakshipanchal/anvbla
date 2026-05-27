/* Generates PWA PNG icons from inline SVG sources using sharp. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/icons/", import.meta.url);

// Standard icon: rounded blue tile with the BlaBlue glyph.
const standard = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="120" fill="#0071eb"/>
  <path d="M150 320c0-35 28-64 64-64h27c27 0 49-22 49-49s-22-49-49-49h-70"
        stroke="#9ef769" stroke-width="36" stroke-linecap="round" fill="none"/>
  <circle cx="352" cy="214" r="38" fill="#2dbeff"/>
  <circle cx="171" cy="352" r="38" fill="#ffffff"/>
</svg>`;

// Maskable icon: full-bleed background so platform masks crop safely.
const maskable = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0071eb"/>
  <g transform="translate(86 86) scale(0.66)">
    <path d="M150 320c0-35 28-64 64-64h27c27 0 49-22 49-49s-22-49-49-49h-70"
          stroke="#9ef769" stroke-width="40" stroke-linecap="round" fill="none"/>
    <circle cx="352" cy="214" r="42" fill="#2dbeff"/>
    <circle cx="171" cy="352" r="42" fill="#ffffff"/>
  </g>
</svg>`;

await mkdir(OUT, { recursive: true });

async function render(svg, name, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(name, OUT).pathname);
  console.log("wrote", name);
}

await render(standard(192), "icon-192.png", 192);
await render(standard(512), "icon-512.png", 512);
await render(maskable, "maskable-512.png", 512);
console.log("done");
