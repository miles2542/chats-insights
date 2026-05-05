"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { InfoTooltip } from "../InfoTooltip";
import { Camera, Play, Pause, RotateCcw, Loader2, Search, Star, X, Info } from "lucide-react";

interface SocialOrbitProps {
	dailyThreadCounts: Record<string, Record<string, number>>;
	allDates: string[];
}

export default function SocialOrbit({ dailyThreadCounts, allDates }: SocialOrbitProps) {
	const [windowSize, setWindowSize] = useState(14);
	const [currentIdx, setCurrentIdx] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [avatar, setAvatar] = useState<string | null>(null);
	const [isCalculating, setIsCalculating] = useState(false);
	const [animationData, setAnimationData] = useState<any[]>([]);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [isCustomWindow, setIsCustomWindow] = useState(false);
	
	const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");
	
	const fileInputRef = useRef<HTMLInputElement>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const threadMetadata = useMemo(() => {
		const threads = Object.keys(dailyThreadCounts);
		return threads.map((path, i) => {
			const name = path.split("/").pop() || path;
			return {
				id: path,
				name: name.replace(/_\w+$/, ""),
				angle: (i * 137.5) % 360,
				totalMsgs: Object.values(dailyThreadCounts[path]).reduce((a, b) => a + b, 0),
			};
		}).sort((a, b) => b.totalMsgs - a.totalMsgs);
	}, [dailyThreadCounts]);

	const filteredThreads = useMemo(() => {
		if (!searchQuery) return threadMetadata.slice(0, 50);
		return threadMetadata.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50);
	}, [threadMetadata, searchQuery]);

	useEffect(() => {
		if (allDates.length === 0) return;
		setIsCalculating(true);
		
		const t = setTimeout(() => {
			const threads = Object.keys(dailyThreadCounts);
			const allDailyCounts: number[] = [];
			threads.forEach(t => {
				Object.values(dailyThreadCounts[t]).forEach(c => {
					if (c > 0) allDailyCounts.push(c);
				});
			});
			allDailyCounts.sort((a, b) => a - b);
			const p95 = allDailyCounts[Math.floor(allDailyCounts.length * 0.95)] || 10;
			const sqrtMax = Math.sqrt(p95);

			const sequence = allDates.map((date, dateIdx) => {
				return threadMetadata.map((meta) => {
					const counts = dailyThreadCounts[meta.id];
					let sum = 0;
					let count = 0;
					for (let i = dateIdx; i > dateIdx - windowSize && i >= 0; i--) {
						sum += counts[allDates[i]] || 0;
						count++;
					}
					const rollingAvg = sum / (count || 1);
					const normalizedSqrt = Math.sqrt(rollingAvg) / (sqrtMax || 1);
					const radius = Math.max(0.2, 1.4 - (normalizedSqrt * 1.2));
					const rad = (meta.angle * Math.PI) / 180;
					const x = radius * Math.cos(rad);
					const y = radius * Math.sin(rad);
					const intensity = rollingAvg / p95;
					const color = intensity > 0.4 ? "#D93829" : intensity > 0.1 ? "#0055A4" : "#FFCC00";

					return {
						id: meta.id,
						name: meta.name,
						value: [x, y, rollingAvg, meta.totalMsgs, intensity],
						radius,
						color,
					};
				});
			});
			setAnimationData(sequence);
			setIsCalculating(false);
		}, 50);
		return () => clearTimeout(t);
	}, [dailyThreadCounts, allDates, threadMetadata, windowSize]);

	useEffect(() => {
		if (isPlaying && !isCalculating) {
			const interval = Math.max(5, 150 / playbackSpeed);
			timerRef.current = setInterval(() => {
				setCurrentIdx((prev) => {
					if (prev >= allDates.length - 1) {
						setIsPlaying(false);
						return prev;
					}
					return prev + 1;
				});
			}, interval);
		} else {
			if (timerRef.current) clearInterval(timerRef.current);
		}
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isPlaying, isCalculating, allDates.length, playbackSpeed]);

	const option = useMemo(() => {
		const frame = animationData[currentIdx] || [];
		
		const trailData: any[] = [];
		if (currentIdx > 0 && trackedIds.size > 0) {
			[1, 2, 3, 4, 5, 6].forEach(offset => {
				const prevIdx = Math.max(0, currentIdx - offset);
				const prevFrame = animationData[prevIdx] || [];
				prevFrame.forEach((p: any) => {
					if (trackedIds.has(p.id)) {
						trailData.push({
							value: p.value,
							itemStyle: {
								color: p.color,
								opacity: 0.6 / (offset * 1.5),
								borderWidth: 0
							},
							symbolSize: Math.max(4, 4 + p.value[4] * 46) * (1 - offset * 0.1)
						});
					}
				});
			});
		}

		return {
			animation: true,
			animationDurationUpdate: 200,
			animationEasingUpdate: "cubicOut",
			tooltip: {
				show: true,
				trigger: "item",
				formatter: (params: any) => {
					if (!params.name) return "";
					const data = params.data;
					return `<div style="padding: 8px; font-family: Inter, sans-serif; border: 2px solid #111; background: white; box-shadow: 4px 4px 0px 0px #111;">
						<div style="font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #eee; margin-bottom: 4px; padding-bottom: 2px;">${params.name}</div>
						<div style="font-size: 10px; color: #888;">ROLLING AVG: <b style="color: #111;">${data.value[2].toFixed(2)}</b></div>
						<div style="font-size: 10px; color: #888;">TOTAL MSGS: <b style="color: #111;">${data.value[3].toLocaleString()}</b></div>
					</div>`;
				},
				backgroundColor: "transparent",
				borderWidth: 0,
				padding: 0
			},
			grid: { top: "5%", bottom: "5%", left: "5%", right: "5%", containLabel: false },
			xAxis: { type: "value", min: -1.5, max: 1.5, show: false },
			yAxis: { type: "value", min: -1.5, max: 1.5, show: false },
			series: [
				{
					type: "scatter",
					coordinateSystem: "cartesian2d",
					data: trailData,
					silent: true,
				},
				{
					type: "scatter",
					coordinateSystem: "cartesian2d",
					data: frame.map(p => ({
						value: p.value,
						name: p.name,
						id: p.id,
						itemStyle: {
							color: p.color,
							opacity: trackedIds.has(p.id) ? 1 : 0.7,
							borderColor: trackedIds.has(p.id) ? "#111" : "transparent",
							borderWidth: trackedIds.has(p.id) ? 2 : 0,
						},
						label: {
							show: trackedIds.has(p.id),
							formatter: "{b}",
							fontSize: 10,
							fontWeight: "bold",
							position: "top",
							color: "#111",
							backgroundColor: "rgba(255,255,255,0.8)",
							padding: [2, 4],
							borderRadius: 2,
							fontFamily: "Inter, sans-serif"
						}
					})),
					symbolSize: (data: any) => Math.max(4, 4 + data[4] * 46),
					emphasis: {
						label: { show: true, fontFamily: "Inter, sans-serif" },
						itemStyle: { opacity: 1, borderWidth: 2, borderColor: "#111" }
					}
				}
			],
			graphic: [
				...[0.35, 0.7, 1.05, 1.4].map(r => ({
					type: "circle",
					shape: { cx: "50%", cy: "50%", r: `${(r / 3) * 100}%` },
					style: { fill: "none", stroke: "#eee", lineWidth: 1, lineDash: [4, 4] },
					silent: true
				})),
				{
					type: "group",
					left: "center",
					top: "center",
					children: [
						{
							type: "circle",
							shape: { r: 40 },
							style: { fill: avatar ? "none" : "#111", stroke: "#D93829", lineWidth: 3, shadowBlur: 15, shadowColor: "rgba(0,0,0,0.2)" }
						},
						avatar ? {
							type: "image",
							style: { image: avatar, width: 80, height: 80, x: -40, y: -40 },
							clipPath: { type: "circle", shape: { cx: 0, cy: 0, r: 40 } }
						} : {
							type: "text",
							style: { text: "YOU", fill: "#fff", font: "900 12px var(--font-outfit)", textAlign: "center", textVerticalAlign: "middle" }
						}
					]
				}
			]
		};
	}, [animationData, currentIdx, avatar, trackedIds]);

	const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (ev) => setAvatar(ev.target?.result as string);
			reader.readAsDataURL(file);
		}
	};

	const toggleTracked = (id: string) => {
		const next = new Set(trackedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setTrackedIds(next);
	};

	const innerCircleCount = animationData[currentIdx]?.filter((p: any) => p.value[4] > 0.4).length || 0;
	const activeThreadsCount = animationData[currentIdx]?.filter((p: any) => p.value[4] > 0.05).length || 0;
	const engagementBalance = activeThreadsCount > 0 ? (innerCircleCount / activeThreadsCount * 100) : 0;

	return (
		<div className="bg-white dark:bg-[#111] border-4 border-[#111] dark:border-[#EAE8E3] p-8 shadow-[12px_12px_0px_0px_#111] dark:shadow-[12px_12px_0px_0px_#EAE8E3] relative overflow-visible">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-30">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<div className="w-4 h-4 bg-[#D93829]" />
						<h2 className="text-2xl font-bold uppercase tracking-tighter italic text-[#111] dark:text-[#EAE8E3]">
							Social Circle Orbit
						</h2>
						<InfoTooltip content={<div className="space-y-2"><p>This chart visualizes your <b>social gravity</b> using "honest" square-root scaling.</p><div className="space-y-1 pl-1"><p>• <b>Red (&gt;40% Intensity)</b>: Your true inner circle.</p><p>• <b>Blue (10-40%)</b>: Active casual friendships.</p><p>• <b>Yellow (&lt;10%)</b>: Distant or fading contacts.</p></div></div>} />
					</div>
					<div className="text-[10px] uppercase font-bold text-[#888] tracking-widest">
						Your social circle through texting, now in motion
					</div>
				</div>

				<div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-8 bg-[#F5F5F5] dark:bg-[#1A1A1A] p-3 border-2 border-[#111] dark:border-[#EAE8E3] w-full md:w-auto">
					<div className="flex items-center gap-2 border-b xl:border-b-0 xl:border-r border-[#111]/10 dark:border-[#EAE8E3]/10 pb-3 xl:pb-0 xl:pr-4 xl:mr-2 w-full xl:w-auto justify-center">
						{isCalculating ? (
							<div className="w-8 h-8 flex items-center justify-center bg-[#D93829] text-white">
								<Loader2 size={14} className="animate-spin" />
							</div>
						) : (
							<button onClick={() => setIsPlaying(!isPlaying)} className={`w-8 h-8 flex items-center justify-center transition-colors ${isPlaying ? "bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111]" : "bg-[#D93829] text-white hover:bg-[#111]"}`}>
								{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
							</button>
						)}
						<button onClick={() => { setIsPlaying(false); setCurrentIdx(0); }} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] text-[#111] dark:text-[#EAE8E3] hover:border-[#D93829] hover:text-[#D93829] transition-colors">
							<RotateCcw size={14} />
						</button>
					</div>
					<div className="flex items-center gap-2 border-b xl:border-b-0 xl:border-r border-[#111]/10 dark:border-[#EAE8E3]/10 pb-3 xl:pb-0 xl:pr-4 xl:mr-2 w-full xl:w-auto justify-center">
						<span className="text-[9px] uppercase font-black text-[#555] dark:text-[#aaa] mr-2">Speed:</span>
						<div className="flex gap-1">
							{[0.5, 1, 2, 4, 8, 16].map(s => (
								<button key={s} onClick={() => setPlaybackSpeed(s)} className={`px-2 py-1 text-[9px] font-bold border-2 ${playbackSpeed === s ? "bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111] border-[#111] dark:border-[#EAE8E3]" : "bg-white dark:bg-[#111] border-[#ddd] dark:border-[#333] hover:border-[#D93829]"}`}>{s}x</button>
							))}
						</div>
					</div>
					<div className="flex items-center gap-2 w-full xl:w-auto justify-center whitespace-nowrap">
						<span className="text-[9px] uppercase font-black text-[#555] dark:text-[#aaa] mr-2">Rolling Avg:</span>
						<div className="flex items-center gap-1">
							{[1, 7, 14, 30].map(d => (
								<button key={d} disabled={isCalculating} onClick={() => { setWindowSize(d); setIsCustomWindow(false); }} className={`px-3 py-1 text-[10px] font-bold border-2 transition-all ${windowSize === d && !isCustomWindow ? "bg-[#D93829] border-[#D93829] text-white" : "bg-white dark:bg-[#111] border-[#111] dark:border-[#EAE8E3] text-[#111] dark:text-[#EAE8E3] hover:border-[#D93829]"} ${isCalculating ? "opacity-50 cursor-not-allowed" : ""}`}>{d}D</button>
							))}
							<div className="flex items-center border-2 border-[#111] dark:border-[#EAE8E3]">
								<button 
									disabled={isCalculating}
									onClick={() => setIsCustomWindow(!isCustomWindow)}
									className={`px-3 py-1 text-[10px] font-bold transition-all ${isCustomWindow ? "bg-[#D93829] text-white" : "bg-white dark:bg-[#111] text-[#111] dark:text-[#EAE8E3] hover:text-[#D93829]"} ${isCalculating ? "opacity-50 cursor-not-allowed" : ""}`}
								>
									Custom
								</button>
								{isCustomWindow && (
									<input 
										type="number"
										value={windowSize}
										min="1"
										max="365"
										onChange={(e) => setWindowSize(Number(e.target.value))}
										className="w-10 px-1 py-0.5 text-[10px] font-bold border-l-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] focus:outline-none focus:bg-[#D93829]/5 text-center"
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-12 items-start relative z-20">
				<div className="w-full lg:w-[300px] shrink-0 space-y-6">
					<div className="p-5 bg-white dark:bg-[#111] border border-[#111]/10 dark:border-[#EAE8E3]/10 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="relative w-12 h-12 shrink-0 border border-[#111]/20 dark:border-[#EAE8E3]/20 bg-[#f5f5f5] dark:bg-[#1a1a1a] overflow-hidden group">
								{avatar ? <img src={avatar} className="w-full h-full object-cover" alt="User" /> : <div className="w-full h-full flex items-center justify-center text-[#888] text-[8px] font-black uppercase tracking-tighter">YOU</div>}
								<button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={14} /></button>
							</div>
							<div>
								<h3 className="text-xs font-bold uppercase tracking-tight leading-none mb-1">Central Identity</h3>
								<p className="text-[8px] text-[#888] uppercase font-bold tracking-widest">Update your face at the center</p>
							</div>
						</div>
						<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
					</div>

					<div className="p-5 bg-white dark:bg-[#111] border border-[#111]/10 dark:border-[#EAE8E3]/10 shadow-sm h-[480px] flex flex-col">
						<div className="flex justify-between items-center mb-4 pb-2 border-b border-[#111]/5">
							<h3 className="text-xs font-bold uppercase tracking-tight">Watchlist</h3>
							<div className="flex items-center gap-1"><span className="text-[10px] font-bold text-[#D93829]">{trackedIds.size}</span><Star size={10} fill="#D93829" className="text-[#D93829]" /></div>
						</div>
						<div className="relative mb-3">
							<Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#aaa]" />
							<input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-7 pr-2 py-1.5 text-[10px] font-medium border border-[#111]/10 dark:border-[#EAE8E3]/10 bg-[#fafafa] dark:bg-[#0a0a0a] focus:outline-none focus:border-[#D93829]/50" />
						</div>
						<div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scrollbar">
							{filteredThreads.map(t => (
								<button key={t.id} onClick={() => toggleTracked(t.id)} className={`w-full flex items-center justify-between p-2 text-left transition-colors border ${trackedIds.has(t.id) ? "bg-[#D93829]/5 border-[#D93829]/30" : "hover:bg-[#f9f9f9] dark:hover:bg-[#151515] border-transparent"}`}>
									<div className="flex flex-col min-w-0">
										<span className="text-[10px] font-bold uppercase truncate">{t.name}</span>
										<span className="text-[8px] text-[#888] uppercase tracking-tighter">{t.totalMsgs.toLocaleString()} Msgs</span>
									</div>
									<Star size={12} fill={trackedIds.has(t.id) ? "#D93829" : "none"} className={trackedIds.has(t.id) ? "text-[#D93829]" : "text-[#ddd]"} />
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="flex-1 w-full flex flex-col gap-8">
					<div className="w-full aspect-square max-w-[800px] mx-auto overflow-visible relative">
						<ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge={true} />
					</div>
					
					<div className="w-full max-w-[800px] mx-auto px-4 flex items-center gap-6">
						<div className="flex-1 flex items-center h-8">
							<input 
								type="range" min="0" max={allDates.length - 1} value={currentIdx} disabled={isCalculating} onChange={(e) => { setIsPlaying(false); setCurrentIdx(Number(e.target.value)); }} 
								className="w-full cursor-pointer accent-[#D93829] [&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:bg-[#eee] dark:[&::-webkit-slider-runnable-track]:bg-[#222] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#111] dark:[&::-webkit-slider-thumb]:bg-[#EAE8E3] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#D93829] [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-125 active:[&::-webkit-slider-thumb]:rotate-45"
							/>
						</div>
						<div className="text-[12px] font-black font-mono bg-[#111] text-white px-4 py-2 min-w-[140px] text-center border border-[#D93829] shadow-[4px_4px_0px_0px_#D93829] transform -rotate-1">{allDates[currentIdx]}</div>
					</div>
				</div>
			</div>

			<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="p-4 border-2 border-[#111]/10 dark:border-[#EAE8E3]/10">
					<div className="text-[9px] uppercase font-black text-[#888] mb-1 flex items-center gap-1">
						Inner Circle
						<InfoTooltip content={<div className="space-y-2"><p>This represents your <b>Core Group</b> on this specific date.</p><p><b>High values</b>: You have a broad core of active friendships.</p><p><b>Low values</b>: Your social energy is focused on just 1-2 people or you are being quiet.</p></div>} />
					</div>
					<div className="text-xl font-bold font-[family-name:var(--font-outfit)] text-[#D93829]">
						{innerCircleCount} <span className="text-[10px] text-[#888] font-normal uppercase">People</span>
					</div>
				</div>
				<div className="p-4 border-2 border-[#111]/10 dark:border-[#EAE8E3]/10">
					<div className="text-[9px] uppercase font-black text-[#888] mb-1 flex items-center gap-1">
						Chat Intensity
						<InfoTooltip content={<div className="space-y-2"><p>Measures how <b>deep</b> or frequent your conversations are on average.</p><p><b>High Intensity</b>: You're having long, fast-paced, or many messages per thread.</p><p><b>Low Intensity</b>: Mostly quick check-ins or short updates.</p></div>} />
					</div>
					<div className="text-xl font-bold font-[family-name:var(--font-outfit)]">
						{(animationData[currentIdx]?.reduce((acc: any, p: any) => acc + p.value[2], 0) / (Object.keys(dailyThreadCounts).length || 1)).toFixed(2)}
					</div>
				</div>
				<div className="p-4 border-2 border-[#111]/10 dark:border-[#EAE8E3]/10">
					<div className="text-[9px] uppercase font-black text-[#888] mb-1 flex items-center gap-1">
						Engagement Balance
						<InfoTooltip content={<div className="space-y-2"><p>Compares your <b>Inner Circle</b> to all currently <b>Active Threads</b>.</p><p><b>High %</b>: Your social energy is highly concentrated on your closest friends.</p><p><b>Low %</b>: Your attention is spread thin across many casual acquaintances.</p></div>} />
					</div>
					<div className="text-xl font-bold font-[family-name:var(--font-outfit)]">
						{engagementBalance.toFixed(1)}%
					</div>
				</div>
			</div>
		</div>
	);
}
