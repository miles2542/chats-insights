/**
 * Call Activity Aggregation Worker
 * Offloads filtering and heavy message iteration to a background thread
 */

export type ActivityRequest = {
	messages: {
		timestampMs: number;
		callStartTimeMs?: number;
		callEndTimeMs?: number;
		senderName: string;
	}[];
	timezoneOffset: number;
	systemOffset: number;
	timeMode: "Start" | "End";
	// Filter Criteria
	selectedParticipants: string[];
	timeRange: [number | null, number | null];
};

export type ActivityResponse = {
	heatmapData: number[][];
	weekdayData: number[];
	hourData: number[];
	slotDetails: Record<string, Record<string, number>>;
	weekdayDetails: Record<string, Record<string, number>>;
	hourDetails: Record<string, Record<string, number>>;
};

addEventListener("message", (event: MessageEvent<ActivityRequest>) => {
	const {
		messages,
		timezoneOffset,
		systemOffset,
		timeMode,
		selectedParticipants,
		timeRange,
	} = event.data;

	const participantSet = new Set(selectedParticipants);
	const startTime = timeRange[0];
	const endTime = timeRange[1];
	const hasParticipantFilter = selectedParticipants.length > 0;

	const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
	const weekdays = Array(7).fill(0);
	const hours = Array(24).fill(0);
	const details: Record<string, Record<string, number>> = {};
	const wdDetails: Record<string, Record<string, number>> = {};
	const hDetails: Record<string, Record<string, number>> = {};

	for (let i = 0; i < messages.length; i++) {
		const m = messages[i];

		const effectiveTs =
			timeMode === "Start"
				? m.callStartTimeMs || m.timestampMs
				: m.callEndTimeMs || m.timestampMs;

		// Filtering
		if (startTime && effectiveTs < startTime) continue;
		if (endTime && effectiveTs > endTime) continue;
		if (hasParticipantFilter && !participantSet.has(m.senderName)) continue;

		// Inline getAdjustedDate logic
		const d = new Date(effectiveTs + (timezoneOffset - systemOffset) * 60000);
		const dayIdx = (d.getDay() + 6) % 7; // Mon=0, Sun=6
		const hourIdx = d.getHours();

		heatmap[dayIdx][hourIdx]++;
		weekdays[dayIdx]++;
		hours[hourIdx]++;

		const sender = m.senderName;

		// Heatmap details
		const key = `${dayIdx}-${hourIdx}`;
		if (!details[key]) details[key] = {};
		details[key][sender] = (details[key][sender] || 0) + 1;

		// Weekday details
		if (!wdDetails[dayIdx]) wdDetails[dayIdx] = {};
		wdDetails[dayIdx][sender] = (wdDetails[dayIdx][sender] || 0) + 1;

		// Hour details
		if (!hDetails[hourIdx]) hDetails[hourIdx] = {};
		hDetails[hourIdx][sender] = (hDetails[hourIdx][sender] || 0) + 1;
	}

	const formattedHeatmap: number[][] = [];
	for (let d = 0; d < 7; d++) {
		for (let h = 0; h < 24; h++) {
			formattedHeatmap.push([h, d, heatmap[d][h]]);
		}
	}

	postMessage({
		heatmapData: formattedHeatmap,
		weekdayData: weekdays,
		hourData: hours,
		slotDetails: details,
		weekdayDetails: wdDetails,
		hourDetails: hDetails,
	} as ActivityResponse);
});
