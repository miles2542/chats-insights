import { MessageCategory } from "../lib/parsers/types";

export type StatsRequest = {
	messages: {
		timestampMs: number;
		senderName: string;
		category: string;
		content?: string;
		mediaUri?: string;
	}[];
	timezoneOffset: number;
	systemOffset: number;
	sessionGapThreshold: number;
	// Filter Criteria
	selectedParticipants: string[];
	timeRange: [number | null, number | null];
	// Timeline Criteria
	granularity: "hour" | "day" | "week" | "month";
};

export type StatsResponse = {
	senderStats: {
		messages: { name: string; value: number }[];
		words: { name: string; value: number }[];
	};
	daysActiveCount: number;
	totalRangeDays: number;
	categoryCounts: { name: string; value: number }[];
	messageStats: any;
	filteredCount: number;
	timelineActivity: {
		keys: string[];
		values: number[];
		details: Record<string, number>[];
	};
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

addEventListener("message", (event: MessageEvent<StatsRequest>) => {
	const {
		messages,
		timezoneOffset,
		systemOffset,
		sessionGapThreshold,
		selectedParticipants,
		timeRange,
		granularity,
	} = event.data;

	const participantSet = new Set(selectedParticipants);
	const startTime = timeRange[0];
	const endTime = timeRange[1];
	const hasParticipantFilter = selectedParticipants.length > 0;

	// Helper for local keys
	const getLocalDateKey = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	// 1. Filtering
	const filtered: typeof messages = [];
	let minTs = Number.MAX_SAFE_INTEGER;
	let maxTs = Number.MIN_SAFE_INTEGER;

	for (let i = 0; i < messages.length; i++) {
		const m = messages[i];
		if (startTime && m.timestampMs < startTime) continue;
		if (endTime && m.timestampMs > endTime) continue;
		if (hasParticipantFilter && !participantSet.has(m.senderName)) continue;

		filtered.push(m);
		if (m.timestampMs < minTs) minTs = m.timestampMs;
		if (m.timestampMs > maxTs) maxTs = m.timestampMs;
	}

	// 2. Timeline Aggregation (Zero-filled)
	const counts: Record<
		string,
		{ total: number; senders: Record<string, number> }
	> = {};

	if (filtered.length > 0) {
		const start = new Date(minTs + (timezoneOffset - systemOffset) * 60000);
		const end = new Date(maxTs + (timezoneOffset - systemOffset) * 60000);
		const curr = new Date(start);

		if (granularity === "hour") curr.setMinutes(0, 0, 0);
		else curr.setHours(0, 0, 0, 0);

		// Pre-populate keys to ensure zero-filling
		while (curr <= end) {
			let key = "";
			if (granularity === "day") {
				key = getLocalDateKey(curr);
				curr.setDate(curr.getDate() + 1);
			} else if (granularity === "week") {
				const sw = new Date(curr);
				const day = sw.getDay();
				const diff = sw.getDate() - day + (day === 0 ? -6 : 1);
				sw.setDate(diff);
				key = getLocalDateKey(sw);
				curr.setDate(curr.getDate() + 7);
			} else if (granularity === "month") {
				key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
				curr.setMonth(curr.getMonth() + 1);
			} else {
				key = `${getLocalDateKey(curr)} ${String(curr.getHours()).padStart(2, "0")}:00`;
				curr.setHours(curr.getHours() + 1);
			}
			counts[key] = { total: 0, senders: {} };
		}

		// Populate data
		for (let i = 0; i < filtered.length; i++) {
			const m = filtered[i];
			const d = new Date(
				m.timestampMs + (timezoneOffset - systemOffset) * 60000,
			);
			let key = "";
			if (granularity === "day") {
				key = getLocalDateKey(d);
			} else if (granularity === "week") {
				const sw = new Date(d);
				const day = sw.getDay();
				const diff = sw.getDate() - day + (day === 0 ? -6 : 1);
				sw.setDate(diff);
				key = getLocalDateKey(sw);
			} else if (granularity === "month") {
				key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			} else {
				key = `${getLocalDateKey(d)} ${String(d.getHours()).padStart(2, "0")}:00`;
			}

			if (counts[key]) {
				counts[key].total++;
				const sender = m.senderName;
				counts[key].senders[sender] = (counts[key].senders[sender] || 0) + 1;
			}
		}
	}

	const sortedTimelineKeys = Object.keys(counts).sort();
	const timelineActivity = {
		keys: sortedTimelineKeys,
		values: sortedTimelineKeys.map((k) => counts[k].total),
		details: sortedTimelineKeys.map((k) => counts[k].senders),
	};

	// 3. General Stats Aggregation
	const statsMap: Record<string, { messages: number; words: number }> = {};
	const daysSet = new Set<string>();
	const catCounts: Record<string, number> = {};
	const validMedia = [
		MessageCategory.Photo,
		MessageCategory.Video,
		MessageCategory.Audio,
		MessageCategory.Sticker,
		MessageCategory.GIF,
		MessageCategory.File,
	];

	for (let i = 0; i < filtered.length; i++) {
		const m = filtered[i];
		const s = m.senderName;
		const c = m.category as MessageCategory;

		// Skip system/meta messages for word counts to align with Language page
		const isSystem =
			c === MessageCategory.SystemEvent ||
			c === MessageCategory.ReactionNotification ||
			c === MessageCategory.VoiceCall ||
			c === MessageCategory.VideoCall ||
			c === MessageCategory.MissedCall;

		if (!statsMap[s]) statsMap[s] = { messages: 0, words: 0 };
		statsMap[s].messages += 1;

		if (!isSystem && m.content) {
			const words = m.content.split(/\s+/).filter(Boolean).length;
			statsMap[s].words += words;
		}

		const d = new Date(m.timestampMs + (timezoneOffset - systemOffset) * 60000);
		daysSet.add(getLocalDateKey(d));

		if (validMedia.includes(c)) {
			catCounts[c] = (catCounts[c] || 0) + 1;
		}
	}

	const sortedNames = Object.entries(statsMap)
		.sort((a, b) => b[1].messages - a[1].messages)
		.slice(0, 10)
		.map(([name]) => name);

	const senderStats = {
		messages: sortedNames.map((name) => ({
			name,
			value: statsMap[name].messages,
		})),
		words: sortedNames.map((name) => ({ name, value: statsMap[name].words })),
	};

	const categoryCountsArr = Object.entries(catCounts)
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	const msgStats = {
		total: filtered.length,
		types: {
			text: 0,
			links: 0,
			images: 0,
			gifs: 0,
			videos: 0,
			stickers: 0,
			audio: 0,
			files: 0,
			other: 0,
			unsent: 0,
		},
		totalWords: 0,
		emojiCount: 0,
		longestGap: { ms: 0, start: 0, end: 0 },
		longestStreak: { count: 0, start: 0, end: 0, totalMessages: 0 },
		longestSession: { ms: 0, start: 0, end: 0, count: 0 },
		peaks: {
			year: { key: "", val: 0 },
			month: { key: "", val: 0 },
			day: { key: "", val: 0 },
			hour: { key: "", val: 0 },
		},
	};

	const sortedMsgs = [...filtered].sort(
		(a, b) => a.timestampMs - b.timestampMs,
	);
	const peakTrackers: Record<string, Record<string, number>> = {
		year: {},
		month: {},
		day: {},
		hour: {},
	};

	let currentSessionDuration = 0;
	let currentSessionStart = 0;
	let currentSessionCount = 0;
	let currentStreak = 0;
	let currentStreakStartTs = 0;
	let currentStreakMsgCount = 0;
	let lastDayKey = "";
	const gapThresholdMs = sessionGapThreshold * 60000;
	const emojiRegex = /\p{Emoji_Presentation}/gu;
	let totalSessions = sortedMsgs.length > 0 ? 1 : 0;

	for (let i = 0; i < sortedMsgs.length; i++) {
		const m = sortedMsgs[i];
		const cat = m.category;

		if (cat === MessageCategory.Text) msgStats.types.text++;
		else if (cat === MessageCategory.Photo) msgStats.types.images++;
		else if (cat === MessageCategory.GIF) msgStats.types.gifs++;
		else if (cat === MessageCategory.Video) msgStats.types.videos++;
		else if (cat === MessageCategory.Sticker) msgStats.types.stickers++;
		else if (cat === MessageCategory.Audio) msgStats.types.audio++;
		else if (cat === MessageCategory.File) msgStats.types.files++;
		else if (cat === MessageCategory.Unsent) msgStats.types.unsent++;
		else if (cat !== MessageCategory.Link) msgStats.types.other++;

		// Deep Link Scan (Matches Language Worker) with de-duplication
		const messageLinks = new Set<string>();
		if (m.content) {
			const textLinks = m.content.match(urlRegex);
			if (textLinks) {
				for (const url of textLinks) messageLinks.add(url);
			}
		}
		if (cat === MessageCategory.Link && m.mediaUri) {
			messageLinks.add(m.mediaUri);
		}
		msgStats.types.links += messageLinks.size;

		if (m.content) {
			const isSystem =
				cat === MessageCategory.SystemEvent ||
				cat === MessageCategory.ReactionNotification ||
				cat === MessageCategory.VoiceCall ||
				cat === MessageCategory.VideoCall ||
				cat === MessageCategory.MissedCall;

			if (!isSystem) {
				msgStats.totalWords += m.content.split(/\s+/).filter(Boolean).length;
				const emojis = m.content.match(emojiRegex);
				if (emojis) msgStats.emojiCount += emojis.length;
			}
		}

		if (i > 0) {
			const prev = sortedMsgs[i - 1];
			const gap = m.timestampMs - prev.timestampMs;
			if (gap > msgStats.longestGap.ms)
				msgStats.longestGap = {
					ms: gap,
					start: prev.timestampMs,
					end: m.timestampMs,
				};
			if (gap <= gapThresholdMs) {
				if (currentSessionCount === 0) currentSessionStart = prev.timestampMs;
				currentSessionDuration += gap;
				currentSessionCount++;
			} else {
				totalSessions++;
				if (currentSessionDuration > msgStats.longestSession.ms) {
					msgStats.longestSession = {
						ms: currentSessionDuration,
						start: currentSessionStart,
						end: prev.timestampMs,
						count: currentSessionCount + 1,
					};
				}
				currentSessionDuration = 0;
				currentSessionCount = 0;
			}
		}

		const d = new Date(m.timestampMs + (timezoneOffset - systemOffset) * 60000);
		const y = d.getFullYear().toString();
		const mon = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		const dy = getLocalDateKey(d);

		if (dy !== lastDayKey) {
			if (lastDayKey) {
				const lastDate = new Date(lastDayKey);
				const currDate = new Date(dy);
				const diff = (currDate.getTime() - lastDate.getTime()) / 86400000;
				if (Math.round(diff) === 1) {
					currentStreak++;
				} else {
					currentStreak = 1;
					currentStreakStartTs = m.timestampMs;
					currentStreakMsgCount = 0;
				}
			} else {
				currentStreak = 1;
				currentStreakStartTs = m.timestampMs;
				currentStreakMsgCount = 0;
			}
			lastDayKey = dy;
		}
		currentStreakMsgCount++;

		if (currentStreak > msgStats.longestStreak.count)
			msgStats.longestStreak = {
				count: currentStreak,
				start: currentStreakStartTs,
				end: m.timestampMs,
				totalMessages: currentStreakMsgCount,
			};

		const hr = `${dy} ${String(d.getHours()).padStart(2, "0")}:00`;
		peakTrackers.year[y] = (peakTrackers.year[y] || 0) + 1;
		peakTrackers.month[mon] = (peakTrackers.month[mon] || 0) + 1;
		peakTrackers.day[dy] = (peakTrackers.day[dy] || 0) + 1;
		peakTrackers.hour[hr] = (peakTrackers.hour[hr] || 0) + 1;
	}

	const findPeak = (tracker: Record<string, number>) => {
		let max = { key: "N/A", val: 0 };
		for (const [key, val] of Object.entries(tracker)) {
			if (val > max.val) max = { key, val };
		}
		return max;
	};

	msgStats.peaks.year = findPeak(peakTrackers.year);
	msgStats.peaks.month = findPeak(peakTrackers.month);
	msgStats.peaks.day = findPeak(peakTrackers.day);
	msgStats.peaks.hour = findPeak(peakTrackers.hour);

	const startD = new Date(minTs + (timezoneOffset - systemOffset) * 60000);
	startD.setHours(0, 0, 0, 0);
	const endD = new Date(maxTs + (timezoneOffset - systemOffset) * 60000);
	endD.setHours(0, 0, 0, 0);
	const totalRangeDays = filtered.length > 0 ? Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1 : 0;

	postMessage({
		senderStats,
		daysActiveCount: daysSet.size,
		totalRangeDays,
		categoryCounts: categoryCountsArr,
		messageStats: { ...msgStats, totalSessions },
		filteredCount: filtered.length,
		timelineActivity,
	} as StatsResponse);
});
