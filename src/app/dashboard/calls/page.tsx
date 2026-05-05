"use client";

import ReactECharts from "echarts-for-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChartContainer } from "../../../components/dashboard/ChartContainer";
import { InfoTooltip } from "../../../components/dashboard/InfoTooltip";
import { useCallsWorker } from "../../../hooks/useCallsWorker";
import { formatDate, getAdjustedDate } from "../../../lib/utils/time";
import { useChatStore } from "../../../store";
import CallActivityHeatmap from "../../../components/dashboard/CallActivityHeatmap";

const bauhausColors = ["#111111", "#D93829", "#0055A4", "#FFCC00", "#555555"];

const formatDuration = (seconds: number) => {
	if (seconds === 0) return "0s";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	const parts = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (s > 0 && h === 0) parts.push(`${s}s`);
	return parts.join(" ") || "0s";
};

export default function CallsPage() {
	const {
		isLoaded,
		messages,
		participants,
		timezoneOffset,
		selectedParticipants,
		timeRange,
	} = useChatStore();

	const formatCallTooltip = (data: any, header?: string) => {
		const start = getAdjustedDate(data.startTimeMs, timezoneOffset);
		const end = getAdjustedDate(data.endTimeMs, timezoneOffset);

		const d1 = start.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		const t1 = start.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		const d2 = end.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		const t2 = end.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		return (
			<div className="flex flex-col gap-1 py-0.5">
				{header && (
					<div className="text-[8px] uppercase font-black text-[#D93829] border-b border-[#111]/10 dark:border-[#EAE8E3]/10 pb-1 mb-1">
						{header}
					</div>
				)}
				<div>
					<span className="text-[#888] font-normal">From </span>
					{d1}
					<span className="text-[#888] font-normal"> at </span>
					{t1}
				</div>
				<div>
					<span className="text-[#888] font-normal">To </span>
					{d2}
					<span className="text-[#888] font-normal"> at </span>
					{t2}
				</div>
			</div>
		);
	};
	const {
		isInitialized,
		kpis,
		participantStats,
		timelineData,
		distributionData,
		error,
		setGranularity,
	} = useCallsWorker();
	const [timelineGranularity, setTimelineGranularity] = useState<
		"Day" | "Month" | "Year"
	>("Month");
	const [timelineMode, setTimelineMode] = useState<"Total" | "Participant">(
		"Total",
	);
	const [distMode, setDistMode] = useState<"Histogram" | "Density">(
		"Histogram",
	);
	const [showCharts, setShowCharts] = useState(false);

	useEffect(() => {
		if (isInitialized) {
			const timer = setTimeout(() => setShowCharts(true), 800);
			return () => clearTimeout(timer);
		}
		setShowCharts(false);
	}, [isInitialized]);

	const isGroup = participants.length > 2;

	const handleGranularityChange = (g: "Day" | "Month" | "Year") => {
		setTimelineGranularity(g);
		setGranularity(g);
	};

	const timelineOption = useMemo(() => {
		if (!timelineData || timelineData.length === 0) return {};
		const isParticipantMode = timelineMode === "Participant";

		const series = isParticipantMode
			? Array.from(
					new Set(
						timelineData.flatMap((d: any) => [
							...Object.keys(d.breakdown.voice),
							...Object.keys(d.breakdown.video),
							...Object.keys(d.breakdown.missed),
						]),
					),
				).map((p) => ({
					name: p as string,
					type: "line",
					smooth: true,
					symbol: "none",
					areaStyle: { opacity: 0.1 },
					data: timelineData.map(
						(d: any) =>
							(d.breakdown.voice[p as string] || 0) +
							(d.breakdown.video[p as string] || 0) +
							(d.breakdown.missed[p as string] || 0),
					),
				}))
			: [
					{
						name: "Voice",
						type: "bar",
						stack: "total",
						data: timelineData.map((d: any) => d.voice),
						color: "#D93829",
					},
					{
						name: "Video",
						type: "bar",
						stack: "total",
						data: timelineData.map((d: any) => d.video),
						color: "#0055A4",
					},
					{
						name: "Missed",
						type: "bar",
						stack: "total",
						data: timelineData.map((d: any) => d.missed),
						color: "#FFCC00",
					},
				];

		return {
			tooltip: {
				trigger: "axis",
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				axisPointer: { type: isParticipantMode ? "line" : "shadow" },
				formatter: (params: any) => {
					const dataIndex = params[0].dataIndex;
					const entry = timelineData[dataIndex] as any;
					const total = entry.voice + entry.video + entry.missed;

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
                            <span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit)">${entry.key}</span>
                            <span style="color: #D93829; font-size: 16px; font-weight: 900; font-family: var(--font-outfit)">${total.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px">`;

					["voice", "video", "missed"].forEach((type) => {
						const count = entry[type];
						if (count === 0) return;

						const color =
							type === "voice"
								? "#D93829"
								: type === "video"
									? "#0055A4"
									: "#FFCC00";
						const participants = Object.entries(entry.breakdown[type]).sort(
							(a: any, b: any) => b[1] - a[1],
						);

						html += `<div style="margin-bottom: 4px">
                            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; color: ${color}; text-transform: uppercase; margin-bottom: 2px">
                                <span>${type}</span>
                                <span>${count}</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 8px; border-left: 2px solid ${color}22">`;

						participants.slice(0, 3).forEach(([name, c]: [string, any]) => {
							html += `<div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; color: #111">
                                <span>${name}</span>
                                <span>${c}</span>
                            </div>`;
						});

						if (participants.length > 3) {
							const othersCount = participants
								.slice(3)
								.reduce((acc, curr) => acc + (curr[1] as number), 0);
							html += `<div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: 700; color: #888; font-style: italic">
                                <span>... and ${participants.length - 3} more</span>
                                <span>${othersCount}</span>
                            </div>`;
						}
						html += `</div></div>`;
					});

					html += `</div></div>`;
					return html;
				},
			},
			legend: {
				show: true,
				top: 0,
				right: 0,
				orient: "horizontal",
				textStyle: { fontSize: 10, fontWeight: "bold", color: "#888" },
				icon: "rect",
			},
			grid: { top: 40, left: 50, right: 20, bottom: 70 },
			xAxis: {
				type: "category",
				data: timelineData.map((d: any) => d.key),
				axisLabel: { fontSize: 9, fontWeight: "bold", margin: 18 },
			},
			yAxis: { type: "value", axisLabel: { fontSize: 9, fontWeight: "bold" } },
			dataZoom: [
				{ type: "inside" },
				{
					type: "slider",
					bottom: 10,
					height: 20,
					borderColor: "transparent",
					fillerColor: "rgba(0, 85, 164, 0.1)",
					handleStyle: { color: "#0055A4" },
				},
			],
			series,
		};
	}, [timelineData, timelineMode]);

	const distributionOption = useMemo(() => {
		if (!distributionData) return {};

		const formatter = (params: any) => {
			const p = Array.isArray(params) ? params[0] : params;
			const data = p.data;
			const bucket =
				distMode === "Histogram"
					? distributionData.semanticBuckets[p.dataIndex]
					: distributionData.granularBuckets[p.dataIndex];

			const total = bucket.count;
			const participants = Object.entries(bucket.breakdown).sort(
				(a: any, b: any) => b[1] - a[1],
			);

			let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
                <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
                    <span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit)">${bucket.label}</span>
                    <span style="color: #D93829; font-size: 16px; font-weight: 900; font-family: var(--font-outfit)">${total.toLocaleString()}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px">`;

			participants.slice(0, 5).forEach(([name, count]: [string, any]) => {
				html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
                    <span>${name}</span>
                    <span>${count.toLocaleString()}</span>
                </div>`;
			});

			if (participants.length > 5) {
				const othersCount = participants
					.slice(5)
					.reduce((acc, curr) => acc + (curr[1] as number), 0);
				html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; color: #888; font-family: var(--font-outfit); border-top: 1px dashed #ccc; padding-top: 4px">
                    <span>... and ${participants.length - 5} more</span>
                    <span>${othersCount.toLocaleString()}</span>
                </div>`;
			}

			html += `</div></div>`;
			return html;
		};

		if (distMode === "Histogram") {
			const data = distributionData.semanticBuckets;
			return {
				tooltip: {
					trigger: "axis",
					backgroundColor: "transparent",
					borderWidth: 0,
					padding: 0,
					formatter,
				},
				grid: { top: 20, left: 50, right: 20, bottom: 40 },
				xAxis: {
					type: "category",
					data: data.map((d: any) => d.label),
					axisLabel: { fontSize: 9, fontWeight: "bold" },
				},
				yAxis: {
					type: "value",
					axisLabel: { fontSize: 9, fontWeight: "bold" },
				},
				series: [
					{
						type: "bar",
						data: data.map((d: any) => d.count),
						color: "#0055A4",
						barWidth: "60%",
					},
				],
			};
		} else {
			const data = distributionData.granularBuckets;
			return {
				tooltip: {
					trigger: "axis",
					backgroundColor: "transparent",
					borderWidth: 0,
					padding: 0,
					formatter,
				},
				grid: { top: 20, left: 50, right: 50, bottom: 80 },
				xAxis: {
					type: "category",
					data: data.map((d: any) => d.label),
					axisLabel: { fontSize: 9, fontWeight: "bold" },
				},
				yAxis: {
					type: "value",
					axisLabel: { fontSize: 9, fontWeight: "bold" },
				},
				dataZoom: [
					{ type: "inside", xAxisIndex: 0 },
					{
						type: "slider",
						xAxisIndex: 0,
						bottom: 10,
						height: 20,
						borderColor: "transparent",
						backgroundColor: "#F5F5F5",
						fillerColor: "rgba(0, 85, 164, 0.1)",
						handleStyle: { color: "#0055A4" },
					},
					{
						type: "slider",
						yAxisIndex: 0,
						right: 10,
						width: 20,
						borderColor: "transparent",
						backgroundColor: "#F5F5F5",
						fillerColor: "rgba(0, 85, 164, 0.1)",
						handleStyle: { color: "#0055A4" },
					},
				],
				series: [
					{
						type: "line",
						smooth: true,
						showSymbol: false,
						areaStyle: { opacity: 0.3 },
						data: data.map((d: any) => d.count),
						color: "#0055A4",
					},
				],
			};
		}
	}, [distributionData, distMode]);

	const callTypeOption = useMemo(() => {
		if (!kpis || !kpis.categoryBreakdown) return {};
		const data = [
			{ name: "Voice", value: kpis.voiceCount, color: "#D93829" },
			{ name: "Video", value: kpis.videoCount, color: "#0055A4" },
			{ name: "Missed", value: kpis.missedCalls, color: "#FFCC00" },
		].filter((d) => d.value > 0);

		return {
			legend: {
				show: true,
				orient: "vertical",
				top: 0,
				right: 0,
				textStyle: { color: "#888", fontSize: 10, fontWeight: "bold" },
				icon: "rect",
			},
			tooltip: {
				trigger: "item",
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0,
				formatter: (params: any) => {
					const category = params.name;
					const breakdown =
						kpis.categoryBreakdown[
							category as keyof typeof kpis.categoryBreakdown
						];
					const participants = Object.entries(breakdown.participants) as [
						string,
						number,
					][];
					participants.sort((a, b) => b[1] - a[1]);

					const top3 = participants.slice(0, 3);
					const others = participants.slice(3);
					const othersCount = others.reduce((acc, curr) => acc + curr[1], 0);

					let html = `<div style="background: #fff; border: 2px solid #111; padding: 12px; box-shadow: 4px 4px 0px 0px #111; min-width: 180px">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #111; padding-bottom: 8px; margin-bottom: 10px">
                            <span style="color: #888; font-size: 11px; font-weight: bold; font-family: var(--font-outfit); text-transform: uppercase">${category}</span>
                            <span style="color: #D93829; font-size: 16px; font-weight: 900; font-family: var(--font-outfit)">${params.value.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px">`;

					top3.forEach(([name, count]) => {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #111; font-family: var(--font-outfit)">
                            <span>${name}</span>
                            <span>${count.toLocaleString()}</span>
                        </div>`;
					});

					if (others.length > 0) {
						html += `<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #888; font-family: var(--font-outfit); border-top: 1px dashed #ccc; pt-2">
                            <span>... and ${others.length} more</span>
                            <span>${othersCount.toLocaleString()}</span>
                        </div>`;
					}

					html += `</div></div>`;
					return html;
				},
			},
			series: [
				{
					type: "pie",
					radius: ["35%", "65%"],
					center: ["45%", "50%"],
					avoidLabelOverlap: true,
					itemStyle: { borderRadius: 0, borderWidth: 2, borderColor: "#fff" },
					label: {
						show: true,
						position: "outside",
						formatter: "{c}",
						fontFamily: "var(--font-outfit)",
						fontWeight: "bold",
						fontSize: 14,
						color: "inherit",
					},
					labelLine: { show: true, length: 15, length2: 15 },
					data: data.map((d) => ({
						value: d.value,
						name: d.name,
						itemStyle: { color: d.color },
					})),
				},
			],
		};
	}, [kpis]);

	if (!isLoaded || messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[12px_12px_0px_0px_#D93829]">
				<div className="w-16 h-16 border-8 border-[#111] dark:border-[#EAE8E3] border-t-[#D93829] animate-spin mb-8" />
				<h2 className="text-2xl font-bold uppercase tracking-widest text-[#111] dark:text-[#EAE8E3]">
					Awaiting Data Stream
				</h2>
			</div>
		);
	}

	if (!isInitialized) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[12px_12px_0px_0px_#D93829]">
				<div className="text-4xl font-bold font-[family-name:var(--font-outfit)] animate-pulse mb-4 text-[#D93829]">
					RECONSTRUCTING CALL HISTORY...
				</div>
				<div className="w-64 h-2 bg-[#f0f0f0] dark:bg-[#333] border-2 border-[#111] dark:border-[#EAE8E3] overflow-hidden">
					<div
						className="h-full bg-[#111] dark:bg-[#EAE8E3] animate-[slide_2s_infinite]"
						style={{ width: "40%" }}
					/>
				</div>
			</div>
		);
	}

	if (kpis?.totalCalls === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[70vh] border-[12px] border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-24 text-center">
				<div className="w-32 h-32 bg-[#D93829] mb-12 flex items-center justify-center">
					<span className="text-white text-8xl font-black">!</span>
				</div>
				<h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">
					NO CALL TELEMETRY <br /> DETECTED
				</h1>
				<p className="max-w-md text-xs font-bold uppercase tracking-widest text-[#888]">
					Messenger E2EE exports often strip call metadata. No voice or video
					call events found in this data corpus.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-24 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
			<header className="border-b-4 border-[#111] dark:border-[#EAE8E3] pb-4 flex items-end justify-between">
				<div>
					<h1 className="text-5xl font-[family-name:var(--font-playfair)] font-black">
						CALLS
					</h1>
					<div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D93829] mt-2 text-balance">
						VOICE & VIDEO INTERACTION METRICS
					</div>
				</div>
				<div className="text-right">
					<div className="text-[10px] uppercase font-bold text-[#888]">
						Total Duration
					</div>
					<div className="text-lg font-bold font-[family-name:var(--font-outfit)]">
						{formatDuration(kpis?.totalDuration || 0)}
					</div>
				</div>
			</header>

			{/* Section 01 // Call Stats */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#D93829]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						01 // Call Stats
					</h2>
					{isGroup && (
						<InfoTooltip content="Group chat detected. Call metrics reflect initiation statistics, as participant join-data is not available in exports." />
					)}
				</div>

				<div className="grid grid-cols-12 gap-6 items-stretch">
					{/* Left Column: KPIs and Table */}
					<div className="col-span-8 flex flex-col gap-6 min-w-0 min-h-0">
						<div className="grid grid-cols-4 gap-4">
							{[
								{ label: "Total Calls", value: kpis?.totalCalls },
								{
									label: "Missed Calls",
									value: kpis?.missedCalls,
									color: "#111",
								},
								{
									label: "Avg Duration",
									value: formatDuration(kpis?.avgDuration || 0),
								},
								{
									label: "Total Duration",
									value: formatDuration(kpis?.totalDuration || 0),
								},
							].map((kpi, i) => (
								<div
									key={i}
									className="border-2 border-[#111] dark:border-[#EAE8E3] p-4 bg-white dark:bg-[#1A1A1A] shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3]"
								>
									<div className="text-[9px] uppercase font-bold text-[#888] mb-1 flex items-center gap-1">
										{kpi.label}
									</div>
									<div
										className="text-2xl font-black font-[family-name:var(--font-outfit)] text-[#111] dark:text-[#EAE8E3]"
										style={kpi.color ? { color: kpi.color } : {}}
									>
										{kpi.value}
									</div>
								</div>
							))}
						</div>

						<div className="border-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] shadow-[8px_8px_0px_0px_#111] dark:shadow-[8px_8px_0px_0px_#EAE8E3] flex flex-col min-h-0">
							<div className="bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111] text-[10px] uppercase font-bold flex">
								<div className="p-3 w-[25%]">Participant</div>
								<div className="p-3 w-[15%]">Initiated</div>
								<div className="p-3 w-[30%]">Total Duration</div>
								<div className="p-3 w-[20%]">Avg Duration</div>
								<div className="p-3 w-[10%] flex items-center gap-1">
									Missed
									<InfoTooltip
										content={
											<span className="text-[#111] dark:text-[#EAE8E3]">
												Calls this person started but weren't answered.
											</span>
										}
									/>
								</div>
							</div>
							<div className="overflow-y-auto max-h-[400px] custom-scrollbar">
								<table className="w-full text-left border-collapse table-fixed">
									<tbody className="text-xs font-bold">
										{participantStats?.map((s: any, i: number) => {
											const maxDuration = Math.max(
												...participantStats.map((p: any) => p.duration),
											);
											const width = `${(s.duration / (maxDuration || 1)) * 100}%`;
											return (
												<tr
													key={i}
													className="border-b border-[#eee] dark:border-[#222] relative group"
												>
													<td className="p-3 w-[25%] relative z-10 truncate">
														{s.name}
													</td>
													<td className="p-3 w-[15%] relative z-10">
														{s.initiated}
													</td>
													<td className="p-3 w-[30%] relative z-10">
														<div className="absolute inset-0 bg-[#0055A4]/5 w-0 group-hover:w-full transition-all duration-500" />
														<div
															className="absolute bottom-0 left-0 h-full bg-[#0055A4]/10"
															style={{ width }}
														/>
														{formatDuration(s.duration)}
													</td>
													<td className="p-3 w-[20%] relative z-10">
														{formatDuration(s.avgDuration)}
													</td>
													<td className="p-3 w-[10%] relative z-10 text-[#D93829]">
														{s.missed}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Right Column: Stats & Breakdown */}
					<div className="col-span-4 flex flex-col h-full bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] border-t-4 border-t-[#D93829] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] transition-all">
						<div className="flex items-center gap-2 mb-6">
							<div className="w-2 h-2 bg-[#D93829]" />
							<span className="text-[10px] uppercase tracking-widest font-bold text-[#555] dark:text-[#aaa]">
								Call Statistics
							</span>
						</div>

						<div className="flex flex-col h-full">
							{/* Pie Chart Section */}
							<div className="h-[200px] shrink-0 border-b-2 border-[#ccc] dark:border-[#444] pb-4 mb-4">
								{showCharts && (
									<ReactECharts
										key={`pie-${isInitialized}-${kpis?.totalCalls}`}
										option={callTypeOption}
										style={{ height: "100%", width: "100%" }}
									/>
								)}
							</div>

							<div className="flex-1 space-y-4">
								{/* Detailed Metrics (Records) */}
								<div className="space-y-2">
									{[
										{
											label: "Longest Call",
											data: kpis?.longestCall,
										},
										{
											label: "Shortest Call",
											data: kpis?.shortestCall,
										},
									].map(
										(item, idx) =>
											item.data && (
												<div
													key={idx}
													className="flex justify-between items-center"
												>
													<span className="text-[9px] uppercase font-bold text-[#888]">
														{item.label}
														<InfoTooltip
															content={formatCallTooltip(
																item.data,
																item.data.type === "voice"
																	? "Voice Call"
																	: item.data.type === "video"
																		? "Video Call"
																		: "Missed Call",
															)}
														/>
													</span>
													<span className="text-[10px] font-bold font-[family-name:var(--font-outfit)] leading-tight text-right">
														{formatDuration(item.data.duration)}
														<div className="text-[8px] text-[#888] font-normal tracking-normal">
															by {item.data.senderName}
														</div>
													</span>
												</div>
											),
									)}
								</div>

								{/* Historical Markers (Now after Records, no title) */}
								<div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333]">
									<div className="space-y-1.5 text-[10px] font-bold">
										{[
											["First Voice", kpis?.firstCalls?.voice],
											["First Video", kpis?.firstCalls?.video],
											["First Missed", kpis?.firstCalls?.missed],
										].map(([label, data], idx) =>
											data ? (
												<div
													key={idx}
													className="flex justify-between items-center"
												>
													<span className="text-[#888]">
														{label as string}
														<InfoTooltip
															content={
																(label as string) === "First Missed" ? (
																	<div className="py-0.5">
																		<span className="text-[#888] font-normal">
																			at{" "}
																		</span>
																		{getAdjustedDate(
																			data.startTimeMs,
																			timezoneOffset,
																		).toLocaleTimeString("en-GB", {
																			hour: "2-digit",
																			minute: "2-digit",
																			hour12: false,
																		})}
																	</div>
																) : (
																	formatCallTooltip(
																		data,
																		formatDuration(data.duration),
																	)
																)
															}
														/>
													</span>
													<span className="text-right">
														{new Date(data.startTimeMs).toLocaleDateString(
															"en-US",
															{
																month: "short",
																day: "numeric",
																year: "2-digit",
															},
														)}
														<div className="text-[8px] text-[#888] font-normal leading-tight">
															by {data.senderName}
														</div>
													</span>
												</div>
											) : null,
										)}
									</div>
								</div>

								{/* Most Active Section */}
								<div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333]">
									<span className="text-[9px] uppercase font-bold text-[#D93829] block mb-2">
										Most Active
									</span>
									<div className="space-y-1.5 text-[10px] font-bold">
										{[
											["Year", kpis?.mostActivePeriods?.year],
											["Month", kpis?.mostActivePeriods?.month],
											["Week", kpis?.mostActivePeriods?.week],
											["Day", kpis?.mostActivePeriods?.day],
										].map(([label, data], idx) => {
											if (!data) return null;
											let formattedKey = data.key;
											try {
												if (label === "Year") {
													formattedKey = formatDate(
														new Date(`${data.key}-01-01`).getTime(),
														timezoneOffset,
														"month",
													)
														.split(" ")
														.pop(); // Just the year as in overview
												} else if (label === "Month") {
													formattedKey = formatDate(
														new Date(`${data.key}-01`).getTime(),
														timezoneOffset,
														"month",
													);
												} else if (label === "Week") {
													// Parse YYYY-Www
													const [y, w] = data.key.split("-W").map(Number);
													const d = new Date(Date.UTC(y, 0, 1));
													const day = d.getUTCDay();
													const firstThursday = new Date(d);
													if (day <= 4)
														firstThursday.setUTCDate(
															d.getUTCDate() + (4 - day),
														);
													else
														firstThursday.setUTCDate(
															d.getUTCDate() + (11 - day),
														);

													const start = new Date(firstThursday);
													start.setUTCDate(
														start.getUTCDate() + (w - 1) * 7 - 3,
													);
													const end = new Date(start);
													end.setUTCDate(start.getUTCDate() + 6);

													const m1 = start.toLocaleDateString("en-US", {
														month: "short",
													});
													const d1 = start.getUTCDate();
													const m2 = end.toLocaleDateString("en-US", {
														month: "short",
													});
													const d2 = end.getUTCDate();
													const y2 = end.getUTCFullYear();

													formattedKey =
														m1 === m2
															? `${m1} ${d1} - ${d2}, ${y2}`
															: `${m1} ${d1} - ${m2} ${d2}, ${y2}`;
												} else if (label === "Day") {
													formattedKey = formatDate(
														new Date(data.key).getTime(),
														timezoneOffset,
														"date",
													);
												}
											} catch (e) {}

											return (
												<div
													key={idx}
													className="flex justify-between items-center"
												>
													<span className="text-[#888]">
														{label as string} Ever
														<InfoTooltip content={`${data.count} calls`} />
													</span>
													<span className="truncate ml-4 text-right">
														{formattedKey}
													</span>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Section 02 // Calls over time */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#0055A4]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						02 // Calls over time
					</h2>
				</div>
				<div className="grid grid-cols-12 gap-6">
					<div className="col-span-12">
						<ChartContainer
							title={`${timelineGranularity === "Day" ? "Daily" : `${timelineGranularity}ly`} Call Volume`}
							height="h-[400px]"
							leftControls={
								<div className="flex border border-[#EAE8E3] dark:border-[#333] bg-[#F5F5F5] dark:bg-[#111] p-0.5">
									{(
										[
											{ label: "Total", value: "Total" },
											{ label: "By Participant", value: "Participant" },
										] as const
									).map((m) => (
										<button
											key={m.value}
											type="button"
											onClick={() => setTimelineMode(m.value)}
											className={`px-3 py-1 text-[9px] uppercase font-bold transition-colors ${
												timelineMode === m.value
													? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
													: "text-[#888] hover:text-[#111] dark:hover:text-white"
											}`}
										>
											{m.label}
										</button>
									))}
								</div>
							}
							controls={
								<div className="flex gap-4 items-center">
									{/* Granularity Toggle */}
									<div className="flex border border-[#EAE8E3] dark:border-[#333] bg-[#F5F5F5] dark:bg-[#111] p-0.5">
										{(["Day", "Month", "Year"] as const).map((g) => (
											<button
												key={g}
												type="button"
												onClick={() => handleGranularityChange(g)}
												className={`px-3 py-1 text-[9px] uppercase font-bold transition-colors ${
													timelineGranularity === g
														? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
														: "text-[#888] hover:text-[#111] dark:hover:text-white"
												}`}
											>
												{g}
											</button>
										))}
									</div>
								</div>
							}
						>
							{showCharts && (
								<ReactECharts
									key={`timeline-${isInitialized}-${timelineData?.length}-${timelineGranularity}-${timelineMode}`}
									option={timelineOption}
									style={{ height: "100%", width: "100%" }}
									notMerge={true}
								/>
							)}
						</ChartContainer>
					</div>
				</div>
			</section>

			{/* Section 03 // Call Lengths */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#FFCC00]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						03 // Call Lengths
					</h2>
				</div>
				<div className="grid grid-cols-12 gap-6">
					<div className="col-span-12">
						<ChartContainer
							title={`${distMode} Analysis`}
							height="h-[400px]"
							controls={
								<div className="flex border border-[#EAE8E3] dark:border-[#333] bg-[#F5F5F5] dark:bg-[#111] p-0.5">
									{["Histogram", "Density"].map((mode) => (
										<button
											key={mode}
											type="button"
											onClick={() => setDistMode(mode as any)}
											className={`px-3 py-1 text-[9px] uppercase font-bold transition-colors ${
												distMode === mode
													? "bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]"
													: "text-[#888] hover:text-[#111] dark:hover:text-white"
											}`}
										>
											{mode}
										</button>
									))}
								</div>
							}
						>
							{showCharts && (
								<ReactECharts
									key={`dist-${isInitialized}-${distributionData?.semanticBuckets?.length}-${distMode}`}
									option={distributionOption}
									style={{ height: "100%", width: "100%" }}
									notMerge={true}
								/>
							)}
						</ChartContainer>
					</div>
				</div>
			</section>

			{/* Section 04 // Call Activity Pattern */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#555555]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						04 // Call Activity Pattern
					</h2>
				</div>
				<CallActivityHeatmap
					messages={messages}
					timezoneOffset={timezoneOffset}
					selectedParticipants={selectedParticipants}
					timeRange={timeRange}
				/>
			</section>
		</div>
	);
}
