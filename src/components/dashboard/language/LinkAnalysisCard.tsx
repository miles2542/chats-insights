"use client";

import ReactECharts from "echarts-for-react";
import {
	BarChart3,
	ExternalLink,
	Globe,
	Grid,
	Link2,
	List,
	Search,
	Users,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { QuickTooltip } from "./QuickTooltip";

interface LinkAnalysisCardProps {
	kpis: any | null;
	results: { text: string; count: number }[];
	details: any;
	onSelectLink: (domain: string) => void;
}

const Favicon = ({
	domain,
	size = "large",
}: {
	domain: string;
	size?: "small" | "large";
}) => {
	const [error, setError] = useState(false);
	const containerClasses =
		size === "large"
			? "w-10 h-10 flex-shrink-0 bg-transparent flex items-center justify-center overflow-hidden"
			: "w-6 h-6 flex-shrink-0 bg-transparent flex items-center justify-center overflow-hidden";

	const imgClasses = size === "large" ? "w-8 h-8" : "w-5 h-5";

	return (
		<div className={containerClasses}>
			{!error ? (
				<img
					src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
					alt={domain}
					className={`${imgClasses} object-contain`}
					onError={() => setError(true)}
				/>
			) : (
				<div
					className={`border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] flex items-center justify-center ${imgClasses}`}
				>
					<span className="text-[10px] font-black uppercase text-[#111] dark:text-[#EAE8E3]">
						{domain.charAt(0)}
					</span>
				</div>
			)}
		</div>
	);
};

export const LinkAnalysisCard: React.FC<LinkAnalysisCardProps> = ({
	kpis,
	results,
	details,
	onSelectLink,
}) => {
	const [query, setQuery] = useState("");
	const [selectedLink, setSelectedLink] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

	const filteredResults = useMemo(() => {
		return results.filter((r) =>
			r.text.toLowerCase().includes(query.toLowerCase()),
		);
	}, [results, query]);

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
						color: (p: any) => (p.value === 0.05 ? "#f5f5f5" : "#FFCC00"),
					},
					barMaxWidth: 10,
				},
			],
		};
	}, [details]);

	return (
		<div className="col-span-12 grid grid-cols-12 gap-6">
			<div className="col-span-7 bg-[#EAE8E3] dark:bg-[#1A1A1A] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] flex flex-col h-[600px]">
				<div className="flex items-center gap-4 mb-6">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
						<input
							type="text"
							placeholder="Search domains..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] pl-10 pr-4 py-2 text-sm font-bold focus:outline-none"
						/>
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
					<div className="h-full overflow-y-auto p-2">
						{viewMode === "list" ? (
							<div className="space-y-1">
								{filteredResults.map((r) => {
									const isAgg = r.text === "Σ TOTAL";
									const maxCount = results[1]?.count || results[0]?.count || 1;
									const width = isAgg ? 100 : (r.count / maxCount) * 100;
									const isSelected =
										selectedLink === r.text ||
										(!selectedLink && isAgg && details?.domain === "Σ TOTAL");

									return (
										<button
											key={r.text}
											onClick={() => {
												setSelectedLink(r.text);
												onSelectLink(r.text);
											}}
											className={`w-full text-left group relative p-2 transition-all flex items-center gap-3 border-b border-[#111] dark:border-[#EAE8E3] last:border-0 ${
												isSelected
													? isAgg
														? "bg-[#FFCC00] text-white"
														: "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
													: isAgg
														? "bg-white dark:bg-[#111] border-l-4 border-l-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00]/10"
														: "hover:bg-[#f5f5f5] dark:hover:bg-[#1A1A1A]"
											}`}
										>
											{isAgg ? (
												<div className="w-6 h-6 flex items-center justify-center font-black text-xs">
													Σ
												</div>
											) : (
												<Favicon domain={r.text} size="small" />
											)}
											<div className="flex-1 flex justify-between items-center relative z-10 overflow-hidden">
												<span
													className={`font-bold truncate pr-4 ${isAgg ? "text-[10px] tracking-widest uppercase italic" : "text-sm"}`}
												>
													{isAgg ? "Σ TOTAL" : r.text}
												</span>
												<span
													className={`font-mono text-xs ${isSelected || isAgg ? "opacity-100" : "opacity-60"}`}
												>
													{r.count.toLocaleString()}
												</span>
											</div>
											{!isAgg && (
												<div
													className="absolute bottom-0 left-0 h-[2px] bg-[#FFCC00] opacity-30 transition-all group-hover:opacity-100"
													style={{ width: `${width}%` }}
												/>
											)}
										</button>
									);
								})}
							</div>
						) : (
							<div className="grid grid-cols-3 gap-2 p-2">
								{filteredResults.map((r) => {
									const isAgg = r.text === "Σ TOTAL";
									const isSelected =
										selectedLink === r.text ||
										(!selectedLink && isAgg && details?.domain === "Σ TOTAL");
									return (
										<button
											key={r.text}
											onClick={() => {
												setSelectedLink(r.text);
												onSelectLink(r.text);
											}}
											className={`p-3 border-2 transition-all text-left flex flex-col gap-3 h-32 ${
												isSelected
													? "bg-[#FFCC00] border-[#111] text-white"
													: isAgg
														? "bg-white dark:bg-[#111] border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00]/10"
														: "border-[#f0f0f0] dark:border-[#222] hover:border-[#111] dark:hover:border-[#EAE8E3]"
											}`}
										>
											<div className="flex items-start justify-between">
												{isAgg ? (
													<div className="w-10 h-10 flex items-center justify-center text-2xl font-black">
														Σ
													</div>
												) : (
													<Favicon domain={r.text} />
												)}
												<div className="text-xl font-black">
													{r.count.toLocaleString()}
												</div>
											</div>
											<div
												className={`font-bold truncate opacity-60 uppercase leading-tight mt-auto ${isAgg ? "text-[8px] tracking-widest italic" : "text-[10px]"}`}
											>
												{isAgg ? "Σ TOTAL" : r.text}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="col-span-5 flex flex-col h-[600px] gap-6">
				<div className="h-[370px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#FFCC00]">
					<div className="flex items-center gap-2 mb-4">
						<BarChart3 className="w-5 h-5 text-[#FFCC00]" />
						<h3 className="text-sm font-bold uppercase tracking-widest">
							Shares over time
						</h3>
					</div>
					{details && details.domain ? (
						<div className="h-full pb-10">
							<div className="mb-2 flex items-center gap-3 border-b-2 border-[#111] dark:border-[#EAE8E3] pb-1">
								<Favicon domain={details.domain} size="small" />
								<div className="text-lg font-bold">{details.domain}</div>
							</div>
							<ReactECharts
								option={timelineOption}
								style={{ height: "100%", width: "100%" }}
							/>
						</div>
					) : (
						<div className="h-full flex items-center justify-center text-[10px] uppercase font-bold text-[#888]">
							Select a domain
						</div>
					)}
				</div>

				<div className="h-[206px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
					<div className="flex items-center gap-2 mb-4">
						<Users className="w-5 h-5 text-[#FFCC00]" />
						<h3 className="text-sm font-bold uppercase tracking-widest">
							Top Participants
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
												className="h-full bg-[#FFCC00]"
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

			<div className="col-span-12 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-4 shadow-[4px_4px_0px_0px_#111] flex items-center justify-between">
				<div className="flex items-center gap-8">
					<div>
						<span className="text-[10px] uppercase font-bold text-[#888] block">
							Total Links
						</span>
						<span className="text-2xl font-black">
							{kpis?.totalLinks.toLocaleString()}
						</span>
					</div>
					<div className="w-[1px] h-10 bg-[#eee]" />
					<div>
						<span className="text-[10px] uppercase font-bold text-[#888] block">
							Unique Domains
						</span>
						<span className="text-2xl font-black">
							{kpis?.uniqueDomains.toLocaleString()}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3 text-[#888]">
					<ExternalLink className="w-5 h-5" />
					<span className="text-[9px] uppercase font-bold max-w-[200px] leading-tight">
						Analyzing both explicit media shares and URLs found in message
						content.
					</span>
				</div>
			</div>
		</div>
	);
};
