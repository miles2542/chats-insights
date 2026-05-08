"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTree } from "../../lib/files";
import { deduplicateMessages } from "../../lib/parsers/dedup";
import type { NormalizedMessage } from "../../lib/parsers/types";
import { type FileNode, useChatStore } from "../../store";
import type { WorkerRequest, WorkerResponse } from "../../workers/parse-worker";

type CorpusExplorerProps = {};

interface TutorialOverlayProps {
	step: 1 | 2 | 3 | 4;
	onNext: () => void;
	onSkip: () => void;
	targets: {
		pending: HTMLElement | null;
		actions: HTMLElement | null;
		process: HTMLElement | null;
		active: HTMLElement | null;
	};
}

function TutorialOverlay({
	step,
	onNext,
	onSkip,
	targets,
}: TutorialOverlayProps) {
	const currentTarget = useMemo(() => {
		if (step === 1) return targets.pending;
		if (step === 2) return targets.actions;
		if (step === 3) return targets.process || targets.pending;
		return targets.active || targets.pending;
	}, [step, targets]);

	const [coords, setCoords] = useState({
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	});

	// Auto-scroll target into view when step changes
	useEffect(() => {
		if (currentTarget) {
			currentTarget.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [step, currentTarget]);

	useEffect(() => {
		if (!currentTarget) return;

		let rafId: number;
		const update = () => {
			const rect = currentTarget.getBoundingClientRect();
			if (rect.width > 0) {
				setCoords({
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
				});
			}
			rafId = requestAnimationFrame(update);
		};

		rafId = requestAnimationFrame(update);
		return () => cancelAnimationFrame(rafId);
	}, [currentTarget]);

	const content = {
		1: {
			num: "01",
			title: "QUEUED",
			body: "Your selected archives are now in the pending queue. They haven't been processed into memory yet.",
		},
		2: {
			num: "02",
			title: "EXPAND",
			body: "You can queue up more folders or individual files here to build a cumulative dataset for analysis.",
		},
		3: {
			num: "03",
			title: "PROCESS",
			body: "When your archive list is ready, hit this to begin local parsing. No data leaves your machine.",
		},
		4: {
			num: "04",
			title: "MODIFY",
			body: "You can always come back to this panel to add more data or remove loaded data as you wish. Just click on the x next to the files and folders to remove them.",
		},
	}[step as 1 | 2 | 3 | 4];

	const maskStyle = {
		clipPath:
			coords.width > 0
				? `polygon(
			0% 0%, 
			0% 100%, 
			${coords.left}px 100%, 
			${coords.left}px ${coords.top}px, 
			${coords.left + coords.width}px ${coords.top}px, 
			${coords.left + coords.width}px ${coords.top + coords.height}px, 
			${coords.left}px ${coords.top + coords.height}px, 
			${coords.left}px 100%, 
			100% 100%, 
			100% 0%
		)`
				: "none",
	};

	if (coords.width === 0) return null;

	const boxWidth = 420;

	return (
		<div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden">
			{/* The Dimmed Layer */}
			<div
				className="absolute inset-0 bg-[#111111]/70 backdrop-blur-[4px] transition-opacity duration-300"
				style={maskStyle}
			/>

			{/* The Content Box */}
			<div
				className="absolute flex flex-col pointer-events-auto transition-all duration-300 ease-out"
				style={{
					top: Math.max(
						100,
						Math.min(
							coords.top + coords.height / 2 - 100,
							window.innerHeight - 350,
						),
					),
					left: Math.max(40, coords.left - (boxWidth + 60)),
					width: boxWidth,
				}}
			>
				<div className="bg-[#EAE8E3] dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] p-10 flex flex-col gap-8 animate-in fade-in slide-in-from-left-8 duration-500 shadow-2xl">
					<div className="flex justify-between items-start">
						<div className="flex items-center gap-6">
							<div className="text-4xl font-black text-[#D93829] leading-none">
								{content.num}
							</div>
							<h4 className="text-2xl font-black uppercase tracking-tighter text-[#111] dark:text-[#EAE8E3]">
								{content.title}
							</h4>
						</div>
					</div>

					<p className="text-xs leading-relaxed uppercase font-bold text-[#111]/80 dark:text-[#EAE8E3]/80 tracking-widest max-w-sm">
						{content.body}
					</p>

					<div className="flex justify-between items-center mt-4 border-t-2 border-[#111] dark:border-[#EAE8E3] pt-8">
						<button
							type="button"
							onClick={onSkip}
							className="text-[9px] uppercase font-black opacity-30 hover:opacity-100 transition-opacity text-[#111] dark:text-[#EAE8E3]"
						>
							Skip Introduction
						</button>
						<button
							type="button"
							onClick={onNext}
							className="bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111] px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#D93829] transition-colors border-2 border-transparent hover:border-white/20"
						>
							{step === 4 ? "UNDERSTOOD" : "NEXT PHASE"}
						</button>
					</div>
				</div>

				{/* Geometric connecting line */}
				<div
					className="absolute top-1/2 -right-10 w-10 h-[2px] bg-[#D93829]"
					style={{ transform: "translateY(-50%)" }}
				/>
			</div>

			{/* Highlight Border */}
			<div
				className="absolute border-2 border-[#D93829] pointer-events-none transition-all duration-300"
				style={{
					top: coords.top - 6,
					left: coords.left - 6,
					width: coords.width + 12,
					height: coords.height + 12,
				}}
			>
				<div className="absolute -top-9 left-0 bg-[#D93829] text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">
					{content.title} / {content.num}
				</div>
			</div>
		</div>
	);
}

export function CorpusExplorer({}: CorpusExplorerProps) {
	const {
		activeFiles,
		queuedFiles,
		setActiveFiles,
		setQueuedFiles,
		messages,
		participants,
		owner,
		setOwner,
		setChatData,
		isExplorerOpen,
		setExplorerOpen,
		hasSeenTutorial,
		setHasSeenTutorial,
		stagedFilesBuffer,
	} = useChatStore();

	const [status, setStatus] = useState<"idle" | "parsing">("idle");
	const [progress, setProgress] = useState({ current: 0, total: 0, text: "" });
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3 | null>(null);

	const folderInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const actionsRef = useRef<HTMLDivElement>(null);
	const pendingRef = useRef<HTMLDivElement>(null);
	const processRef = useRef<HTMLButtonElement>(null);
	const activeRef = useRef<HTMLDivElement>(null);

	// Start tutorial if first time
	useEffect(() => {
		if (isExplorerOpen && !hasSeenTutorial && !tutorialStep) {
			setTutorialStep(1);
		}
	}, [isExplorerOpen, hasSeenTutorial, tutorialStep]);

	const completeTutorial = () => {
		setTutorialStep(null);
		setHasSeenTutorial(true);
	};

	// Keyboard support for Escape
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				// [35] Don't close explorer if a lightbox is currently open
				if (useChatStore.getState().inbox.lightboxMessageId) return;
				if (tutorialStep) setTutorialStep(null);
				else setExplorerOpen(false);
			}
		};
		if (isExplorerOpen) {
			window.addEventListener("keydown", handleEsc);
		}
		return () => window.removeEventListener("keydown", handleEsc);
	}, [isExplorerOpen, setExplorerOpen, tutorialStep]);

	// Auto-expand all folders on mount or when files change
	useEffect(() => {
		const collectFolderIds = (nodes: FileNode[]): string[] => {
			const ids: string[] = [];
			for (const node of nodes) {
				if (node.type === "folder") {
					ids.push(node.id);
					if (node.children) {
						ids.push(...collectFolderIds(node.children));
					}
				}
			}
			return ids;
		};

		const allFolderIds = [
			...collectFolderIds(activeFiles),
			...collectFolderIds(queuedFiles),
		];
		setExpandedNodes((prev) => {
			const next = new Set(prev);
			for (const id of allFolderIds) next.add(id);
			return next;
		});
	}, [activeFiles, queuedFiles]);

	const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
		const fileList = e.target.files;
		if (!fileList) return;

		const newFiles: File[] = Array.from(fileList);
		useChatStore.setState((s) => ({
			stagedFilesBuffer: [...s.stagedFilesBuffer, ...newFiles],
		}));

		const jsonFiles = newFiles.filter((f) => f.name.endsWith(".json"));

		if (jsonFiles.length > 0) {
			const newTree = buildTree(jsonFiles);
			setQueuedFiles([...queuedFiles, ...newTree]);
		}

		// Reset inputs
		if (folderInputRef.current) folderInputRef.current.value = "";
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const removeNode = (
		tree: FileNode[],
		id: string,
		isQueued: boolean,
	): FileNode[] => {
		const newTree = tree
			.filter((n) => n.id !== id)
			.map((n) => ({
				...n,
				children: n.children ? removeNode(n.children, id, isQueued) : undefined,
			}));

		return newTree;
	};

	const getAllRawFiles = (nodes: FileNode[]): File[] => {
		const files: File[] = [];
		for (const node of nodes) {
			if (node.rawFile) files.push(node.rawFile);
			if (node.children) files.push(...getAllRawFiles(node.children));
		}
		return files;
	};

	const { setMediaMap } = useChatStore();

	const handleProcess = useCallback(
		(targetFiles: FileNode[]) => {
			const rawJsonFiles = getAllRawFiles(targetFiles);

			// Populate Media Map from all uploaded files
			const newMediaMap = new Map<string, File>();
			stagedFilesBuffer.forEach((f) => {
				if (!f.name.endsWith(".json")) {
					const path = f.webkitRelativePath || f.name;
					newMediaMap.set(path, f);
				}
			});
			setMediaMap(newMediaMap);

			if (rawJsonFiles.length === 0) {
				setChatData({
					messages: [],
					participants: [],
					threadName: "",
					owner: "",
				});
				return;
			}

			setStatus("parsing");
			setProgress({
				current: 0,
				total: rawJsonFiles.length,
				text: "Initializing Workers...",
			});

			const numWorkers = Math.min(
				navigator.hardwareConcurrency || 4,
				Math.ceil(rawJsonFiles.length / 10),
				8,
			);
			const chunks = Array.from({ length: numWorkers }, () => [] as File[]);
			rawJsonFiles.forEach((f, i) => chunks[i % numWorkers].push(f));

			const allMessages: NormalizedMessage[] = [];
			const finalParticipants = new Set<string>();
			let finalThreadName = "";
			let completedWorkers = 0;

			const finalize = () => {
				const uniqueMessages = deduplicateMessages(allMessages);
				uniqueMessages.sort((a, b) => a.timestampMs - b.timestampMs);

				// Owner Detection
				const counts: Record<string, number> = {};
				for (const m of uniqueMessages) {
					counts[m.senderName] = (counts[m.senderName] || 0) + 1;
				}
				let detectedOwner = "";
				let max = 0;
				for (const [k, v] of Object.entries(counts)) {
					if (v > max) {
						max = v;
						detectedOwner = k;
					}
				}

				setChatData({
					messages: uniqueMessages,
					participants: Array.from(finalParticipants),
					threadName: finalThreadName,
					owner: owner || detectedOwner,
				});

				setStatus("idle");
				setExplorerOpen(false);
			};

			for (let i = 0; i < numWorkers; i++) {
				if (chunks[i].length === 0) {
					completedWorkers++;
					if (completedWorkers === numWorkers) finalize();
					continue;
				}

				const worker = new Worker(
					new URL("../../workers/parse-worker.ts", import.meta.url),
					{ type: "module" },
				);

				worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
					const res = e.data;
					if (res.type === "PROGRESS") {
						setProgress((p) => ({
							...p,
							text: res.status,
							current: p.current + (res.current === res.total ? 1 : 0), // Simplistic progress
						}));
					} else if (res.type === "SUCCESS") {
						allMessages.push(...res.data.messages);
						res.data.participants.forEach((p) => finalParticipants.add(p));
						if (res.data.threadName.length > finalThreadName.length) {
							finalThreadName = res.data.threadName;
						}
						completedWorkers++;
						worker.terminate();
						if (completedWorkers === numWorkers) finalize();
					} else if (res.type === "ERROR") {
						console.error("Worker error:", res.message);
						completedWorkers++;
						worker.terminate();
						if (completedWorkers === numWorkers) finalize();
					}
				};

				worker.postMessage({
					type: "PARSE_FILES",
					files: chunks[i],
				} satisfies WorkerRequest);
			}
		},
		[setChatData, owner, setExplorerOpen, stagedFilesBuffer],
	);

	const initiateProcess = () => {
		const combined = [...activeFiles, ...queuedFiles];
		setActiveFiles(combined);
		setQueuedFiles([]);
		handleProcess(combined);
	};

	const toggleExpand = (id: string) => {
		const newExpanded = new Set(expandedNodes);
		if (newExpanded.has(id)) newExpanded.delete(id);
		else newExpanded.add(id);
		setExpandedNodes(newExpanded);
	};

	const renderTree = (nodes: FileNode[], isQueued: boolean, level = 0) => {
		return (
			<div
				className={`flex flex-col gap-1 ${level > 0 ? "ml-4 border-l-2 border-[#111111]/5 dark:border-[#EAE8E3]/5" : ""}`}
			>
				{nodes.map((node) => {
					const isLevel1 = level === 0;
					return (
						<div
							key={node.id}
							className={`flex flex-col ${isLevel1 ? "mb-3 bg-[#111111]/[0.02] dark:bg-white/[0.02] p-1" : ""}`}
						>
							<div className="flex items-center group">
								<button
									type="button"
									onClick={() =>
										node.type === "folder" && toggleExpand(node.id)
									}
									className={`flex-1 flex items-center gap-2.5 px-2 py-1.5 transition-all text-left ${
										isQueued
											? "text-[#888] hover:text-[#111] dark:hover:text-[#EAE8E3]"
											: "text-[#111] dark:text-[#EAE8E3]"
									}`}
								>
									{node.type === "folder" ? (
										<div
											className={`flex-shrink-0 w-1.5 h-1.5 border border-current ${expandedNodes.has(node.id) ? "bg-current" : ""} ${isLevel1 ? "w-2 h-2" : ""}`}
										/>
									) : (
										<div
											className={`flex-shrink-0 w-1 h-1 bg-[#D93829] ${isLevel1 ? "w-1.5 h-1.5" : ""}`}
										/>
									)}
									<div className="flex flex-col min-w-0">
										<span
											className={`truncate uppercase tracking-widest leading-none ${isLevel1 ? "text-[11px] font-black" : "text-[9px] font-bold opacity-80"}`}
										>
											{node.name}
										</span>
										{isLevel1 && node.type === "file" && (
											<span className="text-[8px] opacity-40 font-mono truncate lowercase mt-1">
												{node.path.length > 45
													? `...${node.path.slice(-42)}`
													: node.path}
											</span>
										)}
									</div>
									{node.type === "file" && node.rawFile && (
										<span className="text-[8px] opacity-30 font-normal ml-auto">
											{(node.rawFile.size / 1024).toFixed(1)}K
										</span>
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										if (isQueued) {
											setQueuedFiles(removeNode(queuedFiles, node.id, true));
										} else {
											const newActive = removeNode(activeFiles, node.id, false);
											setActiveFiles(newActive);
											handleProcess(newActive);
										}
									}}
									className="px-2 opacity-0 group-hover:opacity-100 text-[#D93829] hover:bg-[#D93829] hover:text-white transition-all text-[10px]"
								>
									✕
								</button>
							</div>
							{node.type === "folder" &&
								expandedNodes.has(node.id) &&
								node.children &&
								renderTree(node.children, isQueued, level + 1)}
						</div>
					);
				})}
			</div>
		);
	};

	const [searchTerm, setSearchTerm] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Click away to close dropdown
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const [isDragging, setIsDragging] = useState(false);

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		const items = e.dataTransfer.items;
		if (!items) return;

		const selectedFiles: File[] = [];

		async function traverseEntry(entry: any) {
			if (entry.isFile) {
				const file = await new Promise<File>((resolve) => entry.file(resolve));
				if (file.name.endsWith(".json")) {
					selectedFiles.push(file);
				}
			} else if (entry.isDirectory) {
				const reader = entry.createReader();
				const entries = await new Promise<any[]>((resolve) => {
					reader.readEntries(resolve);
				});
				for (const child of entries) {
					await traverseEntry(child);
				}
			}
		}

		const entryPromises = [];
		for (let i = 0; i < items.length; i++) {
			const entry = items[i].webkitGetAsEntry();
			if (entry) {
				entryPromises.push(traverseEntry(entry));
			}
		}

		await Promise.all(entryPromises);
		useChatStore.setState((s) => ({
			stagedFilesBuffer: [...s.stagedFilesBuffer, ...selectedFiles],
		}));

		if (selectedFiles.length > 0) {
			const newTree = buildTree(selectedFiles);
			setQueuedFiles([...queuedFiles, ...newTree]);
		}
	};

	const filteredParticipants = participants
		.filter((p) => p.toLowerCase().includes(searchTerm.toLowerCase()))
		.sort();

	if (!isExplorerOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex justify-end">
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
				onMouseDown={() => setExplorerOpen(false)}
			/>
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				className={`relative w-full max-w-lg bg-[#EAE8E3] dark:bg-[#111] h-full border-l-2 border-[#111] dark:border-[#EAE8E3] flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl ${isDragging ? "ring-4 ring-inset ring-[#D93829]" : ""}`}
			>
				{/* Top Bar Actions */}
				<div className="p-6 border-b-2 border-[#111] dark:border-[#EAE8E3] flex flex-col gap-4">
					<div className="flex justify-between items-center">
						<h2 className="text-xl font-black uppercase tracking-tighter">
							Chat Archives
						</h2>
						<button
							type="button"
							onMouseDown={(e) => {
								e.stopPropagation();
								setExplorerOpen(false);
							}}
							className="w-8 h-8 bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111] hover:bg-[#D93829] transition-colors font-bold text-base flex items-center justify-center"
						>
							✕
						</button>
					</div>

					<div ref={actionsRef} className="grid grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => folderInputRef.current?.click()}
							className="bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111] py-3 px-4 uppercase text-[9px] font-black tracking-widest hover:bg-[#D93829] transition-colors flex justify-between items-center group"
						>
							<span>+ Add Folder</span>
							<div className="w-2.5 h-2.5 bg-white dark:bg-[#111] group-hover:rotate-90 transition-transform" />
						</button>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="border-2 border-[#111] dark:border-[#EAE8E3] py-3 px-4 uppercase text-[9px] font-black tracking-widest hover:bg-[#111] hover:text-white dark:hover:bg-[#EAE8E3] dark:hover:text-[#111] transition-all flex justify-between items-center group"
						>
							<span>+ Add Files</span>
							<div className="w-2.5 h-2.5 bg-[#111] dark:bg-[#EAE8E3] group-hover:rotate-90 transition-transform" />
						</button>
					</div>

					{isDragging && (
						<div className="absolute inset-0 bg-[#D93829]/10 backdrop-blur-[2px] flex items-center justify-center z-[150] pointer-events-none">
							<div className="bg-[#111] text-white px-6 py-4 border-2 border-white uppercase text-xs font-black tracking-widest shadow-xl">
								Drop Multiple Folders Here
							</div>
						</div>
					)}

					<input
						type="file"
						ref={folderInputRef}
						onChange={handleFileSelection}
						className="hidden"
						// @ts-expect-error - webkitdirectory is non-standard but widely supported
						webkitdirectory="true"
						directory="true"
						multiple
					/>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileSelection}
						className="hidden"
						multiple
						accept=".json"
					/>
				</div>

				<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
					<section ref={pendingRef}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-[9px] uppercase tracking-[0.2em] font-black text-[#888]">
								01 / Pending Archives
							</h3>
							<button
								type="button"
								onClick={() => setQueuedFiles([])}
								className="text-[9px] uppercase font-black text-[#D93829] hover:underline"
							>
								Clear
							</button>
						</div>

						<div className="border-2 border-dashed border-[#111111]/20 dark:border-[#EAE8E3]/20 p-4 min-h-[100px]">
							{queuedFiles.length === 0 ? (
								<div className="h-full flex items-center justify-center text-[9px] uppercase font-bold text-[#888] tracking-widest text-center">
									Queue Empty — Drag Archives Here
								</div>
							) : (
								renderTree(queuedFiles, true)
							)}
						</div>

						{queuedFiles.length > 0 && (
							<button
								ref={processRef}
								type="button"
								onClick={initiateProcess}
								disabled={status === "parsing"}
								className="w-full mt-4 bg-[#D93829] text-white py-4 px-6 uppercase text-xs font-black tracking-[0.2em] hover:bg-[#111] disabled:bg-[#888] transition-colors shadow-[6px_6px_0px_0px_#111] dark:shadow-[6px_6px_0px_0px_#EAE8E3] active:translate-x-1 active:translate-y-1 active:shadow-none"
							>
								{status === "parsing"
									? `Parsing (${progress.current}/${progress.total})...`
									: "Process Data"}
							</button>
						)}
					</section>

					<section ref={activeRef}>
						<div className="flex justify-between items-center mb-4">
							<h3 className="text-[9px] uppercase tracking-[0.2em] font-black text-[#D93829]">
								02 / Loaded Archives
							</h3>
							<div className="text-[9px] uppercase font-black text-[#888]">
								{messages.length.toLocaleString()} Messages
							</div>
						</div>

						<div className="border-2 border-[#111] dark:border-[#EAE8E3] p-4 bg-white dark:bg-[#1A1A1A] shadow-[6px_6px_0px_0px_#D93829]">
							{activeFiles.length === 0 ? (
								<div className="h-full flex items-center justify-center text-[9px] uppercase font-bold text-[#888] tracking-widest">
									No Active Data
								</div>
							) : (
								renderTree(activeFiles, false)
							)}
						</div>
					</section>
				</div>

				{/* Onboarding Tutorial Overlay */}
				{tutorialStep && (
					<TutorialOverlay
						step={tutorialStep as any}
						onNext={() => {
							if (tutorialStep < 4) setTutorialStep((s) => (s! + 1) as any);
							else completeTutorial();
						}}
						onSkip={completeTutorial}
						targets={{
							pending: pendingRef.current,
							actions: actionsRef.current,
							process: processRef.current,
							active: activeRef.current,
						}}
					/>
				)}

				<div className="p-6 border-t-2 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#1A1A1A]">
					<div className="flex flex-col gap-3 relative" ref={dropdownRef}>
						<label className="text-[9px] uppercase font-black tracking-widest text-[#888] font-sans">
							Select Owner (You)
						</label>

						<button
							type="button"
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className={`w-full border-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-left flex justify-between items-center transition-all ${isDropdownOpen ? "border-[#D93829] bg-[#111] text-white dark:bg-[#EAE8E3] dark:text-[#111]" : "bg-[#EAE8E3] dark:bg-[#111] border-[#111] dark:border-[#EAE8E3] hover:border-[#D93829]"}`}
						>
							<span className="truncate">
								{(owner || "Auto-Detecting...").normalize("NFC")}
							</span>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="4"
								className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
							>
								<path d="M6 9l6 6 6-6" />
							</svg>
						</button>

						{isDropdownOpen && (
							<div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] shadow-[8px_-8px_0px_0px_#111] dark:shadow-[8px_-8px_0px_0px_#EAE8E3] z-[110] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
								<div className="p-2 border-b-2 border-[#111] dark:border-[#EAE8E3]">
									<input
										autoFocus
										type="text"
										placeholder="Search participants..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] px-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-[#D93829]"
									/>
								</div>
								<div className="max-h-48 overflow-y-auto custom-scrollbar">
									{filteredParticipants.length === 0 ? (
										<div className="p-4 text-[9px] uppercase font-bold text-[#888] text-center">
											No matches found
										</div>
									) : (
										filteredParticipants.map((p) => (
											<button
												key={p}
												type="button"
												onClick={() => {
													setOwner(p);
													setIsDropdownOpen(false);
													setSearchTerm("");
												}}
												className={`w-full px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-[#D93829] hover:text-white ${owner === p ? "bg-[#D93829]/10 text-[#D93829] border-l-4 border-[#D93829]" : ""}`}
											>
												{p.normalize("NFC")}
											</button>
										))
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
