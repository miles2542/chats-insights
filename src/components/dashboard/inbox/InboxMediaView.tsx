"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { MessageCategory } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { AvatarCircle } from "./InboxPanel";
import { ChevronDownIcon } from "./InboxRightSidebar";

interface Props {
	onBack: () => void;
	onJump: (messageId: string) => void;
}

export const InboxMediaView = ({ onBack, onJump }: Props) => {
	const { inbox, messages, participants, setInboxData } = useChatStore();
	const { activeMediaView, mediaSenderFilters } = inbox;

	const [isSenderOpen, setIsSenderOpen] = useState(false);
	const [selYear, setSelYear] = useState<string>("All");
	const [selMonth, setSelMonth] = useState<string>("All");

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const years = useMemo(() => {
		if (messages.length === 0) return ["All"];
		const start = new Date(messages[0].timestampMs).getFullYear();
		const end = new Date(
			messages[messages.length - 1].timestampMs,
		).getFullYear();
		const list = ["All"];
		for (let i = end; i >= start; i--) list.push(i.toString());
		return list;
	}, [messages]);

	// 1. Filter relevant messages
	const filteredMessages = useMemo(() => {
		let list = messages.filter((m) => {
			if (activeMediaView === "photos") {
				return (
					m.category === MessageCategory.Photo ||
					m.category === MessageCategory.Video ||
					m.category === MessageCategory.GIF
				);
			}
			if (activeMediaView === "audio")
				return m.category === MessageCategory.Audio;
			if (activeMediaView === "files")
				return m.category === MessageCategory.File;
			return false;
		});

		if (mediaSenderFilters.length > 0) {
			list = list.filter((m) => mediaSenderFilters.includes(m.senderName));
		}

		if (selYear !== "All") {
			list = list.filter(
				(m) => new Date(m.timestampMs).getFullYear().toString() === selYear,
			);
		}
		if (selMonth !== "All") {
			const monthIdx = months.indexOf(selMonth);
			list = list.filter(
				(m) => new Date(m.timestampMs).getMonth() === monthIdx,
			);
		}

		// Sort newest first
		return [...list].sort((a, b) => b.timestampMs - a.timestampMs);
	}, [messages, activeMediaView, mediaSenderFilters, selYear, selMonth]);

	// 2. Group by month
	const groups = useMemo(() => {
		const map: Record<string, NormalizedMessage[]> = {};
		filteredMessages.forEach((m) => {
			const date = new Date(m.timestampMs);
			const label = date.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
			if (!map[label]) map[label] = [];
			map[label].push(m);
		});
		return Object.entries(map);
	}, [filteredMessages]);

	const title = useMemo(() => {
		if (activeMediaView === "photos") return "Photos & Videos";
		if (activeMediaView === "audio") return "Audio";
		if (activeMediaView === "files") return "Files";
		return "Media";
	}, [activeMediaView]);

	const toggleSender = (p: string) => {
		if (mediaSenderFilters.includes(p)) {
			setInboxData({
				mediaSenderFilters: mediaSenderFilters.filter((x) => x !== p),
			});
		} else {
			setInboxData({ mediaSenderFilters: [...mediaSenderFilters, p] });
		}
	};

	return (
		<aside className="w-[300px] flex-shrink-0 border-l border-[#E5E5E5] dark:border-[#1E1E1E] bg-white dark:bg-[#0A0A0A] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
			{/* Header */}
			<div className="p-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] flex items-center gap-3 bg-[#F8F8F8] dark:bg-[#111]">
				<button
					type="button"
					onClick={onBack}
					className="w-8 h-8 rounded-full flex items-center justify-center text-[#888] hover:bg-[#EEE] dark:hover:bg-[#222] transition-colors"
				>
					<BackIcon className="w-4 h-4" />
				</button>
				<h3 className="text-sm font-bold text-[#111] dark:text-white tracking-tight">
					{title}
				</h3>
			</div>

			{/* Filter Bar */}
			<div className="p-4 space-y-3 border-b border-[#E5E5E5] dark:border-[#1E1E1E] bg-[#FDFDFD] dark:bg-[#0D0D0D]">
				{/* Sender Selector */}
				<div className="relative">
					<button
						onClick={() => setIsSenderOpen(!isSenderOpen)}
						className="w-full h-10 px-4 rounded-xl bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-between group transition-all hover:bg-[#EBEBEF] dark:hover:bg-[#222]"
					>
						<span className="text-[11px] font-bold text-[#666] dark:text-[#888] uppercase tracking-wider">
							{mediaSenderFilters.length === 0
								? "Filter by Sender"
								: `${mediaSenderFilters.length} Selected`}
						</span>
						<ChevronDownIcon
							className={`w-3.5 h-3.5 text-[#AAA] transition-transform ${isSenderOpen ? "rotate-180" : ""}`}
						/>
					</button>

					{isSenderOpen && (
						<div className="absolute top-12 left-0 right-0 bg-white dark:bg-[#111] border border-[#EEE] dark:border-[#222] rounded-2xl shadow-2xl z-50 p-2 max-h-[300px] overflow-y-auto custom-scrollbar animate-[fadeIn_0.15s_ease-out]">
							<button
								onClick={() => {
									setInboxData({ mediaSenderFilters: [] });
									setIsSenderOpen(false);
								}}
								className="w-full p-3 text-left text-[11px] font-black uppercase tracking-widest text-[#D93829] hover:bg-[#F8F8F8] dark:hover:bg-[#1A1A1A] rounded-xl transition-colors"
							>
								Clear All
							</button>
							{participants.map((p) => (
								<button
									key={p}
									onClick={() => toggleSender(p)}
									className="w-full p-2.5 flex items-center gap-3 hover:bg-[#F8F8F8] dark:hover:bg-[#1A1A1A] rounded-xl transition-colors group"
								>
									<div
										className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${mediaSenderFilters.includes(p) ? "bg-[#D93829] border-[#D93829]" : "border-[#DDD] dark:border-[#333]"}`}
									>
										{mediaSenderFilters.includes(p) && (
											<CheckIcon className="w-2.5 h-2.5 text-white" />
										)}
									</div>
									<AvatarCircle name={p} size="sm" />
									<span
										className={`text-[12px] font-bold truncate ${mediaSenderFilters.includes(p) ? "text-[#111] dark:text-white" : "text-[#888]"}`}
									>
										{p}
									</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Time Filter */}
				<div className="flex gap-2">
					<select
						value={selYear}
						onChange={(e) => setSelYear(e.target.value)}
						className="flex-1 h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1A1A1A] text-[11px] font-bold text-[#666] dark:text-[#888] outline-none border-none appearance-none cursor-pointer"
					>
						{years.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
					<select
						value={selMonth}
						onChange={(e) => setSelMonth(e.target.value)}
						className="flex-1 h-10 px-3 rounded-xl bg-[#F2F2F7] dark:bg-[#1A1A1A] text-[11px] font-bold text-[#666] dark:text-[#888] outline-none border-none appearance-none cursor-pointer"
					>
						<option value="All">All Months</option>
						{months.map((m) => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto custom-scrollbar">
				{groups.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center p-10 text-center">
						<div className="w-16 h-16 rounded-full bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-center text-[#CCC] mb-4">
							<EmptyIcon className="w-8 h-8" />
						</div>
						<p className="text-xs font-bold text-[#999]">No items found</p>
					</div>
				) : (
					groups.map(([month, items]) => (
						<section key={month} className="mb-6">
							<div className="px-5 py-3 sticky top-0 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-10 border-b border-[#EEE]/50 dark:border-white/5">
								<h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D93829]">
									{month}
								</h4>
							</div>

							{activeMediaView === "photos" ? (
								<div className="grid grid-cols-3 gap-0.5 px-0.5">
									{items.map((m) => (
										<GalleryThumbnail
											key={m.id}
											message={m}
											onOpenLightbox={() =>
												setInboxData({ lightboxMessageId: m.id })
											}
										/>
									))}
								</div>
							) : (
								<div className="px-2 space-y-1 mt-2">
									{items.map((m) => (
										<button
											key={m.id}
											onClick={() => onJump(m.id)}
											className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#111] transition-all group text-left"
										>
											<div className="w-10 h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-center text-[#555] dark:text-[#777] group-hover:bg-[#D93829]/10 group-hover:text-[#D93829] transition-colors">
												{activeMediaView === "audio" ? (
													<AudioIcon className="w-5 h-5" />
												) : (
													<FileIcon className="w-5 h-5" />
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-[12px] font-bold text-[#111] dark:text-[#EEE] truncate">
													{m.mediaItems?.[0]?.uri.split("/").pop() ||
														(activeMediaView === "audio"
															? "Audio Message"
															: "File")}
												</p>
												<p className="text-[10px] text-[#999] mt-0.5">
													{new Date(m.timestampMs).toLocaleDateString()} •{" "}
													{m.senderName.split(" ")[0]}
												</p>
											</div>
										</button>
									))}
								</div>
							)}
						</section>
					))
				)}
			</div>
		</aside>
	);
};

const GalleryThumbnail = ({
	message,
	onOpenLightbox,
}: {
	message: NormalizedMessage;
	onOpenLightbox: () => void;
}) => {
	const { mediaMap } = useChatStore();
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		const uri = message.mediaUri || message.mediaItems?.[0]?.uri;
		if (!uri) return;
		const filename = uri.split("/").pop() ?? "";
		let file = mediaMap.get(uri) || mediaMap.get(filename);
		if (!file) {
			for (const [key, f] of mediaMap.entries()) {
				if (key.endsWith(filename)) {
					file = f;
					break;
				}
			}
		}
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			setUrl(objectUrl);
			return () => URL.revokeObjectURL(objectUrl);
		}
	}, [message, mediaMap]);

	return (
		<button
			onClick={onOpenLightbox}
			className="aspect-square bg-[#F5F5F5] dark:bg-[#111] overflow-hidden group relative"
		>
			{url ? (
				<img
					src={url}
					alt=""
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
			) : (
				<div className="w-full h-full flex items-center justify-center opacity-20 grayscale text-xl">
					🖼️
				</div>
			)}
			{message.category === MessageCategory.Video && (
				<div className="absolute inset-0 flex items-center justify-center bg-black/20">
					<PlayIcon className="w-6 h-6 text-white shadow-xl" />
				</div>
			)}
		</button>
	);
};

const BackIcon = ({ className }: any) => (
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

const EmptyIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
		<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
		<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
	</svg>
);

const PlayIcon = ({ className }: any) => (
	<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
		<polygon points="5 3 19 12 5 21 5 3" />
	</svg>
);

const AudioIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
		<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
		<line x1="12" y1="19" x2="12" y2="23" />
		<line x1="8" y1="23" x2="16" y2="23" />
	</svg>
);

const FileIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
		<polyline points="13 2 13 9 20 9" />
	</svg>
);

const CheckIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="4"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="20 6 9 17 4 12" />
	</svg>
);
