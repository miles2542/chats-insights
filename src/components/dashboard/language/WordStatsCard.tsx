"use client";

import ReactECharts from "echarts-for-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "echarts-wordcloud";
import {
	BarChart3,
	ChevronDown,
	ChevronUp,
	Cloud,
	List,
	Maximize2,
	Regex,
	Search,
	Type,
	Users,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { QuickTooltip } from "./QuickTooltip";

interface WordStatsCardProps {
	kpis: any | null;
	results: { text: string; count: number }[];
	details: any;
	onSearch: (
		query: string,
		isRegex: boolean,
		isCaseSensitive: boolean,
		minLen: number,
	) => void;
	onSelectWord: (word: string) => void;
	error: string | null;
}

export const WordStatsCard: React.FC<WordStatsCardProps> = ({
	kpis,
	results,
	details,
	onSearch,
	onSelectWord,
	error,
}) => {
	const [query, setQuery] = useState("");
	const [isRegex, setIsRegex] = useState(false);
	const [isCaseSensitive, setIsCaseSensitive] = useState(false);
	const [minLen, setMinLen] = useState(1);
	const [viewMode, setViewMode] = useState<"list" | "cloud">("list");
	const [selectedWord, setSelectedWord] = useState<string | null>(null);

	// Zoom/Pan State
	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const isDragging = useRef(false);
	const lastPos = useRef({ x: 0, y: 0 });
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = setTimeout(() => {
			onSearch(query, isRegex, isCaseSensitive, minLen);
		}, 300);
		return () => clearTimeout(handler);
	}, [query, isRegex, isCaseSensitive, minLen, onSearch]);

	const wordCloudOption = useMemo(() => {
		const cloudData = results.slice(0, 250).map((r) => ({
			name: r.text,
			// Log normalization + scaling
			value: Math.log2(r.count + 1) * 50,
		}));

		return {
			series: [
				{
					type: "wordCloud",
					shape: "circle",
					left: "center",
					top: "center",
					width: "100%",
					height: "100%",
					// Increased size range for higher native resolution
					sizeRange: [20, 140],
					rotationRange: [0, 0],
					gridSize: 2,
					drawOutOfBound: true,
					layoutAnimation: true,
					textStyle: {
						fontFamily: "var(--font-outfit)",
						fontWeight: "bold",
						color: () => {
							const colors = ["#111111", "#D93829", "#0055A4", "#FFCC00"];
							return colors[Math.floor(Math.random() * colors.length)];
						},
					},
					emphasis: {
						focus: "self",
						textStyle: { textShadowBlur: 10, textShadowColor: "#333" },
					},
					data: cloudData,
				},
			],
		};
	}, [results]);

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
				axisTick: { alignWithLabel: true },
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
						color: (p: any) => (p.value === 0.05 ? "#f5f5f5" : "#D93829"),
					},
					barMaxWidth: 10,
				},
			],
		};
	}, [details]);

	const onChartClick = (params: any) => {
		if (params.seriesType === "wordCloud") {
			onSelectWord(params.name);
			setSelectedWord(params.name);
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (viewMode !== "cloud") return;
		isDragging.current = true;
		lastPos.current = { x: e.clientX, y: e.clientY };
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging.current) return;
		const dx = (e.clientX - lastPos.current.x) / zoom;
		const dy = (e.clientY - lastPos.current.y) / zoom;
		setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
		lastPos.current = { x: e.clientX, y: e.clientY };
	};

	const handleMouseUp = () => {
		isDragging.current = false;
	};

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleNativeWheel = (e: WheelEvent) => {
			if (viewMode !== "cloud") return;
			e.preventDefault();
			const delta = e.deltaY > 0 ? -0.1 : 0.1;
			setZoom((prev) => Math.max(0.5, Math.min(5, prev + delta)));
		};

		container.addEventListener("wheel", handleNativeWheel, { passive: false });
		return () => container.removeEventListener("wheel", handleNativeWheel);
	}, [viewMode]);

	const resetZoom = () => {
		setZoom(1);
		setOffset({ x: 0, y: 0 });
	};

	return (
		<div className="col-span-12 grid grid-cols-12 gap-6">
			<div className="col-span-12 grid grid-cols-5 gap-4">
				{[
					{
						label: "Total Words",
						value: kpis?.totalWords.toLocaleString() || "...",
					},
					{
						label: "Unique Words",
						value: kpis?.uniqueWords.toLocaleString() || "...",
					},
					{
						label: "Lexical Richness",
						value: kpis ? `${kpis.lexicalRichness.toFixed(1)}%` : "...",
					},
					{
						label: "Avg Word Length",
						value: kpis?.avgWordLength.toFixed(1) || "...",
					},
					{
						label: "Most Verbose Day",
						value: kpis?.mostVerboseDay.day || "...",
					},
				].map((kpi) => (
					<div
						key={kpi.label}
						className="bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] p-4 shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3]"
					>
						<div className="text-[10px] uppercase font-bold text-[#888] mb-1">
							{kpi.label}
						</div>
						<div className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
							{kpi.value}
						</div>
					</div>
				))}
			</div>

			<div className="col-span-7 bg-[#EAE8E3] dark:bg-[#1A1A1A] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] flex flex-col h-[600px]">
				<div className="flex items-center gap-4 mb-6">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
						<input
							type="text"
							placeholder="Search words..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] pl-10 pr-4 py-2 text-sm font-bold focus:outline-none"
						/>
					</div>

					<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111]">
						<QuickTooltip content="Regex Mode">
							<button
								onClick={() => setIsRegex(!isRegex)}
								className={`p-2 transition-colors ${isRegex ? "bg-[#D93829] text-white" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`}
							>
								<Regex className="w-4 h-4" />
							</button>
						</QuickTooltip>
						<QuickTooltip content="Case Sensitive">
							<button
								onClick={() => setIsCaseSensitive(!isCaseSensitive)}
								disabled={isRegex}
								className={`p-2 transition-colors ${isCaseSensitive ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"} disabled:opacity-30`}
							>
								<Type className="w-4 h-4" />
							</button>
						</QuickTooltip>
					</div>

					<div className="flex items-center border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] px-1 relative group">
						<div className="px-2 text-[10px] font-black tracking-widest text-[#888] group-hover:text-[#111] transition-colors">
							LEN
						</div>
						<div className="flex flex-col border-l-2 border-[#111] dark:border-[#EAE8E3]">
							<button
								onClick={() => setMinLen(Math.min(50, minLen + 1))}
								className="p-0.5 hover:bg-[#f0f0f0] dark:hover:bg-[#222] border-b border-[#111] dark:border-[#EAE8E3]"
							>
								<ChevronUp className="w-2.5 h-2.5" />
							</button>
							<button
								onClick={() => setMinLen(Math.max(1, minLen - 1))}
								className="p-0.5 hover:bg-[#f0f0f0] dark:hover:bg-[#222]"
							>
								<ChevronDown className="w-2.5 h-2.5" />
							</button>
						</div>
						<div className="px-3 min-w-[3rem] text-center font-bold text-sm text-[#D93829] tabular-nums">
							{minLen}
						</div>
						<QuickTooltip content="Minimum Letter Count Filter">
							<div className="absolute inset-0 z-10" />
						</QuickTooltip>
					</div>

					<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111]">
						<QuickTooltip content="List View">
							<button
								onClick={() => setViewMode("list")}
								className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`}
							>
								<List className="w-4 h-4" />
							</button>
						</QuickTooltip>
						<QuickTooltip content="Word Cloud">
							<button
								onClick={() => setViewMode("cloud")}
								className={`p-2 transition-colors ${viewMode === "cloud" ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`}
							>
								<Cloud className="w-4 h-4" />
							</button>
						</QuickTooltip>
					</div>
				</div>

				{error && (
					<div className="mb-4 text-[10px] uppercase font-bold text-[#D93829] bg-red-100 dark:bg-red-900/30 p-2 border-l-4 border-[#D93829]">
						{error}
					</div>
				)}

				<div className="flex-1 overflow-hidden relative border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111]">
					{viewMode === "list" ? (
						<div className="h-full overflow-y-auto p-2 space-y-1">
							{results.map((r) => {
								const isAgg = r.text === "Σ TOTAL";
								const maxCount = results[1]?.count || results[0]?.count || 1;
								const width = isAgg ? 100 : (r.count / maxCount) * 100;
								const isSelected =
									selectedWord === r.text ||
									(!selectedWord && isAgg && details?.word === "Σ TOTAL");

								return (
									<button
										key={r.text}
										onClick={() => {
											setSelectedWord(r.text);
											onSelectWord(r.text);
										}}
										className={`w-full text-left group relative p-2 transition-all border-b border-[#111] dark:border-[#EAE8E3] last:border-0 ${
											isSelected
												? isAgg
													? "bg-[#D93829] text-white"
													: "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
												: isAgg
													? "bg-white dark:bg-[#111] border-l-4 border-l-[#D93829] text-[#D93829] hover:bg-[#D93829]/10"
													: "hover:bg-[#f5f5f5] dark:hover:bg-[#1A1A1A]"
										}`}
									>
										<div className="flex justify-between items-center relative z-10">
											<span
												className={`font-bold ${isAgg ? "text-[10px] tracking-widest uppercase italic" : "text-sm"}`}
											>
												{isAgg ? "Σ TOTAL" : r.text}
											</span>
											<span
												className={`font-mono text-xs ${isSelected ? "opacity-100" : "opacity-60"}`}
											>
												{r.count.toLocaleString()}
											</span>
										</div>
										{!isAgg && (
											<div
												className="absolute bottom-0 left-0 h-[2px] bg-[#D93829] opacity-30 transition-all group-hover:opacity-100"
												style={{ width: `${width}%` }}
											/>
										)}
									</button>
								);
							})}
						</div>
					) : (
						<div
							ref={containerRef}
							className="h-full w-full relative group cursor-grab active:cursor-grabbing overflow-hidden"
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
						>
							{/* High-Resolution Canvas Emulation */}
							<div
								className="absolute inset-[-100%] flex items-center justify-center transition-transform duration-100 ease-out will-change-transform"
								style={{
									transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
									transformOrigin: "center",
								}}
							>
								<div className="w-[100%] h-[100%]">
									<ReactECharts
										option={wordCloudOption}
										style={{ height: "100%", width: "100%" }}
										onEvents={{ click: onChartClick }}
										opts={{ devicePixelRatio: 3 }} // Force high density rendering
									/>
								</div>
							</div>

							{/* Cloud Controls Overlay */}
							<div className="absolute bottom-4 right-4 flex flex-col border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] shadow-[2px_2px_0px_0px_#111]">
								<button
									onClick={() => setZoom((prev) => Math.min(5, prev + 0.2))}
									className="p-2 hover:bg-[#f0f0f0] dark:hover:bg-[#222] border-b-2 border-[#111] dark:border-[#EAE8E3]"
								>
									<ZoomIn className="w-4 h-4" />
								</button>
								<button
									onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.2))}
									className="p-2 hover:bg-[#f0f0f0] dark:hover:bg-[#222] border-b-2 border-[#111] dark:border-[#EAE8E3]"
								>
									<ZoomOut className="w-4 h-4" />
								</button>
								<button
									onClick={resetZoom}
									className="p-2 hover:bg-[#f0f0f0] dark:hover:bg-[#222]"
								>
									<Maximize2 className="w-4 h-4" />
								</button>
							</div>

							<div className="absolute top-4 left-4 bg-[#111] text-white px-2 py-1 text-[8px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
								Hold to Pan • Scroll to Zoom
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="col-span-5 flex flex-col h-[600px] gap-6">
				<div className="h-[370px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#D93829]">
					<div className="flex items-center gap-2 mb-4">
						<BarChart3 className="w-5 h-5 text-[#D93829]" />
						<h3 className="text-sm font-bold uppercase tracking-widest">
							Usage Over Time
						</h3>
					</div>
					{details && details.word ? (
						<div className="h-full pb-10">
							<div className="mb-2 text-lg font-bold border-b-2 border-[#111] dark:border-[#EAE8E3] inline-block">
								{details.word}
							</div>
							<ReactECharts
								option={timelineOption}
								style={{ height: "100%", width: "100%" }}
							/>
						</div>
					) : (
						<div className="h-full flex items-center justify-center text-[10px] uppercase font-bold text-[#888]">
							Select a word
						</div>
					)}
				</div>

				<div className="h-[206px] bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
					<div className="flex items-center gap-2 mb-4">
						<Users className="w-5 h-5 text-[#D93829]" />
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
												className="h-full bg-[#111] dark:bg-[#EAE8E3]"
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
