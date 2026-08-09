import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const source = await readFile("public/favicon.svg", "utf8");
const browser = await chromium.launch({ headless: true });

async function render(size, { background = "transparent" } = {}) {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: size, height: size },
  });
  await page.setContent(`
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: ${background}; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
    ${source}
  `);
  const image = await page.screenshot({
    omitBackground: background === "transparent",
    type: "png",
  });
  await page.close();
  return image;
}

function createIco(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

try {
  const favicon16 = await render(16);
  const favicon32 = await render(32);
  const appleTouchIcon = await render(180, { background: "#111512" });

  await Promise.all([
    writeFile("public/favicon.png", favicon32),
    writeFile(
      "public/favicon.ico",
      createIco([
        { size: 16, data: favicon16 },
        { size: 32, data: favicon32 },
      ]),
    ),
    writeFile("public/apple-touch-icon.png", appleTouchIcon),
  ]);
} finally {
  await browser.close();
}
