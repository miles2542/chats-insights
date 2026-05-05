"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "../store";

let workerInstance: Worker | null = null;
let currentMessagesRef: any[] | null = null;

export const useEngagementWorker = () => {
	const {
		messages,
		selectedParticipants,
		timeRange,
		timezoneOffset,
		sessionGapThreshold,
		overnightMinGap,
		morningStartHour,
		morningEndHour,
		nightStartHour,
		nightEndHour,
		doubleTextMinGap,
		doubleTextMaxGap,
		maxResponseGapThreshold,
		engagement,
		setEngagementData,
	} = useChatStore();

	const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

	const initWorker = useCallback(() => {
		if (workerInstance) {
			workerInstance.terminate();
		}

		setEngagementData({ isInitialized: false, error: null });

		workerInstance = new Worker(
			new URL("../workers/engagement-worker.ts", import.meta.url),
		);
		currentMessagesRef = messages;

		workerInstance.onmessage = (event) => {
			const { type, payload } = event.data;

			switch (type) {
				case "INIT_COMPLETE":
					setEngagementData({ isInitialized: true });
					// Initial load with current global filters
					workerInstance?.postMessage({
						type: "SET_FILTERS",
						payload: {
							selectedParticipants,
							timeRange: [
								timeRange[0]?.getTime() || -Infinity,
								timeRange[1]?.getTime() || Infinity,
							],
							sessionGapThreshold,
							overnightMinGap,
							morningStartHour,
							morningEndHour,
							nightStartHour,
							nightEndHour,
							doubleTextMinGap,
							doubleTextMaxGap,
							maxResponseGapThreshold,
						},
					});
					break;
				case "ENGAGEMENT_DATA":
					setEngagementData({
						kpis: payload.kpis,
						initiatorData: payload.initiatorData,
						doubleTextData: payload.doubleTextData,
						responseCadenceData: payload.responseCadenceData,
					});
					break;
				case "ERROR":
					setEngagementData({ error: payload });
					break;
			}
		};

		if (messages.length > 0) {
			workerInstance.postMessage({
				type: "INIT",
				payload: {
					messages,
					timezoneOffset,
					sessionGapThreshold,
					overnightMinGap,
					morningStartHour,
					morningEndHour,
					nightStartHour,
					nightEndHour,
					doubleTextMinGap,
					doubleTextMaxGap,
					maxResponseGapThreshold,
				},
			});
		}
	}, [
		messages,
		timezoneOffset,
		setEngagementData,
		sessionGapThreshold,
		overnightMinGap,
		morningStartHour,
		morningEndHour,
		nightStartHour,
		nightEndHour,
		doubleTextMinGap,
		doubleTextMaxGap,
		maxResponseGapThreshold,
	]);

	// 1. Handle message changes (Full Re-init)
	useEffect(() => {
		if (!workerInstance || currentMessagesRef !== messages) {
			if (messages.length > 0) {
				initWorker();
			}
		}
	}, [messages, initWorker]);

	// 2. Handle Filter & Config Changes (Reactive Re-indexing)
	useEffect(() => {
		if (!workerInstance || !engagement.isInitialized) return;

		if (filterDebounceTimer.current) clearTimeout(filterDebounceTimer.current);

		filterDebounceTimer.current = setTimeout(() => {
			workerInstance?.postMessage({
				type: "SET_FILTERS",
				payload: {
					selectedParticipants,
					timeRange: [
						timeRange[0]?.getTime() || -Infinity,
						timeRange[1]?.getTime() || Infinity,
					],
					sessionGapThreshold,
					overnightMinGap,
					morningStartHour,
					morningEndHour,
					nightStartHour,
					nightEndHour,
					doubleTextMinGap,
					doubleTextMaxGap,
					maxResponseGapThreshold,
				},
			});
		}, 300);

		return () => {
			if (filterDebounceTimer.current)
				clearTimeout(filterDebounceTimer.current);
		};
	}, [
		selectedParticipants,
		timeRange,
		sessionGapThreshold,
		overnightMinGap,
		morningStartHour,
		morningEndHour,
		nightStartHour,
		nightEndHour,
		doubleTextMinGap,
		doubleTextMaxGap,
		maxResponseGapThreshold,
		engagement.isInitialized,
	]);

	return {
		...engagement,
	};
};
