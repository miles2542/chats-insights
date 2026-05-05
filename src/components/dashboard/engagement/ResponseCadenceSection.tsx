"use client";

import ReactECharts from "echarts-for-react";
import { Zap } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";

import { useChatStore } from "../../../store";

interface ResponseCadenceSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: engagement data is dynamically shaped
	data: any;
}

type TimeUnit = "seconds" | "minutes" | "hours";
type Granularity = "week" | "month" | "year";
type CadenceMode = "overall" | "chatting" | "pings";

const UNIT_DIVISORS: Record<TimeUnit, number> = {
	seconds: 1000,
	minutes: 60000,
	hours: 3600000,
};

const formatDuration = (ms: number): string => {
	if (ms <= 0) return "—";
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		const remMins = minutes % 60;
		return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
	}
	const days = Math.floor(hours / 24);
	const remHours = hours % 24;
	return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
};

const ModeToggle = ({
	value,
	onChange,
	threshold,
}: {
	value: CadenceMode;
	onChange: (v: CadenceMode) => void;
	threshold: number;
}) => (
	<div className="flex border-2 border-[#111] dark:border-[#EAE8E3] p-[2px] gap-[2px] bg-[#F5F5F5] dark:bg-[#1A1A1A] mb-4">
		{(["overall", "chatting", "pings"] as const).map((m) => {
			const label = m === "pings" ? "First response" : m;
			const tooltip =
				m === "overall"
					? `Every response within 10 days.`
					: m === "chatting"
						? `Responses within active chat flow (gap < ${threshold}m).`
						: `First response to start a new chat session (gap ≥ ${threshold}m, within 10 days).`;

			return (
				<button
					type="button"
					key={m}
					onClick={() => onChange(m)}
					title={tooltip}
					className={`flex-1 px-2 py-1.5 text-[9px] font-black uppercase transition-colors relative group ${
						value === m
							? "bg-[#0055A4] text-white"
							: "text-[#888] hover:text-[#111] dark:hover:text-[#EAE8E3]"
					}`}
				>
					{label}
					<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#111] text-white text-[8px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
						{tooltip}
					</div>
				</button>
			);
		})}
	</div>
);

const GranularityToggle = ({
	value,
	onChange,
}: {
	value: Granularity;
	onChange: (v: Granularity) => void;
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

const UnitToggle = ({
	value,
	onChange,
}: {
	value: TimeUnit;
	onChange: (v: TimeUnit) => void;
}) => (
	<div className="flex border-2 border-[#0055A4] p-[2px] gap-[2px]">
		{(["seconds", "minutes", "hours"] as const).map((u) => {
			const label = u === "hours" ? "hour" : u.slice(0, 3);
			return (
				<button
					type="button"
					key={u}
					onClick={() => onChange(u)}
					className={`px-2 py-0.5 text-[9px] font-black uppercase transition-colors ${
						value === u
							? "bg-[#0055A4] text-white"
							: "text-[#888] hover:text-[#0055A4]"
					}`}
				>
					{label}
				</button>
			);
		})}
	</div>
);

export const ResponseCadenceSection: React.FC<ResponseCadenceSectionProps> = ({
	data,
}) => {
	const [cdfUnit, setCdfUnit] = useState<TimeUnit>("seconds");
	const [gran, setGran] = useState<Granularity>("month");
	const [mode, setMode] = useState<CadenceMode>("overall");
	const { sessionGapThreshold, maxResponseGapThreshold } = useChatStore();

	const participants = useMemo(() => {
		if (!data?.[mode]?.raw) return [];
		return Object.keys(data[mode].raw).sort();
	}, [data, mode]);

	// ── CDF chart ───────────────────────────────────────────────────────────────
	const cdfOption = useMemo(() => {
		if (!data?.[mode]?.raw) return {};
		const divisor = UNIT_DIVISORS[cdfUnit];

		const series = participants.map((p) => {
			const raw: number[] = data[mode].raw[p] || [];
			if (!raw.length) return { name: p, type: "line", data: [] };

			const sorted = [...raw].sort((a, b) => a - b);
			const step = Math.max(1, Math.floor(sorted.length / 80));
			const cdfData = [];
			for (let i = 0; i < sorted.length; i += step) {
				cdfData.push([sorted[i] / divisor, ((i + 1) / sorted.length) * 100]);
			}
			cdfData.push([
				sorted[sorted.length - 1] / divisor,
				((sorted.length - 1 + 1) / sorted.length) * 100,
			]);

			return {
				name: p,
				type: "line" as const,
				showSymbol: false,
				data: cdfData,
				smooth: true,
				areaStyle: { opacity: 0.05 },
			};
		});

		return {
			tooltip: {
				trigger: "axis" as const,
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				// biome-ignore lint/suspicious/noExplicitAny: ECharts formatter callback
				formatter: (params: any) => {
					const x = params[0]?.value?.[0]?.toFixed(2) ?? "?";
					const maxVisible = 3;
					const visibleParams = params.slice(0, maxVisible);
					const hiddenParams = params.slice(maxVisible);
					const hiddenSum = hiddenParams.reduce(
						(acc: number, s: any) => acc + (s.value[1] || 0),
						0,
					);

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
						<div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
							<span style="color: #111; font-size: 11px; font-weight: 800; font-family: var(--font-outfit)">Respond within ${x} ${cdfUnit}</span>
						</div>
						<div style="display: flex; flex-direction: column; gap: 6px">`;

					visibleParams.forEach((s: any) => {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
							<div style="display: flex; align-items: center; gap: 6px">
								<div style="width: 8px; height: 8px; background: ${s.color}"></div>
								<span>${s.seriesName}</span>
							</div>
							<span>${s.value[1].toFixed(1)}%</span>
						</div>`;
					});

					if (hiddenParams.length > 0) {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #888; font-family: var(--font-outfit); border-top: 1px dashed #DDD; padding-top: 4px; margin-top: 2px">
							<span>...and ${hiddenParams.length} more</span>
							<span>${hiddenSum.toFixed(1)}%</span>
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
				right: "4%",
				bottom: "8%",
				top: "20%",
				containLabel: true,
			},
			xAxis: {
				type: "value" as const,
				max: cdfUnit === "seconds" ? 180 : cdfUnit === "minutes" ? 60 : 24,
				axisLine: { lineStyle: { color: "#111", width: 2 } },
				axisLabel: { fontWeight: "bold", fontSize: 9, color: "#888" },
				splitLine: { lineStyle: { type: "dashed" as const, color: "#e0e0e0" } },
			},
			yAxis: {
				type: "value" as const,
				max: 100,
				axisLine: { show: true, lineStyle: { color: "#111", width: 2 } },
				axisLabel: {
					fontWeight: "bold",
					fontSize: 9,
					color: "#888",
					formatter: "{value}%",
				},
				splitLine: { lineStyle: { type: "dashed" as const, color: "#e0e0e0" } },
			},
			series,
		};
	}, [data, mode, participants, cdfUnit]);

	// ── Median over time chart ───────────────────────────────────────────────────
	const medianTrendOption = useMemo(() => {
		if (!data?.[mode]?.trends?.[gran]) return {};
		const trendData = data[mode].trends[gran];
		const keys = Object.keys(trendData).sort();

		const series = participants.map((p) => ({
			name: p,
			type: "line" as const,
			showSymbol: false,
			data: keys.map((k) => trendData[k][p] || 0),
			smooth: true,
		}));

		return {
			tooltip: {
				trigger: "axis" as const,
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				// biome-ignore lint/suspicious/noExplicitAny: ECharts formatter callback
				formatter: (params: any) => {
					const maxVisible = 3;
					const visibleParams = params.slice(0, maxVisible);
					const hiddenParams = params.slice(maxVisible);
					const hiddenSum = hiddenParams.reduce(
						(acc: number, s: any) => acc + (s.value || 0),
						0,
					);

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
						<div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
							<span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit)">${params[0]?.name}</span>
						</div>
						<div style="display: flex; flex-direction: column; gap: 6px">`;

					visibleParams.forEach((s: any) => {
						const dur = s.value != null ? formatDuration(s.value) : "—";
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
							<div style="display: flex; align-items: center; gap: 6px">
								<div style="width: 8px; height: 8px; background: ${s.color}"></div>
								<span>${s.seriesName}</span>
							</div>
							<span>${dur}</span>
						</div>`;
					});

					if (hiddenParams.length > 0) {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #888; font-family: var(--font-outfit); border-top: 1px dashed #DDD; padding-top: 4px; margin-top: 2px">
							<span>...and ${hiddenParams.length} more</span>
							<span>${formatDuration(hiddenSum)}</span>
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
				axisLabel: {
					fontWeight: "bold",
					fontSize: 9,
					color: "#888",
					formatter: (v: number) => formatDuration(v),
				},
				splitLine: { lineStyle: { type: "dashed" as const, color: "#e0e0e0" } },
			},
			series,
		};
	}, [data, mode, participants, gran]);

	return (
		<div className="grid grid-cols-12 gap-6">
			{/* ── Sidebar (Median KPIs) ── */}
			<div className="col-span-4 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-6 shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col">
				<ModeToggle
					value={mode}
					onChange={setMode}
					threshold={sessionGapThreshold}
				/>

				<div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-[#111] dark:border-[#EAE8E3]">
					<Zap className="w-4 h-4 text-[#0055A4]" />
					<div className="text-[10px] uppercase font-bold text-[#888]">
						Median Response Time
					</div>
				</div>
				<div className="space-y-6 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
					{participants.map((p) => (
						<div key={p} className="space-y-1">
							<div className="text-xs font-bold uppercase tracking-tight text-[#888]">
								{p}
							</div>
							<div className="text-3xl font-bold font-[family-name:var(--font-outfit)] text-[#0055A4]">
								{formatDuration(data?.medians?.[mode]?.[p] || 0)}
							</div>
						</div>
					))}
				</div>
				<div className="mt-auto pt-6">
					<p className="text-[8px] font-bold text-[#AAA] uppercase leading-relaxed">
						{mode === "overall"
							? `Displaying interactions within ${maxResponseGapThreshold} days.`
							: mode === "chatting"
								? `Filtering for speed within active flow (< ${sessionGapThreshold}m gap).`
								: `Filtering for first response after a break (≥ ${sessionGapThreshold}m gap, max ${maxResponseGapThreshold} days).`}
					</p>
				</div>
			</div>

			{/* ── Charts Card (Stacked) ── */}
			<div className="col-span-8 bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] shadow-[8px_8px_0px_0px_#0055A4] flex flex-col overflow-hidden">
				{/* CDF Section (Top) */}
				<div className="flex-1 min-h-0 flex flex-col p-6 pb-2">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-[#0055A4]" />
							<span className="text-[10px] uppercase font-bold text-[#888]">
								Response Distribution (CDF)
							</span>
						</div>
						<UnitToggle value={cdfUnit} onChange={setCdfUnit} />
					</div>
					<div className="flex-1 min-h-[250px]">
						<ReactECharts
							option={cdfOption}
							style={{ height: "100%", width: "100%" }}
							notMerge={true}
						/>
					</div>
				</div>

				<div className="mx-6 border-t border-dashed border-[#DDD] dark:border-[#333]" />

				{/* Median Trend Section (Bottom) */}
				<div className="flex-1 min-h-0 flex flex-col p-6 pt-2">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-[#D93829]" />
							<span className="text-[10px] uppercase font-bold text-[#888]">
								Median Response Over Time
							</span>
						</div>
						<GranularityToggle value={gran} onChange={setGran} />
					</div>
					<div className="flex-1 min-h-[250px]">
						<ReactECharts
							option={medianTrendOption}
							style={{ height: "100%", width: "100%" }}
							notMerge={true}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
