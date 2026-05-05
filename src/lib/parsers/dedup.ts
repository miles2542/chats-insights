import type { NormalizedMessage } from "./types";

/**
 * Deduplicates messages across all uploaded files.
 * Uses a composite key: timestamp + sender + content fingerprint.
 */
export function deduplicateMessages(
	messages: NormalizedMessage[],
): NormalizedMessage[] {
	const seen = new Set<string>();
	const unique: NormalizedMessage[] = [];

	for (const msg of messages) {
		// Generate fingerprint
		// For content, we use it directly. For media, we use the URI.
		// We also include isUnsent to distinguish between a message and its retraction if they share same timestamp (rare but possible).
		const fingerprint = [
			msg.timestampMs,
			msg.senderName,
			msg.content || "",
			msg.mediaUri || "",
			msg.isUnsent ? "unsent" : "live",
		].join("|");

		if (!seen.has(fingerprint)) {
			seen.add(fingerprint);
			unique.push(msg);
		}
	}

	// Sort by timestamp ascending
	return unique.sort((a, b) => a.timestampMs - b.timestampMs);
}
