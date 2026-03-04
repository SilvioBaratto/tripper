/**
 * Vercel Serverless Function handler.
 *
 * Vercel's Node.js runtime compiles this file independently of the NestJS
 * build. It imports the serverless bootstrap module which is part of the
 * same TypeScript source tree — Vercel resolves the import via
 * tsconfig path aliases.
 *
 * File location:  api/api/index.ts
 * Vercel detects: api/ directory → treats index.ts as the function for "/"
 * The rewrite in vercel.json routes all traffic here.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApp } from '../src/serverless';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const app = await getApp();
  app(req as any, res as any);
}
