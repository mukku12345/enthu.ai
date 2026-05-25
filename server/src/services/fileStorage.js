import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

const sanitizeFileName = (name) => name.replace(/[^a-z0-9.\-_]/gi, "_");

const shouldUseS3 = () => process.env.STORAGE_DRIVER === "s3";

const buildS3Client = () => {
  const config = {
    region: process.env.AWS_REGION
  };

  if (process.env.AWS_S3_ENDPOINT) {
    config.endpoint = process.env.AWS_S3_ENDPOINT;
    config.forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";
  }

  return new S3Client(config);
};

const saveToLocal = async (file, storedName) => {
  await fs.mkdir(uploadDir, { recursive: true });
  const storagePath = path.join(uploadDir, storedName);
  await fs.writeFile(storagePath, file.buffer);

  return {
    storageDriver: "local",
    storedName,
    storagePath
  };
};

const saveToS3 = async (file, storedName) => {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is required when STORAGE_DRIVER=s3");
  }

  const prefix = process.env.AWS_S3_PREFIX || "call-recordings";
  const key = `${prefix}/${storedName}`;

  await buildS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname
      }
    })
  );

  return {
    storageDriver: "s3",
    storedName,
    s3Bucket: process.env.AWS_S3_BUCKET,
    s3Key: key,
    s3Url: process.env.AWS_S3_PUBLIC_BASE_URL
      ? `${process.env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
      : undefined
  };
};

export const saveUploadedCallFile = async (file) => {
  const storedName = `${Date.now()}-${sanitizeFileName(file.originalname)}`;
  const storage = shouldUseS3()
    ? await saveToS3(file, storedName)
    : await saveToLocal(file, storedName);

  return {
    ...storage,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  };
};
