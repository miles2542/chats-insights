"use client";

import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useState } from "react";
import ActivityHeatmap from "../../components/dashboard/ActivityHeatmap";
import { ChartContainer } from "../../components/dashboard/ChartContainer";
import { InfoTooltip } from "../../components/dashboard/InfoTooltip";
import TimelineProjection from "../../components/dashboard/overview/TimelineProjection";
import { MessageCategory } from "../../lib/parsers/types";
import {
	formatDate,
	getAdjustedDate,
	getSystemOffset,
} from "../../lib/utils/time";
import { useChatStore } from "../../store";
import type { StatsResponse } from "../../workers/stats-worker";

// Shared Theme Properties for ECharts
const axisLineColor = "#333";
const labelColor = "#888";
const primaryColor = "#D93829";
const bauhausColors = [
	"#111111", // Black
	"#D93829", // Red
	"#0055A4", // Blue
	"#FFCC00", // Yellow
	"#555555", // Charcoal
	"#888888", // Grey
	"#AAAAAA", // Light Grey
];

export default function DashboardOverview() {
	const {
		messages,
		selectedParticipants,
		timeRange,
		timezoneOffset,
		sessionGapThreshold,
	} = useChatStore();

	const [data, setData] = useState<StatsResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [granularity, setGranularity] = useState<
		"hour" | "day" | "week" | "month"
	>("day");

	// Stats Worker Integration - Pass RAW messages and all filters/criteria
	useEffect(() => {
		if (messages.length === 0 || selectedParticipants.length === 0) {
			setData(null);
			setLoading(false);
			return;
		}

		setLoading(true);
		const worker = new Worker(
			new URL("../../workers/stats-worker.ts", import.meta.url),
		);

		worker.onmessage = (event: MessageEvent<StatsResponse>) => {
			setData(event.data);
			setLoading(false);
			worker.terminate();
		};

		worker.postMessage({
			messages: messages.map((m) => ({
				timestampMs: m.timestampMs,
				senderName: m.senderName,
				category: m.category,
				content: m.content,
				mediaUri: m.mediaUri,
			})),
			timezoneOffset,
			systemOffset: getSystemOffset(),
			sessionGapThreshold,
			selectedParticipants,
			timeRange: [
				timeRange[0]?.getTime() || null,
				timeRange[1]?.getTime() || null,
			],
			granularity,
		});

		return () => worker.terminate();
	}, [
		messages,
		timezoneOffset,
		sessionGapThreshold,
		selectedParticipants,
		timeRange,
		granularity,
	]);

	const responseMatrixOption = useMemo(() => {
		if (!data) return {};
		return {
			title: [
				{
					text: "MESSAGES SENT",
					left: "22%",
					top: "2%",
					textAlign: "center",
					textStyle: {
						color: "#555",
						fontSize: 11,
						fontWeight: "bold",
						fontFamily: "var(--font-outfit)",
						letterSpacing: 1,
					},
				},
				{
					text: "WORDS SENT",
					left: "78%",
					top: "2%",
					textAlign: "center",
					textStyle: {
						color: "#555",
						fontSize: 11,
						fontWeight: "bold",
						fontFamily: "var(--font-outfit)",
						letterSpacing: 1,
					},
				},
			],
			tooltip: { trigger: "item" },
			legend: {
				show: false,
			},
			series: [
				{
					name: "Messages sent",
					type: "pie",
					radius: ["40%", "75%"],
					center: ["22%", "55%"],
					itemStyle: { borderRadius: 0, borderWidth: 0 },
					label: {
						show: true,
						position: "inner",
						formatter: "{d}%",
						fontSize: 10,
						fontWeight: "bold",
						color: "#fff",
					},
					data: data.senderStats.messages,
					color: bauhausColors,
				},
				{
					name: "Words sent",
					type: "pie",
					radius: ["40%", "75%"],
					center: ["78%", "55%"],
					itemStyle: { borderRadius: 0, borderWidth: 0 },
					label: {
						show: true,
						position: "inner",
						formatter: "{d}%",
						fontSize: 10,
						fontWeight: "bold",
						color: "#fff",
					},
					data: data.senderStats.words,
					color: bauhausColors,
				},
			],
		};
	}, [data]);

	const mediaBreakdownOption = useMemo(() => {
		if (!data) return {};
		return {
			tooltip: { trigger: "item", formatter: "{b}: {c}" },
			legend: {
				show: false,
			},
			series: [
				{
					name: "Media",
					type: "pie",
					radius: ["40%", "70%"],
					center: ["50%", "50%"],
					avoidLabelOverlap: true,
					itemStyle: { borderRadius: 0, borderWidth: 0 },
					label: {
						show: true,
						position: "outside",
						formatter: "{d}%",
						fontSize: 9,
						fontWeight: "bold",
						color: "inherit",
					},
					labelLine: {
						show: true,
						length: 15,
						length2: 15,
					},
					data: data.categoryCounts,
					color: [
						primaryColor,
						"#0055A4",
						"#FFCC00",
						"#111111",
						"#555555",
						"#F47A1F",
						"#2B5292",
						"#F4C300",
					],
				},
			],
		};
	}, [data]);

	const renderSubtleDate = (ts: number, mode: "full" | "date" = "full") => {
		const d = getAdjustedDate(ts, timezoneOffset);
		const dateStr = d.toLocaleDateString("en-US", {
			month: "long",
			day: "2-digit",
			year: "numeric",
		});
		const timeStr = d.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		return (
			<>
				{mode === "full" ? (
					<>
						{dateStr}
						<span className="text-[#888] font-normal opacity-60 px-1">at</span>
						{timeStr}
					</>
				) : (
					dateStr
				)}
			</>
		);
	};

	return (
		<div className="grid grid-cols-12 gap-6 animate-in fade-in duration-500">
			<div className="col-span-12">
				{/* KPI Row */}
				<div className="grid grid-cols-4 gap-6 mb-6">
					<div className="bg-[#111] text-[#EAE8E3] dark:bg-[#EAE8E3] dark:text-[#111] p-6 shadow-sm relative overflow-hidden">
						{loading && (
							<div className="absolute top-0 left-0 w-full h-1 bg-[#D93829] animate-pulse" />
						)}
						<div className="text-[10px] uppercase tracking-widest text-[#888] dark:text-[#555] mb-2 font-bold">
							Total Volume
						</div>
						<div className="text-4xl font-[family-name:var(--font-outfit)] font-bold">
							{data ? data.filteredCount.toLocaleString() : "..."}
						</div>
					</div>
					<div className="bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] p-6 shadow-sm">
						<div className="text-[10px] uppercase tracking-widest text-[#888] mb-2 font-bold">
							Participants
						</div>
						<div className="text-4xl font-[family-name:var(--font-outfit)] font-bold text-[#D93829]">
							{data ? data.senderStats.messages.length.toLocaleString() : "..."}
						</div>
					</div>
					<div className="bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border(--333) p-6 shadow-sm">
						<div className="text-[10px] uppercase tracking-widest text-[#888] mb-2 font-bold">
							Media Files
						</div>
						<div className="text-4xl font-[family-name:var(--font-outfit)] font-bold text-[#D93829]">
							{data
								? data.categoryCounts
										.filter((c) => c.name !== MessageCategory.Text)
										.reduce((acc, curr) => acc + curr.value, 0)
										.toLocaleString()
								: "..."}
						</div>
					</div>
					<div className="bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] p-6 shadow-sm">
						<div className="text-[10px] uppercase tracking-widest text-[#888] mb-2 font-bold">
							Days Active
						</div>
						<div className="text-4xl font-[family-name:var(--font-outfit)] font-bold text-[#D93829] flex items-baseline gap-1.5">
							{data ? data.daysActiveCount.toLocaleString() : "..."}
							{data && (
								<span className="text-[10px] font-bold text-[#888] lowercase">
									(
									{(
										(data.daysActiveCount / (data.totalRangeDays || 1)) *
										100
									).toFixed(1)}
									% of {data.totalRangeDays} days)
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="col-span-8">
				<ChartContainer>
					{data ? (
						<div className="flex flex-col h-full">
							<div className="flex-1">
								<ReactECharts
									option={responseMatrixOption}
									style={{ height: "100%", width: "100%" }}
								/>
							</div>
							<PaginatedLegend
								items={data.senderStats.messages.map((m, i) => ({
									name: m.name,
									color: bauhausColors[i % bauhausColors.length],
								}))}
							/>
						</div>
					) : (
						<div className="h-full w-full flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-[#888]">
							Calculating Metrics...
						</div>
					)}
				</ChartContainer>
			</div>
			<div className="col-span-4">
				<ChartContainer title="Media Types">
					{data ? (
						<div className="flex flex-col h-full">
							<div className="flex-1">
								<ReactECharts
									option={mediaBreakdownOption}
									style={{ height: "100%", width: "100%" }}
								/>
							</div>
							<PaginatedLegend
								items={data.categoryCounts.map((c, i) => ({
									name: c.name,
									color: [
										primaryColor,
										"#0055A4",
										"#FFCC00",
										"#111111",
										"#555555",
										"#F47A1F",
										"#2B5292",
										"#F4C300",
									][i % 8],
								}))}
							/>
						</div>
					) : (
						<div className="h-full w-full flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-[#888]">
							Analyzing Media...
						</div>
					)}
				</ChartContainer>
			</div>

			<div className="col-span-12 mt-6 grid grid-cols-12 gap-6 items-stretch">
				<div className="col-span-8 flex flex-col h-full">
					{data ? (
						<TimelineProjection
							timelineData={data.timelineActivity}
							granularity={granularity}
							setGranularity={setGranularity}
							colors={{
								primary: primaryColor,
								axis: axisLineColor,
								label: labelColor,
							}}
						/>
					) : (
						<div className="w-full h-full min-h-[300px] bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] flex items-center justify-center">
							<span className="text-[10px] uppercase font-bold tracking-widest text-[#888]">
								Projecting Temporal Data...
							</span>
						</div>
					)}
				</div>

				<div className="col-span-4 flex flex-col h-full bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] border-t-4 border-t-[#D93829] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] transition-all">
					<div className="flex items-center gap-2 mb-6">
						<div className="w-2 h-2 bg-[#D93829]" />
						<span className="text-[10px] uppercase tracking-widest font-bold text-[#555] dark:text-[#aaa]">
							Message Statistics
						</span>
					</div>

					{data ? (
						<div className="space-y-4">
							<div className="flex justify-between border-b-2 border-[#111] dark:border-[#EAE8E3] pb-1">
								<span className="text-xs font-bold uppercase">
									Total Messages
								</span>
								<span className="text-xs font-bold font-[family-name:var(--font-outfit)]">
									{data.messageStats.total.toLocaleString()}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[10px] text-[#555] dark:text-[#aaa] font-bold uppercase">
								{[
									["Text", "text"],
									[
										"Links",
										"links",
										false,
										"Total URLs found - not number of messages with at least one link.",
									],
									["Images", "images"],
									["GIFs", "gifs"],
									["Videos", "videos"],
									["Stickers", "stickers"],
									["Audio", "audio"],
									["Files", "files"],
									["Unsent", "unsent"],
									["Emojis", "emojiCount", true],
								].map(([label, key, isDirect, tooltip]) => (
									<div
										key={label as string}
										className="flex justify-between items-center"
									>
										<div className="flex items-center gap-1">
											<span>{label as string}</span>
											{tooltip && <InfoTooltip content={tooltip as string} />}
										</div>
										<span>
											{isDirect
												? (data.messageStats as any)[
														key as string
													]?.toLocaleString() || 0
												: data.messageStats.types?.[
														key as string
													]?.toLocaleString() || 0}
										</span>
									</div>
								))}
							</div>

							<div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333] space-y-2">
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Total Sessions
										<InfoTooltip
											content={`Total conversations calculated based on your ${sessionGapThreshold}m inactivity threshold. See Engagement page for deeper analysis.`}
										/>
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)]">
										{data.messageStats.totalSessions?.toLocaleString() || "—"}
									</span>
								</div>
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Avg msgs/session
										<InfoTooltip content="Higher values indicate sustained, deep conversations. Lower values suggest brief updates or check-ins. This also reflects participant texting styles (long-form vs. rapid-fire)." />
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)]">
										{(
											data.messageStats.total /
											(data.messageStats.totalSessions || 1)
										).toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Average messages/day
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)]">
										{(
											data.messageStats.total / (data.daysActiveCount || 1)
										).toFixed(2)}
									</span>
								</div>
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Average words/message
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)]">
										{(
											data.messageStats.totalWords /
											(data.messageStats.total || 1)
										).toFixed(2)}
									</span>
								</div>
							</div>

							<div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333] space-y-2">
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Longest period without message
										<InfoTooltip
											content={
												<div className="flex flex-col gap-0.5">
													<div>
														<span className="text-[#888] font-normal">
															From{" "}
														</span>
														{renderSubtleDate(
															data.messageStats.longestGap.start,
															"full",
														)}
													</div>
													<div>
														<span className="text-[#888] font-normal">To </span>
														{renderSubtleDate(
															data.messageStats.longestGap.end,
															"full",
														)}
													</div>
												</div>
											}
										/>
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)] text-right leading-tight">
										{Math.floor(data.messageStats.longestGap.ms / 86400000)}d{" "}
										{Math.floor(
											(data.messageStats.longestGap.ms % 86400000) / 3600000,
										)}
										h
									</span>
								</div>
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Longest daily streak
										<InfoTooltip
											content={
												<div className="flex flex-col gap-0.5">
													<div className="text-[10px] font-black text-[#D93829] mb-1 uppercase tracking-wider border-b border-[#111]/5 pb-1">
														{data.messageStats.longestStreak.totalMessages?.toLocaleString() ||
															0}{" "}
														messages
													</div>
													<div>
														<span className="text-[#888] font-normal">
															From{" "}
														</span>
														{renderSubtleDate(
															data.messageStats.longestStreak.start,
															"date",
														)}
													</div>
													<div>
														<span className="text-[#888] font-normal">To </span>
														{renderSubtleDate(
															data.messageStats.longestStreak.end,
															"date",
														)}
													</div>
												</div>
											}
										/>
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)] text-right leading-tight">
										{data.messageStats.longestStreak.count} days
									</span>
								</div>
								<div className="flex justify-between items-end">
									<span className="text-[9px] uppercase font-bold text-[#888]">
										Longest active conversation
										<InfoTooltip
											content={
												<div className="flex flex-col gap-0.5">
													<div className="text-[10px] font-black text-[#D93829] mb-1 uppercase tracking-wider border-b border-[#111]/5 pb-1">
														{data.messageStats.longestSession.count.toLocaleString()}{" "}
														messages
													</div>
													<div>
														<span className="text-[#888] font-normal">
															From{" "}
														</span>
														{renderSubtleDate(
															data.messageStats.longestSession.start,
															"full",
														)}
													</div>
													<div>
														<span className="text-[#888] font-normal">To </span>
														{renderSubtleDate(
															data.messageStats.longestSession.end,
															"full",
														)}
													</div>
												</div>
											}
										/>
									</span>
									<span className="text-sm font-bold font-[family-name:var(--font-outfit)] text-right leading-tight">
										{Math.floor(data.messageStats.longestSession.ms / 3600000)}h{" "}
										{Math.floor(
											(data.messageStats.longestSession.ms % 3600000) / 60000,
										)}
										m
									</span>
								</div>
							</div>

							<div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333]">
								<span className="text-[9px] uppercase font-bold text-[#D93829] block mb-2">
									Most Active
								</span>
								<div className="space-y-1 text-[10px] font-bold">
									<div className="flex justify-between">
										<span className="text-[#888]">
											Year Ever
											<InfoTooltip
												content={`${data.messageStats.peaks.year.val.toLocaleString()} messages`}
											/>
										</span>
										<span>{data.messageStats.peaks.year.key}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-[#888]">
											Month Ever
											<InfoTooltip
												content={`${data.messageStats.peaks.month.val.toLocaleString()} messages`}
											/>
										</span>
										<span>
											{formatDate(
												new Date(
													`${data.messageStats.peaks.month.key}-01`,
												).getTime(),
												timezoneOffset,
												"month",
											)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-[#888]">
											Day Ever
											<InfoTooltip
												content={`${data.messageStats.peaks.day.val.toLocaleString()} messages`}
											/>
										</span>
										<span>
											{formatDate(
												new Date(data.messageStats.peaks.day.key).getTime(),
												timezoneOffset,
												"date",
											)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-[#888]">
											Hour Ever
											<InfoTooltip
												content={`${data.messageStats.peaks.hour.val.toLocaleString()} messages`}
											/>
										</span>
										<span className="truncate ml-4">
											{renderSubtleDate(
												new Date(data.messageStats.peaks.hour.key).getTime(),
												"full",
											)}
										</span>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center opacity-30 grayscale">
							<div className="w-12 h-1 bg-[#111] dark:bg-[#EAE8E3] mb-4 animate-pulse" />
							<span className="text-[9px] uppercase font-bold tracking-widest">
								Processing Intelligence...
							</span>
						</div>
					)}
				</div>
			</div>

			<div className="col-span-12 mt-6">
				<ActivityHeatmap
					messages={messages}
					timezoneOffset={timezoneOffset}
					selectedParticipants={selectedParticipants}
					timeRange={timeRange}
				/>
			</div>
		</div>
	);
}

interface LegendItem {
	name: string;
	color: string;
}

const PaginatedLegend = ({ items }: { items: LegendItem[] }) => {
	const [page, setPage] = useState(0);
	const itemsPerPage = 8;
	const totalPages = Math.ceil(items.length / itemsPerPage);

	const currentItems = items.slice(
		page * itemsPerPage,
		(page + 1) * itemsPerPage,
	);

	if (items.length === 0) return null;

	return (
		<div className="mt-2 pb-2">
			<div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4">
				{currentItems.map((item) => (
					<div key={item.name} className="flex items-center gap-1.5 min-w-0">
						<div
							className="w-2 h-2 flex-shrink-0"
							style={{ backgroundColor: item.color }}
						/>
						<span className="text-[10px] font-bold text-[#666] dark:text-[#999] truncate uppercase tracking-tighter">
							{item.name}
						</span>
					</div>
				))}
			</div>

			{totalPages > 1 && (
				<div className="flex justify-center items-center gap-4 mt-3">
					<button
						onClick={() => setPage((p) => Math.max(0, p - 1))}
						disabled={page === 0}
						className="p-1 hover:bg-[#F2F2F7] dark:hover:bg-[#222] rounded disabled:opacity-20 transition-all"
					>
						<ChevronLeftIcon className="w-3 h-3" />
					</button>
					<span className="text-[9px] font-black text-[#CCC] uppercase tracking-[0.2em]">
						Page {page + 1} / {totalPages}
					</span>
					<button
						onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
						disabled={page === totalPages - 1}
						className="p-1 hover:bg-[#F2F2F7] dark:hover:bg-[#222] rounded disabled:opacity-20 transition-all"
					>
						<ChevronRightIcon className="w-3 h-3" />
					</button>
				</div>
			)}
		</div>
	);
};

const ChevronLeftIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="3"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="15 18 9 12 15 6" />
	</svg>
);

const ChevronRightIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="3"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="9 18 15 12 9 6" />
	</svg>
);
