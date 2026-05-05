"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { buildTree } from "../lib/files";
import { useChatStore } from "../store";

export default function WelcomePage() {
	const router = useRouter();
	const { setQueuedFiles, setExplorerOpen } = useChatStore();

	const folderInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
		const fileList = e.target.files;
		if (!fileList) return;

		const selectedFiles: File[] = [];
		for (let i = 0; i < fileList.length; i++) {
			const f = fileList[i];
			if (f.name.endsWith(".json")) {
				selectedFiles.push(f);
			}
		}

		if (selectedFiles.length > 0) {
			const tree = buildTree(selectedFiles);
			setQueuedFiles(tree);
			setExplorerOpen(true);
			router.push("/dashboard");
		}
	};

	const handleDirectorySelect = async () => {
		if (!("showDirectoryPicker" in window)) {
			folderInputRef.current?.click();
			return;
		}

		try {
			// @ts-expect-error - Modern File System Access API
			const dirHandle = await window.showDirectoryPicker();
			const selectedFiles: File[] = [];

			async function walkDirectory(dir: any) {
				for await (const entry of dir.values()) {
					if (entry.kind === "file" && entry.name.endsWith(".json")) {
						selectedFiles.push(await entry.getFile());
					} else if (entry.kind === "directory") {
						await walkDirectory(entry);
					}
				}
			}

			await walkDirectory(dirHandle);

			if (selectedFiles.length > 0) {
				const tree = buildTree(selectedFiles);
				setQueuedFiles(tree);
				setExplorerOpen(true);
				router.push("/dashboard");
			}
		} catch (err: any) {
			if (err.name !== "AbortError") {
				console.error("Failed to read directory:", err);
			}
		}
	};

	return (
		<div className="min-h-screen bg-[#EAE8E3] text-[#111111] p-6 md:p-12 font-[family-name:var(--font-outfit)] selection:bg-[#D93829] selection:text-white dark:bg-[#111111] dark:text-[#EAE8E3]">
			<ThemeToggle className="fixed top-6 right-6 z-50" />

			<input
				type="file"
				ref={folderInputRef}
				onChange={handleFileSelection}
				className="hidden"
				// @ts-expect-error
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

			<div className="max-w-6xl mx-auto min-h-[calc(100vh-6rem)] grid grid-cols-1 md:grid-cols-12 gap-6">
				{/* Left Column - Graphic/Color block */}
				<div className="md:col-span-4 bg-[#D93829] p-8 flex flex-col justify-between text-[#EAE8E3] shadow-xl">
					<div className="w-16 h-16 bg-[#EAE8E3] rounded-full mix-blend-screen" />

					<div>
						<h2 className="text-4xl font-bold tracking-tighter mb-4 uppercase">
							Data <br /> Module
						</h2>
						<div className="text-xs uppercase tracking-widest opacity-80 font-[family-name:var(--font-inter)]">
							100% Client-Side Processing
						</div>
					</div>
				</div>

				{/* Right Column - Typography & Controls */}
				<div className="md:col-span-8 flex flex-col justify-between p-8 md:p-16 border-t-8 border-l-[0px] md:border-t-0 md:border-l-8 border-[#111111] bg-white dark:bg-[#1A1A1A] dark:border-[#EAE8E3] shadow-xl">
					<div className="flex justify-end">
						<span className="bg-[#111111] text-white dark:bg-[#EAE8E3] dark:text-[#111111] text-[10px] uppercase font-bold tracking-widest px-3 py-1">
							Version 1.0
						</span>
					</div>

					<div className="my-12">
						<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl leading-none mb-8 text-[#111111] dark:text-[#EAE8E3]">
							Conversational <br />
							<span className="italic">Geometry.</span>
						</h1>
						<p className="text-[#555] dark:text-[#aaa] max-w-md text-sm md:text-base leading-relaxed font-[family-name:var(--font-inter)]">
							Structurally analyze the patterns of your messenger archives. A
							private instrument built on robust, entirely local parsing
							mechanisms. No data ever leaves your device.
						</p>
					</div>

					<div className="border-t border-[#EAE8E3] dark:border-[#333] pt-8">
						<div className="flex flex-col sm:flex-row gap-4">
							<button
								onClick={handleDirectorySelect}
								className="flex-1 bg-[#111111] text-white dark:bg-[#EAE8E3] dark:text-[#111111] py-5 px-6 uppercase text-xs font-bold tracking-widest hover:bg-[#D93829] dark:hover:bg-[#D93829] dark:hover:text-white transition-colors flex justify-between items-center group"
							>
								<span>Select Directory</span>
								<span className="bg-white text-[#111111] dark:bg-[#111111] dark:text-[#EAE8E3] w-6 h-6 flex items-center justify-center rounded-full group-hover:rotate-45 transition-transform">
									+
								</span>
							</button>
							<button
								onClick={() => fileInputRef.current?.click()}
								className="flex-1 bg-[#EAE8E3] text-[#111111] dark:bg-[#222] dark:text-[#EAE8E3] py-5 px-6 uppercase text-xs font-bold tracking-widest hover:bg-[#D93829] hover:text-white transition-colors border border-transparent dark:border-[#333]"
							>
								Select Files
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
