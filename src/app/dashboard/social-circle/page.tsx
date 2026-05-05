"use client";

import { useRef, useState, useMemo } from "react";
import { InfoTooltip } from "../../../components/dashboard/InfoTooltip";
import ActivityHeatmap from "../../../components/dashboard/ActivityHeatmap";
import TimelineProjection from "../../../components/dashboard/overview/TimelineProjection";
import { formatDate, getSystemOffset, getAdjustedDate } from "../../../lib/utils/time";
import { useChatStore } from "../../../store";
import type { SocialCircleWorkerResponse, ThreadData } from "../../../workers/social-circle-worker";
import SocialOrbit from "../../../components/dashboard/social-circle/SocialOrbit";

interface ProgressState {
    workerId: number;
    current: number;
    total: number;
    fileName: string;
}

export default function SocialCirclePage() {
    const { timezoneOffset, socialCircle, setSocialCircleData } = useChatStore();
    const [excludeGroupChats, setExcludeGroupChats] = useState(false);
    const rawThreads = socialCircle.rawThreads || {};
    const [status, setStatus] = useState<"idle" | "checking" | "parsing">("idle");
    const [workerProgress, setWorkerProgress] = useState<Record<number, ProgressState>>({});
    const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = Array.from(e.target.files || []);
        if (fileList.length === 0) return;

        setStatus("checking");
        
        setTimeout(() => {
            const jsonFiles = fileList.filter(f => f.name.endsWith(".json"));
            if (jsonFiles.length === 0) {
                setStatus("idle");
                return;
            }

            setStatus("parsing");
            const systemOffset = getSystemOffset();
            
            const numWorkers = Math.min(
                navigator.hardwareConcurrency || 4,
                Math.ceil(jsonFiles.length / 5),
                8
            );

            const chunks = Array.from({ length: numWorkers }, () => [] as File[]);
            jsonFiles.forEach((f, i) => chunks[i % numWorkers].push(f));

            const allThreads: Record<string, ThreadData> = JSON.parse(JSON.stringify(rawThreads));
            let completedWorkers = 0;

            for (let i = 0; i < numWorkers; i++) {
                if (chunks[i].length === 0) {
                    completedWorkers++;
                    continue;
                }

                const worker = new Worker(
                    new URL("../../../workers/social-circle-worker.ts", import.meta.url),
                );

                worker.onmessage = (event: MessageEvent<SocialCircleWorkerResponse>) => {
                    const res = event.data;
                    if (res.type === "PROGRESS") {
                        setWorkerProgress(prev => ({
                            ...prev,
                            [res.workerId]: {
                                workerId: res.workerId,
                                current: res.current,
                                total: res.total,
                                fileName: res.fileName
                            }
                        }));
                    } else if (res.type === "SUCCESS") {
                        Object.entries(res.threads).forEach(([name, data]) => {
                            if (!allThreads[name]) {
                                allThreads[name] = data;
                            } else {
                                const t = allThreads[name];
                                t.totalCount += data.totalCount;
                                t.timestamps = Array.from(new Set([...t.timestamps, ...data.timestamps])).sort((a, b) => a - b);
                                t.daysActive = Array.from(new Set([...t.daysActive, ...data.daysActive])).sort();
                                Object.entries(data.catCounts).forEach(([k, v]) => t.catCounts[k] = (t.catCounts[k] || 0) + v);
                                Object.entries(data.msgStats.types).forEach(([k, v]) => t.msgStats.types[k] = (t.msgStats.types[k] || 0) + v);
                                t.msgStats.totalWords += data.msgStats.totalWords;
                                t.msgStats.emojiCount += data.msgStats.emojiCount;
                                data.heatmap.forEach((row, d) => row.forEach((v, h) => t.heatmap[d][h] += v));
                                
                                const mergeNested = (target: Record<string, Record<string, number>>, source: Record<string, Record<string, number>>) => {
                                    Object.entries(source).forEach(([k, v]) => {
                                        if (!target[k]) target[k] = {};
                                        Object.entries(v).forEach(([s, count]) => target[k][s] = (target[k][s] || 0) + count);
                                    });
                                };
                                mergeNested(t.wdDetails, data.wdDetails);
                                mergeNested(t.hDetails, data.hDetails);
                                mergeNested(t.slotDetails, data.slotDetails);
                                Object.entries(data.timelineCounts).forEach(([day, v]) => {
                                    if (!t.timelineCounts[day]) t.timelineCounts[day] = { total: 0, senders: {} };
                                    t.timelineCounts[day].total += v.total;
                                    Object.entries(v.senders).forEach(([s, count]) => t.timelineCounts[day].senders[s] = (t.timelineCounts[day].senders[s] || 0) + count);
                                });
                                Object.entries(data.peakTrackers).forEach(([type, tracker]) => {
                                    Object.entries(tracker).forEach(([k, v]) => t.peakTrackers[type][k] = (t.peakTrackers[type][k] || 0) + v);
                                });
                            }
                        });

                        completedWorkers++;
                        worker.terminate();

                        if (completedWorkers === numWorkers) {
                            setSocialCircleData({ rawThreads: allThreads, isInitialized: true });
                            setStatus("idle");
                            setWorkerProgress({});
                        }
                    }
                };

                worker.postMessage({
                    files: chunks[i],
                    timezoneOffset,
                    systemOffset,
                    workerId: i
                });
            }
        }, 10);
    };

    const data = useMemo(() => {
        const threadList = Object.values(rawThreads);
        if (threadList.length === 0) return null;

        const filteredThreads = excludeGroupChats 
            ? threadList.filter(t => !t.isGroup)
            : threadList;

        if (filteredThreads.length === 0) return { empty: true };

        const totalCount = filteredThreads.reduce((acc, t) => acc + t.totalCount, 0);
        const allParticipants = new Set<string>();
        const allDays = new Set<string>();
        const catCounts: Record<string, number> = {};
        const msgStatsTypes: Record<string, number> = {};
        let totalWords = 0;
        let emojiCount = 0;
        const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
        const wdDetails: Record<string, Record<string, number>> = {};
        const hDetails: Record<string, Record<string, number>> = {};
        const slotDetails: Record<string, Record<string, number>> = {};
        const dailyThreadCounts: Record<string, Record<string, number>> = {};
        const peakTrackers: Record<string, Record<string, number>> = {
            year: {}, month: {}, day: {}, hour: {}
        };
        const allTimestamps: number[] = [];

        const dayBuckets: Record<string, { total: number; senders: Record<string, number> }> = {};

        filteredThreads.forEach((t: ThreadData) => {
            t.participants.forEach((x: string) => allParticipants.add(x));
            t.daysActive.forEach((x: string) => allDays.add(x));
            Object.entries(t.catCounts).forEach(([k, v]: [string, number]) => catCounts[k] = (catCounts[k] || 0) + v);
            Object.entries(t.msgStats.types).forEach(([k, v]: [string, number]) => msgStatsTypes[k] = (msgStatsTypes[k] || 0) + v);
            totalWords += t.msgStats.totalWords;
            emojiCount += t.msgStats.emojiCount;
            
            t.heatmap.forEach((row: number[], d: number) => {
                row.forEach((count: number, h: number) => heatmap[d][h] += count);
            });

            const mergeDetails = (target: Record<string, Record<string, number>>, source: Record<string, Record<string, number>>) => {
                Object.entries(source).forEach(([key, senders]) => {
                    if (!target[key]) target[key] = {};
                    Object.entries(senders).forEach(([s, v]) => target[key][s] = (target[key][s] || 0) + v);
                });
            };

            mergeDetails(wdDetails, t.wdDetails);
            mergeDetails(hDetails, t.hDetails);
            mergeDetails(slotDetails, t.slotDetails);

            Object.entries(t.timelineCounts).forEach(([day, dData]: [string, any]) => {
                if (!dayBuckets[day]) dayBuckets[day] = { total: 0, senders: {} };
                dayBuckets[day].total += dData.total;
                Object.entries(dData.senders as Record<string, number>).forEach(([s, v]) => {
                    dayBuckets[day].senders[s] = (dayBuckets[day].senders[s] || 0) + v;
                });
            });

            Object.entries(t.peakTrackers).forEach(([type, tracker]: [string, any]) => {
                Object.entries(tracker as Record<string, number>).forEach(([k, v]) => {
                    peakTrackers[type][k] = (peakTrackers[type][k] || 0) + v;
                });
            });

            allTimestamps.push(...t.timestamps);
            
            const threadDayCounts: Record<string, number> = {};
            Object.entries(t.timelineCounts).forEach(([day, dData]: [string, any]) => {
                threadDayCounts[day] = dData.total;
            });
            dailyThreadCounts[t.threadName] = threadDayCounts;
        });

        allTimestamps.sort((a, b) => a - b);
        const longestGap = { ms: 0, start: 0, end: 0 };
        const longestStreak = { count: 0, start: 0, end: 0 };
        const systemOffset = getSystemOffset();

        let currentStreak = 0;
        let lastDayKey = "";
        let currentStreakStartTs = 0;

        for (let i = 0; i < allTimestamps.length; i++) {
            const ts = allTimestamps[i];
            if (i > 0) {
                const gap = ts - allTimestamps[i - 1];
                if (gap > longestGap.ms) {
                    longestGap.ms = gap;
                    longestGap.start = allTimestamps[i - 1];
                    longestGap.end = ts;
                }
            }

            const d = new Date(ts + (timezoneOffset - systemOffset) * 60000);
            const dy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

            if (dy !== lastDayKey) {
                if (lastDayKey) {
                    const lastDate = new Date(lastDayKey);
                    const currDate = new Date(dy);
                    const diff = (currDate.getTime() - lastDate.getTime()) / 86400000;
                    if (Math.round(diff) === 1) currentStreak++;
                    else {
                        currentStreak = 1;
                        currentStreakStartTs = ts;
                    }
                } else {
                    currentStreak = 1;
                    currentStreakStartTs = ts;
                }
                lastDayKey = dy;
            }
            if (currentStreak > longestStreak.count) {
                longestStreak.count = currentStreak;
                longestStreak.start = currentStreakStartTs;
                longestStreak.end = ts;
            }
        }

        // Days without any message calculation
        const firstTs = allTimestamps[0];
        const lastTs = allTimestamps[allTimestamps.length - 1];
        const startD = new Date(firstTs + (timezoneOffset - systemOffset) * 60000);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(lastTs + (timezoneOffset - systemOffset) * 60000);
        endD.setHours(0, 0, 0, 0);
        const totalRangeDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
        const daysActiveCount = allDays.size;
        const daysWithoutActivity = Math.max(0, totalRangeDays - daysActiveCount);
        const inactivityPercentage = totalRangeDays > 0 ? ((daysWithoutActivity / totalRangeDays) * 100).toFixed(1) : "0";
        const activityPercentage = totalRangeDays > 0 ? ((daysActiveCount / totalRangeDays) * 100).toFixed(1) : "0";

        const findPeak = (tracker: Record<string, number>) => {
            let max = { key: "N/A", val: 0 };
            for (const [k, v] of Object.entries(tracker)) {
                if (v > max.val) max = { key: k, val: v };
            }
            return max;
        };

        const sortedDayKeys = Object.keys(dayBuckets).sort();
        const aggregatedTimeline: Record<string, { total: number; senders: Record<string, number> }> = {};

        if (sortedDayKeys.length > 0) {
            const firstDay = sortedDayKeys[0];
            const lastDay = sortedDayKeys[sortedDayKeys.length - 1];
            const curr = new Date(firstDay);
            const end = new Date(lastDay);

            while (curr <= end) {
                const dayKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`;
                
                let aggKey = dayKey;
                if (granularity === "week") {
                    const sw = new Date(curr);
                    const dOfWeek = sw.getDay();
                    const diff = sw.getDate() - dOfWeek + (dOfWeek === 0 ? -6 : 1);
                    sw.setDate(diff);
                    aggKey = `${sw.getFullYear()}-${String(sw.getMonth() + 1).padStart(2, "0")}-${String(sw.getDate()).padStart(2, "0")}`;
                } else if (granularity === "month") {
                    aggKey = dayKey.substring(0, 7);
                }

                if (!aggregatedTimeline[aggKey]) {
                    aggregatedTimeline[aggKey] = { total: 0, senders: {} };
                }

                const dayData = dayBuckets[dayKey];
                if (dayData) {
                    aggregatedTimeline[aggKey].total += dayData.total;
                    Object.entries(dayData.senders).forEach(([s, v]) => {
                        aggregatedTimeline[aggKey].senders[s] = (aggregatedTimeline[aggKey].senders[s] || 0) + v;
                    });
                }
                curr.setDate(curr.getDate() + 1);
            }
        }

        const sortedAggKeys = Object.keys(aggregatedTimeline).sort();
        const formattedHeatmap: [number, number, number][] = [];
        for (let d = 0; d < 7; d++) {
            for (let h = 0; h < 24; h++) {
                formattedHeatmap.push([h, d, heatmap[d][h]]);
            }
        }

        return {
            filteredCount: totalCount,
            totalChats: filteredThreads.length,
            participantsCount: allParticipants.size,
            daysActiveCount: daysActiveCount,
            totalRangeDays,
            activityPercentage,
            categoryCounts: Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            messageStats: {
                total: totalCount,
                types: msgStatsTypes,
                totalWords,
                emojiCount,
                longestGap,
                longestStreak,
                daysWithoutActivity,
                inactivityPercentage,
                peaks: {
                    year: findPeak(peakTrackers.year),
                    month: findPeak(peakTrackers.month),
                    day: findPeak(peakTrackers.day),
                    hour: findPeak(peakTrackers.hour),
                }
            },
            timelineActivity: {
                keys: sortedAggKeys,
                values: sortedAggKeys.map(k => aggregatedTimeline[k].total),
                details: sortedAggKeys.map(k => aggregatedTimeline[k].senders)
            },
            heatmapData: formattedHeatmap,
            weekdayData: heatmap.map(row => row.reduce((a, b) => a + b, 0)),
            hourData: Array.from({ length: 24 }, (_, h) => heatmap.reduce((acc, row) => acc + row[h], 0)),
            weekdayDetails: wdDetails,
            hourDetails: hDetails,
            slotDetails: slotDetails,
            dailyThreadCounts,
            allDates: sortedDayKeys
        };
    }, [rawThreads, excludeGroupChats, timezoneOffset, granularity]);

    const primaryColor = "#D93829";
    const axisLineColor = "#333";
    const labelColor = "#888";

    const totalProgress = Object.values(workerProgress).reduce((acc, curr) => acc + (curr.current / curr.total), 0) / (Object.keys(workerProgress).length || 1);

    const isDataLoaded = data && !("empty" in data);

    const renderSubtleDate = (ts: number, mode: "full" | "date" = "full") => {
        const d = getAdjustedDate(ts, timezoneOffset);
        const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
        const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        return (
            <>
                {mode === "full" ? (
                    <>
                        {dateStr}
                        <span className="text-[#888] font-normal opacity-60 px-1">at</span>
                        {timeStr}
                    </>
                ) : dateStr}
            </>
        );
    };

    return (
        <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-500 pb-32">
            {/* Top Header & Dropzone */}
            <div className="col-span-12 space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-[family-name:var(--font-outfit)] font-black uppercase tracking-tighter text-[#111] dark:text-[#EAE8E3]">
                        Social Circle Analysis
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#888] max-w-3xl mx-auto leading-relaxed">
                        Holistic view of your digital social sphere. Upload your entire <span className="bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111] px-1.5 py-0.5 rounded-sm">inbox</span> folder for complete network mapping. Data remains local.
                    </p>
                </div>

                <div 
                    className="w-full border-2 border-dashed border-[#ccc] dark:border-[#444] bg-[#F5F5F5]/50 dark:bg-[#1A1A1A]/50 hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors p-16 flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden"
                    onClick={() => status === "idle" && folderInputRef.current?.click()}
                >
                    {status !== "idle" ? (
                        <div className="flex flex-col items-center gap-6 w-full max-w-md z-10">
                            <div className="w-12 h-1 border-4 border-[#ccc] border-t-[#D93829] rounded-full animate-spin" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#111] dark:text-[#EAE8E3] animate-pulse">
                                    {status === "checking" ? "Checking Files..." : "Parsing Complete Inbox..."}
                                </div>
                                {status === "parsing" && (
                                    <>
                                        <div className="w-full h-1 bg-[#ccc] dark:bg-[#333] relative">
                                            <div 
                                                className="h-full bg-[#D93829] transition-all duration-300"
                                                style={{ width: `${totalProgress * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-[8px] uppercase font-bold text-[#888]">
                                                Processing {Object.keys(workerProgress).length} threads in parallel
                                            </div>
                                            <div className="text-[8px] font-mono text-[#D93829] truncate max-w-xs">
                                                {Object.values(workerProgress).map(p => p.fileName).find(f => f) || "Initializing..."}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 z-10">
                            <div className="text-lg font-bold uppercase tracking-widest text-[#111] dark:text-[#EAE8E3] group-hover:text-[#D93829] transition-colors">
                                {Object.keys(rawThreads).length > 0 ? "Update Data Corpus" : "Drop Inbox Folder Here"}
                            </div>
                            <div className="text-[10px] uppercase font-bold text-[#888]">
                                Or click to browse archives
                            </div>
                        </div>
                    )}

                    {status === "parsing" && (
                        <div 
                            className="absolute inset-0 bg-[#D93829]/5 animate-pulse"
                            style={{ opacity: totalProgress }}
                        />
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <button 
                        onClick={() => folderInputRef.current?.click()}
                        className="px-6 py-3 bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] text-[10px] font-black uppercase tracking-widest hover:bg-[#D93829] hover:border-[#D93829] hover:text-white transition-all shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3] active:translate-y-0.5 active:shadow-none"
                    >
                        + Add Inbox Folder
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] text-[10px] font-black uppercase tracking-widest hover:bg-[#D93829] hover:border-[#D93829] hover:text-white transition-all shadow-[4px_4px_0px_0px_#111] dark:shadow-[4px_4px_0px_0px_#EAE8E3] active:translate-y-0.5 active:shadow-none"
                    >
                        + Add JSON Files
                    </button>
                    {Object.keys(rawThreads).length > 0 && (
                        <button 
                            onClick={() => setSocialCircleData({ rawThreads: {}, isInitialized: false })}
                            className="px-6 py-3 bg-white dark:bg-[#111] border-2 border-[#D93829] text-[#D93829] text-[10px] font-black uppercase tracking-widest hover:bg-[#D93829] hover:text-white transition-all shadow-[4px_4px_0px_0px_#D93829] active:translate-y-0.5 active:shadow-none"
                        >
                            Clear All Data
                        </button>
                    )}
                    
                    <input 
                        type="file" 
                        ref={folderInputRef} 
                        className="hidden" 
                        {...({ webkitdirectory: "", directory: "" } as any)}
                        multiple 
                        onChange={handleFilesSelected}
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        onChange={handleFilesSelected}
                    />
                </div>

                <div className="flex justify-center">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={excludeGroupChats} 
                                onChange={(e) => setExcludeGroupChats(e.target.checked)}
                            />
                            <div className={`w-5 h-5 border-2 transition-all ${excludeGroupChats ? "bg-[#D93829] border-[#D93829]" : "border-[#ccc] dark:border-[#444] group-hover:border-[#D93829]"}`}>
                                {excludeGroupChats && (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4 absolute top-0.5 left-0.5">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${excludeGroupChats ? "text-[#D93829]" : "text-[#555] dark:text-[#aaa]"}`}>
                            Exclude group chats (only analyze 1 on 1 chats)
                        </span>
                    </label>
                </div>
            </div>

            <div className="col-span-12 mt-12 mb-6 h-[2px] bg-[#111]/10 dark:bg-[#EAE8E3]/10 relative">
                <div className="absolute top-0 left-0 w-32 h-full bg-[#D93829]" />
            </div>

            {/* KPI Row */}
            <div className="col-span-12 grid grid-cols-4 gap-6 mb-6">
                {[
                    ["Total Messages", isDataLoaded ? data?.filteredCount?.toLocaleString() : "---"],
                    ["Total Chats", isDataLoaded ? (
                        <div className="flex items-baseline gap-1.5">
                            {data?.totalChats?.toLocaleString()}
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#888] lowercase">
                                ({data?.participantsCount?.toLocaleString()} unique participants)
                                <InfoTooltip content="Unique participant count may be slightly inaccurate if different accounts share the exact same display name." />
                            </div>
                        </div>
                    ) : "---"],
                    ["Media Files", isDataLoaded ? data?.categoryCounts?.filter((c: any) => c.name !== "Text").reduce((acc: number, curr: any) => acc + curr.value, 0).toLocaleString() : "---"],
                    ["Days Active", isDataLoaded ? (
                        <div className="flex items-baseline gap-1.5">
                            {data?.daysActiveCount?.toLocaleString()}
                            <span className="text-[10px] font-bold text-[#888] lowercase">
                                ({data?.activityPercentage}% of {data?.totalRangeDays} days)
                            </span>
                        </div>
                    ) : "---"]
                ].map(([label, val], idx) => (
                    <div key={label as string} className={`p-6 shadow-sm border ${idx === 0 ? "bg-[#111] text-[#EAE8E3] dark:bg-[#EAE8E3] dark:text-[#111] border-transparent" : "bg-white dark:bg-[#1A1A1A] border-[#EAE8E3] dark:border-[#333]"}`}>
                        <div className={`text-[10px] uppercase tracking-widest font-black mb-2 ${idx === 0 ? "text-[#888] dark:text-[#555]" : "text-[#888]"}`}>
                            {label as string}
                        </div>
                        <div className={`text-4xl font-[family-name:var(--font-outfit)] font-bold ${idx !== 0 ? "text-[#D93829]" : ""}`}>
                            {val}
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart Row */}
            <div className="col-span-12 grid grid-cols-12 gap-6 items-stretch">
                <div className="col-span-8 flex flex-col h-full">
                    {isDataLoaded ? (
                        <TimelineProjection
                            timelineData={data.timelineActivity}
                            granularity={granularity as any}
                            setGranularity={setGranularity as any}
                            allowedGranularities={["day", "week", "month"]}
                            colors={{
                                primary: primaryColor,
                                axis: axisLineColor,
                                label: labelColor,
                            }}
                        />
                    ) : (
                        <div className="w-full h-full min-h-[300px] bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] flex flex-col items-center justify-center opacity-30 grayscale">
                            <div className="w-12 h-1 bg-[#111] dark:bg-[#EAE8E3] mb-4" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#888]">
                                {data && "empty" in data ? "No 1-on-1 Chats Found" : "No Data Available"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="col-span-4 flex flex-col h-full bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] border-t-4 border-t-[#D93829] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] transition-all">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 bg-[#D93829]" />
                        <span className="text-[10px] uppercase tracking-widest font-black text-[#555] dark:text-[#aaa]">
                            Message Statistics
                        </span>
                    </div>

                    {isDataLoaded ? (
                        <div className="space-y-4">
                            <div className="flex justify-between border-b-2 border-[#111] dark:border-[#EAE8E3] pb-1">
                                <span className="text-xs font-bold uppercase">Total Messages</span>
                                <span className="text-xs font-bold font-[family-name:var(--font-outfit)]">
                                    {data.messageStats.total.toLocaleString()}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-[10px] text-[#555] dark:text-[#aaa] font-bold uppercase">
                                {[
                                    ["Text", "text"], ["Links", "links", false, "Total URLs found - not number of messages with at least one link."],
                                    ["Images", "images"], ["GIFs", "gifs"], ["Videos", "videos"],
                                    ["Stickers", "stickers"], ["Audio", "audio"], ["Files", "files"],
                                    ["Unsent", "unsent"], ["Emojis", "emojiCount", true],
                                ].map(([label, key, isDirect, tooltip]) => (
                                    <div key={label as string} className="flex justify-between items-center">
                                        <div className="flex items-center gap-1">
                                            <span>{label as string}</span>
                                            {tooltip && <InfoTooltip content={tooltip as string} />}
                                        </div>
                                        <span>{isDirect ? (data.messageStats as any)[key as string]?.toLocaleString() || 0 : data.messageStats.types?.[key as string]?.toLocaleString() || 0}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333] space-y-2">
                                {[
                                    ["Average messages/day", (data.messageStats.total / (data.daysActiveCount || 1)).toFixed(2)],
                                    ["Average words/message", (data.messageStats.totalWords / (data.messageStats.total || 1)).toFixed(2)],
                                    [
                                        "Longest period without message", 
                                        `${Math.floor(data.messageStats.longestGap.ms / 86400000)}d ${Math.floor((data.messageStats.longestGap.ms % 86400000) / 3600000)}h`, 
                                        <InfoTooltip key="gap" content={
                                            <div className="flex flex-col gap-0.5">
                                                <div><span className="text-[#888] font-normal">From </span>{renderSubtleDate(data.messageStats.longestGap.start, "full")}</div>
                                                <div><span className="text-[#888] font-normal">To </span>{renderSubtleDate(data.messageStats.longestGap.end, "full")}</div>
                                            </div>
                                        } />
                                    ],
                                    [
                                        "Longest daily streak", 
                                        `${data.messageStats.longestStreak.count} days`, 
                                        <InfoTooltip key="streak" content={
                                            <div className="flex flex-col gap-0.5">
                                                <div><span className="text-[#888] font-normal">From </span>{renderSubtleDate(data.messageStats.longestStreak.start, "date")}</div>
                                                <div><span className="text-[#888] font-normal">To </span>{renderSubtleDate(data.messageStats.longestStreak.end, "date")}</div>
                                            </div>
                                        } />
                                    ],
                                    [
                                        "Days without any message",
                                        `${data.messageStats.daysWithoutActivity} days`,
                                        <InfoTooltip key="inactive" content="Days with zero incoming or outgoing activity across the entire archive range." />,
                                        <span key="pct" className="text-[9px] text-[#888] font-normal lowercase ml-1">
                                            ({data.messageStats.inactivityPercentage}%)
                                        </span>
                                    ]
                                ].map(([l, v, tooltip, extra]) => (
                                    <div key={l as string} className="flex justify-between items-end">
                                        <span className="text-[9px] uppercase font-bold text-[#888] flex items-center gap-1">{l as string}{tooltip as any}</span>
                                        <span className="text-sm font-bold font-[family-name:var(--font-outfit)]">
                                            {v as any}{extra as any}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-[#EAE8E3] dark:border-[#333]">
                                <span className="text-[9px] uppercase font-black text-[#D93829] block mb-2">Most Active</span>
                                <div className="space-y-1 text-[10px] font-bold">
                                    {[
                                        ["Year Ever", data.messageStats.peaks.year, "year"],
                                        ["Month Ever", data.messageStats.peaks.month, "month"],
                                        ["Day Ever", data.messageStats.peaks.day, "day"],
                                        ["Hour Ever", data.messageStats.peaks.hour, "hour"]
                                    ].map(([label, p, type]) => (
                                        <div key={label as string} className="flex justify-between uppercase">
                                            <span className="text-[#888]">
                                                {label as string}
                                                <InfoTooltip content={`${(p as any).val.toLocaleString()} messages`} />
                                            </span>
                                            <span className="truncate ml-4">
                                                {type === "year" ? (p as any).key :
                                                 type === "month" ? formatDate(new Date(`${(p as any).key}-01`).getTime(), timezoneOffset, "month") :
                                                 type === "day" ? formatDate(new Date((p as any).key).getTime(), timezoneOffset, "date") :
                                                 renderSubtleDate(new Date((p as any).key).getTime(), "full")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 grayscale">
                            <div className="w-12 h-1 bg-[#111] dark:bg-[#EAE8E3] mb-4 animate-pulse" />
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[#888]">
                                {data && "empty" in data ? "No 1-on-1 Data" : "No Data Available"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-span-12 mt-6">
                <ActivityHeatmap
                    timezoneOffset={timezoneOffset}
                    precomputedData={isDataLoaded ? {
                        heatmapData: data.heatmapData,
                        weekdayData: data.weekdayData,
                        hourData: data.hourData,
                        slotDetails: data.slotDetails,
                        weekdayDetails: data.weekdayDetails,
                        hourDetails: data.hourDetails
                    } as any : null}
                />
            </div>

            {isDataLoaded && (
                <div className="col-span-12 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="mb-12 h-[2px] bg-[#111]/10 dark:bg-[#EAE8E3]/10 relative">
                        <div className="absolute top-0 right-0 w-32 h-full bg-[#D93829]" />
                    </div>
                    <SocialOrbit 
                        dailyThreadCounts={data.dailyThreadCounts}
                        allDates={data.allDates}
                    />
                </div>
            )}
        </div>
    );
}
