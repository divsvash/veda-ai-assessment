// src/utils/fileExtractor.ts
import fs from 'fs';
import path from 'path';

/**
 * Extract text content from uploaded file (PDF or plain text)
 * Images are handled by passing them to the AI as base64 (future feature)
 */
export async function extractFileContent(filePath: string, mimetype: string): Promise<string> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  try {
    if (mimetype === 'application/pdf') {
      // Dynamic import to avoid issues if pdf-parse not installed
      const pdfParse = await import('pdf-parse');
      const buffer = fs.readFileSync(absolutePath);
      const data = await pdfParse.default(buffer);
      return data.text.trim();
    }

    if (mimetype === 'text/plain') {
      return fs.readFileSync(absolutePath, 'utf-8').trim();
    }

    if (mimetype.startsWith('image/')) {
      // For images, return base64 encoded data URI
      // The AI service can use this for vision-based extraction
      const buffer = fs.readFileSync(absolutePath);
      const base64 = buffer.toString('base64');
      return `[IMAGE_CONTENT:${mimetype}:${base64.slice(0, 100)}...]`; // Truncated reference
    }

    return '';
  } finally {
    // Clean up uploaded file after extraction
    try {
      fs.unlinkSync(absolutePath);
    } catch {
      // Non-critical cleanup failure
    }
  }
}

export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore
  }
}
