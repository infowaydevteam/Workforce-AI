import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, "..");

const version = process.argv[2] || "1.0.0";
const configuration = process.argv[3] || "Release";

const projectPath = path.join(rootDir, "IWF-Agent", "IWF-Agent", "IWF-Agent.csproj");
const publishDir = path.join(
  rootDir,
  "IWF-Agent",
  "IWF-Agent",
  "bin",
  configuration,
  "net10.0",
  "win-x64",
  "publish"
);
const packageRoot = path.join(rootDir, "backend", "agent-updates", "windows", version);
const packagePath = path.join(packageRoot, `IWF-Agent-Setup-${version}.zip`);

await execFileAsync("dotnet", [
  "publish",
  projectPath,
  "-c",
  configuration,
  "-r",
  "win-x64",
  "--self-contained",
  "true",
]);

await fsp.mkdir(packageRoot, { recursive: true });

await fsp.copyFile(
  path.join(rootDir, "packaging", "windows", "install-iwf-agent.ps1"),
  path.join(publishDir, "install-iwf-agent.ps1")
);

await fsp.rm(packagePath, { force: true });

await execFileAsync("zip", ["-r", packagePath, "."], {
  cwd: publishDir,
});

console.log(`Built Windows agent package: ${packagePath}`);
console.log("Update manifest with:");
console.log(
  `node scripts/update-agent-manifest.mjs windows ${version} "${packagePath}" "Windows agent ${version}"`
);
