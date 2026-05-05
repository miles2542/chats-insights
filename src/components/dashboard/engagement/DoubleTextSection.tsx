"use client";

import ReactECharts from "echarts-for-react";
import { MessageSquarePlus } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

interface DoubleTextSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: engagement data is dynamically shaped
	data: any;
}

const GranularityToggle = ({
	value,
	onChange,
}: {
	value: "week" | "month" | "year";
	onChange: (v: "week" | "month" | "year") => void;
}) => (
	<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] p-[2px] gap-[2px] bg-[#F5F5F5] dark:bg-[#1A1A1A]">
		{(["week", "month", "year"] as const).map((g) => (
			<button
				type="button"
				key={g}
				onClick={() => onChange(g)}
				className={`px-2 py-0.5 text-[9px] font-black uppercase transition-colors ${
					value === g
						? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
						: "text-[#888] hover:text-[#111] dark:hover:text-[#EAE8E3]"
				}`}
			>
				{g}
			</button>
		))}
	</div>
);

export const DoubleTextSection: React.FC<DoubleTextSectionProps> = ({
	data,
}) => {
	const [gran, setGran] = useState<"week" | "month" | "year">("month");

	const participants = useMemo(() => {
		if (!data?.breakdown) return [];
		return Object.keys(data.breakdown).sort();
	}, [data]);

	const total = useMemo(
		() => participants.reduce((acc, p) => acc + (data?.breakdown?.[p] || 0), 0),
		[data, participants],
	);

	const keys = useMemo(() => {
		if (!data?.trends?.[gran]) return [];
		return Object.keys(data.trends[gran]).sort();
	}, [data, gran]);

	const chartOption = useMemo(() => {
		if (!keys.length) return {};
		const trendData = data.trends[gran];
		return {
			tooltip: {
				trigger: "axis" as const,
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				// biome-ignore lint/suspicious/noExplicitAny: ECharts formatter callback
				formatter: (params: any) => {
					const p = params[0];
					const totalVal = params.reduce(
						(acc: number, s: any) => acc + (Number(s.value) || 0),
						0,
					);
					const maxVisible = 3;
					const visibleParams = params.slice(0, maxVisible);
					const hiddenParams = params.slice(maxVisible);
					const hiddenSum = hiddenParams.reduce(
						(acc: number, s: any) => acc + (Number(s.value) || 0),
						0,
					);

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
						<div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
							<span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit)">${p.name}</span>
							<span style="color: #D93829; font-size: 13px; font-weight: 800; font-family: var(--font-outfit)">${totalVal.toLocaleString()}</span>
						</div>
						<div style="display: flex; flex-direction: column; gap: 6px">`;

					visibleParams.forEach((s: any) => {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
							<div style="display: flex; align-items: center; gap: 6px">
								<div style="width: 8px; height: 8px; background: ${s.color}"></div>
								<span>${s.seriesName}</span>
							</div>
							<span>${s.value.toLocaleString()}</span>
						</div>`;
					});

					if (hiddenParams.length > 0) {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #888; font-family: var(--font-outfit); border-top: 1px dashed #DDD; padding-top: 4px; margin-top: 2px">
							<span>...and ${hiddenParams.length} more</span>
							<span>${hiddenSum.toLocaleString()}</span>
						</div>`;
					}

					html += `</div></div>`;
					return html;
				},
			},
			legend: {
				type: "scroll",
				top: 0,
				icon: "rect",
				itemWidth: 10,
				itemHeight: 10,
				textStyle: { fontWeight: "bold", fontSize: 10 },
			},
			grid: {
				left: "2%",
				right: "2%",
				bottom: "8%",
				top: "20%",
				containLabel: true,
			},
			xAxis: {
				type: "category" as const,
				boundaryGap: false,
				data: keys,
				axisLine: { lineStyle: { color: "#111", width: 2 } },
				axisLabel: { fontWeight: "bold", fontSize: 9, color: "#888" },
				axisTick: { show: false },
			},
			yAxis: {
				type: "value" as const,
				axisLine: { show: true, lineStyle: { color: "#111", width: 2 } },
				splitLine: { lineStyle: { type: "dashed" as const, color: "#e0e0e0" } },
				axisLabel: { fontWeight: "bold", fontSize: 9, color: "#888" },
			},
			series: participants.map((p) => ({
				name: p,
				type: "line",
				smooth: true,
				symbol: "none",
				lineStyle: { width: 1.5 },
				areaStyle: { opacity: 0.07 },
				data: keys.map((k) => trendData[k]?.[p] ?? 0),
				emphasis: { focus: "series" as const },
			})),
		};
	}, [data, gran, keys, participants]);

	return (
		<div className="grid grid-cols-12 gap-6">
			{/* ── Sidebar (Total + Breakdown) ── */}
			<div className="col-span-4 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
				{/* Total Section */}
				<div className="p-6 pb-4">
					<div className="flex items-center gap-2 mb-1">
						<MessageSquarePlus className="w-3.5 h-3.5 text-[#FFCC00]" />
						<div className="text-[10px] uppercase font-bold text-[#888]">
							Total Double Texts
						</div>
					</div>
					<div className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
						{total.toLocaleString()}
					</div>
				</div>

				<div className="mx-6 border-b-2 border-[#111] dark:border-[#EAE8E3] opacity-20" />

				{/* Breakdown Section */}
				<div className="p-6 pt-4">
					<div className="text-[10px] uppercase font-bold text-[#888] mb-4">
						By Participant
					</div>
					<div className="space-y-5 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
						{participants.map((p) => {
							const count = data?.breakdown?.[p] || 0;
							const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
							const max = Math.max(
								...participants.map((n) => data?.breakdown?.[n] || 1),
							);
							const width = (count / max) * 100;
							return (
								<div key={p} className="space-y-1.5">
									<div className="flex justify-between text-[10px] font-bold">
										<div className="flex items-baseline gap-2">
											<span className="text-xs font-bold uppercase tracking-tight">
												{p}
											</span>
											<span className="text-[10px] font-bold text-[#888]">
												{pct}%
											</span>
										</div>
										<span className="text-[#888]">
											{count.toLocaleString()}
										</span>
									</div>
									<div className="h-2 bg-[#F0F0F0] dark:bg-[#1A1A1A] border border-[#DDD] dark:border-[#333] overflow-hidden">
										<div
											className="h-full bg-[#FFCC00] transition-all duration-700"
											style={{ width: `${width}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* ── Chart ── */}
			<div className="col-span-8 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
				<div className="flex items-center justify-between mb-2">
					<div className="text-[10px] uppercase font-bold text-[#888]">
						Double Texts Over Time
					</div>
					<GranularityToggle value={gran} onChange={setGran} />
				</div>
				<div className="flex-1 min-h-[400px]">
					<ReactECharts
						option={chartOption}
						style={{ height: "100%", width: "100%" }}
						notMerge={true}
					/>
				</div>
			</div>
		</div>
	);
};
