"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useChatStore } from "../../../store";

/**
 * MediaLightbox — global fullscreen overlay for viewing photos and videos.
 *
 * Features:
 * - Triggered by setting inbox.lightboxMessageId in the store.
 * - Backdrop blur + dark overlay.
 * - Supports Photos (img), Videos (video with controls), GIFs.
 * - Navigation: if a message has multiple media items, allows toggling between them.
 * - Close on: Escape, clicking backdrop, or close button.
 * - Resolution: Uses the same mediaMap logic to resolve local object URLs.
 */

export const MediaLightbox = () => {
	const { inbox, messages, mediaMap, setInboxData } = useChatStore();
	const messageId = inbox.lightboxMessageId;

	const message = useMemo(
		() => messages.find((m) => m.id === messageId),
		[messages, messageId],
	);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [objectUrls, setObjectUrls] = useState<string[]>([]);

	// Reset index when message changes
	useEffect(() => {
		setCurrentIndex(0);
	}, [messageId]);

	// Resolve all media items for the current message
	useEffect(() => {
		if (!message?.mediaItems || message.mediaItems.length === 0) {
			setObjectUrls([]);
			return;
		}

		const urls: string[] = [];
		const revokes: (() => void)[] = [];

		for (const item of message.mediaItems) {
			const uri = item.uri;
			const filename = uri.split("/").pop() ?? "";
			let file = mediaMap.get(uri) || mediaMap.get(filename);

			if (!file) {
				for (const [key, f] of mediaMap.entries()) {
					if (key.endsWith(filename)) {
						file = f;
						break;
					}
				}
			}

			if (file) {
				const url = URL.createObjectURL(file);
				urls.push(url);
				revokes.push(() => URL.revokeObjectURL(url));
			} else {
				urls.push(""); // Placeholder for missing file
			}
		}

		setObjectUrls(urls);
		return () => revokes.forEach((r) => r());
	}, [message, mediaMap]);

	// Close on Escape
	useEffect(() => {
		if (!messageId) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setInboxData({ lightboxMessageId: null });
			if (e.key === "ArrowRight")
				setCurrentIndex((prev) => Math.min(prev + 1, objectUrls.length - 1));
			if (e.key === "ArrowLeft")
				setCurrentIndex((prev) => Math.max(prev - 1, 0));
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [messageId, objectUrls.length, setInboxData]);

	if (!messageId || !message) return null;

	const currentItem = message.mediaItems?.[currentIndex];
	const currentUrl = objectUrls[currentIndex];

	return createPortal(
		<div
			className="fixed inset-0 z-[100] flex flex-col animate-[fadeIn_0.2s_ease-out]"
			onContextMenu={(e) => e.stopPropagation()}
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
				onClick={() => setInboxData({ lightboxMessageId: null })}
			/>

			{/* Header */}
			<header className="relative z-10 p-5 flex items-center justify-between pointer-events-none">
				<div className="flex flex-col">
					<p className="text-white font-bold text-sm">{message.senderName}</p>
					<p className="text-white/50 text-[10px] font-black uppercase tracking-widest">
						{new Date(message.timestampMs).toLocaleString()}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setInboxData({ lightboxMessageId: null })}
					className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors pointer-events-auto"
				>
					<CloseIcon className="w-5 h-5" />
				</button>
			</header>

			{/* Content Area */}
			<div
				className="flex-1 relative z-10 flex items-center justify-center p-10 cursor-zoom-out"
				onClick={() => setInboxData({ lightboxMessageId: null })}
			>
				{objectUrls.length > 1 && (
					<div className="absolute inset-x-5 flex justify-between pointer-events-none">
						<NavBtn
							direction="left"
							disabled={currentIndex === 0}
							onClick={() => setCurrentIndex((p) => p - 1)}
						/>
						<NavBtn
							direction="right"
							disabled={currentIndex === objectUrls.length - 1}
							onClick={() => setCurrentIndex((p) => p + 1)}
						/>
					</div>
				)}

				<div className="max-w-full max-h-full flex items-center justify-center">
					{currentUrl ? (
						currentItem?.type === "video" ? (
							<video
								autoPlay
								controls
								src={currentUrl}
								onClick={(e) => e.stopPropagation()}
								className="max-w-full max-h-[85vh] rounded-lg shadow-2xl relative z-20"
							/>
						) : (
							<img
								src={currentUrl}
								alt=""
								onClick={(e) => e.stopPropagation()}
								className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none relative z-20"
							/>
						)
					) : (
						<div className="text-white/20 flex flex-col items-center gap-4">
							<span className="text-6xl">📎</span>
							<p className="text-sm font-bold">
								Media file not available locally
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Footer: Pagination dots */}
			{objectUrls.length > 1 && (
				<footer className="relative z-10 p-8 flex justify-center gap-2">
					{objectUrls.map((_, i) => (
						<div
							key={i}
							className={`w-1.5 h-1.5 rounded-full transition-all ${
								i === currentIndex ? "bg-[#D93829] w-4" : "bg-white/20"
							}`}
						/>
					))}
				</footer>
			)}
		</div>,
		document.body,
	);
};

const NavBtn = ({ direction, disabled, onClick }: any) => (
	<button
		type="button"
		disabled={disabled}
		onClick={(e) => {
			e.stopPropagation();
			onClick();
		}}
		className={`w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all pointer-events-auto ${
			disabled ? "opacity-0 scale-75" : "opacity-100 scale-100"
		}`}
	>
		{direction === "left" ? (
			<ChevronLeftIcon className="w-6 h-6" />
		) : (
			<ChevronRightIcon className="w-6 h-6" />
		)}
	</button>
);

const CloseIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	</svg>
);
const ChevronLeftIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
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
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="9 18 15 12 9 6" />
	</svg>
);
