"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { AvatarCircle } from "./InboxPanel";

/**
 * InboxSearchView — dedicated search UI that replaces the right sidebar.
 *
 * Features:
 * - Real-time filtering of messages (debounced).
 * - Mode selection: Fuzzy (standard includes), Exact (case-sensitive literal), Regex.
 * - Results list with highlighted matches, avatars, and relative timestamps.
 * - Click-to-jump: scrolls the main ChatStream to the selected message.
 * - Result count summary.
 */

interface Props {
	onBack: () => void;
	onJump: (messageId: string) => void;
}

export const InboxSearchView = ({ onBack, onJump }: Props) => {
	const { messages, inbox, setInboxData } = useChatStore();
	const [localSearch, setLocalSearch] = useState(inbox.searchTerm.trim());

	// Debounce local search to store
	useEffect(() => {
		const timer = setTimeout(() => {
			setInboxData({ searchTerm: localSearch });
		}, 300);
		return () => clearTimeout(timer);
	}, [localSearch, setInboxData]);

	const results = useMemo(() => {
		const term = inbox.searchTerm.trim();
		if (!term) return [];

		try {
			return messages.filter((m) => {
				const content = m.content || "";
				if (inbox.searchMode === "regex") {
					const re = new RegExp(term, "i");
					return re.test(content);
				}
				if (inbox.searchMode === "exact") {
					return content.includes(term);
				}
				// Default fuzzy (case-insensitive includes)
				return content.toLowerCase().includes(term.toLowerCase());
			});
		} catch (e) {
			console.error("Search error:", e);
			return [];
		}
	}, [messages, inbox.searchTerm, inbox.searchMode]);

	return (
		<aside className="w-[300px] flex-shrink-0 border-l border-[#E5E5E5] dark:border-[#1E1E1E] bg-white dark:bg-[#0A0A0A] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
			{/* Header: Back Button + Title */}
			<div className="p-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] flex items-center gap-3 bg-[#F8F8F8] dark:bg-[#111]">
				<button
					type="button"
					onClick={onBack}
					className="w-8 h-8 rounded-full flex items-center justify-center text-[#888] hover:bg-[#EEE] dark:hover:bg-[#222] transition-colors"
				>
					<BackIcon className="w-4 h-4" />
				</button>
				<h3 className="text-sm font-bold text-[#111] dark:text-white tracking-tight">
					Search Messages
				</h3>
			</div>

			{/* Search Controls */}
			<div className="p-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] flex flex-col gap-3">
				<div className="bg-[#F2F2F7] dark:bg-[#1A1A1A] rounded-xl px-3 py-2.5 flex items-center gap-2 border border-transparent focus-within:border-[#D93829]/30 transition-colors">
					<SearchIcon className="w-3.5 h-3.5 text-[#888]" />
					<input
						autoFocus
						type="text"
						value={localSearch}
						onChange={(e) => setLocalSearch(e.target.value)}
						placeholder="Search in chat..."
						className="bg-transparent outline-none text-sm w-full text-[#111] dark:text-white placeholder-[#999] dark:placeholder-[#555]"
					/>
				</div>

				{/* Mode Selector */}
				<div className="flex bg-[#F2F2F7] dark:bg-[#1A1A1A] rounded-lg p-1">
					{(["fuzzy", "exact", "regex"] as const).map((mode) => (
						<button
							key={mode}
							type="button"
							onClick={() => setInboxData({ searchMode: mode })}
							className={[
								"flex-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all rounded-md",
								inbox.searchMode === mode
									? "bg-white dark:bg-[#333] text-[#D93829] shadow-sm"
									: "text-[#999] dark:text-[#555] hover:text-[#666] dark:hover:text-[#AAA]",
							].join(" ")}
						>
							{mode}
						</button>
					))}
				</div>

				<p className="text-[10px] font-bold text-[#BBB] dark:text-[#444] uppercase tracking-wider">
					{results.length} {results.length === 1 ? "Result" : "Results"}
				</p>
			</div>

			{/* Results List */}
			<div className="flex-1 overflow-y-auto custom-scrollbar p-2">
				{results.map((m) => (
					<button
						key={m.id}
						type="button"
						onClick={() => onJump(m.id)}
						className="w-full p-3 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#111] transition-all text-left flex gap-3 group border border-transparent hover:border-[#EEE] dark:hover:border-[#222]"
					>
						<AvatarCircle name={m.senderName} size="sm" />
						<div className="flex-1 min-w-0">
							<div className="flex justify-between items-baseline gap-2 mb-0.5">
								<p className="text-[12px] font-bold text-[#111] dark:text-white truncate">
									{m.senderName}
								</p>
								<p className="text-[9px] font-bold text-[#BBB] dark:text-[#444] uppercase flex-shrink-0">
									{formatDate(m.timestampMs)}
								</p>
							</div>
							<p className="text-[12px] text-[#666] dark:text-[#888] line-clamp-2 leading-relaxed">
								<HighlightedText
									text={m.content || "[Media]"}
									highlight={inbox.searchTerm}
								/>
							</p>
						</div>
					</button>
				))}

				{localSearch && results.length === 0 && (
					<div className="py-12 text-center select-none">
						<p className="text-sm font-semibold text-[#BBB] dark:text-[#444]">
							No results found
						</p>
						<p className="text-xs text-[#CCC] dark:text-[#333] mt-1">
							Try a different term or search mode
						</p>
					</div>
				)}
			</div>
		</aside>
	);
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const HighlightedText = ({
	text,
	highlight,
}: {
	text: string;
	highlight: string;
}) => {
	if (!highlight.trim()) return <>{text}</>;

	try {
		const parts = text.split(new RegExp(`(${highlight})`, "gi"));
		return (
			<>
				{parts.map((part, i) =>
					part.toLowerCase() === highlight.toLowerCase() ? (
						<mark
							key={i}
							className="bg-[#D93829]/20 text-[#D93829] rounded-sm px-0.5 font-bold"
						>
							{part}
						</mark>
					) : (
						part
					),
				)}
			</>
		);
	} catch (e) {
		return <>{text}</>;
	}
};

const formatDate = (ts: number): string => {
	const date = new Date(ts);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days === 0) return "Today";
	if (days < 7) return `${days}d`;
	if (days < 30) return `${Math.floor(days / 7)}w`;
	if (days < 365) return `${Math.floor(days / 30)}mo`;
	return `${Math.floor(days / 365)}y`;
};

// SVG icons
const BackIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<line x1="19" y1="12" x2="5" y2="12" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
);
