/**
 * Split a PDF into parts under the Temporal gRPC message limit (4 MB per message).
 * Each part is a separate PDF (subset of pages) so the workflow receives payloads under the limit.
 */

import { PDFDocument } from "pdf-lib";

/** Temporal Cloud gRPC per-message limit (4 MB). We use 3.5 MB to leave room for JSON wrapper. */
export const GRPC_MESSAGE_LIMIT_BYTES = 4 * 1024 * 1024;
export const SAFE_PAYLOAD_BYTES = Math.floor(2 * 1024 * 1024);

export interface FilePart {
  filename: string;
  content_base64: string;
}

/**
 * Split a PDF file into parts, each under SAFE_PAYLOAD_BYTES.
 * All parts use the same base filename so the dataset shows one logical file.
 */
const SPLIT_LOG_PREFIX = "[pdf-split]";

export async function splitPdfIntoParts(
  file: File,
  baseFilename: string,
): Promise<FilePart[]> {
  const fileSize = file.size;
  const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
  console.log(
    `${SPLIT_LOG_PREFIX} start "${baseFilename}" size=${fileSize} (${sizeMB} MB) SAFE_PAYLOAD_BYTES=${SAFE_PAYLOAD_BYTES}`
  );
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const numPages = sourcePdf.getPageCount();

  if (numPages === 0) {
    console.warn(`${SPLIT_LOG_PREFIX} "${baseFilename}" has 0 pages, skipping`);
    return [];
  }

  const avgBytesPerPage = fileSize / numPages;
  let pagesPerPart = Math.max(
    1,
    Math.floor(SAFE_PAYLOAD_BYTES / avgBytesPerPage),
  );
  console.log(
    `${SPLIT_LOG_PREFIX} "${baseFilename}" pages=${numPages} avgBytesPerPage=${Math.round(avgBytesPerPage)} pagesPerPart=${pagesPerPart}`
  );

  const parts: FilePart[] = [];
  let pageIndex = 0;

  while (pageIndex < numPages) {
    const chunkSize = Math.min(pagesPerPart, numPages - pageIndex);
    const pageIndices = Array.from(
      { length: chunkSize },
      (_, i) => pageIndex + i,
    );

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const partBytes = await newPdf.save();
    const partSize = partBytes.length;

    if (partSize > GRPC_MESSAGE_LIMIT_BYTES && chunkSize > 1) {
      pagesPerPart = Math.max(1, Math.floor(chunkSize / 2));
      continue;
    }

    if (partSize > GRPC_MESSAGE_LIMIT_BYTES && chunkSize === 1) {
      throw new Error(
        `${baseFilename}: one page exceeds the 4 MB limit and cannot be split.`,
      );
    }

    const content_base64 = await blobToBase64(
      new Blob([new Uint8Array(partBytes)])
    );
    const partMB = (partSize / (1024 * 1024)).toFixed(2);
    console.log(
      `${SPLIT_LOG_PREFIX} part ${parts.length + 1} pages ${pageIndex + 1}-${pageIndex + chunkSize} size=${partSize} (${partMB} MB)`
    );
    parts.push({
      filename: baseFilename,
      content_base64,
    });
    pageIndex += chunkSize;
  }

  console.log(
    `${SPLIT_LOG_PREFIX} done "${baseFilename}" → ${parts.length} part(s)`
  );
  return parts;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? (result.split(",")[1] ?? "") : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Approximate decoded size of a base64 string in bytes. */
export function base64DecodedSize(base64: string): number {
  return (base64.length * 3) / 4;
}

/**
 * Batch file parts so each batch's total payload stays under the gRPC limit.
 * Each batch can be sent in one workflow invocation.
 */
export function batchUnderLimit(
  items: FilePart[],
  limitBytes: number = SAFE_PAYLOAD_BYTES,
): FilePart[][] {
  const batches: FilePart[][] = [];
  let currentBatch: FilePart[] = [];
  let currentSize = 0;
  const overhead = 2048; // approximate JSON wrapper per item

  for (const item of items) {
    const itemSize = base64DecodedSize(item.content_base64) + overhead;
    if (currentSize + itemSize > limitBytes && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }
    currentBatch.push(item);
    currentSize += itemSize;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  return batches;
}
