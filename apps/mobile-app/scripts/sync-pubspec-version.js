const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const pubspecPath = path.join(root, "pubspec.yaml");
const pubspec = fs.readFileSync(pubspecPath, "utf8");

const semver = pkg.version;
const current = pubspec.match(/^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$/m);
const buildNumber = current ? Number.parseInt(current[2], 10) + 1 : 1;

const next = pubspec.replace(
  /^version:.*$/m,
  `version: ${semver}+${buildNumber}`,
);

fs.writeFileSync(pubspecPath, next);
console.log(`pubspec.yaml -> ${semver}+${buildNumber}`);
