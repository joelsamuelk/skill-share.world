import fs from "fs";
import path from "path";
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const storageClient = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: process.env.GCS_CREDENTIALS_JSON
    ? JSON.parse(process.env.GCS_CREDENTIALS_JSON)
    : undefined,
});

const LEGACY_PROFILE_PICTURES_DIR = path.resolve(
  process.cwd(),
  "data/profile_pictures/profile_pictures",
);

function getContentTypeForExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function getExtensionForContentType(contentType?: string): string {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

type LocalObjectDetails = {
  aclPolicy: ObjectAclPolicy | null;
  filePath: string;
  isLegacyArchive: boolean;
};

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  isLocalObjectStorageEnabled(): boolean {
    return Boolean(process.env.LOCAL_OBJECTS_DIR);
  }

  getLocalObjectsDir(): string {
    const dir = process.env.LOCAL_OBJECTS_DIR;
    if (!dir) {
      throw new Error(
        "LOCAL_OBJECTS_DIR not set. Use a writable directory path like ./data/objects.",
      );
    }

    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }

  getLocalUploadDir(): string {
    return path.join(this.getLocalObjectsDir(), "uploads");
  }

  getLocalObjectUploadURL(objectId: string): string {
    return `/api/local-objects/upload/${objectId}`;
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Use a Google Cloud Storage bucket path like /my-bucket/public.",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Use a Google Cloud Storage bucket path like /my-bucket/private.",
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = storageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    if (this.isLocalObjectStorageEnabled()) {
      return this.getLocalObjectUploadURL(randomUUID());
    }

    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = storageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/api/local-objects/upload/")) {
      const objectId = rawPath.split("/").pop()?.split("?")[0];
      return objectId ? `/objects/uploads/${objectId}` : rawPath;
    }

    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      const url = new URL(rawPath);
      if (url.pathname.startsWith("/api/local-objects/upload/")) {
        const objectId = url.pathname.split("/").pop();
        return objectId ? `/objects/uploads/${objectId}` : rawPath;
      }
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    if (this.isLocalObjectStorageEnabled()) {
      const details = await this.getLocalObjectDetails(normalizedPath);
      if (!details) {
        throw new ObjectNotFoundError();
      }

      await this.setLocalObjectAclPolicy(details.filePath, aclPolicy);
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async writeLocalObjectUpload(
    objectId: string,
    data: Buffer,
    contentType?: string,
  ): Promise<string> {
    const uploadDir = this.getLocalUploadDir();
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const existingFiles = await fs.promises.readdir(uploadDir).catch(() => []);
    await Promise.all(
      existingFiles
        .filter(
          (entry) =>
            entry === objectId ||
            entry.startsWith(`${objectId}.`) ||
            entry.startsWith(`${objectId}.acl.`),
        )
        .map((entry) =>
          fs.promises.rm(path.join(uploadDir, entry), { force: true }),
        ),
    );

    const extension = getExtensionForContentType(contentType);
    const filePath = path.join(uploadDir, `${objectId}${extension}`);
    await fs.promises.writeFile(filePath, data);
    return filePath;
  }

  async hasLocalObjectEntity(objectPath: string): Promise<boolean> {
    const details = await this.getLocalObjectDetails(objectPath);
    return Boolean(details);
  }

  async downloadLocalObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    const details = await this.getLocalObjectDetails(objectPath);
    if (!details) {
      throw new ObjectNotFoundError();
    }

    const stats = await fs.promises.stat(details.filePath);
    const extension = path.extname(details.filePath);
    const contentType = getContentTypeForExtension(extension);
    const isPublic = details.aclPolicy?.visibility === "public" || details.isLegacyArchive;

    res.set({
      "Content-Type": contentType,
      "Content-Length": stats.size.toString(),
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    });

    const stream = fs.createReadStream(details.filePath);
    stream.on("error", (error) => {
      console.error("Error streaming local object:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming file" });
      }
    });
    stream.pipe(res);
  }

  async canAccessLocalObjectEntity({
    userId,
    objectPath,
    requestedPermission,
  }: {
    userId?: string;
    objectPath: string;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    const details = await this.getLocalObjectDetails(objectPath);
    if (!details) {
      return false;
    }

    const permission = requestedPermission ?? ObjectPermission.READ;
    const aclPolicy =
      details.aclPolicy ??
      (details.isLegacyArchive
        ? { owner: "legacy-import", visibility: "public" as const }
        : null);

    if (!aclPolicy) {
      return false;
    }

    if (aclPolicy.visibility === "public" && permission === ObjectPermission.READ) {
      return true;
    }

    if (!userId) {
      return false;
    }

    return aclPolicy.owner === userId;
  }

  private async setLocalObjectAclPolicy(
    filePath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<void> {
    await fs.promises.writeFile(
      `${filePath}.acl.json`,
      JSON.stringify(aclPolicy, null, 2),
      "utf8",
    );
  }

  private async getLocalObjectDetails(objectPath: string): Promise<LocalObjectDetails | null> {
    const objectId = this.getLocalObjectId(objectPath);
    if (!objectId) {
      return null;
    }

    const localUploads = await this.findLocalObjectFile(this.getLocalUploadDir(), objectId);
    if (localUploads) {
      const aclPolicy = await this.readLocalAclPolicy(localUploads);
      return {
        aclPolicy,
        filePath: localUploads,
        isLegacyArchive: false,
      };
    }

    const legacyFile = await this.findLocalObjectFile(LEGACY_PROFILE_PICTURES_DIR, objectId);
    if (legacyFile) {
      return {
        aclPolicy: null,
        filePath: legacyFile,
        isLegacyArchive: true,
      };
    }

    return null;
  }

  private getLocalObjectId(objectPath: string): string | null {
    if (!objectPath.startsWith("/objects/uploads/")) {
      return null;
    }

    return objectPath.replace("/objects/uploads/", "").split("/")[0] || null;
  }

  private async findLocalObjectFile(dirPath: string, objectId: string): Promise<string | null> {
    const entries = await fs.promises.readdir(dirPath).catch(() => []);
    const match = entries.find(
      (entry) =>
        !entry.endsWith(".acl.json") &&
        (entry === objectId || entry.startsWith(`${objectId}.`)),
    );

    return match ? path.join(dirPath, match) : null;
  }

  private async readLocalAclPolicy(filePath: string): Promise<ObjectAclPolicy | null> {
    const aclPath = `${filePath}.acl.json`;
    const exists = await fs.promises
      .access(aclPath, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return null;
    }

    const content = await fs.promises.readFile(aclPath, "utf8");
    return JSON.parse(content) as ObjectAclPolicy;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const action = method === "GET" || method === "HEAD"
    ? "read"
    : method === "PUT"
    ? "write"
    : method === "DELETE"
    ? "delete"
    : "read";

  const [signedUrl] = await storageClient
    .bucket(bucketName)
    .file(objectName)
    .getSignedUrl({
      version: "v4",
      action,
      expires: Date.now() + ttlSec * 1000,
    });

  return signedUrl;
}
