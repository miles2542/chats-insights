"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../store";

let workerInstance: Worker | null = null;
let currentMessagesRef: any[] | null = null;

export const useLanguageWorker = () => {
	const {
		messages,
		selectedParticipants,
		timeRange,
		timezoneOffset,
		language,
		setLanguageData,
	} = useChatStore();

	const [wordResults, setWordResults] = useState<
		{ text: string; count: number }[]
	>([]);
	const [filteredWordTotal, setFilteredWordTotal] = useState(0);
	const [emojiResults, setEmojiResults] = useState<
		{ text: string; count: number }[]
	>([]);
	const [filteredEmojiTotal, setFilteredEmojiTotal] = useState(0);
	const [linkResults, setLinkResults] = useState<
		{ text: string; count: number }[]
	>([]);

	const watchdogTimer = useRef<NodeJS.Timeout | null>(null);
	const filterDebounceTimer = useRef<NodeJS.Timeout | null>(null);

	// Ensure the global worker always talks to the currently mounted hook instance
	useEffect(() => {
		if (!workerInstance) return;

		workerInstance.onmessage = (event) => {
			const { type, payload } = event.data;
			if (watchdogTimer.current) {
				clearTimeout(watchdogTimer.current);
				watchdogTimer.current = null;
			}

			switch (type) {
				case "INIT_COMPLETE":
					setLanguageData({ isInitialized: true });
					// Initial load with current global filters
					workerInstance?.postMessage({
						type: "SET_FILTERS",
						payload: {
							selectedParticipants,
							timeRange: [
								timeRange[0]?.getTime() || -Infinity,
								timeRange[1]?.getTime() || Infinity,
							],
							emojiSource: language.emojiSource,
						},
					});
					break;
				case "KPIS_DATA":
					setLanguageData({ kpis: payload });
					break;
				case "SEARCH_WORDS_RESULTS":
					setWordResults(payload.results);
					setFilteredWordTotal(payload.filteredTotal);
					break;
				case "SEARCH_EMOJIS_RESULTS":
					setEmojiResults(payload.results);
					setFilteredEmojiTotal(payload.filteredTotal);
					break;
				case "WORD_DETAILS_DATA":
					setLanguageData({ wordDetails: payload });
					break;
				case "EMOJI_DETAILS_DATA":
					setLanguageData({ emojiDetails: payload });
					break;
				case "LINK_STATS_DATA":
					setLinkResults(payload);
					break;
				case "LINK_DETAILS_DATA":
					setLanguageData({ linkDetails: payload });
					break;
				case "ERROR":
					setLanguageData({ error: payload });
					break;
			}
		};
	}); // No deps: Re-binds on every render to guarantee fresh closures

	const initWorker = useCallback(() => {
		if (workerInstance) {
			workerInstance.terminate();
		}

		setLanguageData({ isInitialized: false, error: null });

		workerInstance = new Worker(
			new URL("../workers/language-worker.ts", import.meta.url),
		);
		currentMessagesRef = messages;

		if (messages.length > 0) {
			workerInstance.postMessage({
				type: "INIT",
				payload: { messages, timezoneOffset },
			});
		}
	}, [messages, timezoneOffset, setLanguageData]); // Minimal deps for init

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
		if (!workerInstance || !language.isInitialized) return;

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
					emojiSource: language.emojiSource,
				},
			});
		}, 300); // Debounce to prevent stutter during slider drags

		return () => {
			if (filterDebounceTimer.current)
				clearTimeout(filterDebounceTimer.current);
		};
	}, [
		selectedParticipants,
		timeRange,
		language.isInitialized,
		language.emojiSource,
	]);

	const startWatchdog = (ms = 3000) => {
		if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
		watchdogTimer.current = setTimeout(() => {
			setLanguageData({
				error: "Regex pattern too complex. Worker restarted.",
			});
			initWorker();
		}, ms);
	};

	const searchWords = useCallback(
		(query: string, isRegex: boolean, isCaseSensitive: boolean, minLen = 1) => {
			setLanguageData({ error: null });
			if (isRegex && query.length > 0) startWatchdog();
			workerInstance?.postMessage({
				type: "SEARCH_WORDS",
				payload: { query, isRegex, isCaseSensitive, minLen },
			});
		},
		[setLanguageData, initWorker],
	);

	const searchEmojis = useCallback((query: string) => {
		workerInstance?.postMessage({
			type: "SEARCH_EMOJIS",
			payload: { query },
		});
	}, []);

	const getWordDetails = useCallback((word: string) => {
		workerInstance?.postMessage({
			type: "GET_WORD_DETAILS",
			payload: word,
		});
	}, []);

	const getEmojiDetails = useCallback((emoji: string) => {
		workerInstance?.postMessage({
			type: "GET_EMOJI_DETAILS",
			payload: emoji,
		});
	}, []);

	const getLinkDetails = useCallback((domain: string) => {
		workerInstance?.postMessage({
			type: "GET_LINK_DETAILS",
			payload: domain,
		});
	}, []);

	const setEmojiSource = useCallback(
		(source: "messages" | "reactions" | "both") => {
			setLanguageData({ emojiSource: source });
		},
		[setLanguageData],
	);

	return {
		...language,
		searchWords,
		searchEmojis,
		getWordDetails,
		getEmojiDetails,
		getLinkDetails,
		setEmojiSource,
		emojiSource: language.emojiSource,
		filteredWordTotal,
		filteredEmojiTotal,
		wordResults,
		emojiResults,
		linkResults,
	};
};
