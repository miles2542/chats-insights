import { REACTION_NOTIF_PATTERN, SYSTEM_PATTERNS } from "../constants/regexes";
import { fixMojibake, fixObjectMojibake } from "./mojibake";
import {
	MessageCategory,
	type NormalizedMessage,
	type ParsedChat,
} from "./types";

export function parseMessengerLegacy(json: any): ParsedChat {
	const threadName = fixMojibake(json.title || "Unknown Chat");
	const participants = (json.participants || []).map((p: any) =>
		fixMojibake(p.name),
	);
	const isGroup = participants.length > 2;

	const messages: NormalizedMessage[] = (json.messages || [])
		.map((msg: any) => {
			// 1. Fix mojibake for this message's strings
			const fixedMsg = fixObjectMojibake(msg);

			const content = fixedMsg.content || null;
			const category = classifyMessage(fixedMsg);

			// Filter out Reaction Notifications from counts (return null to be filtered later)
			if (category === MessageCategory.ReactionNotification) return null;

			const reactions = (fixedMsg.reactions || []).map((r: any) => ({
				emoji: r.reaction,
				actor: r.actor,
			}));

			// Determine media type and URI (Backward compatibility + Full list)
			const mediaItems: {
				uri: string;
				type: NormalizedMessage["mediaType"];
			}[] = [];

			if (fixedMsg.photos?.length) {
				fixedMsg.photos.forEach((p: any) =>
					mediaItems.push({ uri: p.uri, type: "photo" }),
				);
			}
			if (fixedMsg.videos?.length) {
				fixedMsg.videos.forEach((v: any) =>
					mediaItems.push({ uri: v.uri, type: "video" }),
				);
			}
			if (fixedMsg.gifs?.length) {
				fixedMsg.gifs.forEach((g: any) =>
					mediaItems.push({ uri: g.uri, type: "gif" }),
				);
			}
			if (fixedMsg.sticker) {
				mediaItems.push({ uri: fixedMsg.sticker.uri, type: "sticker" });
			}
			if (fixedMsg.audio_files?.length) {
				fixedMsg.audio_files.forEach((a: any) =>
					mediaItems.push({ uri: a.uri, type: "audio" }),
				);
			}
			if (fixedMsg.files?.length) {
				fixedMsg.files.forEach((f: any) =>
					mediaItems.push({ uri: f.uri, type: "file" }),
				);
			}
			if (fixedMsg.share) {
				mediaItems.push({ uri: fixedMsg.share.link, type: "link" });
			}

			const primaryMedia = mediaItems[0] || null;

			const callDurationSec = fixedMsg.call_duration ?? null;
			const callEndTimeMs =
				callDurationSec !== null ? fixedMsg.timestamp_ms : null;
			const callStartTimeMs =
				callDurationSec !== null
					? fixedMsg.timestamp_ms - callDurationSec * 1000
					: null;

			return {
				id: crypto.randomUUID(),
				senderName: fixedMsg.sender_name,
				timestampMs: fixedMsg.timestamp_ms,
				content,
				category,
				mediaType: primaryMedia?.type ?? null,
				mediaUri: primaryMedia?.uri ?? null,
				mediaItems,
				callDurationSec,
				callStartTimeMs,
				callEndTimeMs,
				callType: determineCallType(fixedMsg),
				callMissed: fixedMsg.call_duration === 0,
				reactions,
				isUnsent: fixedMsg.is_unsent === true,
				isSystemEvent: category === MessageCategory.SystemEvent,
				rawFields: msg, // Preserve original (pre-fix) for debugging
			};
		})
		.filter((m: any): m is NormalizedMessage => m !== null);

	return {
		metadata: {
			threadName,
			participants,
			isGroup,
			platform: "messenger-legacy",
		},
		messages,
	};
}

function classifyMessage(msg: any): MessageCategory {
	const content = msg.content || "";

	// 1. Reaction Notification (Priority 1)
	// Matches strict Facebook export structure: "(Name )?Reacted [emoji] to your message "
	if (REACTION_NOTIF_PATTERN.test(content)) {
		return MessageCategory.ReactionNotification;
	}

	// 2. Unsent (Priority 2)
	if (msg.is_unsent === true) return MessageCategory.Unsent;

	// 3. Calls (Priority 3-5)
	if (msg.call_duration !== undefined) {
		if (msg.call_duration === 0) return MessageCategory.MissedCall;
		if (content.includes("video call")) return MessageCategory.VideoCall;
		return MessageCategory.VoiceCall;
	}

	// 4. System Events (Priority 6)
	const isSystem = Object.values(SYSTEM_PATTERNS).some((regex) =>
		regex.test(content),
	);
	// Ensure no media is present for system events
	const hasMedia =
		msg.photos ||
		msg.videos ||
		msg.gifs ||
		msg.sticker ||
		msg.audio_files ||
		msg.files ||
		msg.share;
	if (isSystem && !hasMedia) return MessageCategory.SystemEvent;

	// 5. Media (Priority 7-13)
	if (msg.photos) return MessageCategory.Photo;
	if (msg.videos) return MessageCategory.Video;
	if (msg.gifs) return MessageCategory.GIF;
	if (msg.sticker) return MessageCategory.Sticker;
	if (msg.audio_files) return MessageCategory.Audio;
	if (msg.files) return MessageCategory.File;
	if (msg.share) return MessageCategory.Link;

	// 6. Text (Priority 14)
	if (msg.content) return MessageCategory.Text;

	return MessageCategory.Other;
}

function determineCallType(msg: any): NormalizedMessage["callType"] {
	if (msg.call_duration === undefined) return null;
	const content = msg.content || "";
	if (content.toLowerCase().includes("video")) return "video";
	return "voice";
}
