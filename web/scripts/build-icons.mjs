// Builds the two binary icons Next serves by file convention, from two
// different sources, because a browser tab and a home screen want different
// artwork.
//
//   node scripts/build-icons.mjs
//
// app/favicon.ico (32px) comes from app/icon.png, the mark with no tile.
// A tab renders it at 16 or 32 pixels, and the owner's cream tile eats about
// a third of that canvas before the pot gets any, so the tile is dropped and
// the glyph takes the whole square.
//
// app/apple-icon.png (180px) comes from public/brand/app-icon-tile.png, the
// square tile with no corner cut. iOS applies its own mask and composites the
// icon opaque, so supplying pre-rounded transparent corners leaves black
// wedges on some versions.
//
// Run it after editing either source and commit the results.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const markSource = readFileSync(join(appDir, "icon.png")).toString("base64");
const tileSource = readFileSync(
  join(appDir, "..", "public", "brand", "app-icon-tile.png"),
).toString("base64");

/** Screenshots one source at one size on a transparent canvas. */
async function render(page, size, source) {
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

const ico = await render(page, 32, markSource);
writeFileSync(join(appDir, "favicon.ico"), pngToIco(ico, 32));

const apple = await render(page, 180, tileSource);
writeFileSync(join(appDir, "apple-icon.png"), apple);

await browser.close();
console.log("wrote app/favicon.ico (32px) and app/apple-icon.png (180px)");
