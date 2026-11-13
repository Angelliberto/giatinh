import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/giatinh'),
  jwtSecret: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  adminPassword: required('ADMIN_PASSWORD', 'voss2026'),
  clientOrigin: required('CLIENT_ORIGIN', 'http://localhost:3000'),
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? '',
};

export function isBlobConfigured(): boolean {
  return Boolean(env.blobToken);
}

/** Safe host for logs — never prints password */
export function mongoHostHint(uri: string): string {
  try {
    const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const at = withoutProtocol.lastIndexOf('@');
    const hostPart = at >= 0 ? withoutProtocol.slice(at + 1) : withoutProtocol;
    return hostPart.split('/')[0] || 'unknown';
  } catch {
    return 'unknown';
  }
}
