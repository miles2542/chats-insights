import {
	MessageCategory,
	type NormalizedMessage,
	type ParsedChat,
} from "./types";

export function parseMessengerE2EE(json: any): ParsedChat {
	const threadName = json.threadName || "Unknown Chat";
	const participants = Array.isArray(json.participants)
		? json.participants
		: [];
	const isGroup = participants.length > 2;

	const messages: NormalizedMessage[] = (json.messages || []).map(
		(msg: any) => {
			const content = msg.text || null;
			const category = classifyE2EEMessage(msg);

			// Media Handling
			let mediaType: NormalizedMessage["mediaType"] = null;
			let mediaUri: string | null = null;

			if (Array.isArray(msg.media) && msg.media.length > 0) {
				mediaUri = msg.media[0].uri;
				if (mediaUri === "Failed to download media") {
					mediaType = null; // Mark as broken
				} else if (mediaUri) {
					mediaType = inferMediaType(mediaUri);
				}
			}

			return {
				senderName: msg.senderName,
				timestampMs: msg.timestamp,
				content,
				category,
				mediaType,
				mediaUri,
				callDurationSec: null, // E2EE usually lacks call metadata in JSON
				callStartTimeMs: null,
				callEndTimeMs: null,
				callType: null,
				callMissed: false,
				reactions: (msg.reactions || []).map((r: any) => ({
					emoji: r.reaction,
					actor: r.actor,
				})),
				isUnsent: msg.isUnsent === true,
				isSystemEvent: false, // E2EE JSON typically doesn't contain system events as separate types
				rawFields: msg,
			};
		},
	);

	return {
		metadata: {
			threadName,
			participants,
			isGroup,
			platform: "messenger-e2ee",
		},
		messages,
	};
}

function classifyE2EEMessage(msg: any): MessageCategory {
	if (msg.isUnsent === true) return MessageCategory.Unsent;

	switch (msg.type) {
		case "text":
			return MessageCategory.Text;
		case "media": {
			const uri = msg.media?.[0]?.uri || "";
			const type = inferMediaType(uri);
			switch (type) {
				case "photo":
					return MessageCategory.Photo;
				case "video":
					return MessageCategory.Video;
				case "gif":
					return MessageCategory.GIF;
				default:
					return MessageCategory.Photo; // Fallback
			}
		}
		case "link":
			return MessageCategory.Link;
		case "placeholder":
			return MessageCategory.Other;
		default:
			return MessageCategory.Other;
	}
}

function inferMediaType(uri: string): NormalizedMessage["mediaType"] {
	const lower = uri.toLowerCase();
	if (lower.endsWith(".gif")) return "gif";
	if (lower.match(/\.(jpg|jpeg|png|webp|heic)$/)) return "photo";
	if (lower.match(/\.(mp4|mov|avi|m4v|webm)$/)) return "video";
	if (lower.match(/\.(mp3|wav|m4a|ogg)$/)) return "audio";
	return "file";
}
