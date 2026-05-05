import { MessageCategory, type NormalizedMessage } from "../lib/parsers/types";

// State
let allMessages: NormalizedMessage[] = [];
let filteredCalls: NormalizedMessage[] = [];
let dataMinTs = Infinity;
let dataMaxTs = -Infinity;
let lastTimezoneOffset = 0;

interface CallCategoryData {
	total: number;
	participants: Record<string, number>;
}

interface CallExtreme {
	duration: number;
	startTimeMs: number;
	endTimeMs: number;
	senderName: string;
	type: "voice" | "video" | "missed";
}

interface CallKPIs {
	totalCalls: number;
	totalDuration: number;
	avgDuration: number;
	longestCall: CallExtreme | null;
	shortestCall: CallExtreme | null;
	missedCalls: number;
	voiceCount: number;
	videoCount: number;
	categoryBreakdown: {
		Voice: CallCategoryData;
		Video: CallCategoryData;
		Missed: CallCategoryData;
	};
	firstCalls: {
		voice: CallExtreme | null;
		video: CallExtreme | null;
		missed: CallExtreme | null;
	};
	mostActivePeriods: {
		day: { key: string; count: number } | null;
		week: { key: string; count: number } | null;
		month: { key: string; count: number } | null;
		year: { key: string; count: number } | null;
	};
}

interface ParticipantStat {
	name: string;
	initiated: number;
	duration: number;
	avgDuration: number;
	missed: number;
}

const runIndexing = (messages: NormalizedMessage[], timezoneOffset: number) => {
	// Filter strictly for call categories
	filteredCalls = messages.filter(
		(m) =>
			m.category === MessageCategory.VoiceCall ||
			m.category === MessageCategory.VideoCall ||
			m.category === MessageCategory.MissedCall,
	);

	lastTimezoneOffset = timezoneOffset;
};

const calculateKPIs = (): CallKPIs => {
	let totalDuration = 0;
	let longestCall: CallExtreme | null = null;
	let shortestCall: CallExtreme | null = null;
	let missedCalls = 0;
	let voiceCount = 0;
	let videoCount = 0;

	const firstCalls = {
		voice: null as CallExtreme | null,
		video: null as CallExtreme | null,
		missed: null as CallExtreme | null,
	};

	const periodCounts = {
		day: {} as Record<string, number>,
		week: {} as Record<string, number>,
		month: {} as Record<string, number>,
		year: {} as Record<string, number>,
	};

	const breakdown = {
		Voice: { total: 0, participants: new Map<string, number>() },
		Video: { total: 0, participants: new Map<string, number>() },
		Missed: { total: 0, participants: new Map<string, number>() },
	};

	for (const c of filteredCalls) {
		const startTimeMs = c.callStartTimeMs || c.timestampMs;
		const endTimeMs = c.callEndTimeMs || c.timestampMs;
		const duration = c.callDurationSec || 0;

		const isMissed =
			c.category === MessageCategory.MissedCall ||
			c.callMissed ||
			Math.floor(duration) <= 0;

		const isVoice =
			c.callType === "voice" || c.category === MessageCategory.VoiceCall;
		const isVideo =
			c.callType === "video" || c.category === MessageCategory.VideoCall;

		const callType: "voice" | "video" | "missed" = isMissed
			? "missed"
			: isVoice
				? "voice"
				: "video";

		const callObj: CallExtreme = {
			duration,
			startTimeMs,
			endTimeMs,
			senderName: c.senderName,
			type: callType,
		};

		// First calls tracking
		if (
			!firstCalls[callType] ||
			startTimeMs < firstCalls[callType]!.startTimeMs
		) {
			firstCalls[callType] = callObj;
		}

		if (isMissed) {
			missedCalls++;
			breakdown.Missed.total++;
			breakdown.Missed.participants.set(
				c.senderName,
				(breakdown.Missed.participants.get(c.senderName) || 0) + 1,
			);
		} else {
			totalDuration += duration;

			// Longest/Shortest (completed only)
			if (duration > 0) {
				if (!longestCall || duration > longestCall.duration) {
					longestCall = callObj;
				}
				if (!shortestCall || duration < shortestCall.duration) {
					shortestCall = callObj;
				}
			}

			if (isVoice) {
				voiceCount++;
				breakdown.Voice.total++;
				breakdown.Voice.participants.set(
					c.senderName,
					(breakdown.Voice.participants.get(c.senderName) || 0) + 1,
				);
			} else if (isVideo) {
				videoCount++;
				breakdown.Video.total++;
				breakdown.Video.participants.set(
					c.senderName,
					(breakdown.Video.participants.get(c.senderName) || 0) + 1,
				);
			}
		}

		// Most active periods tracking (use start time)
		const date = new Date(startTimeMs + lastTimezoneOffset * 60000);
		const dayKey = date.toISOString().split("T")[0];
		const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
		const yearKey = `${date.getUTCFullYear()}`;

		// Week calculation
		const d = new Date(date);
		d.setUTCHours(0, 0, 0, 0);
		d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		const weekNo = Math.ceil(
			((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
		);
		const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

		periodCounts.day[dayKey] = (periodCounts.day[dayKey] || 0) + 1;
		periodCounts.month[monthKey] = (periodCounts.month[monthKey] || 0) + 1;
		periodCounts.year[yearKey] = (periodCounts.year[yearKey] || 0) + 1;
		periodCounts.week[weekKey] = (periodCounts.week[weekKey] || 0) + 1;
	}

	const getMostActive = (counts: Record<string, number>) => {
		let maxKey = null;
		let maxVal = -1;
		for (const [key, val] of Object.entries(counts)) {
			if (val > maxVal) {
				maxVal = val;
				maxKey = key;
			}
		}
		return maxKey ? { key: maxKey, count: maxVal } : null;
	};

	const completedCalls = filteredCalls.length - missedCalls;
	const avgDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;

	return {
		totalCalls: filteredCalls.length,
		totalDuration,
		avgDuration,
		longestCall,
		shortestCall,
		missedCalls,
		voiceCount,
		videoCount,
		categoryBreakdown: {
			Voice: {
				total: breakdown.Voice.total,
				participants: Object.fromEntries(breakdown.Voice.participants),
			},
			Video: {
				total: breakdown.Video.total,
				participants: Object.fromEntries(breakdown.Video.participants),
			},
			Missed: {
				total: breakdown.Missed.total,
				participants: Object.fromEntries(breakdown.Missed.participants),
			},
		},
		firstCalls,
		mostActivePeriods: {
			day: getMostActive(periodCounts.day),
			week: getMostActive(periodCounts.week),
			month: getMostActive(periodCounts.month),
			year: getMostActive(periodCounts.year),
		},
	};
};

const calculateParticipantStats = (): ParticipantStat[] => {
	const statsMap = new Map<
		string,
		{ initiated: number; duration: number; completed: number; missed: number }
	>();

	for (const c of filteredCalls) {
		let stat = statsMap.get(c.senderName);
		if (!stat) {
			stat = { initiated: 0, duration: 0, completed: 0, missed: 0 };
			statsMap.set(c.senderName, stat);
		}

		stat.initiated++;
		if (c.category === MessageCategory.MissedCall || c.callMissed) {
			stat.missed++;
		} else {
			stat.completed++;
			stat.duration += c.callDurationSec || 0;
		}
	}

	return Array.from(statsMap.entries())
		.map(([name, s]) => ({
			name,
			initiated: s.initiated,
			duration: s.duration,
			avgDuration: s.completed > 0 ? s.duration / s.completed : 0,
			missed: s.missed,
		}))
		.sort((a, b) => b.duration - a.duration);
};

const calculateTimeline = (
	granularity: "Day" | "Month" | "Year",
	timeRange: [number, number],
) => {
	const timelineMap = new Map<
		string,
		{
			voice: number;
			video: number;
			missed: number;
			breakdown: {
				voice: Record<string, number>;
				video: Record<string, number>;
				missed: Record<string, number>;
			};
		}
	>();

	const startTs =
		timeRange && Number.isFinite(timeRange[0])
			? Math.max(timeRange[0], dataMinTs === Infinity ? 0 : dataMinTs)
			: dataMinTs === Infinity
				? 0
				: dataMinTs;
	const endTs =
		timeRange && Number.isFinite(timeRange[1])
			? Math.min(timeRange[1], dataMaxTs === -Infinity ? Date.now() : dataMaxTs)
			: dataMaxTs === -Infinity
				? Date.now()
				: dataMaxTs;

	if (startTs > endTs) return [];

	const start = new Date(startTs + lastTimezoneOffset * 60000);
	const end = new Date(endTs + lastTimezoneOffset * 60000);
	const current = new Date(start);

	if (granularity === "Day") {
		current.setUTCHours(0, 0, 0, 0);
	} else if (granularity === "Month") {
		current.setUTCDate(1);
		current.setUTCHours(0, 0, 0, 0);
	} else {
		current.setUTCMonth(0, 1);
		current.setUTCHours(0, 0, 0, 0);
	}

	while (current <= end) {
		let key: string;
		if (granularity === "Day") {
			key = current.toISOString().split("T")[0];
		} else if (granularity === "Month") {
			key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
		} else {
			key = `${current.getUTCFullYear()}`;
		}

		if (!timelineMap.has(key)) {
			timelineMap.set(key, {
				voice: 0,
				video: 0,
				missed: 0,
				breakdown: { voice: {}, video: {}, missed: {} },
			});
		}

		if (granularity === "Day") {
			current.setUTCDate(current.getUTCDate() + 1);
		} else if (granularity === "Month") {
			current.setUTCMonth(current.getUTCMonth() + 1);
		} else {
			current.setUTCFullYear(current.getUTCFullYear() + 1);
		}
	}

	for (const c of filteredCalls) {
		const startTimeMs = c.callStartTimeMs || c.timestampMs;
		const date = new Date(startTimeMs + lastTimezoneOffset * 60000);
		let key: string;
		if (granularity === "Day") {
			key = date.toISOString().split("T")[0];
		} else if (granularity === "Month") {
			key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
		} else {
			key = `${date.getUTCFullYear()}`;
		}

		const entry = timelineMap.get(key);
		if (entry) {
			const duration = c.callDurationSec || 0;
			const isMissed =
				c.category === MessageCategory.MissedCall ||
				c.callMissed ||
				Math.floor(duration) <= 0;
			const isVoice =
				c.callType === "voice" || c.category === MessageCategory.VoiceCall;

			const type = isMissed ? "missed" : isVoice ? "voice" : "video";
			entry[type]++;
			entry.breakdown[type][c.senderName] =
				(entry.breakdown[type][c.senderName] || 0) + 1;
		}
	}

	return Array.from(timelineMap.entries())
		.map(([key, data]) => ({ key, ...data }))
		.sort((a, b) => a.key.localeCompare(b.key));
};

const calculateDistribution = () => {
	const completedCalls = filteredCalls.filter((c) => {
		const duration = c.callDurationSec || 0;
		const isMissed =
			c.category === MessageCategory.MissedCall ||
			c.callMissed ||
			Math.floor(duration) <= 0;
		return !isMissed && Math.floor(duration) > 0;
	});

	// 1. Semantic Buckets
	const semanticBuckets = [
		{
			label: "<1m",
			min: 0,
			max: 60,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "1-5m",
			min: 60,
			max: 300,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "5-15m",
			min: 300,
			max: 900,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "15-30m",
			min: 900,
			max: 1800,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "30-60m",
			min: 1800,
			max: 3600,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "1-2h",
			min: 3600,
			max: 7200,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "2-3h",
			min: 7200,
			max: 10800,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "3-4h",
			min: 10800,
			max: 14400,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "4-5h",
			min: 14400,
			max: 18000,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
		{
			label: "5h+",
			min: 18000,
			max: Infinity,
			count: 0,
			breakdown: {} as Record<string, number>,
		},
	];

	for (const c of completedCalls) {
		const d = c.callDurationSec || 0;
		for (const b of semanticBuckets) {
			if (d >= b.min && d < b.max) {
				b.count++;
				b.breakdown[c.senderName] = (b.breakdown[c.senderName] || 0) + 1;
				break;
			}
		}
	}

	// 2. Granular Buckets (every 5 minutes)
	const durations = completedCalls.map((c) => c.callDurationSec || 0);
	const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
	const step = 5 * 60; // 5 minutes in seconds
	const granularBuckets: {
		label: string;
		count: number;
		seconds: number;
		breakdown: Record<string, number>;
	}[] = [];

	for (let s = 0; s <= maxDuration + step; s += step) {
		const minutes = s / 60;
		const label =
			minutes >= 60
				? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
				: `${minutes}m`;
		granularBuckets.push({ label, count: 0, seconds: s, breakdown: {} });
	}

	for (const c of completedCalls) {
		const d = c.callDurationSec || 0;
		const bucketIndex = Math.floor(d / step);
		if (bucketIndex < granularBuckets.length) {
			granularBuckets[bucketIndex].count++;
			granularBuckets[bucketIndex].breakdown[c.senderName] =
				(granularBuckets[bucketIndex].breakdown[c.senderName] || 0) + 1;
		}
	}

	return { semanticBuckets, granularBuckets };
};

addEventListener("message", (event) => {
	const { type, payload } = event.data;

	switch (type) {
		case "INIT": {
			const { messages, timezoneOffset } = payload;
			allMessages = messages;
			dataMinTs = Infinity;
			dataMaxTs = -Infinity;
			for (const m of messages) {
				if (m.timestampMs < dataMinTs) dataMinTs = m.timestampMs;
				if (m.timestampMs > dataMaxTs) dataMaxTs = m.timestampMs;
			}
			runIndexing(allMessages, timezoneOffset);
			postMessage({ type: "INIT_COMPLETE" });
			break;
		}

		case "SET_FILTERS": {
			const {
				selectedParticipants,
				timeRange,
				granularity = "Month",
			} = payload;
			const participantSet = new Set(selectedParticipants);
			const filtered = allMessages.filter((m) => {
				const effectiveTs = m.callStartTimeMs || m.timestampMs;
				const inTime =
					effectiveTs >= timeRange[0] && effectiveTs <= timeRange[1];
				const inSender =
					participantSet.size === 0 || participantSet.has(m.senderName);
				return inTime && inSender;
			});
			runIndexing(filtered, lastTimezoneOffset);

			const kpis = calculateKPIs();
			const participantStats = calculateParticipantStats();
			const timelineData = calculateTimeline(granularity, timeRange);
			const distributionData = calculateDistribution();

			postMessage({
				type: "DATA_UPDATE",
				payload: { kpis, participantStats, timelineData, distributionData },
			});
			postMessage({ type: "FILTERS_COMPLETE" });
			break;
		}

		case "SET_GRANULARITY": {
			const { granularity, timeRange } = payload;
			const timelineData = calculateTimeline(granularity, timeRange);
			postMessage({
				type: "DATA_UPDATE",
				payload: { timelineData },
			});
			break;
		}
	}
});
