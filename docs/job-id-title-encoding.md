# Job ID Title Encoding Strategy

## Problem
The original API only stores job identifiers (job IDs) but doesn't have a separate field for user-friendly report titles. When users create reports with titles like "My Kitchen Analysis", we need a way to preserve this title information even though the API only accepts job IDs.

## Solution
We've implemented a title encoding strategy that embeds the user's original title into the job ID itself, while maintaining uniqueness and URL safety.

### Format
Job IDs now use the format: `{uniqueId}__title__{encodedTitle}`

- `{uniqueId}`: A unique identifier combining timestamp and random characters (e.g., `mg9kx956w1ly2r`)
- `__title__`: A separator to identify the title portion
- `{encodedTitle}`: The URL-encoded, normalized version of the user's title

### Example
- User input: "My Kitchen Analysis 2025"
- Generated job ID: `mg9kx956w1ly2r__title__my-kitchen-analysis-2025`
- When retrieved: Decoded back to "My Kitchen Analysis 2025"

### Key Functions

#### `encodeReportTitle(title: string): string`
- Converts user-friendly titles to unique job IDs with embedded titles
- Ensures uniqueness with timestamp + random component
- Makes titles URL-safe for S3 bucket handling

#### `decodeReportId(jobId: string): string`
- Extracts the original title from encoded job IDs
- Supports both new format (with embedded titles) and legacy format
- Converts to proper title case for display

#### `hasEmbeddedTitle(jobId: string): boolean`
- Checks if a job ID contains an embedded title
- Useful for handling mixed old/new format scenarios

#### `extractUniqueId(jobId: string): string`
- Gets just the unique ID portion without the title
- Useful for operations that need the unique identifier

### Benefits
1. **Preserves User Intent**: Original titles are maintained exactly as users entered them
2. **Maintains Uniqueness**: Each job ID is guaranteed unique even for identical titles
3. **URL Safe**: Compatible with S3 bucket naming requirements
4. **Backward Compatible**: Handles existing job IDs gracefully
5. **Reversible**: Can always extract the original title for display

### Implementation Notes
- All report creation now uses `encodeReportTitle()` to generate job IDs
- All report retrieval automatically decodes titles using `decodeReportId()`
- The system gracefully handles both old and new format job IDs
- Maximum job ID length increased to 200 characters to accommodate embedded titles