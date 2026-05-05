"use client";

import ReactECharts from "echarts-for-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { NormalizedMessage } from "../../lib/parsers/types";
import { getSystemOffset } from "../../lib/utils/time";
import type { ActivityResponse } from "../../workers/activity-worker";
import { ChartContainer } from "./ChartContainer";

interface ActivityHeatmapProps {
	messages?: NormalizedMessage[];
	timezoneOffset: number;
	selectedParticipants?: string[];
	timeRange?: [Date | null, Date | null];
	precomputedData?: ActivityResponse | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`);

const ActivityHeatmap = ({
	messages = [],
	timezoneOffset,
	selectedParticipants = [],
	timeRange = [null, null],
	precomputedData = null,
}: ActivityHeatmapProps) => {
	const [view, setView] = useState<"heatmap" | "split">("split");
	const [workerData, setWorkerData] = useState<ActivityResponse | null>(null);
	const [loading, setLoading] = useState(false);

	const data = precomputedData || workerData;

	useEffect(() => {
		if (precomputedData !== null) return; // Don't run worker if we have precomputed data

		if (messages.length === 0 || selectedParticipants.length === 0) {
			setWorkerData(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const worker = new Worker(
			new URL("../../workers/activity-worker.ts", import.meta.url),
		);

		worker.onmessage = (event: MessageEvent<ActivityResponse>) => {
			setWorkerData(event.data);
			setLoading(false);
			worker.terminate();
		};

		// Pass RAW messages and filters. Worker handles filtering.
		worker.postMessage({
			messages: messages.map((m) => ({
				timestampMs: m.timestampMs,
				senderName: m.senderName,
			})),
			timezoneOffset,
			systemOffset: getSystemOffset(),
			selectedParticipants,
			timeRange: [
				timeRange[0]?.getTime() || null,
				timeRange[1]?.getTime() || null,
			],
		});

		return () => worker.terminate();
	}, [
		messages,
		timezoneOffset,
		selectedParticipants,
		timeRange,
		precomputedData,
	]);

	const renderBreakdownTooltip = (
		title: string,
		count: number,
		senders: Record<string, number>,
	) => {
		const sortedSenders = Object.entries(senders || {}).sort(
			(a, b) => b[1] - a[1],
		);
		const top3 = sortedSenders.slice(0, 3);
		const others = sortedSenders.slice(3);

		let html = `<div style="font-family: var(--font-outfit); min-width: 140px;">`;
		html += `<div style="border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
			<span style="font-size: 9px; color: #888; text-transform: uppercase;">${title}</span>
			<span style="font-size: 14px; color: #D93829;">${count.toLocaleString()}</span>
		</div>`;

		top3.forEach(([name, val]) => {
			html += `<div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px;">
				<span style="color: #444;">${name}</span>
				<span>${val.toLocaleString()}</span>
			</div>`;
		});

		if (others.length > 0) {
			const otherCount = others.reduce((acc, curr) => acc + curr[1], 0);
			html += `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ddd; font-size: 9px; color: #888;">
				...and ${others.length} more: ${otherCount.toLocaleString()}
			</div>`;
		}
		html += `</div>`;
		return html;
	};

	const heatmapOption = useMemo(() => {
		if (!data) return {};
		return {
			tooltip: {
				position: "top",
				backgroundColor: "rgba(255, 255, 255, 0.95)",
				borderColor: "#111",
				borderWidth: 1,
				borderRadius: 0,
				textStyle: { color: "#111", fontSize: 11, fontWeight: "bold" },
				formatter: (params: any) => {
					if (!params.data || !data) return "";
					const [h, d, count] = params.data;
					const key = `${d}-${h}`;
					const senders = data.slotDetails?.[key] || {};
					return renderBreakdownTooltip(`${DAYS[d]} @ ${h}:00`, count, senders);
				},
			},
			grid: {
				height: "75%",
				top: "10%",
				bottom: "10%",
				left: "6%",
				right: "8%",
			},
			xAxis: {
				type: "category",
				data: HOURS,
				splitArea: { show: false },
				splitLine: {
					show: true,
					lineStyle: { color: "rgba(0,0,0,0.05)", width: 0.5 },
				},
				axisLine: { lineStyle: { color: "#333" } },
				axisLabel: { color: "#888", fontSize: 9, interval: 0 },
			},
			yAxis: {
				type: "category",
				data: DAYS,
				splitArea: { show: false },
				splitLine: {
					show: true,
					lineStyle: { color: "rgba(0,0,0,0.05)", width: 0.5 },
				},
				axisLine: { lineStyle: { color: "#333" } },
				axisLabel: { color: "#888", fontSize: 9 },
			},
			visualMap: {
				type: "continuous",
				min: 1,
				max: Math.max(...(data.heatmapData?.map((d) => d[2]) || [1]), 1),
				seriesIndex: [1],
				calculable: true,
				orient: "vertical",
				right: "1%",
				top: "middle",
				itemHeight: 200,
				inRange: {
					color: ["#FFFDE7", "#FFD54F", "#D93829", "#111111"],
				},
				textStyle: { color: "#888", fontSize: 9, fontWeight: "bold" },
			},
			series: [
				{
					name: "Grid Base",
					type: "scatter",
					coordinateSystem: "cartesian2d",
					symbol: "rect",
					symbolSize: () => ["99%", "99%"],
					data: data.heatmapData?.map((d) => [d[0], d[1], 0]) || [],
					z: 1,
					itemStyle: { color: "#ffffff" },
					tooltip: { show: true },
				},
				{
					name: "Activity",
					type: "heatmap",
					data: (data.heatmapData || []).map((d) => [
						d[0],
						d[1],
						d[2] === 0 ? null : d[2],
					]),
					label: { show: false },
					itemStyle: {},
					emphasis: {
						itemStyle: {
							shadowBlur: 10,
							shadowColor: "rgba(0, 0, 0, 0.5)",
							borderColor: "#111",
							borderWidth: 1,
						},
					},
					z: 2,
				},
			],
		};
	}, [data]);

	const splitOption = useMemo(() => {
		if (!data) return {};
		return {
			tooltip: {
				trigger: "axis",
				backgroundColor: "rgba(255, 255, 255, 0.95)",
				borderColor: "#111",
				borderWidth: 1,
				borderRadius: 0,
				textStyle: { color: "#111", fontSize: 11, fontWeight: "bold" },
				formatter: (params: any) => {
					if (!params.length || !data) return "";
					const p = params[0];
					const idx = p.dataIndex;
					const count = p.value;
					const isWeekday = p.seriesName === "By Weekday";
					const title = isWeekday ? DAYS[idx] : HOURS[idx];
					const senders = isWeekday
						? data.weekdayDetails?.[idx] || {}
						: data.hourDetails?.[idx] || {};

					return renderBreakdownTooltip(title, count, senders);
				},
			},
			grid: [
				{ top: "10%", height: "35%", left: "6%", right: "6%" },
				{ top: "55%", height: "35%", left: "6%", right: "6%" },
			],
			xAxis: [
				{
					type: "category",
					data: DAYS,
					gridIndex: 0,
					axisLine: { lineStyle: { color: "#333" } },
					axisLabel: { color: "#888", fontSize: 9 },
				},
				{
					type: "category",
					data: HOURS,
					gridIndex: 1,
					axisLine: { lineStyle: { color: "#333" } },
					axisLabel: { color: "#888", fontSize: 9 },
				},
			],
			yAxis: [
				{
					type: "value",
					gridIndex: 0,
					splitLine: { lineStyle: { type: "dashed" } },
					axisLabel: { color: "#888", fontSize: 9 },
				},
				{
					type: "value",
					gridIndex: 1,
					splitLine: { lineStyle: { type: "dashed" } },
					axisLabel: { color: "#888", fontSize: 9 },
				},
			],
			series: [
				{
					name: "By Weekday",
					type: "bar",
					xAxisIndex: 0,
					yAxisIndex: 0,
					data: data.weekdayData || [],
					itemStyle: { color: "#D93829" },
				},
				{
					name: "By Hour",
					type: "bar",
					xAxisIndex: 1,
					yAxisIndex: 1,
					data: data.hourData || [],
					itemStyle: { color: "#0055A4" },
				},
			],
		};
	}, [data]);

	if (!data && !loading && precomputedData === null) return null;

	return (
		<ChartContainer title="Activity Patterns" height="h-[420px]">
			<div className="absolute top-4 right-4 z-20 flex bg-[#F5F5F5] dark:bg-[#111] border border-[#EAE8E3] dark:border-[#333] p-0.5">
				{(["heatmap", "split"] as const).map((v) => (
					<button
						type="button"
						key={v}
						disabled={loading && precomputedData === null}
						onClick={() => setView(v)}
						className={`px-3 py-1 text-[9px] uppercase font-bold transition-colors ${view === v ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "text-[#888] hover:text-[#111] dark:hover:text-white disabled:opacity-50"}`}
					>
						{v}
					</button>
				))}
			</div>
			<div className="flex-1 w-full h-full pt-4 relative">
				{loading && precomputedData === null && (
					<div className="absolute inset-0 z-30 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px]">
						<div className="flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-[#D93829] animate-bounce [animation-delay:-0.3s]" />
							<div className="w-1.5 h-1.5 bg-[#D93829] animate-bounce [animation-delay:-0.15s]" />
							<div className="w-1.5 h-1.5 bg-[#D93829] animate-bounce" />
						</div>
					</div>
				)}
				{data ? (
					<ReactECharts
						option={view === "heatmap" ? heatmapOption : splitOption}
						style={{ height: "100%", width: "100%" }}
						notMerge={true}
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#888]">
						No Data Available
					</div>
				)}
			</div>
		</ChartContainer>
	);
};

export default memo(ActivityHeatmap);
