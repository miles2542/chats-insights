"use client";

import ReactECharts from "echarts-for-react";
import { BarChart3, Grid, List, Search, Users } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { InfoTooltip } from "../InfoTooltip";
import { QuickTooltip } from "./QuickTooltip";

interface EmojiStatsCardProps {
	kpis: any | null;
	results: { text: string; count: number }[];
	details: any;
	emojiSource: "messages" | "reactions" | "both";
	onSourceChange: (source: "messages" | "reactions" | "both") => void;
	onSearch: (query: string) => void;
	onSelectEmoji: (emoji: string) => void;
}

export const EmojiStatsCard: React.FC<EmojiStatsCardProps> = ({
	kpis,
	results,
	details,
	emojiSource,
	onSourceChange,
	onSearch,
	onSelectEmoji,
}) => {
	const [query, setQuery] = useState("");
	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
	const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

	const timelineOption = useMemo(() => {
		if (!details || !details.timeline) return {};
		const keys = Object.keys(details.timeline).sort();
		const data = keys.map((k) => details.timeline[k]);

		return {
			tooltip: {
				trigger: "axis",
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				formatter: (params: any) => {
					const p = params[0];
					const dayData = details.timeline[p.name];
					const total = dayData ? dayData.total : 0;
					const breakdown = dayData ? dayData.breakdown : {};
					const sortedBreakdown = Object.entries(breakdown).sort(
						(a: any, b: any) => b[1] - a[1],
					);

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
                            <span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit)">${p.name}</span>
                            <span style="color: #D93829; font-size: 16px; font-weight: 900; font-family: var(--font-outfit)">${total.toLocaleString()}</span>
                        </div>`;

					if (total > 0) {
						html += `<div style="display: flex; flex-direction: column; gap: 6px">`;
						sortedBreakdown.forEach(([name, count]: [string, any]) => {
							html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
                                <span>${name}</span>
                                <span>${count.toLocaleString()}</span>
                            </div>`;
						});
						html += `</div>`;
					}
					html += `</div>`;
					return html;
				},
			},
			grid: { top: 30, bottom: 60, left: 40, right: 20 },
			xAxis: {
				type: "category",
				data: keys,
				axisLine: { lineStyle: { color: "#111", width: 2 } },
				axisLabel: {
					fontSize: 9,
					fontWeight: "bold",
					interval: "auto",
					hideOverlap: true,
					margin: 12,
				},
			},
			yAxis: {
				type: "value",
				axisLine: { show: true, lineStyle: { color: "#111", width: 2 } },
				splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
				axisLabel: { fontSize: 9, fontWeight: "bold" },
			},
			series: [
				{
					data: data.map((d) => (d.total === 0 ? 0.05 : d.total)),
					type: "bar",
					itemStyle: {
						color: (p: any) => (p.value === 0.05 ? "#f5f5f5" : "#0055A4"),
					},
					barMaxWidth: 10,
				},
			],
		};
	}, [details]);

	return (
		<div className="col-span-12 grid grid-cols-12 gap-6">
			<div className="col-span-12 grid grid-cols-4 gap-4">
				{[
					{
						label: "Total Emojis",
						value: kpis?.totalEmojis.toLocaleString() || "...",
					},
					{
						label: "Unique Emojis",
						value: kpis?.uniqueEmojis.toLocaleString() || "...",
					},
					{
						label: "Messages w/ Emoji",
						value: kpis?.messagesWithEmoji.toLocaleString() || "...",
					},
					{
						label: "Reactions Received",
						value: kpis?.totalReactions.toLocaleString() || "...",
						tooltip:
							"Messenger only exports reactions other people placed on your messages.",
					},
				].map((kpi) => (
					<div
						key={kpi.label}
						className="bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] p-4 shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3]"
					>
						<div className="flex items-center gap-1 mb-1">
							<div className="text-[10px] uppercase font-bold text-[#888]">
								{kpi.label}
							</div>
							{kpi.tooltip && <InfoTooltip content={kpi.tooltip} />}
						</div>
						<div className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
							{kpi.value}
						</div>
					</div>
				))}
			</div>

			<div className="col-span-7 bg-[#EAE8E3] dark:bg-[#1A1A1A] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] flex flex-col h-[600px]">
				<div className="flex flex-wrap items-center gap-4 mb-6">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
						<input
							type="text"
							placeholder="Search emojis..."
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								onSearch(e.target.value);
							}}
							className="w-full bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] pl-10 pr-4 py-2 text-sm font-bold focus:outline-none"
						/>
					</div>

					<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] overflow-hidden">
						{(["messages", "reactions", "both"] as const).map((source) => (
							<button
								key={source}
								onClick={() => onSourceChange(source)}
								className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-r-2 last:border-r-0 border-[#111] dark:border-[#EAE8E3] ${
									emojiSource === source
										? "bg-[#0055A4] text-white"
										: "hover:bg-[#f0f0f0] dark:hover:bg-[#222] text-[#888] hover:text-[#111] dark:hover:text-[#EAE8E3]"
								}`}
							>
								{source}
							</button>
						))}
					</div>

					<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111]">
						<QuickTooltip content="Grid View">
							<button
								onClick={() => setViewMode("grid")}
								className={`p-2 transition-colors ${viewMode === "grid" ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`}
							>
								<Grid className="w-4 h-4" />
							</button>
						</QuickTooltip>
						<QuickTooltip content="List View">
							<button
								onClick={() => setViewMode("list")}
								className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`}
							>
								<List className="w-4 h-4" />
							</button>
						</QuickTooltip>
					</div>
				</div>

				<div className="flex-1 overflow-hidden relative border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111]">
					<div className="h-full overflow-y-auto p-4">
						{viewMode === "grid" ? (
							<div className="grid grid-cols-6 gap-2">
								{results.map((r) => {
									const isAgg = r.text === "Σ TOTAL";
									const isSelected =
										selectedEmoji === r.text ||
										(!selectedEmoji && isAgg && details?.emoji === "Σ TOTAL");
									return (
										<button
											key={r.text}
											onClick={() => {
												setSelectedEmoji(r.text);
												onSelectEmoji(r.text);
											}}
											className={`aspect-square flex flex-col items-center justify-center border-2 transition-all ${
												isSelected
													? "bg-[#0055A4] border-[#111] text-white"
													: isAgg
														? "bg-white dark:bg-[#111] border-[#0055A4] text-[#0055A4] hover:bg-[#0055A4]/10"
														: "border-[#f0f0f0] dark:border-[#333] hover:border-[#111] dark:hover:border-[#EAE8E3] hover:bg-[#f9f9f9] dark:hover:bg-[#1A1A1A]"
											}`}
										>
											<span
												className={`${isAgg ? "text-lg font-black" : "text-3xl"} leading-none`}
											>
												{isAgg ? "Σ" : r.text}
											</span>
											{isAgg && (
												<span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">
													TOTAL
												</span>
											)}
											<span
												className={`text-[9px] font-bold mt-1 ${isSelected || isAgg ? "opacity-100" : "opacity-60"}`}
											>
												{r.count.toLocaleString()}
											</span>
										</button>
									);
								})}
							</div>
						) : (
							<div className="space-y-1">
								{results.map((r) => {
									const isAgg = r.text === "Σ TOTAL";
									const maxCount = results[1]?.count || results[0]?.count || 1;
									const width = isAgg ? 100 : (r.count / maxCount) * 100;
									const isSelected =
										selectedEmoji === r.text ||
										(!selectedEmoji && isAgg && details?.emoji === "Σ TOTAL");

									return (
										<button
											key={r.text}
											onClick={() => {
												setSelectedEmoji(r.text);
												onSelectEmoji(r.text);
											}}
											className={`w-full text-left group relative p-2 transition-all border-b border-[#111] dark:border-[#EAE8E3] last:border-0 ${
												isSelected
													? isAgg
														? "bg-[#0055A4] text-white"
														: "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
													: isAgg
														? "bg-white dark:bg-[#111] border-l-4 border-l-[#0055A4] text-[#0055A4] hover:bg-[#0055A4]/10"
														: "hover:bg-[#f5f5f5] dark:hover:bg-[#1A1A1A]"
											}`}
										>
											<div className="flex justify-between items-center relative z-10">
												<div className="flex items-center gap-3">
													<span className="text-xl">
														{isAgg ? "Σ" : r.text}
													</span>
													<span
														className={`font-bold ${isAgg ? "text-[10px] tracking-widest uppercase italic" : "text-sm"}`}
													>
														{isAgg ? "TOTAL TREND" : `Emoji ${r.text}`}
													</span>
												</div>
												<span
													className={`font-mono text-xs ${isSelected || isAgg ? "opacity-100" : "opacity-60"}`}
												>
													{r.count.toLocaleString()}
												</span>
											</div>
											{!isAgg && (
												<div
													className="absolute bottom-0 left-0 h-[2px] bg-[#0055A4] opacity-30 transition-all group-hover:opacity-100"
													style={{ width: `${width}%` }}
												/>
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="col-span-5 flex flex-col h-[600px] gap-6">
				<div className="h-[370px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#0055A4]">
					<div className="flex items-center gap-2 mb-4">
						<BarChart3 className="w-5 h-5 text-[#0055A4]" />
						<h3 className="text-sm font-bold uppercase tracking-widest">
							Temporal Distribution
						</h3>
					</div>
					{details && details.emoji ? (
						<div className="h-full pb-10">
							<div className="mb-2 flex items-center h-10 overflow-hidden border-b-2 border-[#111] dark:border-[#EAE8E3]">
								<span className="text-2xl leading-none">{details.emoji}</span>
							</div>
							<ReactECharts
								option={timelineOption}
								style={{ height: "100%", width: "100%" }}
							/>
						</div>
					) : (
						<div className="h-full flex items-center justify-center text-[10px] uppercase font-bold text-[#888]">
							Select an emoji
						</div>
					)}
				</div>

				<div className="h-[206px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
					<div className="flex items-center gap-2 mb-4">
						<Users className="w-5 h-5 text-[#0055A4]" />
						<h3 className="text-sm font-bold uppercase tracking-widest">
							Heavy Users
						</h3>
					</div>
					<div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
						{details && details.participants ? (
							details.participants.map((p: any) => {
								const max = details.participants[0].count;
								const width = (p.count / max) * 100;
								return (
									<div key={p.name}>
										<div className="flex justify-between text-xs font-bold mb-1">
											<span>{p.name}</span>
											<span>{p.count.toLocaleString()}</span>
										</div>
										<div className="h-4 bg-[#f0f0f0] dark:bg-[#222] border border-[#111] dark:border-[#EAE8E3]">
											<div
												className="h-full bg-[#0055A4]"
												style={{ width: `${width}%` }}
											/>
										</div>
									</div>
								);
							})
						) : (
							<div className="h-full flex items-center justify-center text-[10px] uppercase font-bold text-[#888]">
								No selection
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
