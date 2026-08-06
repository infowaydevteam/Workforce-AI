import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(rootDir, "backend", "agent-updates", "manifest.json");
const allowedPlatforms = new Set(["windows", "macos"]);

const usage = () => {
  console.log(
    "Usage: node scripts/update-agent-manifest.mjs <windows|macos> <version> <package-path> [release note]"
  );
};

const sha256File = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const [platform, version, packagePathArg, releaseNote] = process.argv.slice(2);

if (!allowedPlatforms.has(platform) || !version || !packagePathArg) {
  usage();
  process.exit(1);
}

const packagePath = path.resolve(packagePathArg);

if (!fs.existsSync(packagePath)) {
  console.error(`Package not found: ${packagePath}`);
  process.exit(1);
}

const manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
const checksum = await sha256File(packagePath);

manifest.platforms ||= {};
manifest.platforms[platform] ||= {};
manifest.platforms[platform] = {
  ...manifest.platforms[platform],
  enabled: true,
  latest_version: version,
  package_name: path.basename(packagePath),
  checksum_sha256: checksum,
  release_notes: releaseNote
    ? [releaseNote]
    : manifest.platforms[platform].release_notes || [],
};

await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Updated ${platform} manifest to ${version}`);
console.log(`Package: ${path.basename(packagePath)}`);
console.log(`SHA256: ${checksum}`);
