const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const storageRoot = path.resolve(
  process.env.SCREENSHOT_STORAGE_DIR ||
    path.join(__dirname, "..", "storage", "screenshots")
);

const getEncryptionKey = () => {
  const configured = process.env.SCREENSHOT_ENCRYPTION_KEY;
  const source = configured || process.env.JWT_SECRET;

  if (!source) {
    throw new Error("SCREENSHOT_ENCRYPTION_KEY or JWT_SECRET is required");
  }

  if (/^[a-f0-9]{64}$/i.test(source)) {
    return Buffer.from(source, "hex");
  }

  try {
    const decoded = Buffer.from(source, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to deterministic key derivation.
  }

  return crypto.createHash("sha256").update(source).digest();
};

const ensureStorageRoot = async () => {
  await fs.mkdir(storageRoot, { recursive: true, mode: 0o700 });
};

const getSafeRelativePath = (employeeId, capturedAt) => {
  const date = new Date(capturedAt);
  const day = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
  const fileName = `${crypto.randomUUID()}.bin`;

  return path.join(String(employeeId), day, fileName);
};

const encryptAndStoreScreenshot = async ({ employeeId, capturedAt, buffer }) => {
  await ensureStorageRoot();

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const relativePath = getSafeRelativePath(employeeId, capturedAt);
  const fullPath = path.join(storageRoot, relativePath);

  await fs.mkdir(path.dirname(fullPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(fullPath, encrypted, { mode: 0o600 });

  return {
    storagePath: relativePath,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
};

const readAndDecryptScreenshot = async ({ storagePath, iv, authTag }) => {
  const key = getEncryptionKey();
  const fullPath = path.resolve(storageRoot, storagePath);

  if (!fullPath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid screenshot storage path");
  }

  const encrypted = await fs.readFile(fullPath);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

const deleteStoredScreenshot = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  const fullPath = path.resolve(storageRoot, storagePath);

  if (!fullPath.startsWith(`${storageRoot}${path.sep}`)) {
    return;
  }

  await fs.rm(fullPath, { force: true });
};

module.exports = {
  encryptAndStoreScreenshot,
  readAndDecryptScreenshot,
  deleteStoredScreenshot,
};
