import { MessageCategory, type NormalizedMessage } from "../lib/parsers/types";

// State
let allMessages: NormalizedMessage[] = [];
const wordMap = new Map<
	string,
	{
		count: number;
		participants: Map<string, number>;
		timeline: Map<string, Map<string, number>>;
	}
>();
const emojiMap = new Map<
	string,
	{
		count: number;
		participants: Map<string, number>;
		timeline: Map<string, Map<string, number>>;
	}
>();
const linkMap = new Map<
	string,
	{
		count: number;
		participants: Map<string, number>;
		timeline: Map<string, Map<string, number>>;
	}
>();

const aggregates = {
	word: {
		participants: new Map<string, number>(),
		timeline: new Map<string, Map<string, number>>(),
	},
	emoji: {
		participants: new Map<string, number>(),
		timeline: new Map<string, Map<string, number>>(),
	},
	link: {
		participants: new Map<string, number>(),
		timeline: new Map<string, Map<string, number>>(),
	},
};

let totalWords = 0;
let totalEmojis = 0;
let messagesWithEmoji = 0;
let totalReactions = 0;
let mostVerboseDay = { day: "", count: 0 };
let allDates: string[] = [];
let dataMinTs = Infinity;
let dataMaxTs = -Infinity;

// Cache for re-indexing
let lastTimezoneOffset = 0;
const lastSearchParams = {
	word: { query: "", isRegex: false, isCaseSensitive: false, minLen: 1 },
	emoji: { query: "" },
	activeWord: null as string | null,
	activeEmoji: null as string | null,
	activeDomain: null as string | null,
	emojiSource: "both" as "messages" | "reactions" | "both",
};

const getLocalDateKey = (ts: number, offset: number) => {
	const d = new Date(ts + offset * 60000);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const emojiRegex = /\p{Extended_Pictographic}/gu;
const urlRegex = /(https?:\/\/[^\s]+)/g;

const runIndexing = (
	messages: NormalizedMessage[],
	timezoneOffset: number,
	timeRange: [number, number],
	emojiSource: "messages" | "reactions" | "both" = "both",
) => {
	wordMap.clear();
	emojiMap.clear();
	linkMap.clear();
	totalWords = 0;
	totalEmojis = 0;
	messagesWithEmoji = 0;
	totalReactions = 0;

	// Reset aggregates
	for (const cat of ["word", "emoji", "link"] as const) {
		aggregates[cat].participants.clear();
		aggregates[cat].timeline.clear();
	}

	const dayWordCounts = new Map<string, number>();

	for (const m of messages) {
		const dayKey = getLocalDateKey(m.timestampMs, timezoneOffset);

		if (!dayWordCounts.has(dayKey)) dayWordCounts.set(dayKey, 0);

		if (m.reactions) {
			totalReactions += m.reactions.length;
		}

		// Skip system/meta messages for linguistic analysis
		if (
			m.category === MessageCategory.SystemEvent ||
			m.category === MessageCategory.ReactionNotification ||
			m.category === MessageCategory.VoiceCall ||
			m.category === MessageCategory.VideoCall ||
			m.category === MessageCategory.MissedCall
		) {
			continue;
		}

		if (m.content) {
			// 1. Words
			const words = m.content
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 0 && !emojiRegex.test(w));
			dayWordCounts.set(
				dayKey,
				(dayWordCounts.get(dayKey) || 0) + words.length,
			);

			for (const w of words) {
				totalWords++;
				let entry = wordMap.get(w);
				if (!entry) {
					entry = { count: 0, participants: new Map(), timeline: new Map() };
					wordMap.set(w, entry);
				}
				entry.count++;
				entry.participants.set(
					m.senderName,
					(entry.participants.get(m.senderName) || 0) + 1,
				);

				let dayMap = entry.timeline.get(dayKey);
				if (!dayMap) {
					dayMap = new Map();
					entry.timeline.set(dayKey, dayMap);
				}
				dayMap.set(m.senderName, (dayMap.get(m.senderName) || 0) + 1);

				// Word Aggregate
				aggregates.word.participants.set(
					m.senderName,
					(aggregates.word.participants.get(m.senderName) || 0) + 1,
				);
				let aggDayMap = aggregates.word.timeline.get(dayKey);
				if (!aggDayMap) {
					aggDayMap = new Map();
					aggregates.word.timeline.set(dayKey, aggDayMap);
				}
				aggDayMap.set(m.senderName, (aggDayMap.get(m.senderName) || 0) + 1);
			}

			// 2. Emojis (Content)
			if (emojiSource === "messages" || emojiSource === "both") {
				const emojis = m.content.match(emojiRegex);
				if (emojis) {
					messagesWithEmoji++;
					for (const e of emojis) {
						totalEmojis++;
						let entry = emojiMap.get(e);
						if (!entry) {
							entry = {
								count: 0,
								participants: new Map(),
								timeline: new Map(),
							};
							emojiMap.set(e, entry);
						}
						entry.count++;
						entry.participants.set(
							m.senderName,
							(entry.participants.get(m.senderName) || 0) + 1,
						);

						let dayMap = entry.timeline.get(dayKey);
						if (!dayMap) {
							dayMap = new Map();
							entry.timeline.set(dayKey, dayMap);
						}
						dayMap.set(m.senderName, (dayMap.get(m.senderName) || 0) + 1);

						// Emoji Aggregate
						aggregates.emoji.participants.set(
							m.senderName,
							(aggregates.emoji.participants.get(m.senderName) || 0) + 1,
						);
						let aggDayMap = aggregates.emoji.timeline.get(dayKey);
						if (!aggDayMap) {
							aggDayMap = new Map();
							aggregates.emoji.timeline.set(dayKey, aggDayMap);
						}
						aggDayMap.set(m.senderName, (aggDayMap.get(m.senderName) || 0) + 1);
					}
				}
			}
		}

		// 3. Emojis (Reactions)
		if (emojiSource === "reactions" || emojiSource === "both") {
			if (m.reactions && m.reactions.length > 0) {
				for (const r of m.reactions) {
					totalEmojis++;
					let entry = emojiMap.get(r.emoji);
					if (!entry) {
						entry = { count: 0, participants: new Map(), timeline: new Map() };
						emojiMap.set(r.emoji, entry);
					}
					entry.count++;
					entry.participants.set(
						r.actor,
						(entry.participants.get(r.actor) || 0) + 1,
					);

					let dayMap = entry.timeline.get(dayKey);
					if (!dayMap) {
						dayMap = new Map();
						entry.timeline.set(dayKey, dayMap);
					}
					dayMap.set(r.actor, (dayMap.get(r.actor) || 0) + 1);

					// Emoji Aggregate
					aggregates.emoji.participants.set(
						r.actor,
						(aggregates.emoji.participants.get(r.actor) || 0) + 1,
					);
					let aggDayMap = aggregates.emoji.timeline.get(dayKey);
					if (!aggDayMap) {
						aggDayMap = new Map();
						aggregates.emoji.timeline.set(dayKey, aggDayMap);
					}
					aggDayMap.set(r.actor, (aggDayMap.get(r.actor) || 0) + 1);
				}
			}
		}

		// 4. Links
		const messageLinks = new Set<string>();
		if (m.content) {
			const links = m.content.match(urlRegex);
			if (links) {
				for (const url of links) messageLinks.add(url);
			}
		}
		if (m.category === MessageCategory.Link && m.mediaUri) {
			messageLinks.add(m.mediaUri);
		}

		for (const url of messageLinks) {
			try {
				const domain = new URL(url).hostname.replace("www.", "");
				let entry = linkMap.get(domain);
				if (!entry) {
					entry = { count: 0, participants: new Map(), timeline: new Map() };
					linkMap.set(domain, entry);
				}
				entry.count++;
				entry.participants.set(
					m.senderName,
					(entry.participants.get(m.senderName) || 0) + 1,
				);

				let dayMap = entry.timeline.get(dayKey);
				if (!dayMap) {
					dayMap = new Map();
					entry.timeline.set(dayKey, dayMap);
				}
				dayMap.set(m.senderName, (dayMap.get(m.senderName) || 0) + 1);

				// Link Aggregate
				aggregates.link.participants.set(
					m.senderName,
					(aggregates.link.participants.get(m.senderName) || 0) + 1,
				);
				let aggDayMap = aggregates.link.timeline.get(dayKey);
				if (!aggDayMap) {
					aggDayMap = new Map();
					aggregates.link.timeline.set(dayKey, aggDayMap);
				}
				aggDayMap.set(m.senderName, (aggDayMap.get(m.senderName) || 0) + 1);
			} catch (e) {
				/* ignore */
			}
		}
	}

	// Chart baseline
	allDates = [];
	const effectiveStart =
		timeRange[0] === -Infinity || isNaN(timeRange[0])
			? dataMinTs
			: timeRange[0];
	const effectiveEnd =
		timeRange[1] === Infinity || isNaN(timeRange[1]) ? dataMaxTs : timeRange[1];

	if (
		effectiveStart !== Infinity &&
		effectiveEnd !== -Infinity &&
		!isNaN(effectiveStart) &&
		!isNaN(effectiveEnd)
	) {
		const start = new Date(effectiveStart + timezoneOffset * 60000);
		start.setUTCHours(0, 0, 0, 0);
		const end = new Date(effectiveEnd + timezoneOffset * 60000);
		end.setUTCHours(0, 0, 0, 0);

		const curr = new Date(start);
		let safety = 0;
		while (curr <= end && safety < 18250) {
			allDates.push(
				`${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, "0")}-${String(curr.getUTCDate()).padStart(2, "0")}`,
			);
			curr.setUTCDate(curr.getUTCDate() + 1);
			safety++;
		}
	}

	let maxCount = 0;
	let maxDay = "N/A";
	for (const [day, count] of dayWordCounts) {
		if (count > maxCount) {
			maxCount = count;
			maxDay = day;
		}
	}
	mostVerboseDay = { day: maxDay, count: maxCount };
};

addEventListener("message", (event) => {
	const { type, payload } = event.data;

	switch (type) {
		case "INIT": {
			const { messages, timezoneOffset } = payload;
			allMessages = messages;
			lastTimezoneOffset = timezoneOffset;
			dataMinTs = Infinity;
			dataMaxTs = -Infinity;
			for (const m of messages) {
				if (m.timestampMs < dataMinTs) dataMinTs = m.timestampMs;
				if (m.timestampMs > dataMaxTs) dataMaxTs = m.timestampMs;
			}
			runIndexing(allMessages, timezoneOffset, [dataMinTs, dataMaxTs]);
			postMessage({ type: "INIT_COMPLETE" });
			break;
		}

		case "SET_FILTERS": {
			const { selectedParticipants, timeRange } = payload;
			const participantSet = new Set(selectedParticipants);
			const filtered = allMessages.filter((m) => {
				const inTime =
					m.timestampMs >= timeRange[0] && m.timestampMs <= timeRange[1];
				const inSender =
					participantSet.size === 0 || participantSet.has(m.senderName);
				return inTime && inSender;
			});
			lastSearchParams.emojiSource = payload.emojiSource || "both";
			runIndexing(
				filtered,
				lastTimezoneOffset,
				timeRange,
				lastSearchParams.emojiSource,
			);
			postMessage({ type: "KPIS_DATA", payload: calculateKPIs() });
			processSearchWords(lastSearchParams.word);
			processSearchEmojis(lastSearchParams.emoji.query);
			processGetLinkStats();
			if (lastSearchParams.activeWord)
				processGetWordDetails(lastSearchParams.activeWord);
			if (lastSearchParams.activeEmoji)
				processGetEmojiDetails(lastSearchParams.activeEmoji);
			if (lastSearchParams.activeDomain)
				processGetLinkDetails(lastSearchParams.activeDomain);
			postMessage({ type: "FILTERS_COMPLETE" });
			break;
		}

		case "GET_KPIS": {
			postMessage({ type: "KPIS_DATA", payload: calculateKPIs() });
			break;
		}

		case "SEARCH_WORDS": {
			lastSearchParams.word = payload;
			processSearchWords(payload);
			break;
		}

		case "GET_WORD_DETAILS": {
			lastSearchParams.activeWord = payload;
			processGetWordDetails(payload);
			break;
		}

		case "SEARCH_EMOJIS": {
			lastSearchParams.emoji = payload;
			processSearchEmojis(payload.query);
			break;
		}

		case "GET_EMOJI_DETAILS": {
			lastSearchParams.activeEmoji = payload;
			processGetEmojiDetails(payload);
			break;
		}

		case "GET_LINK_STATS": {
			processGetLinkStats();
			break;
		}

		case "GET_LINK_DETAILS": {
			lastSearchParams.activeDomain = payload;
			processGetLinkDetails(payload);
			break;
		}
	}
});

const calculateKPIs = () => {
	const avgWordLength =
		totalWords > 0
			? Array.from(wordMap.keys()).reduce(
					(acc, w) => acc + w.length * (wordMap.get(w)?.count || 0),
					0,
				) / totalWords
			: 0;

	return {
		wordKPIs: {
			totalWords,
			uniqueWords: wordMap.size,
			lexicalRichness: totalWords > 0 ? (wordMap.size / totalWords) * 100 : 0,
			avgWordLength,
			mostVerboseDay,
		},
		emojiKPIs: {
			totalEmojis,
			uniqueEmojis: emojiMap.size,
			messagesWithEmoji,
			totalReactions,
		},
		linkKPIs: {
			totalLinks: Array.from(linkMap.values()).reduce(
				(acc, v) => acc + v.count,
				0,
			),
			uniqueDomains: linkMap.size,
		},
	};
};

const processSearchWords = (params: any) => {
	const { query, isRegex, isCaseSensitive, minLen } = params;
	const results: { text: string; count: number }[] = [];
	try {
		const searchRegex = isRegex
			? new RegExp(query, isCaseSensitive ? "u" : "ui")
			: null;
		const searchLower = query.toLowerCase();
		let filteredTotal = 0;
		for (const [word, data] of wordMap) {
			if (minLen && word.length < minLen) continue;
			const match =
				isRegex && searchRegex
					? searchRegex.test(word)
					: isCaseSensitive
						? word.includes(query)
						: word.toLowerCase().includes(searchLower);
			if (match) {
				results.push({ text: word, count: data.count });
				filteredTotal += data.count;
			}
		}
		results.sort((a, b) => b.count - a.count);
		postMessage({
			type: "SEARCH_WORDS_RESULTS",
			payload: { results: results.slice(0, 150), filteredTotal },
		});
	} catch (err) {
		postMessage({ type: "ERROR", payload: "Invalid regex" });
	}
};

const processGetWordDetails = (word: string) => {
	const isAgg = word === "Σ TOTAL";
	let data: any = null;

	if (isAgg) {
		const { query, isRegex, isCaseSensitive, minLen } = lastSearchParams.word;
		const hasFilter = query.length > 0 || minLen > 1;

		if (!hasFilter) {
			data = aggregates.word;
		} else {
			// Compute filtered aggregate on the fly
			const filteredData = {
				participants: new Map<string, number>(),
				timeline: new Map<string, Map<string, number>>(),
			};
			const searchRegex = isRegex
				? new RegExp(query, isCaseSensitive ? "u" : "ui")
				: null;
			const searchLower = query.toLowerCase();

			for (const [w, wData] of wordMap) {
				if (minLen && w.length < minLen) continue;
				const match =
					isRegex && searchRegex
						? searchRegex.test(w)
						: isCaseSensitive
							? w.includes(query)
							: w.toLowerCase().includes(searchLower);

				if (match) {
					// Merge participants
					for (const [p, c] of wData.participants) {
						filteredData.participants.set(
							p,
							(filteredData.participants.get(p) || 0) + c,
						);
					}
					// Merge timeline
					for (const [day, dayMap] of wData.timeline) {
						let aggDayMap = filteredData.timeline.get(day);
						if (!aggDayMap) {
							aggDayMap = new Map();
							filteredData.timeline.set(day, aggDayMap);
						}
						for (const [p, c] of dayMap) {
							aggDayMap.set(p, (aggDayMap.get(p) || 0) + c);
						}
					}
				}
			}
			data = filteredData;
		}
	} else {
		data = wordMap.get(word.toLowerCase());
	}

	if (data) {
		const timeline: any = {};
		for (const d of allDates) {
			const dayMap = data.timeline.get(d);
			timeline[d] = {
				total: dayMap
					? (Array.from(dayMap.values()) as number[]).reduce((a, b) => a + b, 0)
					: 0,
				breakdown: dayMap ? Object.fromEntries(dayMap) : {},
			};
		}
		postMessage({
			type: "WORD_DETAILS_DATA",
			payload: {
				word,
				timeline,
				participants: (
					Array.from(data.participants.entries()) as [string, number][]
				)
					.sort((a, b) => b[1] - a[1])
					.map(([name, count]) => ({ name, count })),
			},
		});
	}
};

const processSearchEmojis = (query: string) => {
	const results: { text: string; count: number }[] = [];
	let filteredTotal = 0;
	for (const [emoji, data] of emojiMap) {
		if (!query || emoji.includes(query)) {
			results.push({ text: emoji, count: data.count });
			filteredTotal += data.count;
		}
	}
	results.sort((a, b) => b.count - a.count);
	postMessage({
		type: "SEARCH_EMOJIS_RESULTS",
		payload: { results, filteredTotal },
	});
};

const processGetEmojiDetails = (emoji: string) => {
	const isAgg = emoji === "Σ TOTAL";
	let data: any = null;

	if (isAgg) {
		const query = lastSearchParams.emoji.query;
		if (!query) {
			data = aggregates.emoji;
		} else {
			const filteredData = {
				participants: new Map<string, number>(),
				timeline: new Map<string, Map<string, number>>(),
			};
			for (const [e, eData] of emojiMap) {
				if (e.includes(query)) {
					for (const [p, c] of eData.participants)
						filteredData.participants.set(
							p,
							(filteredData.participants.get(p) || 0) + c,
						);
					for (const [day, dayMap] of eData.timeline) {
						let aggDayMap = filteredData.timeline.get(day);
						if (!aggDayMap) {
							aggDayMap = new Map();
							filteredData.timeline.set(day, aggDayMap);
						}
						for (const [p, c] of dayMap)
							aggDayMap.set(p, (aggDayMap.get(p) || 0) + c);
					}
				}
			}
			data = filteredData;
		}
	} else {
		data = emojiMap.get(emoji);
	}

	if (data) {
		const timeline: any = {};
		for (const d of allDates) {
			const dayMap = data.timeline.get(d);
			timeline[d] = {
				total: dayMap
					? (Array.from(dayMap.values()) as number[]).reduce((a, b) => a + b, 0)
					: 0,
				breakdown: dayMap ? Object.fromEntries(dayMap) : {},
			};
		}
		postMessage({
			type: "EMOJI_DETAILS_DATA",
			payload: {
				emoji,
				timeline,
				participants: (
					Array.from(data.participants.entries()) as [string, number][]
				)
					.sort((a, b) => b[1] - a[1])
					.map(([name, count]) => ({ name, count })),
			},
		});
	}
};

const processGetLinkStats = () => {
	const results = Array.from(linkMap.entries())
		.sort((a, b) => b[1].count - a[1].count)
		.map(([domain, data]) => ({ text: domain, count: data.count }));
	postMessage({ type: "LINK_STATS_DATA", payload: results });
};

const processGetLinkDetails = (domain: string) => {
	const isAgg = domain === "Σ TOTAL";
	let data: any = null;

	if (isAgg) {
		const query = lastSearchParams.word.query; // Link search uses word search query input usually? No, check SET_FILTERS
		// Actually LinkAnalysisCard has its own local query in the UI, but it's not sent to worker via SEARCH_WORDS.
		// Wait, LinkAnalysisCard.tsx:54 has a local filteredResults.
		// I should check how LinkAnalysisCard handles search.
		data = aggregates.link;
	} else {
		data = linkMap.get(domain);
	}
	if (data) {
		const timeline: any = {};
		for (const d of allDates) {
			const dayMap = data.timeline.get(d);
			timeline[d] = {
				total: dayMap
					? (Array.from(dayMap.values()) as number[]).reduce((a, b) => a + b, 0)
					: 0,
				breakdown: dayMap ? Object.fromEntries(dayMap) : {},
			};
		}
		postMessage({
			type: "LINK_DETAILS_DATA",
			payload: {
				domain,
				timeline,
				participants: (
					Array.from(data.participants.entries()) as [string, number][]
				)
					.sort((a, b) => b[1] - a[1])
					.map(([name, count]) => ({ name, count })),
			},
		});
	}
};
