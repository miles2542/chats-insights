import type { NormalizedMessage } from "../lib/parsers/types";

// State
let allMessages: NormalizedMessage[] = [];
let timezoneOffset = 0;
let sessionGapThreshold = 10;
let overnightMinGap = 180;
let morningStartHour = 5;
let morningEndHour = 11;
let nightStartHour = 22;
let nightEndHour = 5;
let doubleTextMinGap = 5;
let doubleTextMaxGap = 120;
let maxResponseGapThreshold = 10;

const getLocalDate = (ts: number, offset: number) =>
	new Date(ts + offset * 60000);

const getLocalDateKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getWeekKey = (d: Date) => {
	const sw = new Date(d);
	const day = sw.getDay();
	const diff = sw.getDate() - day + (day === 0 ? -6 : 1);
	sw.setHours(0, 0, 0, 0);
	sw.setDate(diff);
	return getLocalDateKey(sw);
};

const getMonthKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const getYearKey = (d: Date) => `${d.getFullYear()}`;

const isHourInWindow = (hour: number, start: number, end: number) => {
	if (start === end) return false;
	if (start < end) {
		return hour >= start && hour < end;
	} else {
		return hour >= start || hour < end;
	}
};

const calculateEngagement = (messages: NormalizedMessage[]) => {
	if (messages.length === 0) return null;

	const sorted = [...messages].sort((a, b) => a.timestampMs - b.timestampMs);
	const gapThresholdMs = sessionGapThreshold * 60000;
	const overnightMinGapMs = overnightMinGap * 60000;
	const doubleMinMs = doubleTextMinGap * 60000;
	const doubleMaxMs = doubleTextMaxGap * 60000;
	const maxResponseGapMs = maxResponseGapThreshold * 24 * 60 * 60 * 1000;

	const participants = Array.from(new Set(sorted.map((m) => m.senderName)));

	const initiators: Record<
		string,
		{ starts: number; ends: number; morningStarts: number; nightEnds: number }
	> = {};
	const doubleTexts: Record<string, number> = {};
	const responseTimes: Record<
		string,
		{ overall: number[]; chatting: number[]; pings: number[] }
	> = {};

	participants.forEach((p) => {
		initiators[p] = { starts: 0, ends: 0, morningStarts: 0, nightEnds: 0 };
		doubleTexts[p] = 0;
		responseTimes[p] = { overall: [], chatting: [], pings: [] };
	});

	const trends: Record<
		string,
		{
			initiators: Record<string, Record<string, number>>;
			closers: Record<string, Record<string, number>>;
			doubleTexts: Record<string, Record<string, number>>;
			responseMedians_overall: Record<string, Record<string, number[]>>;
			responseMedians_chatting: Record<string, Record<string, number[]>>;
			responseMedians_pings: Record<string, Record<string, number[]>>;
		}
	> = {
		week: {
			initiators: {},
			closers: {},
			doubleTexts: {},
			responseMedians_overall: {},
			responseMedians_chatting: {},
			responseMedians_pings: {},
		},
		month: {
			initiators: {},
			closers: {},
			doubleTexts: {},
			responseMedians_overall: {},
			responseMedians_chatting: {},
			responseMedians_pings: {},
		},
		year: {
			initiators: {},
			closers: {},
			doubleTexts: {},
			responseMedians_overall: {},
			responseMedians_chatting: {},
			responseMedians_pings: {},
		},
	};

	const addTrend = (
		type: "week" | "month" | "year",
		key: string,
		participant: string,
		metric:
			| "initiators"
			| "closers"
			| "doubleTexts"
			| "responseMedians_overall"
			| "responseMedians_chatting"
			| "responseMedians_pings",
		val: number,
	) => {
		if (!trends[type][metric][key]) trends[type][metric][key] = {};

		if (metric.startsWith("responseMedians")) {
			const target = trends[type][metric][key];
			if (!target[participant]) target[participant] = [] as any;
			(target[participant] as number[]).push(val);
		} else {
			const target = trends[type][metric][key];
			target[participant] = ((target[participant] as number) || 0) + 1;
		}
	};

	// Calculate initial morning/night classification for first ever message
	const firstMsg = sorted[0];
	const firstDate = getLocalDate(firstMsg.timestampMs, timezoneOffset);
	if (isHourInWindow(firstDate.getHours(), morningStartHour, morningEndHour)) {
		initiators[firstMsg.senderName].morningStarts++;
	}

	initiators[firstMsg.senderName].starts++;
	addTrend("week", getWeekKey(firstDate), firstMsg.senderName, "initiators", 1);
	addTrend(
		"month",
		getMonthKey(firstDate),
		firstMsg.senderName,
		"initiators",
		1,
	);
	addTrend("year", getYearKey(firstDate), firstMsg.senderName, "initiators", 1);

	let isFirstResponseInSession = true;

	for (let i = 1; i < sorted.length; i++) {
		const m = sorted[i];
		const prev = sorted[i - 1];
		const date = getLocalDate(m.timestampMs, timezoneOffset);
		const prevDate = getLocalDate(prev.timestampMs, timezoneOffset);

		const weekKey = getWeekKey(date);
		const monthKey = getMonthKey(date);
		const yearKey = getYearKey(date);

		const gap = m.timestampMs - prev.timestampMs;

		// 1. Session Boundaries
		if (gap > gapThresholdMs) {
			// End of session
			initiators[prev.senderName].ends++;
			addTrend("week", getWeekKey(prevDate), prev.senderName, "closers", 1);
			addTrend("month", getMonthKey(prevDate), prev.senderName, "closers", 1);
			addTrend("year", getYearKey(prevDate), prev.senderName, "closers", 1);

			// Start of new session
			initiators[m.senderName].starts++;
			addTrend("week", weekKey, m.senderName, "initiators", 1);
			addTrend("month", monthKey, m.senderName, "initiators", 1);
			addTrend("year", yearKey, m.senderName, "initiators", 1);

			isFirstResponseInSession = true;

			// Overnight Filter
			if (gap >= overnightMinGapMs) {
				if (isHourInWindow(prevDate.getHours(), nightStartHour, nightEndHour)) {
					initiators[prev.senderName].nightEnds++;
				}
				if (isHourInWindow(date.getHours(), morningStartHour, morningEndHour)) {
					initiators[m.senderName].morningStarts++;
				}
			}
		}

		// 2. Double Texting
		if (prev.senderName === m.senderName) {
			if (gap >= doubleMinMs && gap <= doubleMaxMs) {
				doubleTexts[m.senderName]++;
				addTrend("week", weekKey, m.senderName, "doubleTexts", 1);
				addTrend("month", monthKey, m.senderName, "doubleTexts", 1);
				addTrend("year", yearKey, m.senderName, "doubleTexts", 1);
			}
		}

		// 3. Response Time
		if (prev.senderName !== m.senderName) {
			if (gap <= maxResponseGapMs) {
				const type = isFirstResponseInSession ? "pings" : "chatting";
				responseTimes[m.senderName].overall.push(gap);
				responseTimes[m.senderName][type].push(gap);

				addTrend("week", weekKey, m.senderName, "responseMedians_overall", gap);
				addTrend("week", weekKey, m.senderName, `responseMedians_${type}`, gap);

				addTrend(
					"month",
					monthKey,
					m.senderName,
					"responseMedians_overall",
					gap,
				);
				addTrend(
					"month",
					monthKey,
					m.senderName,
					`responseMedians_${type}`,
					gap,
				);

				addTrend("year", yearKey, m.senderName, "responseMedians_overall", gap);
				addTrend("year", yearKey, m.senderName, `responseMedians_${type}`, gap);
			}

			isFirstResponseInSession = false;
		}
	}

	// Final closer of last session
	const lastMsg = sorted[sorted.length - 1];
	initiators[lastMsg.senderName].ends++;
	const lastDate = getLocalDate(lastMsg.timestampMs, timezoneOffset);
	if (isHourInWindow(lastDate.getHours(), nightStartHour, nightEndHour)) {
		initiators[lastMsg.senderName].nightEnds++;
	}
	addTrend("week", getWeekKey(lastDate), lastMsg.senderName, "closers", 1);
	addTrend("month", getMonthKey(lastDate), lastMsg.senderName, "closers", 1);
	addTrend("year", getYearKey(lastDate), lastMsg.senderName, "closers", 1);

	const getMedian = (arr: number[]) => {
		if (arr.length === 0) return 0;
		const s = [...arr].sort((a, b) => a - b);
		const mid = Math.floor(s.length / 2);
		return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
	};

	// Zero-filling and Median calculation
	const fillTrends = (gran: "week" | "month" | "year") => {
		const startTs = sorted[0].timestampMs;
		const endTs = sorted[sorted.length - 1].timestampMs;
		const keys: string[] = [];
		const curr = getLocalDate(startTs, timezoneOffset);
		curr.setHours(0, 0, 0, 0);

		if (gran === "month") curr.setDate(1);
		if (gran === "year") {
			curr.setMonth(0);
			curr.setDate(1);
		}

		const endKey =
			gran === "week"
				? getWeekKey(getLocalDate(endTs, timezoneOffset))
				: gran === "month"
					? getMonthKey(getLocalDate(endTs, timezoneOffset))
					: getYearKey(getLocalDate(endTs, timezoneOffset));

		let safety = 0;
		while (safety < 2000) {
			const k =
				gran === "week"
					? getWeekKey(curr)
					: gran === "month"
						? getMonthKey(curr)
						: getYearKey(curr);
			if (!keys.includes(k)) keys.push(k);
			if (k === endKey) break;

			if (gran === "week") curr.setDate(curr.getDate() + 7);
			else if (gran === "month") curr.setMonth(curr.getMonth() + 1);
			else curr.setFullYear(curr.getFullYear() + 1);
			safety++;
		}

		const metrics = [
			"initiators",
			"closers",
			"doubleTexts",
			"responseMedians_overall",
			"responseMedians_chatting",
			"responseMedians_pings",
		] as const;

		const result: any = {
			initiators: {},
			closers: {},
			doubleTexts: {},
			responseMedians_overall: {},
			responseMedians_chatting: {},
			responseMedians_pings: {},
		};

		keys.forEach((k) => {
			metrics.forEach((m) => {
				result[m][k] = {};
				participants.forEach((p) => {
					if (m.startsWith("responseMedians")) {
						const vals = (trends[gran][m][k]?.[p] || []) as number[];
						result[m][k][p] = getMedian(vals);
					} else {
						result[m][k][p] = trends[gran][m][k]?.[p] || 0;
					}
				});
			});
		});
		return result;
	};

	const filledTrends = {
		week: fillTrends("week"),
		month: fillTrends("month"),
		year: fillTrends("year"),
	};

	return {
		kpis: {
			totalSessions: Object.values(initiators).reduce(
				(acc, v) => acc + v.starts,
				0,
			),
			totalDoubleTexts: Object.values(doubleTexts).reduce(
				(acc, v) => acc + v,
				0,
			),
			medians: {
				overall: Object.fromEntries(
					Object.entries(responseTimes).map(([p, data]) => [
						p,
						getMedian(data.overall),
					]),
				),
				chatting: Object.fromEntries(
					Object.entries(responseTimes).map(([p, data]) => [
						p,
						getMedian(data.chatting),
					]),
				),
				pings: Object.fromEntries(
					Object.entries(responseTimes).map(([p, data]) => [
						p,
						getMedian(data.pings),
					]),
				),
			},
		},
		initiatorData: {
			breakdown: initiators,
			trends: {
				week: {
					initiators: filledTrends.week.initiators,
					closers: filledTrends.week.closers,
				},
				month: {
					initiators: filledTrends.month.initiators,
					closers: filledTrends.month.closers,
				},
				year: {
					initiators: filledTrends.year.initiators,
					closers: filledTrends.year.closers,
				},
			},
		},
		doubleTextData: {
			breakdown: doubleTexts,
			trends: {
				week: filledTrends.week.doubleTexts,
				month: filledTrends.month.doubleTexts,
				year: filledTrends.year.doubleTexts,
			},
		},
		responseCadenceData: {
			overall: {
				raw: Object.fromEntries(
					Object.entries(responseTimes).map(([p, d]) => [p, d.overall]),
				),
				trends: {
					week: filledTrends.week.responseMedians_overall,
					month: filledTrends.month.responseMedians_overall,
					year: filledTrends.year.responseMedians_overall,
				},
			},
			chatting: {
				raw: Object.fromEntries(
					Object.entries(responseTimes).map(([p, d]) => [p, d.chatting]),
				),
				trends: {
					week: filledTrends.week.responseMedians_chatting,
					month: filledTrends.month.responseMedians_chatting,
					year: filledTrends.year.responseMedians_chatting,
				},
			},
			pings: {
				raw: Object.fromEntries(
					Object.entries(responseTimes).map(([p, d]) => [p, d.pings]),
				),
				trends: {
					week: filledTrends.week.responseMedians_pings,
					month: filledTrends.month.responseMedians_pings,
					year: filledTrends.year.responseMedians_pings,
				},
			},
		},
	};
};

addEventListener("message", (event) => {
	const { type, payload } = event.data;

	switch (type) {
		case "INIT": {
			const {
				messages,
				timezoneOffset: tz,
				sessionGapThreshold: sG,
				overnightMinGap: oG,
				morningStartHour: mS,
				morningEndHour: mE,
				nightStartHour: nS,
				nightEndHour: nE,
				doubleTextMinGap: dMin,
				doubleTextMaxGap: dMax,
				maxResponseGapThreshold: mRG,
			} = payload;
			allMessages = messages;
			timezoneOffset = tz;
			sessionGapThreshold = sG;
			overnightMinGap = oG;
			morningStartHour = mS;
			morningEndHour = mE;
			nightStartHour = nS;
			nightEndHour = nE;
			doubleTextMinGap = dMin;
			doubleTextMaxGap = dMax;
			maxResponseGapThreshold = mRG;
			postMessage({ type: "INIT_COMPLETE" });
			break;
		}

		case "SET_FILTERS": {
			const {
				selectedParticipants,
				timeRange,
				sessionGapThreshold: sG,
				overnightMinGap: oG,
				morningStartHour: mS,
				morningEndHour: mE,
				nightStartHour: nS,
				nightEndHour: nE,
				doubleTextMinGap: dMin,
				doubleTextMaxGap: dMax,
				maxResponseGapThreshold: mRG,
			} = payload;

			sessionGapThreshold = sG;
			overnightMinGap = oG;
			morningStartHour = mS;
			morningEndHour = mE;
			nightStartHour = nS;
			nightEndHour = nE;
			doubleTextMinGap = dMin;
			doubleTextMaxGap = dMax;
			maxResponseGapThreshold = mRG;

			const participantSet = new Set(selectedParticipants);
			const filtered = allMessages.filter((m) => {
				const inTime =
					m.timestampMs >= timeRange[0] && m.timestampMs <= timeRange[1];
				const inSender =
					participantSet.size === 0 || participantSet.has(m.senderName);
				return inTime && inSender;
			});

			const results = calculateEngagement(filtered);
			postMessage({ type: "ENGAGEMENT_DATA", payload: results });
			break;
		}
	}
});
