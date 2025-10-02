/**
 * Utilities for handling job names and report IDs
 * 
 * The original API uses job identifiers that need to be URL-safe for S3 bucket handling.
 * These utilities handle encoding/decoding between user-friendly report titles and job IDs.
 * 
 * Strategy: Since the original API doesn't store titles separately, we encode the title
 * into the job ID itself using a format: {uniqueId}__title__{encodedTitle}
 * This ensures uniqueness while preserving the original title for reconstruction.
 */

/**
 * Convert a user-friendly report title to a URL-safe job identifier
 * This creates a unique job ID that embeds the original title for later extraction
 */
export function encodeReportTitle(title: string): string {
  // Ensure title is a string
  if (typeof title !== 'string') {
    throw new Error(`Expected title to be a string, but received ${typeof title}`);
  }
  
  // Generate a unique identifier (timestamp + random component)
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const uniqueId = `${timestamp}${random}`;
  
  // Encode the title to be URL-safe
  const encodedTitle = encodeURIComponent(
    title
      .toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]/g, '')        // Remove non-alphanumeric except hyphens
      .replace(/-+/g, '-')            // Collapse multiple hyphens
      .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
  );
  
  // Format: {uniqueId}__title__{encodedTitle}
  return `${uniqueId}__title__${encodedTitle}`;
}

/**
 * Convert a job identifier back to a user-friendly report title
 * This extracts the original title from the encoded job ID
 */
export function decodeReportId(jobId: string): string {
  // Check if this is the new format: {uniqueId}__title__{encodedTitle}
  const titleMatch = jobId.match(/^.*?__title__(.+)$/);
  
  if (titleMatch) {
    // New format - extract and decode the title
    const encodedTitle = titleMatch[1];
    return decodeURIComponent(encodedTitle)
      .replace(/-/g, ' ')                // Replace hyphens with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }
  
  // Fallback to old format for backward compatibility
  return decodeURIComponent(jobId)
    .replace(/-/g, ' ')                // Replace hyphens with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

/**
 * Generate a unique job identifier with timestamp (DEPRECATED)
 * Use encodeReportTitle instead, which now includes uniqueness
 */
export function generateJobId(title: string): string {
  console.warn('generateJobId is deprecated, use encodeReportTitle instead');
  return encodeReportTitle(title);
}

/**
 * Extract the base title from a job ID
 * Works with both new and old formats
 */
export function extractTitleFromJobId(jobId: string): string {
  return decodeReportId(jobId);
}

/**
 * Check if a job ID contains an embedded title
 */
export function hasEmbeddedTitle(jobId: string): boolean {
  return /__title__/.test(jobId);
}

/**
 * Extract just the unique ID portion from a job ID (without the title)
 */
export function extractUniqueId(jobId: string): string {
  const match = jobId.match(/^(.*?)__title__/);
  return match ? match[1] : jobId;
}

/**
 * Validate that a string is a valid job identifier
 * Supports both new format (with embedded title) and old format
 */
export function isValidJobId(jobId: string): boolean {
  // Job IDs should be URL-safe and not contain spaces
  const basicValidation = /^[a-zA-Z0-9\-_.]+$/.test(jobId) && jobId.length > 0 && jobId.length <= 200;
  
  if (!basicValidation) {
    return false;
  }
  
  // If it has embedded title, validate the format
  if (hasEmbeddedTitle(jobId)) {
    return /^[a-zA-Z0-9]+__title__[a-zA-Z0-9\-_.%]+$/.test(jobId);
  }
  
  // Legacy format validation
  return jobId.length <= 100;
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