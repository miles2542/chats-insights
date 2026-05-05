"use client";

import ReactECharts from "echarts-for-react";
import { memo, useEffect, useRef, useState } from "react";

interface TimelineProjectionProps {
	timelineData: {
		keys: string[];
		values: number[];
		details: Record<string, number>[];
	};
	granularity: "hour" | "day" | "week" | "month";
	setGranularity: (g: "hour" | "day" | "week" | "month") => void;
	colors: {
		primary: string;
		axis: string;
		label: string;
	};
	allowedGranularities?: ("hour" | "day" | "week" | "month")[];
}

const TimelineProjection = ({
	timelineData,
	granularity,
	setGranularity,
	colors,
	allowedGranularities = ["hour", "day", "week", "month"],
}: TimelineProjectionProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			if (entries[0].contentRect.width) {
				setContainerWidth(entries[0].contentRect.width);
			}
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	const numPoints = timelineData.keys.length;
	const approxBarWidth =
		containerWidth > 0 && numPoints > 0 ? (containerWidth - 80) / numPoints : 5;
	const tipHeight =
		granularity === "day"
			? Math.max(3, Math.min(approxBarWidth * 1.8, 10))
			: Math.max(2, Math.min(approxBarWidth * 1.3, 6));

	const option = {
		tooltip: {
			trigger: "axis",
			backgroundColor: "rgba(255, 255, 255, 0.95)",
			borderColor: "#111",
			borderWidth: 1,
			borderRadius: 0,
			textStyle: { color: "#111", fontSize: 11, fontWeight: "bold" },
			formatter: (params: any) => {
				const idx = params[0].dataIndex;
				const key = timelineData.keys[idx];
				const total = timelineData.values[idx];
				const senders = timelineData.details?.[idx] || {};

				const sortedSenders = Object.entries(
					senders as Record<string, number>,
				).sort((a, b) => b[1] - a[1]);
				const top3 = sortedSenders.slice(0, 3);
				const others = sortedSenders.slice(3);

				let html = `<div style="font-family: var(--font-outfit); letter-spacing: 0.5px; min-width: 120px;">`;
				html += `<div style="border-bottom: 1px solid #111; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
					<span style="font-size: 9px; color: #888; text-transform: uppercase;">${key}</span>
					<span style="font-size: 14px; color: ${colors.primary};">${total.toLocaleString()}</span>
				</div>`;

				top3.forEach(([name, count]) => {
					html += `<div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 2px;">
						<span style="color: #444;">${name}</span>
						<span>${count.toLocaleString()}</span>
					</div>`;
				});

				if (others.length > 0) {
					const otherCount = others.reduce((acc, curr) => acc + curr[1], 0);
					html += `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #ddd; font-size: 9px; color: #888;">
						...and ${others.length} more: ${otherCount.toLocaleString()} messages
					</div>`;
				}
				html += `</div>`;
				return html;
			},
		},
		animationDuration: 300,
		animationDurationUpdate: 300,
		animationEasing: "cubicOut",
		grid: { top: 20, right: 20, bottom: 40, left: 50 },
		dataZoom: [
			{ type: "inside", start: 0, end: 100 },
			{
				type: "slider",
				start: 0,
				end: 100,
				height: 20,
				bottom: 0,
				borderColor: "transparent",
				fillerColor: "rgba(217, 56, 41, 0.2)",
				handleStyle: { color: colors.primary },
			},
		],
		xAxis: {
			type: "category",
			data: timelineData.keys,
			axisLine: { lineStyle: { color: colors.axis } },
			axisLabel: { color: colors.label, fontSize: 10 },
		},
		yAxis: {
			type: "value",
			splitLine: { show: true, lineStyle: { color: "#eee", type: "dashed" } },
			axisLine: { lineStyle: { color: colors.axis } },
			axisLabel: { color: colors.label, fontSize: 10 },
		},
		series: [
			{
				name: "Messages",
				type: "bar",
				data: timelineData.values,
				barCategoryGap: "0%",
				itemStyle: {
					color:
						granularity === "hour"
							? "rgba(217, 56, 41, 0.15)"
							: "rgba(217, 56, 41, 0.3)",
				},
				z: 1,
				large: true,
				silent: true,
			},
			{
				name: "Tips",
				type: granularity === "hour" ? "scatter" : "pictorialBar",
				data: timelineData.values,
				symbol: "rect",
				symbolSize: (val: any) => {
					const isZero = val === 0;
					if (granularity === "hour") {
						return [Math.max(1, approxBarWidth), isZero ? 1 : 1.5];
					}
					return ["100%", isZero ? 2 : tipHeight];
				},
				symbolPosition: "end",
				itemStyle: {
					color: (params: any) =>
						params.value === 0 ? "rgba(217, 56, 41, 0.2)" : colors.primary,
					shadowBlur: (params: any) =>
						params.value === 0 || granularity === "hour" ? 0 : 4,
					shadowColor: colors.primary,
				},
				z: 3,
				large: granularity === "hour",
				silent: true,
			},
			{
				name: "Outline",
				type: "line",
				step: "middle",
				data: granularity === "hour" ? timelineData.values : [],
				symbol: "none",
				lineStyle: {
					width: 0.5,
					color: "rgba(217, 56, 41, 0.4)",
				},
				z: 2,
				silent: true,
			},
		],
	};

	return (
		<div
			ref={containerRef}
			className="w-full h-full bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] relative shadow-sm flex flex-col"
		>
			<div className="absolute top-4 left-4 flex items-center gap-2 z-1">
				<div className="w-2 h-2 bg-[#D93829]" />
				<span className="text-[10px] uppercase tracking-widest font-bold text-[#555] dark:text-[#aaa]">
					Messages Over Time
				</span>
			</div>
			<div className="absolute top-4 right-4 z-20 flex bg-[#F5F5F5] dark:bg-[#111] border border-[#EAE8E3] dark:border-[#333] p-0.5">
				{allowedGranularities.map((g) => (
					<button
						type="button"
						key={g}
						onClick={() => setGranularity(g)}
						className={`px-3 py-1 text-[9px] uppercase font-bold transition-colors ${granularity === g ? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "text-[#888] hover:text-[#111] dark:hover:text-white"}`}
					>
						{g}
					</button>
				))}
			</div>
			<div className="flex-1 pt-12 pb-4 px-4">
				<ReactECharts
					option={option}
					style={{ height: "100%", width: "100%" }}
					notMerge={true}
				/>
			</div>
		</div>
	);
};

export default memo(TimelineProjection);
