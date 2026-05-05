export type MessengerFormat = "legacy" | "e2ee" | "unknown";

/**
 * Detects the Messenger export format from a raw JSON object.
 */
export function detectMessengerFormat(json: any): MessengerFormat {
	if (!json || typeof json !== "object") return "unknown";

	// Check root level keys first
	if ("thread_path" in json || "magic_words" in json) return "legacy";
	if ("threadName" in json || "source_exports" in json) return "e2ee";

	// Check first message if available
	const messages = json.messages;
	if (Array.isArray(messages) && messages.length > 0) {
		const first = messages[0];
		if ("sender_name" in first) return "legacy";
		if ("senderName" in first) return "e2ee";
	}

	return "unknown";
}
