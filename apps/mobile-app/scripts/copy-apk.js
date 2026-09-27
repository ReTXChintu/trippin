const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "build", "app", "outputs", "flutter-apk", "app-release.apk");
const destDir = path.join(root, "dist");
const dest = path.join(destDir, "tripplanner.apk");

if (!fs.existsSync(src)) {
  console.error(`APK not found: ${src}`);
  console.error("Run: flutter build apk --release");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${src} -> ${dest}`);
