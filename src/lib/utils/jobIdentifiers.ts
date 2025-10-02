/**
 * Utilities for handling job names and report IDs
 * 
 * The original API uses job identifiers that need to be URL-safe for S3 bucket handling.
 * These utilities handle encoding/decoding between user-friendly report titles and job IDs.
 */

/**
 * Convert a user-friendly report title to a URL-safe job identifier
 * This is used when creating jobs in the original API
 */
export function encodeReportTitle(title: string): string {
  return encodeURIComponent(
    title
      .toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]/g, '')        // Remove non-alphanumeric except hyphens
      .replace(/-+/g, '-')            // Collapse multiple hyphens
      .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
  );
}

/**
 * Convert a job identifier back to a user-friendly report title
 * This is used when displaying job data from the original API
 */
export function decodeReportId(jobId: string): string {
  return decodeURIComponent(jobId)
    .replace(/-/g, ' ')                // Replace hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

/**
 * Generate a unique job identifier with timestamp
 * Useful for ensuring uniqueness when multiple reports might have similar titles
 */
export function generateJobId(title: string): string {
  const encoded = encodeReportTitle(title);
  const timestamp = Date.now().toString(36); // Base36 for shorter string
  return `${encoded}-${timestamp}`;
}

/**
 * Extract the base title from a timestamped job ID
 */
export function extractTitleFromJobId(jobId: string): string {
  // Remove timestamp suffix if present (format: title-timestamp)
  const withoutTimestamp = jobId.replace(/-[a-z0-9]+$/, '');
  return decodeReportId(withoutTimestamp);
}

/**
 * Validate that a string is a valid job identifier
 */
export function isValidJobId(jobId: string): boolean {
  // Job IDs should be URL-safe and not contain spaces or special characters
  return /^[a-zA-Z0-9\-_]+$/.test(jobId) && jobId.length > 0 && jobId.length <= 100;
}

/**
 * Sanitize a filename for use in the original API's album upload
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\-_.]/g, '')        // Keep only alphanumeric, hyphens, underscores, and dots
    .replace(/\.+/g, '.')             // Collapse multiple dots
    .replace(/^\.|\.$/, '');          // Remove leading/trailing dots
}