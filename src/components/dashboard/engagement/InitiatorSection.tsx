"use client";

import ReactECharts from "echarts-for-react";
import { Flag, Moon, Sun } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useChatStore } from "../../../store";
import { InfoTooltip } from "../InfoTooltip";

interface InitiatorSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: engagement data is dynamically shaped
	data: any;
}

const CHART_BASE = {
	tooltip: {
		trigger: "axis" as const,
		backgroundColor: "transparent",
		borderWidth: 0,
		padding: 0,
		// biome-ignore lint/suspicious/noExplicitAny: ECharts formatter callback
		formatter: (params: any) => {
			const p = params[0];
			const total = params.reduce(
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
					<span style="color: #D93829; font-size: 13px; font-weight: 800; font-family: var(--font-outfit)">${total.toLocaleString()}</span>
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
};

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

const buildAreaSeries = (
	name: string,
	keys: string[],
	data: Record<string, Record<string, number>>,
	participant: string,
	color?: string,
	dashed?: boolean,
): object => ({
	name,
	type: "line",
	smooth: true,
	symbol: "none",
	lineStyle: {
		width: 1.5,
		type: dashed ? "dashed" : "solid",
		...(color ? { color } : {}),
	},
	areaStyle: { opacity: 0.07, ...(color ? { color } : {}) },
	...(color ? { color } : {}),
	data: keys.map((k) => data[k]?.[participant] ?? 0),
	emphasis: { focus: "series" as const },
});

export const InitiatorSection: React.FC<InitiatorSectionProps> = ({ data }) => {
	const [gran, setGran] = useState<"week" | "month" | "year">("month");
	const { morningStartHour, morningEndHour, nightStartHour, nightEndHour } =
		useChatStore();

	const participants = useMemo(() => {
		if (!data?.breakdown) return [];
		return Object.keys(data.breakdown).sort();
	}, [data]);

	const keys = useMemo(() => {
		if (!data?.trends?.[gran]?.initiators) return [];
		return Object.keys(data.trends[gran].initiators).sort();
	}, [data, gran]);

	// ── KPI totals ──────────────────────────────────────────────────────────────
	const totals = useMemo(() => {
		return participants.reduce(
			(acc, p) => {
				const b = data?.breakdown?.[p] || {};
				return {
					sessions: acc.sessions + (b.starts || 0),
					morning: acc.morning + (b.morningStarts || 0),
					night: acc.night + (b.nightEnds || 0),
				};
			},
			{ sessions: 0, morning: 0, night: 0 },
		);
	}, [data, participants]);

	// ── Chart options ────────────────────────────────────────────────────────────
	const startsOption = useMemo(() => {
		if (!keys.length) return {};
		const trendData = data.trends[gran];
		return {
			...CHART_BASE,
			legend: { ...CHART_BASE.legend, data: participants.map((p) => `${p}`) },
			xAxis: { ...CHART_BASE.xAxis, data: keys },
			series: participants.map((p) =>
				buildAreaSeries(p, keys, trendData.initiators, p),
			),
		};
	}, [data, gran, keys, participants]);

	const endsOption = useMemo(() => {
		if (!keys.length) return {};
		const trendData = data.trends[gran];
		return {
			...CHART_BASE,
			legend: { ...CHART_BASE.legend, data: participants.map((p) => `${p}`) },
			xAxis: { ...CHART_BASE.xAxis, data: keys },
			series: participants.map((p) =>
				buildAreaSeries(p, keys, trendData.closers, p),
			),
		};
	}, [data, gran, keys, participants]);

	return (
		<div className="grid grid-cols-12 gap-6">
			{/* ── KPI row ── */}
			<div className="col-span-12 grid grid-cols-3 gap-4">
				{[
					{
						label: "Total Sessions",
						value: totals.sessions.toLocaleString(),
						icon: Flag,
						color: "#D93829",
					},
					{
						label: "Morning Starts",
						value: totals.morning.toLocaleString(),
						icon: Sun,
						color: "#FFCC00",
						tooltip: `Conversations initiated between ${morningStartHour}:00 and ${morningEndHour}:00 following an overnight break.`,
					},
					{
						label: "Night Lasts",
						value: totals.night.toLocaleString(),
						icon: Moon,
						color: "#0055A4",
						tooltip: `Conversations concluded between ${nightStartHour}:00 and ${nightEndHour}:00 leading into an overnight break.`,
					},
				].map((kpi) => (
					<div
						key={kpi.label}
						className="bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] p-4 shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3]"
					>
						<div className="flex items-center gap-2 mb-1">
							<kpi.icon
								className="w-3.5 h-3.5 shrink-0"
								style={{ color: kpi.color }}
							/>
							<div className="text-[10px] uppercase font-bold text-[#888] flex items-center">
								{kpi.label}
								{kpi.tooltip && <InfoTooltip content={kpi.tooltip} />}
							</div>
						</div>
						<div className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
							{kpi.value}
						</div>
					</div>
				))}
			</div>

			{/* ── Breakdown card ── */}
			<div className="col-span-4 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3]">
				<div className="text-[10px] uppercase font-bold text-[#888] mb-4 pb-2 border-b-2 border-[#111] dark:border-[#EAE8E3]">
					By Participant
				</div>
				<div className="space-y-5 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
					{participants.map((p) => {
						const b = data?.breakdown?.[p] || {};
						const maxVal = Math.max(
							...participants.map((n) =>
								Math.max(
									data?.breakdown?.[n]?.starts || 0,
									data?.breakdown?.[n]?.ends || 0,
								),
							),
							1,
						);
						const wStarts = ((b.starts || 0) / maxVal) * 100;
						const wEnds = ((b.ends || 0) / maxVal) * 100;

						return (
							<div key={p} className="space-y-2">
								{/* Name row */}
								<div className="text-xs font-bold uppercase tracking-tight">
									{p}
								</div>

								{/* Starts bar */}
								<div className="space-y-0.5">
									<div className="flex justify-between text-[10px] font-bold text-[#888]">
										<span className="flex items-center gap-1">
											<Flag className="w-2.5 h-2.5 text-[#D93829]" /> Starts
										</span>
										<span>{b.starts ?? "—"}</span>
									</div>
									<div className="h-2 bg-[#F0F0F0] dark:bg-[#1A1A1A] border border-[#DDD] dark:border-[#333] overflow-hidden">
										<div
											className="h-full bg-[#D93829] transition-all duration-700"
											style={{ width: `${wStarts}%` }}
										/>
									</div>
								</div>

								{/* Ends bar */}
								<div className="space-y-0.5">
									<div className="flex justify-between text-[10px] font-bold text-[#888]">
										<span>Ends</span>
										<span>{b.ends ?? "—"}</span>
									</div>
									<div className="h-2 bg-[#F0F0F0] dark:bg-[#1A1A1A] border border-[#DDD] dark:border-[#333] overflow-hidden">
										<div
											className="h-full bg-[#111] dark:bg-[#EAE8E3] transition-all duration-700"
											style={{ width: `${wEnds}%` }}
										/>
									</div>
								</div>

								{/* Morning / Night chips */}
								<div className="flex gap-3 pt-0.5">
									<span className="flex items-center gap-1 text-[10px] font-bold text-[#888]">
										<Sun className="w-2.5 h-2.5 text-[#FFCC00]" />
										{b.morningStarts ?? 0}
									</span>
									<span className="flex items-center gap-1 text-[10px] font-bold text-[#888]">
										<Moon className="w-2.5 h-2.5 text-[#0055A4]" />
										{b.nightEnds ?? 0}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* ── Charts stacked ── */}
			<div className="col-span-8 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] shadow-[8px_8px_0px_0px_#D93829] flex flex-col overflow-hidden">
				{/* Shared header */}
				<div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#EAE8E3] dark:border-[#333]">
					<div className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
						Starts &amp; Ends Over Time
					</div>
					<GranularityToggle value={gran} onChange={setGran} />
				</div>

				{/* Starts chart */}
				<div className="flex-1 min-h-0 flex flex-col">
					<div className="px-6 pt-3 pb-0 flex items-center gap-2">
						<div className="w-2 h-2 bg-[#D93829]" />
						<span className="text-[9px] font-black uppercase text-[#888]">
							Session Starts
						</span>
					</div>
					<div className="flex-1">
						<ReactECharts
							option={startsOption}
							style={{ height: "100%", minHeight: 200, width: "100%" }}
							notMerge={true}
						/>
					</div>
				</div>

				{/* Divider */}
				<div className="mx-6 border-t border-dashed border-[#DDD] dark:border-[#333]" />

				{/* Ends chart */}
				<div className="flex-1 min-h-0 flex flex-col">
					<div className="px-6 pt-3 pb-0 flex items-center gap-2">
						<div className="w-2 h-2 bg-[#111] dark:bg-[#EAE8E3]" />
						<span className="text-[9px] font-black uppercase text-[#888]">
							Session Ends
						</span>
					</div>
					<div className="flex-1">
						<ReactECharts
							option={endsOption}
							style={{ height: "100%", minHeight: 200, width: "100%" }}
							notMerge={true}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
