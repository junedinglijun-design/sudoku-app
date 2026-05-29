import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  join(root, "推广图4.jpg"),
  join(root, "推广图4.jpeg"),
];

const src = candidates.find(p => existsSync(p));
const dest = join(root, "public", "og-share.jpg");

if (!src) {
  console.error("[share] 未找到推广图：", candidates.join(" 或 "));
  process.exit(1);
}

copyFileSync(src, dest);
console.log("[share] 已同步分享图:", src, "→", dest);
