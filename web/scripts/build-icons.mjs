// Rasterizes app/icon.png into the two binary icons Next serves by file
// convention: app/favicon.ico (32px, PNG-in-ICO) and app/apple-icon.png
// (180px).
//
//   node scripts/build-icons.mjs
//
// Run it after any edit to app/icon.png and commit the results.
//
// The source used to be an SVG of the bare mark. It is now the owner's app
// icon artwork: the pot on its own rounded cream tile, with everything
// outside that tile transparent. The tile is part of the icon, so the
// transparency here is the corner cut rather than a bare glyph.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const source = readFileSync(join(appDir, "icon.png")).toString("base64");

/** Screenshots the icon at one size on a transparent canvas. */
async function render(page, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;background:transparent}
       img{display:block;width:${size}px;height:${size}px}
     </style><img src="data:image/png;base64,${source}">`,
  );
  // The decode has to finish before the screenshot or the canvas comes back
  // empty at the smaller sizes.
  await page.locator("img").first().evaluate((el) => el.decode());
  return page.screenshot({ omitBackground: true });
}

/** Wraps a single PNG in an ICO container (the format allows PNG payloads). */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage();

const ico = await render(page, 32);
writeFileSync(join(appDir, "favicon.ico"), pngToIco(ico, 32));

const apple = await render(page, 180);
writeFileSync(join(appDir, "apple-icon.png"), apple);

await browser.close();
console.log("wrote app/favicon.ico (32px) and app/apple-icon.png (180px)");
