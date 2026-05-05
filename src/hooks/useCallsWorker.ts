"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "../store";

let workerInstance: Worker | null = null;
let currentMessagesRef: any[] | null = null;

export const useCallsWorker = () => {
	const {
		messages,
		selectedParticipants,
		timeRange,
		timezoneOffset,
		calls,
		setCallsData,
	} = useChatStore();

	const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Ensure the global worker always talks to the currently mounted hook instance
	useEffect(() => {
		if (!workerInstance) return;

		workerInstance.onmessage = (event) => {
			const { type, payload } = event.data;

			switch (type) {
				case "INIT_COMPLETE":
					setCallsData({ isInitialized: true });
					// Initial load with current global filters
					workerInstance?.postMessage({
						type: "SET_FILTERS",
						payload: {
							selectedParticipants,
							timeRange: [
								timeRange[0]?.getTime() || -Infinity,
								timeRange[1]?.getTime() || Infinity,
							],
							granularity: calls.granularity,
						},
					});
					break;
				case "DATA_UPDATE":
					setCallsData({
						...payload,
					});
					break;
				case "ERROR":
					setCallsData({ error: payload });
					break;
			}
		};
	});

	const setGranularity = useCallback(
		(granularity: "Day" | "Month" | "Year") => {
			setCallsData({ granularity });
			workerInstance?.postMessage({
				type: "SET_GRANULARITY",
				payload: {
					granularity,
					timeRange: [
						timeRange[0]?.getTime() || -Infinity,
						timeRange[1]?.getTime() || Infinity,
					],
				},
			});
		},
		[setCallsData, timeRange],
	);

	const initWorker = useCallback(() => {
		if (workerInstance) {
			workerInstance.terminate();
		}

		setCallsData({ isInitialized: false, error: null });

		workerInstance = new Worker(
			new URL("../workers/calls-worker.ts", import.meta.url),
		);
		currentMessagesRef = messages;

		if (messages.length > 0) {
			workerInstance.postMessage({
				type: "INIT",
				payload: { messages, timezoneOffset },
			});
		}
	}, [messages, timezoneOffset, setCallsData]);

	// 1. Handle message changes (Full Re-init)
	useEffect(() => {
		if (!workerInstance || currentMessagesRef !== messages) {
			if (messages.length > 0) {
				initWorker();
			}
		}
	}, [messages, initWorker]);

	// 2. Handle Filter Changes (Reactive Re-indexing)
	useEffect(() => {
		if (!workerInstance || !calls.isInitialized) return;

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
					granularity: calls.granularity,
				},
			});
		}, 300);

		return () => {
			if (filterDebounceTimer.current)
				clearTimeout(filterDebounceTimer.current);
		};
	}, [selectedParticipants, timeRange, calls.isInitialized, calls.granularity]);

	return {
		...calls,
		setGranularity,
	};
};
