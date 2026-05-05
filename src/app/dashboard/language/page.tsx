"use client";

import React, { useMemo } from "react";
import { EmojiStatsCard } from "../../../components/dashboard/language/EmojiStatsCard";
import { LinkAnalysisCard } from "../../../components/dashboard/language/LinkAnalysisCard";
import { WordStatsCard } from "../../../components/dashboard/language/WordStatsCard";
import { useLanguageWorker } from "../../../hooks/useLanguageWorker";
import { useChatStore } from "../../../store";

export default function LanguagePage() {
	const { isLoaded, messages } = useChatStore();
	const {
		isInitialized,
		kpis,
		wordResults,
		filteredWordTotal,
		wordDetails,
		emojiResults,
		filteredEmojiTotal,
		emojiDetails,
		linkResults,
		linkDetails,
		error,
		searchWords,
		searchEmojis,
		getWordDetails,
		getEmojiDetails,
		getLinkDetails,
		setEmojiSource,
		emojiSource,
	} = useLanguageWorker();

	const AGG_KEY = "Σ TOTAL";

	// Handle initial selections
	React.useEffect(() => {
		if (isInitialized) {
			if (!wordDetails) getWordDetails(AGG_KEY);
			if (!emojiDetails) getEmojiDetails(AGG_KEY);
			if (!linkDetails) getLinkDetails(AGG_KEY);
		}
	}, [
		isInitialized,
		getWordDetails,
		getEmojiDetails,
		getLinkDetails,
		wordDetails,
		emojiDetails,
		linkDetails,
	]);

	const enrichedWordResults = useMemo(() => {
		if (!kpis) return wordResults;
		const totalCount =
			filteredWordTotal !== undefined
				? filteredWordTotal
				: kpis.wordKPIs.totalWords;
		return [{ text: AGG_KEY, count: totalCount }, ...wordResults];
	}, [wordResults, kpis, AGG_KEY, filteredWordTotal]);

	const enrichedEmojiResults = useMemo(() => {
		if (!kpis) return emojiResults;
		const totalCount =
			filteredEmojiTotal !== undefined
				? filteredEmojiTotal
				: kpis.emojiKPIs.totalEmojis;
		return [{ text: AGG_KEY, count: totalCount }, ...emojiResults];
	}, [emojiResults, kpis, AGG_KEY, filteredEmojiTotal]);

	const enrichedLinkResults = useMemo(() => {
		if (!kpis) return linkResults;
		return [{ text: AGG_KEY, count: kpis.linkKPIs.totalLinks }, ...linkResults];
	}, [linkResults, kpis, AGG_KEY]);

	const formattedKpis = useMemo(() => {
		if (!kpis) return null;

		const formatDate = (dateStr: string) => {
			if (!dateStr || dateStr === "N/A") return dateStr;
			const parts = dateStr.split("-");
			if (parts.length !== 3) return dateStr;
			const [y, m, d] = parts.map(Number);
			const date = new Date(y, m - 1, d);
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "2-digit",
				year: "numeric",
			});
		};

		return {
			...kpis,
			wordKPIs: {
				...kpis.wordKPIs,
				mostVerboseDay: {
					...kpis.wordKPIs.mostVerboseDay,
					day: formatDate(kpis.wordKPIs.mostVerboseDay.day),
				},
			},
		};
	}, [kpis]);

	if (!isLoaded || messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[12px_12px_0px_0px_#D93829]">
				<div className="w-16 h-16 border-8 border-[#111] dark:border-[#EAE8E3] border-t-[#D93829] animate-spin mb-8" />
				<h2 className="text-2xl font-bold uppercase tracking-widest text-[#111] dark:text-[#EAE8E3]">
					Awaiting Data Stream
				</h2>
				<p className="text-[#888] font-bold mt-2 uppercase text-xs">
					Upload chat history to begin linguistic analysis
				</p>
			</div>
		);
	}

	if (!isInitialized) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[12px_12px_0px_0px_#D93829]">
				<div className="text-4xl font-bold font-[family-name:var(--font-outfit)] animate-pulse mb-4 text-[#D93829]">
					PARSING LEXICON...
				</div>
				<div className="w-64 h-2 bg-[#f0f0f0] dark:bg-[#333] border-2 border-[#111] dark:border-[#EAE8E3] overflow-hidden">
					<div
						className="h-full bg-[#111] dark:bg-[#EAE8E3] animate-[slide_2s_infinite]"
						style={{ width: "40%" }}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-24 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
			<header className="border-b-4 border-[#111] dark:border-[#EAE8E3] pb-4 flex items-end justify-between">
				<div>
					<h1 className="text-5xl font-[family-name:var(--font-playfair)] font-black text-[#111] dark:text-[#EAE8E3]">
						LANGUAGE
					</h1>
					<div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D93829] mt-2">
						Speech patterns and habits
					</div>
				</div>
				<div className="text-right">
					<div className="text-[10px] uppercase font-bold text-[#888]">
						Data Corpus
					</div>
					<div className="text-lg font-bold font-[family-name:var(--font-outfit)]">
						{messages.length.toLocaleString()} Messages
					</div>
				</div>
			</header>

			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#D93829]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						01 // Vocabulary
					</h2>
				</div>
				<WordStatsCard
					kpis={formattedKpis?.wordKPIs || null}
					results={enrichedWordResults}
					details={wordDetails}
					onSearch={searchWords}
					onSelectWord={getWordDetails}
					error={error}
				/>
			</section>

			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#0055A4]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						02 // Emoji
					</h2>
				</div>
				<EmojiStatsCard
					kpis={formattedKpis?.emojiKPIs || null}
					results={enrichedEmojiResults}
					details={emojiDetails}
					emojiSource={emojiSource}
					onSourceChange={setEmojiSource}
					onSearch={searchEmojis}
					onSelectEmoji={getEmojiDetails}
				/>
			</section>

			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#FFCC00]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						03 // Links
					</h2>
				</div>
				<LinkAnalysisCard
					kpis={formattedKpis?.linkKPIs || null}
					results={enrichedLinkResults}
					details={linkDetails}
					onSelectLink={getLinkDetails}
				/>
			</section>
		</div>
	);
}
