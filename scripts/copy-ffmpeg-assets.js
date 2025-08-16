// scripts/copy-ffmpeg-assets.js
const fs = require("fs");
const path = require("path");

const variants = [
  { pkg: "@ffmpeg/core", sub: "core" },
  { pkg: "@ffmpeg/core-mt", sub: "core-mt" },
];

for (const v of variants) {
  const srcDir = path.join("node_modules", v.pkg, "dist", "umd");
  const dstDir = path.join("public", "ffmpeg", v.sub);
  fs.mkdirSync(dstDir, { recursive: true });

  for (const file of [
    "ffmpeg-core.js",
    "ffmpeg-core.wasm",
    "ffmpeg-core.worker.js", // only exists for core-mt; skipping if missing is fine
  ]) {
    const src = path.join(srcDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(dstDir, file));
      console.log("Copied", src, "->", path.join(dstDir, file));
    }
  }
}
console.log("ffmpeg assets copied.");
