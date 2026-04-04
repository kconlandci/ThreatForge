import sharp from "sharp";
import { mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "icon.png");
const resDir = join(root, "android", "app", "src", "main", "res");

const sizes = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

async function generate() {
  // Standard launcher icons (ic_launcher.png & ic_launcher_round.png)
  for (const { folder, size } of sizes) {
    const dir = join(resDir, folder);
    mkdirSync(dir, { recursive: true });

    await sharp(src).resize(size, size).png().toFile(join(dir, "ic_launcher.png"));
    await sharp(src).resize(size, size).png().toFile(join(dir, "ic_launcher_round.png"));
    console.log(`  ${folder}: ${size}x${size}`);
  }

  // Adaptive icon foreground (432x432 with ~20% padding = icon at ~346px centered)
  const fgSize = 432;
  const iconSize = Math.round(fgSize * 0.6); // 60% of canvas = ~20% padding each side
  const offset = Math.round((fgSize - iconSize) / 2);

  const resizedIcon = await sharp(src).resize(iconSize, iconSize).png().toBuffer();

  await sharp({
    create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resizedIcon, left: offset, top: offset }])
    .png()
    .toFile(join(resDir, "mipmap-xxxhdpi", "ic_launcher_foreground.png"));

  console.log("  mipmap-xxxhdpi: ic_launcher_foreground.png (432x432)");

  // Copy 512x512 to public/
  const publicDir = join(root, "public");
  mkdirSync(publicDir, { recursive: true });
  copyFileSync(src, join(publicDir, "icon-512.png"));
  console.log("  public/icon-512.png copied");
}

generate().then(() => console.log("Done!")).catch((e) => { console.error(e); process.exit(1); });
