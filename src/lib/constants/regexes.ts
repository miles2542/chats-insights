export const SYSTEM_PATTERNS = {
	// Join/Start call
	JOIN_CALL: /.* joined the (video |audio )?call\./i,
	START_CALL: /.* started a (video )?call\./i,

	// Member actions
	ADD_MEMBER: /.* added .* to the group\./i,
	REMOVE_MEMBER: /.* removed .* from the group\./i,
	LEAVE_GROUP: /.* left the group\./i,

	// Group config
	RENAME_GROUP: /.* named the group .*/i,
	NICKNAME:
		/.* set the nickname for .* to .*|.* set their own nickname to .*|.* set your nickname to .*/i,
	GROUP_PHOTO: /.* changed the group photo\./i,
	QUICK_REACTION: /.* set the quick reaction to .*/i,
	THEME: /.* changed the theme to .*/i,
};

export const CALL_PATTERNS = {
	VOICE_CALL: /.* called you\.|You called .*/i,
	VIDEO_CALL_END: /The video call ended\./i,
	MISSED_VOICE: /You missed a call from .*|.* missed your call\./i,
	MISSED_VIDEO: /You missed a video call with .*|.* missed your video call\./i,
};

// Strict pattern to match Facebook's exact system message structure, accounting for the trailing space found in exports
// Enforces that the middle part MUST be an emoji to avoid misclassifying real text messages
export const REACTION_NOTIF_PATTERN =
	/^Reacted \p{Extended_Pictographic}+ to your message\s*$/iu;
