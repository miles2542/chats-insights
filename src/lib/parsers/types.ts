export enum MessageCategory {
	Text = "Text",
	Photo = "Photo",
	Video = "Video",
	GIF = "GIF",
	Sticker = "Sticker",
	Audio = "Audio",
	File = "File",
	Link = "Link",
	VoiceCall = "VoiceCall",
	VideoCall = "VideoCall",
	MissedCall = "MissedCall",
	Unsent = "Unsent",
	SystemEvent = "SystemEvent",
	ReactionNotification = "ReactionNotification",
	Other = "Other",
}

export type MediaType =
	| "photo"
	| "video"
	| "gif"
	| "sticker"
	| "audio"
	| "file"
	| "link";

export interface MediaItem {
	uri: string;
	type: MediaType;
}

export interface NormalizedMessage {
	id: string; // REQUIRED: For virtualization and search/jump
	senderName: string;
	timestampMs: number;
	content: string | null;
	category: MessageCategory;
	mediaType: MediaType | null;
	mediaUri: string | null;
	mediaItems: MediaItem[];
	callDurationSec: number | null;
	callStartTimeMs: number | null;
	callEndTimeMs: number | null;
	callType: "voice" | "video" | null;
	callMissed: boolean;
	reactions: { emoji: string; actor: string }[];
	isUnsent: boolean;
	isSystemEvent: boolean;
	rawFields: Record<string, unknown>;
}

export interface ChatMetadata {
	threadName: string;
	participants: string[];
	isGroup: boolean;
	platform: "messenger-legacy" | "messenger-e2ee";
}

export interface ParsedChat {
	metadata: ChatMetadata;
	messages: NormalizedMessage[];
}
