"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DateRangePicker } from "../../components/DateRangePicker";
import { DayWindowSlider } from "../../components/dashboard/controls/DayWindowSlider";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useChatStore } from "../../store";
import { CorpusExplorer } from "../../components/dashboard/CorpusExplorer";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const {
		isLoaded,
		threadName,
		owner,
		messages,
		participants,
		selectedParticipants,
		setSelectedParticipants,
		timeRange,
		setTimeRange,
		timezoneOffset,
		setTimezoneOffset,
		sessionGapThreshold,
		setSessionGapThreshold,
		overnightMinGap,
		setOvernightMinGap,
		morningStartHour,
		morningEndHour,
		nightStartHour,
		nightEndHour,
		setDayWindows,
		doubleTextMinGap,
		doubleTextMaxGap,
		setDoubleTextGaps,
		maxResponseGapThreshold,
		setMaxResponseGapThreshold,
		isExplorerOpen,
		setExplorerOpen,
		toggleExplorer,
	} = useChatStore();
	const router = useRouter();
	const pathname = usePathname();

	// Mounted check to prevent hydration mismatch on client-only stores
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const [timeHorizon, setTimeHorizon] = useState<"all" | "ytd" | "custom">(
		"all",
	);
	const [isSelectorOpen, setIsSelectorOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const selectedSet = useMemo(
		() => new Set(selectedParticipants),
		[selectedParticipants],
	);

	// Ensure owner is included in the list for selection
	const allParticipants = useMemo(() => {
		const set = new Set(participants);
		if (owner) set.add(owner);
		return Array.from(set).filter(Boolean).sort();
	}, [participants, owner]);

	if (mounted && !isLoaded && process.env.NODE_ENV !== "development") {
		// router.push("/");
	}

	const displayThread = useMemo(() => {
		if (!isLoaded) return "Structural Analysis";
		const realParticipants = participants.filter(p => p !== "Meta AI");
		if (realParticipants.length > 2) return threadName; // Group chat
		const other = realParticipants.find(p => p !== owner);
		return other || threadName;
	}, [isLoaded, participants, owner, threadName]);

	const msgCount = messages.length || 0;

	const navItems = [
		{ name: "Overview", path: "/dashboard" },
		{ name: "Language", path: "/dashboard/language" },
		{ name: "Engagement", path: "/dashboard/engagement" },
		{ name: "Calls", path: "/dashboard/calls" },
		{ name: "Social Circle", path: "/dashboard/social-circle" },
	];

	if (!mounted) return null;

	return (
		<div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0A0A0A] flex font-[family-name:var(--font-outfit)] text-[#111111] dark:text-[#EAE8E3] selection:bg-[#D93829] selection:text-white">
			{/* Sidebar - Navigation (Subdued, takes less attention but clearly visible) */}
			<aside className="w-64 bg-white dark:bg-[#111111] border-r border-[#EAE8E3] dark:border-[#333] flex flex-col fixed h-screen z-20">
				<div className="p-6 border-b border-[#EAE8E3] dark:border-[#333]">
					<div className="w-6 h-6 bg-[#D93829] mb-4" />
					<h1
						className="text-xl font-[family-name:var(--font-playfair)] font-bold leading-tight truncate"
						title={displayThread}
					>
						{displayThread}
					</h1>
					<div className="text-[10px] uppercase tracking-widest text-[#888] mt-2">
						Vol: {msgCount.toLocaleString()}
					</div>
				</div>

				<nav className="flex flex-col py-4 flex-1">
					{navItems.map((item) => {
						const isActive = pathname === item.path;
						return (
							<button
								type="button"
								key={item.name}
								onClick={() => router.push(item.path)}
								className={`text-left px-6 py-4 text-xs uppercase tracking-widest font-bold transition-all border-l-2 ${
									isActive
										? "border-[#D93829] bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#D93829]"
										: "border-transparent text-[#555] dark:text-[#888] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#111111] dark:hover:text-[#EAE8E3]"
								}`}
							>
								{item.name}
							</button>
						);
					})}
				</nav>

				<div className="p-6 border-t border-[#EAE8E3] dark:border-[#333]">
					<ThemeToggle className="w-full h-10 border-2" />
				</div>
			</aside>

			{/* Main Area */}
			<div className="ml-64 flex-1 flex flex-col min-h-screen">
				{/* Pinned Global Controls Header */}
				<header className="h-20 bg-white/90 dark:bg-[#111111]/90 backdrop-blur border-b border-[#EAE8E3] dark:border-[#333] sticky top-0 z-40 px-8 flex items-center justify-between shadow-sm">
					{/* Left: Participant Selector Placeholder */}
					<div className="flex items-center gap-4">
						<span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
							Select Participants
						</span>
						<div className="flex gap-2 items-center">
							<button
								type="button"
								onClick={() => setSelectedParticipants(allParticipants)}
								className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-colors ${selectedParticipants.length === allParticipants.length ? "bg-[#111111] text-white dark:bg-[#EAE8E3] dark:text-[#111111] border-transparent" : "bg-transparent text-[#555] dark:text-[#aaa] border-[#ccc] dark:border-[#444] hover:border-[#111111] dark:hover:border-[#EAE8E3]"}`}
							>
								All
							</button>

							<div className="relative">
								<button
									type="button"
									onClick={() => setIsSelectorOpen(!isSelectorOpen)}
									className={`px-4 py-1.5 text-xs font-bold rounded-full border border-dashed transition-colors flex items-center gap-2 ${isSelectorOpen ? "border-[#D93829] text-[#D93829]" : "bg-transparent text-[#555] dark:text-[#aaa] border-[#ccc] dark:border-[#444] hover:border-[#111111] dark:hover:border-[#EAE8E3]"}`}
								>
									<span className="w-1.5 h-1.5 bg-[#D93829]" />
									Filter ({selectedParticipants.length}/{allParticipants.length}
									)
								</button>

								{isSelectorOpen && (
									<>
										<div
											className="fixed inset-0 z-20"
											onClick={() => setIsSelectorOpen(false)}
										/>
										<div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#111111] border-2 border-[#111111] dark:border-[#EAE8E3] shadow-[6px_6px_0px_0px_#D93829] z-30 flex flex-col">
											<div className="p-3 border-b border-[#EAE8E3] dark:border-[#333] flex flex-col gap-3 bg-[#F5F5F5] dark:bg-[#1A1A1A]">
												<div className="flex justify-between items-center">
													<span className="text-[10px] uppercase font-bold tracking-widest">
														Participants
													</span>
													<div className="flex gap-3">
														<button
															type="button"
															onClick={() =>
																setSelectedParticipants(allParticipants)
															}
															className="text-[10px] uppercase font-bold text-[#D93829] hover:underline"
														>
															All
														</button>
														<button
															type="button"
															onClick={() => setSelectedParticipants([])}
															className="text-[10px] uppercase font-bold text-[#D93829] hover:underline"
														>
															Clear
														</button>
													</div>
												</div>
												<input
													type="text"
													placeholder="Search participants..."
													autoFocus
													value={searchTerm}
													className="w-full bg-white dark:bg-[#111] border border-[#ccc] dark:border-[#444] px-3 py-1.5 text-xs font-bold focus:border-[#111] dark:focus:border-[#EAE8E3] outline-none transition-colors"
													onChange={(e) => setSearchTerm(e.target.value)}
												/>
											</div>
											<div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
												{allParticipants
													.filter(
														(p) =>
															!searchTerm ||
															p
																.toLowerCase()
																.includes(searchTerm.toLowerCase()),
													)
													.map((p) => {
														const isSelected = selectedSet.has(p);
														return (
															<button
																key={p}
																type="button"
																onClick={() => {
																	if (isSelected) {
																		setSelectedParticipants(
																			selectedParticipants.filter(
																				(sp) => sp !== p,
																			),
																		);
																	} else {
																		setSelectedParticipants([
																			...selectedParticipants,
																			p,
																		]);
																	}
																}}
																className={`flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all text-left ${
																	isSelected
																		? "bg-[#111111] text-white dark:bg-[#EAE8E3] dark:text-[#111111]"
																		: "hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] text-[#555] dark:text-[#aaa]"
																}`}
															>
																<div
																	className={`w-3 h-3 border ${isSelected ? "bg-[#D93829] border-transparent" : "border-[#ccc] dark:border-[#444]"}`}
																/>
																<span className="truncate">{p}</span>
															</button>
														);
													})}
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Right: Time Range Slicer Placeholder */}
					<div className="flex items-center gap-4 ml-12">
						<span className="text-[10px] uppercase tracking-widest font-bold text-[#888]">
							Time Range
						</span>
						<div className="flex items-center bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-sm border-2 border-[#EAE8E3] dark:border-[#333] p-1 gap-1">
							<button
								type="button"
								onClick={() => {
									setTimeHorizon("all");
									setTimeRange([null, null]);
								}}
								className={`px-3 py-1.5 text-xs font-bold transition-colors ${timeHorizon === "all" ? "bg-white dark:bg-[#333] shadow-sm text-[#111111] dark:text-white" : "text-[#555] dark:text-[#aaa] hover:text-[#111111] dark:hover:text-white"}`}
							>
								All Time
							</button>
							<button
								type="button"
								onClick={() => {
									setTimeHorizon("ytd");
									const start = new Date(new Date().getFullYear(), 0, 1);
									setTimeRange([start, new Date()]);
								}}
								className={`px-3 py-1.5 text-xs font-bold transition-colors ${timeHorizon === "ytd" ? "bg-white dark:bg-[#333] shadow-sm text-[#111111] dark:text-white" : "text-[#555] dark:text-[#aaa] hover:text-[#111111] dark:hover:text-white"}`}
							>
								YTD
							</button>
							<button
								type="button"
								onClick={() => setTimeHorizon("custom")}
								className={`px-3 py-1.5 text-xs font-bold transition-colors ${timeHorizon === "custom" ? "bg-white dark:bg-[#333] shadow-sm text-[#111111] dark:text-white" : "text-[#555] dark:text-[#aaa] hover:text-[#111111] dark:hover:text-white"}`}
							>
								Custom
							</button>
						</div>

						{/* Render Date Picker only if Custom is selected */}
						{timeHorizon === "custom" && (
							<DateRangePicker
								startDate={timeRange[0]}
								endDate={timeRange[1]}
								onChange={(s, e) => setTimeRange([s, e])}
							/>
						)}
					</div>

					{/* Right Controls Group */}
					<div className="flex items-center gap-3 ml-auto">
						{/* Corpus Explorer Toggle */}
						<button
							type="button"
							onClick={toggleExplorer}
							className={`p-2 border-2 transition-colors ${isExplorerOpen ? "border-[#D93829] bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "border-[#EAE8E3] dark:border-[#333] text-[#888] hover:border-[#111] dark:hover:border-[#EAE8E3]"}`}
							title="Corpus Explorer (Data Management)"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								className="w-4 h-4"
							>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
						</button>

						{/* Settings Popover */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsSettingsOpen(!isSettingsOpen)}
								className={`p-2 border-2 transition-colors ${isSettingsOpen ? "border-[#D93829] bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "border-[#EAE8E3] dark:border-[#333] text-[#888] hover:border-[#111] dark:hover:border-[#EAE8E3]"}`}
								title="Dashboard Settings"
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									className="w-4 h-4"
								>
									<circle cx="12" cy="12" r="3" />
									<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
								</svg>
							</button>

							{isSettingsOpen && (
								<>
									<div
										className="fixed inset-0 z-20"
										onClick={() => setIsSettingsOpen(false)}
									/>
									<div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] shadow-[12px_12px_0px_0px_#111] dark:shadow-[12px_12px_0px_0px_#EAE8E3] z-50 p-8 flex flex-col gap-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
									<section>
										<h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#D93829] mb-6 flex items-center gap-2">
											<div className="w-2 h-2 bg-[#D93829]" />
											Temporal Calibration
										</h4>
										<div className="flex flex-col gap-6">
											<div className="space-y-3">
												<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
													<span>Timezone Offset</span>
													<span className="text-[#111] dark:text-[#EAE8E3]">
														UTC {timezoneOffset >= 0 ? "+" : ""}
														{timezoneOffset / 60}
													</span>
												</label>
												<input
													type="range"
													min="-720"
													max="840"
													step="30"
													value={timezoneOffset}
													onChange={(e) =>
														setTimezoneOffset(Number(e.target.value))
													}
													className="w-full accent-[#D93829] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
												/>
											</div>

											<div className="space-y-3">
												<label className="text-[10px] uppercase font-bold text-[#888]">
													Day Windows
												</label>
												<p className="text-[8px] text-[#888] font-bold uppercase leading-tight">
													Drag handles to set when Night ends and Morning
													begins. Night wraps across midnight.
												</p>
												<DayWindowSlider
													nightEnd={nightEndHour}
													morningStart={morningStartHour}
													morningEnd={morningEndHour}
													nightStart={nightStartHour}
													onChange={(nE, mS, mE, nS) =>
														setDayWindows(nE, mS, mE, nS)
													}
												/>
											</div>

											<div className="space-y-3">
												<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
													<span>Overnight Min Gap</span>
													<span className="text-[#111] dark:text-[#EAE8E3]">
														{overnightMinGap / 60}h
													</span>
												</label>
												<input
													type="range"
													min="60"
													max="480"
													step="30"
													value={overnightMinGap}
													onChange={(e) =>
														setOvernightMinGap(Number(e.target.value))
													}
													className="w-full accent-[#D93829] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
												/>
												<p className="text-[8px] uppercase font-bold text-[#888] leading-tight">
													Minimum gap to classify as an overnight break (sleep
													boundary).
												</p>
											</div>
										</div>
									</section>

									<section className="border-t border-[#EAE8E3] dark:border-[#333] pt-8">
										<h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#0055A4] mb-6 flex items-center gap-2">
											<div className="w-2 h-2 bg-[#0055A4]" />
											Session Boundaries
										</h4>
										<div className="space-y-4">
											<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
												<span>Inactivity Threshold</span>
												<span className="text-[#111] dark:text-[#EAE8E3]">
													{sessionGapThreshold}m
												</span>
											</label>
											<input
												type="range"
												min="3"
												max="120"
												step="1"
												value={sessionGapThreshold}
												onChange={(e) =>
													setSessionGapThreshold(Number(e.target.value))
												}
												className="w-full accent-[#0055A4] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
											/>
											<p className="text-[8px] uppercase font-bold text-[#888] leading-tight">
												Defines when a conversation session is considered
												terminated.
											</p>
										</div>

										<div className="space-y-4">
											<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
												<span>Max Response Filter</span>
												<span className="text-[#111] dark:text-[#EAE8E3]">
													{maxResponseGapThreshold} days
												</span>
											</label>
											<input
												type="range"
												min="1"
												max="60"
												step="1"
												value={maxResponseGapThreshold}
												onChange={(e) =>
													setMaxResponseGapThreshold(Number(e.target.value))
												}
												className="w-full accent-[#0055A4] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
											/>
											<p className="text-[8px] uppercase font-bold text-[#888] leading-tight">
												Ignore responses longer than this to avoid extreme
												outliers skewing metrics.
											</p>
										</div>
									</section>

									<section className="border-t border-[#EAE8E3] dark:border-[#333] pt-8">
										<h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-[#FFCC00] mb-6 flex items-center gap-2">
											<div className="w-2 h-2 bg-[#FFCC00]" />
											Engagement Patterns
										</h4>
										<div className="space-y-6">
											<div className="space-y-3">
												<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
													<span>Double Text Min Gap</span>
													<span className="text-[#111] dark:text-[#EAE8E3]">
														{doubleTextMinGap}m
													</span>
												</label>
												<input
													type="range"
													min="1"
													max="30"
													step="1"
													value={doubleTextMinGap}
													onChange={(e) =>
														setDoubleTextGaps(
															Number(e.target.value),
															doubleTextMaxGap,
														)
													}
													className="w-full accent-[#FFCC00] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
												/>
											</div>
											<div className="space-y-3">
												<label className="text-[10px] uppercase font-bold text-[#888] flex justify-between">
													<span>Double Text Max Gap</span>
													<span className="text-[#111] dark:text-[#EAE8E3]">
														{doubleTextMaxGap}m
													</span>
												</label>
												<input
													type="range"
													min="30"
													max="720"
													step="10"
													value={doubleTextMaxGap}
													onChange={(e) =>
														setDoubleTextGaps(
															doubleTextMinGap,
															Number(e.target.value),
														)
													}
													className="w-full accent-[#FFCC00] h-1.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] appearance-none border border-[#EAE8E3] dark:border-[#333]"
												/>
											</div>
										</div>
									</section>
								</div>
							</>
							)}
						</div>
					</div>
				</header>

				{/* Dynamic Page Content */}
				<main className="flex-1 p-8">
					<div className="max-w-7xl mx-auto">{children}</div>
				</main>
			</div>

			{/* Corpus Explorer Drawer */}
			<CorpusExplorer />
		</div>
	);
}
