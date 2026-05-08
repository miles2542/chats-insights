"use client";

import { useCallback, useEffect, useRef } from "react";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { ChatStream } from "./ChatStream";
import { InboxCalendarView } from "./InboxCalendarView";
import { InboxMediaView } from "./InboxMediaView";
import { InboxRightSidebar } from "./InboxRightSidebar";
import { InboxSearchView } from "./InboxSearchView";
import { MediaLightbox } from "./MediaLightbox";

/**
 * InboxPanel — the main sliding panel container.
 *
 * Layout: 3 columns
 *   [Left: Thread list] [Center: Chat stream] [Right: Info/Search]
 *
 * Design rationale:
 * - Light: white/glass base with subtle shadows. More "messenger-like" than the heavy
 *   analytics Bauhaus aesthetic. Rounded elements for readability.
 * - Dark: deep #111 base with #222 borders. Accent red (#D93829) only for highlights.
 * - Left sidebar: auto-hidden when only one thread loaded (single chat = no need for list).
 * - Right sidebar: toggled by ℹ button. Can switch to full SearchView.
 * - The panel mounts always in the DOM but is translated off-screen when closed,
 *   preserving scroll position and state (per Zustand statefulness requirement).
 */
export const InboxPanel = () => {
	const { inbox, setInboxData, messages, participants, owner, threadName } =
		useChatStore();

	const panelRef = useRef<HTMLDivElement>(null);

	// Close on Escape
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && inbox.isOpen) {
				// [35] Don't close panel if a lightbox is currently open
				if (useChatStore.getState().inbox.lightboxMessageId) return;
				setInboxData({ isOpen: false });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [inbox.isOpen, setInboxData]);

	// Lock body scroll while panel is open
	useEffect(() => {
		document.body.style.overflow = inbox.isOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [inbox.isOpen]);

	// Single chat loaded → hide left sidebar (isSidebarOpen irrelevant)
	// For now we only ever load 1 thread at a time, so always hide left sidebar.
	const showLeftSidebar = false; // will be: threads.length > 1

	const displayName =
		participants.length > 2
			? threadName
			: (inbox.nicknames[participants.find((p) => p !== owner) ?? ""] ??
				participants.find((p) => p !== owner) ??
				threadName);

	// Handle staged message sending
	const handleSendStaged = useCallback(
		(text: string) => {
			const newMsg: NormalizedMessage = {
				id: crypto.randomUUID(),
				senderName: owner || "Me",
				timestampMs: Date.now(),
				content: text,
				category:
					"Text" as import("../../../lib/parsers/types").MessageCategory,
				mediaType: null,
				mediaUri: null,
				mediaItems: [],
				callDurationSec: null,
				callStartTimeMs: null,
				callEndTimeMs: null,
				callType: null,
				callMissed: false,
				reactions: [],
				isUnsent: false,
				isSystemEvent: false,
				rawFields: {},
			};
			setInboxData({ stagedMessages: [...inbox.stagedMessages, newMsg] });
		},
		[owner, inbox.stagedMessages, setInboxData],
	);

	const isMediaView =
		!inbox.isInfoOpen &&
		!inbox.isCalendarOpen &&
		inbox.activeMediaView !== null;
	const isSearchView =
		!inbox.isInfoOpen &&
		!inbox.isCalendarOpen &&
		inbox.activeMediaView === null;

	const handleJump = (messageId: string) => {
		setInboxData({ selectedMessageId: messageId });
	};

	const handleSearchBack = () => {
		setInboxData({
			searchTerm: "",
			isInfoOpen: true,
			selectedMessageId: null,
			isCalendarOpen: false,
		});
	};

	const handleCalendarBack = () => {
		setInboxData({ isCalendarOpen: false, isInfoOpen: true });
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = inbox.panelWidth;

		const onMouseMove = (moveEvent: MouseEvent) => {
			const delta = startX - moveEvent.clientX;
			// Constrain width: 400px min, screen width - small margin max
			const newWidth = Math.min(
				Math.max(400, startWidth + delta),
				window.innerWidth - 60,
			);
			setInboxData({ panelWidth: newWidth });
		};

		const onMouseUp = () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			document.body.style.cursor = "";
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		document.body.style.cursor = "ew-resize";
	};

	return (
		<>
			{/* Global Lightbox for Media */}
			<MediaLightbox />

			{/* Dim overlay — clicking closes panel */}
			<div
				aria-hidden
				className={[
					"fixed inset-0 z-[60]",
					"bg-black/30 dark:bg-black/50 backdrop-blur-[2px]",
					"transition-opacity duration-300",
					inbox.isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
				].join(" ")}
				onClick={() => setInboxData({ isOpen: false })}
			/>

			{/* Panel — always mounted, translate off-screen to preserve state */}
			<div
				ref={panelRef}
				style={{ width: inbox.isOpen ? inbox.panelWidth : undefined }}
				className={[
					"fixed top-0 right-0 h-screen z-[70]",
					"flex",
					// Slide transition — snappy bezier
					"transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]",
					inbox.isOpen ? "translate-x-0" : "translate-x-full",
					// Base bg — light is near-white, dark is deep near-black
					"bg-[#F8F8F8] dark:bg-[#0E0E0E]",
					// Left border shadow to separate from the dimmed content behind
					"shadow-[-24px_0_60px_rgba(0,0,0,0.12)] dark:shadow-[-24px_0_80px_rgba(0,0,0,0.6)]",
					"border-l border-[#E5E5E5] dark:border-[#1E1E1E]",
				].join(" ")}
			>
				{/* Resize Handle (Left edge) */}
				<div
					onMouseDown={handleMouseDown}
					className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize hover:bg-[#D93829]/20 transition-colors z-50 group"
				>
					<div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-8 bg-[#E5E5E5] dark:bg-[#333] group-hover:bg-[#D93829] rounded-full transition-colors" />
				</div>
				{/* ── LEFT SIDEBAR (thread list) ─────────────────────────────── */}
				{showLeftSidebar && (
					<aside className="w-[260px] flex-shrink-0 border-r border-[#E5E5E5] dark:border-[#1E1E1E] bg-white dark:bg-[#0A0A0A] flex flex-col">
						<div className="p-5 border-b border-[#E5E5E5] dark:border-[#1E1E1E]">
							<h2 className="text-base font-bold text-[#111] dark:text-white tracking-tight">
								Inbox
							</h2>
							<div className="mt-3 flex items-center gap-2 bg-[#F2F2F7] dark:bg-[#1A1A1A] rounded-full px-3 py-2">
								<SearchIcon className="w-3.5 h-3.5 text-[#888] flex-shrink-0" />
								<input
									type="text"
									placeholder="Search threads"
									className="bg-transparent outline-none text-sm w-full text-[#111] dark:text-white placeholder-[#999] dark:placeholder-[#555]"
								/>
							</div>
						</div>
						{/* Thread list placeholder — will be populated when multi-thread lands */}
						<div className="flex-1 overflow-y-auto p-2 custom-scrollbar" />
					</aside>
				)}

				{/* ── CENTER: CHAT STREAM ─────────────────────────────────────── */}
				<div className="flex-1 flex flex-col min-w-0 bg-[#FAFAFA] dark:bg-[#111]">
					{/* Center Header */}
					<header className="h-16 flex items-center justify-between px-5 border-b border-[#E5E5E5] dark:border-[#1E1E1E] bg-white/80 dark:bg-[#111]/80 backdrop-blur-md flex-shrink-0">
						{/* Left: avatar + name */}
						<div className="flex items-center gap-3">
							<AvatarCircle name={displayName} size="sm" />
							<div>
								<p className="text-[14px] font-semibold text-[#111] dark:text-white leading-tight">
									{displayName || "—"}
								</p>
								<p className="text-[10px] font-bold uppercase tracking-widest text-[#888] dark:text-[#555] mt-0.5">
									{messages.length > 0
										? `${messages.length.toLocaleString()} messages`
										: "No messages loaded"}
								</p>
							</div>
						</div>
						{/* Right: action icons */}
						<div className="flex items-center gap-1.5">
							{/* Voice call — decorative */}
							<HeaderIconBtn label="Voice call (decorative)" onClick={() => {}}>
								<PhoneIcon className="w-4 h-4" />
							</HeaderIconBtn>
							{/* Video call — decorative */}
							<HeaderIconBtn label="Video call (decorative)" onClick={() => {}}>
								<VideoIcon className="w-4 h-4" />
							</HeaderIconBtn>
							{/* Jump to Date trigger */}
							<HeaderIconBtn
								label="Jump to date"
								onClick={() =>
									setInboxData({
										isCalendarOpen: !inbox.isCalendarOpen,
										isInfoOpen: inbox.isCalendarOpen ? true : false,
									})
								}
								active={inbox.isCalendarOpen}
							>
								<CalendarIcon className="w-4 h-4" />
							</HeaderIconBtn>
							{/* Info toggle */}
							<HeaderIconBtn
								label="Chat info"
								onClick={() =>
									setInboxData({
										isInfoOpen: !inbox.isInfoOpen,
										isCalendarOpen: false,
									})
								}
								active={inbox.isInfoOpen && !inbox.isCalendarOpen}
							>
								<InfoIcon className="w-4 h-4" />
							</HeaderIconBtn>
							{/* Close panel */}
							<HeaderIconBtn
								label="Close inbox"
								onClick={() => setInboxData({ isOpen: false })}
								danger
							>
								<CloseIcon className="w-4 h-4" />
							</HeaderIconBtn>
						</div>
					</header>

					{/* ChatStream — virtualized messages + input bar */}
					<ChatStream
						messages={messages}
						owner={owner}
						stagedMessages={inbox.stagedMessages}
						onSendStaged={handleSendStaged}
					/>
				</div>

				{/* ── RIGHT SIDEBAR (Info, Search, or Calendar) ─────────────────── */}
				{isSearchView ? (
					<InboxSearchView onBack={handleSearchBack} onJump={handleJump} />
				) : isMediaView ? (
					<InboxMediaView
						onBack={() =>
							setInboxData({ activeMediaView: null, isInfoOpen: true })
						}
						onJump={handleJump}
					/>
				) : inbox.isCalendarOpen ? (
					<InboxCalendarView onBack={handleCalendarBack} onJump={handleJump} />
				) : (
					inbox.isInfoOpen && (
						<InboxRightSidebar
							displayName={displayName}
							participants={participants}
							owner={owner}
						/>
					)
				)}
			</div>
		</>
	);
};

// ── Small reusable primitives local to this file ──────────────────────────────

/** Colored initial circle avatar. Deterministic hue from name. */
export const AvatarCircle = ({
	name,
	size = "md",
	avatarUrl,
	onClick,
}: {
	name: string;
	size?: "sm" | "md" | "lg";
	avatarUrl?: string;
	onClick?: () => void;
}) => {
	const initials = name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");

	const hue =
		((name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 47) % 280) +
		160;

	const sizeClass = {
		sm: "w-9 h-9 text-[11px]",
		md: "w-11 h-11 text-[13px]",
		lg: "w-20 h-20 text-2xl",
	}[size];

	const commonProps = {
		className: [
			sizeClass,
			"rounded-full flex items-center justify-center font-bold flex-shrink-0",
			"transition-opacity hover:opacity-80",
			onClick ? "cursor-pointer" : "cursor-default",
		].join(" "),
		style: avatarUrl
			? {
					backgroundImage: `url(${avatarUrl})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
				}
			: {
					backgroundColor: `hsl(${hue % 360}, 55%, 60%)`,
				},
	};

	if (onClick) {
		return (
			<button type="button" onClick={onClick} {...commonProps}>
				{!avatarUrl && (
					<span className="text-white drop-shadow-sm">{initials || "?"}</span>
				)}
			</button>
		);
	}

	return (
		<div {...commonProps}>
			{!avatarUrl && (
				<span className="text-white drop-shadow-sm">{initials || "?"}</span>
			)}
		</div>
	);
};

const HeaderIconBtn = ({
	label,
	onClick,
	active,
	danger,
	children,
}: {
	label: string;
	onClick: () => void;
	active?: boolean;
	danger?: boolean;
	children: React.ReactNode;
}) => (
	<button
		type="button"
		onClick={onClick}
		title={label}
		aria-label={label}
		className={[
			"w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
			danger
				? "text-[#888] hover:text-[#D93829] hover:bg-[#D93829]/10"
				: active
					? "bg-[#D93829]/20 text-[#D93829] scale-110 shadow-sm"
					: "text-[#888] dark:text-[#555] hover:bg-[#F0F0F0] dark:hover:bg-[#222] hover:text-[#111] dark:hover:text-white",
		].join(" ")}
	>
		{children}
	</button>
);

// SVG icon atoms — inline to avoid extra imports
const SearchIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	</svg>
);
const PhoneIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l1.07-1.07a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
	</svg>
);
const VideoIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polygon points="23 7 16 12 23 17 23 7" />
		<rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
	</svg>
);
const InfoIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="12" cy="12" r="10" />
		<line x1="12" y1="16" x2="12" y2="12" />
		<line x1="12" y1="8" x2="12.01" y2="8" />
	</svg>
);
const CloseIcon = ({ className }: { className?: string }) => (
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
const CalendarIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
		<line x1="16" y1="2" x2="16" y2="6" />
		<line x1="8" y1="2" x2="8" y2="6" />
		<line x1="3" y1="10" x2="21" y2="10" />
	</svg>
);
