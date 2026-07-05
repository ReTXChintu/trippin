const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = rootPkg.version;

function setVersion(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${path.relative(root, pkgPath)} -> ${version}`);
}

setVersion(path.join(root, "apps/frontend/package.json"));
setVersion(path.join(root, "apps/backend/package.json"));
setVersion(path.join(root, "apps/mobile-app/package.json"));

execFileSync("node", ["scripts/sync-pubspec-version.js"], {
  cwd: path.join(root, "apps/mobile-app"),
  stdio: "inherit",
});

execFileSync("git", [
  "add",
  "apps/frontend/package.json",
  "apps/backend/package.json",
  "apps/mobile-app/package.json",
  "apps/mobile-app/pubspec.yaml",
], { cwd: root, stdio: "inherit" });
