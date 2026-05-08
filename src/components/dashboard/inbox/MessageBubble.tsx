"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { MessageCategory } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { AvatarCircle } from "./InboxPanel";
import { MessengerMarkdown } from "./MessengerMarkdown";

/**
 * MessageBubble — renders a single message in the chat stream.
 *
 * Handles:
 * - Owner vs other alignment (right vs left)
 * - Avatar: shown on the last bubble of each consecutive group (bottom-anchored)
 * - Consecutive grouping: tighter spacing, no repeated avatar/name when same sender runs
 * - Timestamp tooltip on bubble hover
 * - Row hover → action bar: [React] [Reply] [More]
 * - Reactions pill (absolute, overlapping bubble bottom-right)
 * - Media rendering: image/video/audio/gif/file with skeleton + "not available" fallback
 * - Staged (local-only) messages: subtle opacity + "local" badge
 * - Reply context: quoted preview above the bubble (when reply data available)
 *
 * UX notes:
 * - The action bar only appears on ROW hover, not bubble hover, to avoid it
 *   fighting with the timestamp tooltip. They serve different purposes.
 * - We never use dangerouslySetInnerHTML — MessengerMarkdown handles safe rendering.
 * - The "More" dropdown (copy options) is positioned to avoid overflow at edges.
 */

interface Props {
	message: NormalizedMessage;
	/** True if this message is from the owner (right-aligned, blue bubble) */
	isOwner: boolean;
	/** True if the previous message was from the same sender */
	isConsecutive: boolean;
	/** True if the next message is from the same sender */
	isGroupedWithNext: boolean;
	/** True if this message was staged locally (session only) */
	isStaged?: boolean;
	/** The resolved File object URLs for media (mapped by URI) */
	mediaObjectUrls?: Record<string, string>;
	/** Called when user clicks "Reply" hover action */
	onReply: (message: NormalizedMessage) => void;
	/** Called when media needs an object URL created */
	onRequestMedia: (messageId: string) => void;
	/** [15] True to show the 'Local only' badge (shown once per group) */
	showLocalBadge?: boolean;
	/** True to show the sender's name (for group chats) */
	showParticipantName?: boolean;
}

// Format timestamp for tooltip: Day, DD/MM/YYYY HH:MM:SS
const formatTimestamp = (ts: number): string => {
	const d = new Date(ts);
	return d.toLocaleString("en-GB", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
};

const formatCallDuration = (sec: number): string => {
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (h > 0)
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m}:${s.toString().padStart(2, "0")}`;
};

// Format timestamp for session dividers (more prominent): 24h format
export const formatDividerTime = (ts: number): string => {
	const d = new Date(ts);
	const now = new Date();
	const diffDays = Math.floor(
		(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
	);

	const timeStr = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	if (diffDays === 0) return `Today · ${timeStr}`;
	if (diffDays === 1) return `Yesterday · ${timeStr}`;
	if (diffDays < 7) {
		return (
			d.toLocaleDateString(undefined, { weekday: "long" }) + ` · ${timeStr}`
		);
	}
	return (
		d.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		}) + ` · ${timeStr}`
	);
};

export const MessageBubble = ({
	message,
	isOwner,
	isConsecutive,
	isGroupedWithNext,
	isStaged = false,
	onReply,
	onRequestMedia,
	showLocalBadge = false,
	showParticipantName = false,
	mediaObjectUrls = {},
}: Props) => {
	const { inbox, setInboxData } = useChatStore();

	const [showTimestamp, setShowTimestamp] = useState(false);
	const [showRowActions, setShowRowActions] = useState(false);
	const [showCopyMenu, setShowCopyMenu] = useState(false);
	const [localReactions, setLocalReactions] = useState<
		{ emoji: string; count: number }[]
	>([]);
	const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
	const [highlightPulse, setHighlightPulse] = useState(false);

	const rowRef = useRef<HTMLDivElement>(null);
	const copyMenuRef = useRef<HTMLDivElement>(null);

	// Pulse effect for jump-to-date
	useEffect(() => {
		if (inbox.highlightedMessageId === message.id) {
			setHighlightPulse(true);
			const timer = setTimeout(() => {
				setHighlightPulse(false);
				// We don't clear from store here to avoid race conditions if multiple bubbles render
				// Instead, the InboxCalendarView/Search handles clearing if needed,
				// or we just let it be. Actually, clearing from store after a delay is safer.
				setInboxData({ highlightedMessageId: null });
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [inbox.highlightedMessageId, message.id, setInboxData]);

	// Merge server reactions with local reactions
	const allReactions = mergeReactions(message.reactions ?? [], localReactions);

	const handleLocalReact = (emoji: string) => {
		setLocalReactions((prev) => {
			const existing = prev.find((r) => r.emoji === emoji);
			if (existing) {
				// Toggle off if same emoji
				return prev
					.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
					.filter((r) => r.count > 0);
			}
			return [...prev, { emoji, count: 1 }];
		});
		setReactionPickerOpen(false);
	};

	const handleCopy = (format: "plain" | "markdown" | "messenger") => {
		const content = message.content ?? "";
		let text = content;

		if (format === "markdown") {
			// Already markdown-ish from Messenger — just normalize
			text = content
				.replace(/\*(.+?)\*/g, "**$1**") // Messenger bold → MD bold
				.replace(/_(.+?)_/g, "_$1_"); // italic unchanged
		} else if (format === "plain") {
			// Strip all Messenger formatting markers
			text = content
				.replace(/```[\s\S]*?```/g, "[code block]")
				.replace(/`(.+?)`/g, "$1")
				.replace(/\*(.+?)\*/g, "$1")
				.replace(/_(.+?)_/g, "$1")
				.replace(/~(.+?)~/g, "$1")
				.replace(/^> /gm, "");
		}
		// "messenger" format = raw content as-is

		navigator.clipboard.writeText(text).catch(() => {});
		setShowCopyMenu(false);
	};

	// Border radius logic: Messenger-style "cohesive block" grouping
	// First: top-left/top-right large, inner bottom small
	// Middle: inner top/bottom small
	// Last: inner top small, bottom-left/bottom-right large (with tail)
	const getBubbleRadius = () => {
		const large = "18px";
		const small = "4px";

		if (isOwner) {
			// Right aligned (Owner)
			const topL = large;
			const topR = isConsecutive ? small : large;
			const botR = isGroupedWithNext ? small : large;
			const botL = large;
			return `${topL} ${topR} ${botR} ${botL}`;
		} else {
			// Left aligned (Other)
			const topL = isConsecutive ? small : large;
			const topR = large;
			const botR = large;
			const botL = isGroupedWithNext ? small : large;
			return `${topL} ${topR} ${botR} ${botL}`;
		}
	};

	const hasTextContent = Boolean(message.content?.trim());
	const hasMedia = message.mediaItems && message.mediaItems.length > 0;

	if (
		message.isSystemEvent ||
		message.category === MessageCategory.SystemEvent
	) {
		return (
			<div className="w-full flex justify-center py-2 px-10 select-none animate-[fadeIn_0.3s_ease-out]">
				<span className="text-[11px] font-medium text-[#888] dark:text-[#555] text-center leading-relaxed max-w-[80%] italic">
					{message.senderName}: {message.content}
				</span>
			</div>
		);
	}

	const isUnsent =
		message.isUnsent || message.category === MessageCategory.Unsent;
	const isCall = [
		MessageCategory.VoiceCall,
		MessageCategory.VideoCall,
		MessageCategory.MissedCall,
	].includes(message.category);

	return (
		<div
			ref={rowRef}
			className={[
				"flex items-end gap-3.5 w-full px-5",
				isOwner ? "justify-end" : "justify-start",
				// Vertical spacing: tighter when consecutive
				isConsecutive ? "pt-[3px]" : "pt-4",
				// Fade-in animation for new messages entering viewport
				"animate-[fadeInUp_0.15s_ease-out]",
			].join(" ")}
			onMouseEnter={() => setShowRowActions(true)}
			onMouseLeave={() => {
				setShowRowActions(false);
				setShowCopyMenu(false);
				setReactionPickerOpen(false);
			}}
		>
			{/* Avatar (left side, other participant only) */}
			{!isOwner && (
				<div
					className={[
						"w-8 flex-shrink-0 self-end",
						allReactions.length > 0 ? "mb-4" : "mb-0.5",
					].join(" ")}
				>
					{/* Show avatar only on last bubble of a consecutive group */}
					{!isGroupedWithNext ? (
						<AvatarCircle
							name={message.senderName}
							size="sm"
							avatarUrl={
								useChatStore.getState().inbox.customAvatars[message.senderName]
							}
						/>
					) : (
						<div className="w-8 h-8" /> // spacer to keep alignment
					)}
				</div>
			)}

			{/* ── Main bubble area ─────────────────────────────────── */}
			<div
				className={[
					"relative max-w-[85%] md:max-w-[75%] flex flex-col",
					isOwner ? "items-end" : "items-start",
					// Slight opacity for staged (local) messages
					isStaged ? "opacity-80" : "",
					// Pulse highlight for jump-to-message
					highlightPulse ? "animate-pulse-subtle rounded-2xl" : "",
					"z-10 transition-all duration-500",
				].join(" ")}
			>
				{/* Participant Name (for group chats) */}
				{showParticipantName && (
					<div className="text-[11px] font-bold text-[#888] dark:text-[#666] mb-1 px-1 transition-opacity animate-[fadeIn_0.3s_ease-out]">
						{inbox.nicknames[message.senderName] ?? message.senderName}
					</div>
				)}

				{/* [15] Staged indicator — only shown if showLocalBadge is true */}
				{isStaged && showLocalBadge && (
					<div
						className={`text-[9px] font-bold uppercase tracking-widest text-[#BBB] dark:text-[#444] mb-1 px-1 ${isOwner ? "text-right" : "text-left"}`}
					>
						Local only
					</div>
				)}

				{/* Bubble */}
				<div
					className={[
						"relative",
						hasTextContent || isUnsent || isCall ? "px-4 py-[9px]" : "p-0",
						// Dynamic radius for grouping
						"transition-all duration-200",
						// Bubble colors
						!hasTextContent && hasMedia
							? "bg-transparent border-transparent shadow-none"
							: isUnsent
								? `bg-transparent border border-dashed ${isOwner ? "border-[#0055A4] text-[#0055A4] dark:border-[#4488FF] dark:text-[#4488FF]" : "border-[#BBB] dark:border-[#555] text-[#888] dark:text-[#666]"}`
								: isOwner
									? "bg-[#0055A4] dark:bg-[#0055A4] text-white"
									: "bg-white dark:bg-[#2A2A2A] text-[#111] dark:text-[#EAE8E3] border border-[#EBEBEB] dark:border-transparent",
						// Shadow — subtle
						(!hasTextContent && hasMedia) || isUnsent ? "" : "shadow-sm",
						// [29] Spacing for reactions — if has reactions, add extra bottom margin so pill doesn't clip
						allReactions.length > 0 ? "mb-3.5" : "mb-0",
					].join(" ")}
					style={{
						borderRadius:
							!hasTextContent && hasMedia && !isUnsent
								? "0"
								: getBubbleRadius(),
					}}
					onMouseEnter={() => setShowTimestamp(true)}
					onMouseLeave={() => setShowTimestamp(false)}
				>
					{/* Message content */}
					{isUnsent ? (
						<span className="text-[14px] italic opacity-80">
							{message.content ||
								(isOwner
									? "You unsent a message"
									: `${message.senderName} unsent a message`)}
						</span>
					) : isCall ? (
						<CallBubble message={message} isOwner={isOwner} />
					) : (
						hasTextContent && (
							<MessengerMarkdown
								text={message.content!}
								isOwner={isOwner}
								className="text-[14px] leading-5 break-words"
							/>
						)
					)}

					{/* Media items */}
					{hasMedia &&
						message.mediaItems!.map((item, idx) => (
							<MediaItemView
								key={idx}
								item={item}
								isOwner={isOwner}
								objectUrl={item.uri ? mediaObjectUrls[item.uri] : undefined}
								onRequest={() => onRequestMedia(message.id)}
								onOpenLightbox={() =>
									setInboxData({ lightboxMessageId: message.id })
								}
							/>
						))}

					{/* Timestamp tooltip — appears on bubble hover */}
					{showTimestamp && (
						<div
							className={[
								"absolute -top-7 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none z-10",
								"bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111] shadow-lg",
								isOwner ? "right-0" : "left-0",
							].join(" ")}
						>
							{formatTimestamp(message.timestampMs)}
						</div>
					)}

					{/* Reactions pill — [37] Moved inside for perfect overlap */}
					{allReactions.length > 0 && (
						<div
							className={[
								"absolute -bottom-[13px] flex items-center gap-0.5 px-[5px] py-[3px]",
								"bg-white dark:bg-[#222] rounded-full shadow-sm",
								"border border-[#F0F0F0] dark:border-[#333]",
								isOwner ? "left-1.5" : "right-1.5",
								"z-10",
							].join(" ")}
						>
							{allReactions.slice(0, 3).map((r, i) => (
								<span key={i} className="text-[13px] leading-none">
									{r.emoji}
								</span>
							))}
							{allReactions.reduce((s, r) => s + r.count, 0) > 1 && (
								<span className="text-[10px] font-bold text-[#888] dark:text-[#666] ml-0.5">
									{allReactions.reduce((s, r) => s + r.count, 0)}
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			{/* ── Row hover actions ─────────────────────────────────── */}
			{/* Floats beside the bubble, in-line, same row level */}
			<div
				className={[
					"flex items-center gap-0.5 flex-shrink-0 self-center",
					"transition-all duration-150",
					showRowActions
						? "opacity-100 translate-x-0"
						: "opacity-0 pointer-events-none",
					// Owner actions appear on the LEFT of the bubble (before it in DOM,
					// but since it's flex-row-reverse when owner, handled via order)
					isOwner ? "order-first flex-row-reverse" : "",
					"z-50",
				].join(" ")}
			>
				{/* React */}
				<div className="relative">
					<ActionBtn
						label="React"
						onClick={() => setReactionPickerOpen(!reactionPickerOpen)}
					>
						😊
					</ActionBtn>
					{reactionPickerOpen && (
						<div
							className={[
								"absolute bottom-full mb-1 flex gap-1 p-1.5",
								"bg-white dark:bg-[#222] rounded-full shadow-xl",
								"border border-[#EEE] dark:border-[#333]",
								// Grow INWARD towards bubble to avoid clipping sidebars
								isOwner ? "left-0" : "right-0",
							].join(" ")}
						>
							{["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "🎉"].map((e) => (
								<button
									key={e}
									type="button"
									onClick={() => handleLocalReact(e)}
									className="text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#333] transition-colors hover:scale-125 active:scale-100 transition-transform"
								>
									{e}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Reply */}
				<ActionBtn label="Reply" onClick={() => onReply(message)}>
					<ReplyIcon className="w-3.5 h-3.5" />
				</ActionBtn>

				{/* More (copy options) */}
				<div className="relative" ref={copyMenuRef}>
					<ActionBtn
						label="More"
						onClick={() => setShowCopyMenu(!showCopyMenu)}
					>
						<MoreIcon className="w-3.5 h-3.5" />
					</ActionBtn>
					{showCopyMenu && (
						<div
							className={[
								"absolute bottom-full mb-1 w-44",
								"bg-white dark:bg-[#222] rounded-xl shadow-xl",
								"border border-[#EEE] dark:border-[#333]",
								"overflow-hidden z-20",
								// Grow INWARD towards bubble to avoid clipping sidebars
								isOwner ? "left-0" : "right-0",
							].join(" ")}
						>
							<div className="px-3 py-2 border-b border-[#F0F0F0] dark:border-[#333]">
								<p className="text-[10px] font-black uppercase tracking-widest text-[#999] dark:text-[#555]">
									Copy as
								</p>
							</div>
							{(
								[
									{
										key: "plain" as const,
										label: "Plain text",
										desc: "No formatting",
									},
									{
										key: "markdown" as const,
										label: "Markdown",
										desc: "**bold**, _italic_",
									},
									{
										key: "messenger" as const,
										label: "Messenger style",
										desc: "*bold*, _italic_",
									},
								] as const
							).map((opt) => (
								<button
									key={opt.key}
									type="button"
									onClick={() => handleCopy(opt.key)}
									className="w-full px-3 py-2.5 text-left hover:bg-[#F5F5F5] dark:hover:bg-[#2A2A2A] transition-colors"
								>
									<p className="text-[12px] font-semibold text-[#111] dark:text-[#EAE8E3]">
										{opt.label}
									</p>
									<p className="text-[10px] text-[#999] dark:text-[#555]">
										{opt.desc}
									</p>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const CallBubble = ({
	message,
	isOwner,
}: {
	message: NormalizedMessage;
	isOwner: boolean;
}) => {
	const isMissed =
		message.callMissed || message.category === MessageCategory.MissedCall;
	const isVideo =
		message.callType === "video" ||
		message.category === MessageCategory.VideoCall;

	const duration = message.callDurationSec
		? formatCallDuration(message.callDurationSec)
		: null;

	const label = isMissed
		? isOwner
			? "Missed call"
			: "You missed a call"
		: isVideo
			? "Video chat"
			: "Audio chat";

	return (
		<div className="flex items-center gap-3 min-w-[140px] select-none">
			<div
				className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
					isMissed
						? "bg-[#D93829]/15 text-[#D93829]"
						: isOwner
							? "bg-white/20 text-white"
							: "bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#111] dark:text-[#EAE8E3]"
				}`}
			>
				{isVideo ? (
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						className="w-5 h-5"
					>
						<path d="M23 7l-7 5 7 5V7z" />
						<rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
					</svg>
				) : (
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						className="w-5 h-5"
					>
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
					</svg>
				)}
			</div>
			<div className="flex flex-col">
				<span className="text-[13px] font-bold leading-tight">{label}</span>
				<span
					className={`text-[11px] opacity-70 font-medium ${isMissed ? "text-[#D93829]" : ""}`}
				>
					{isMissed ? "Missed" : duration ? `Ended · ${duration}` : "Started"}
				</span>
			</div>
		</div>
	);
};

// ── Session Divider ───────────────────────────────────────────────────────────

export const SessionDivider = ({ timestamp }: { timestamp: number }) => (
	<div className="flex items-center gap-3 py-5 select-none">
		<div className="flex-1 h-px bg-[#EEE] dark:bg-[#222]" />
		<span className="text-[11px] font-medium text-[#AAA] dark:text-[#555] whitespace-nowrap">
			{formatDividerTime(timestamp)}
		</span>
		<div className="flex-1 h-px bg-[#EEE] dark:bg-[#222]" />
	</div>
);

// ── MediaItem ─────────────────────────────────────────────────────────────────

const MediaItemView = ({
	item,
	isOwner,
	objectUrl,
	onRequest,
	onOpenLightbox,
}: {
	item: import("../../../lib/parsers/types").MediaItem;
	isOwner: boolean;
	objectUrl?: string;
	onRequest: () => void;
	onOpenLightbox: () => void;
}) => {
	// Request object URL on mount if not yet available
	const unavailable = !objectUrl || !item.uri;

	if (item.type === "link") return null;

	if (unavailable) {
		// Show elegant placeholder
		const icons: Record<string, React.ReactNode> = {
			photo: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="w-6 h-6"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<polyline points="21 15 16 10 5 21" />
				</svg>
			),
			video: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="w-6 h-6"
				>
					<polygon points="23 7 16 12 23 17 23 7" />
					<rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
				</svg>
			),
			audio: <AudioIcon className="w-6 h-6" />,
			gif: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="w-6 h-6"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			),
			file: <FileIcon className="w-6 h-6" />,
			sticker: (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="w-6 h-6"
				>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				</svg>
			),
		};
		const labels: Record<string, string> = {
			photo: "Photo not available",
			video: "Video not available",
			audio: "Audio not available",
			gif: "GIF not available",
			file: "File not available",
			sticker: "Sticker not available",
		};

		return (
			<div
				className={[
					"pt-1 w-56 h-36 rounded-xl flex flex-col items-center justify-center gap-2 shrink-0",
					"border-2 border-dashed aspect-video",
					isOwner
						? "border-white/25 text-white/50"
						: "border-[#CCC] dark:border-[#333] text-[#BBB] dark:text-[#555]",
				].join(" ")}
			>
				<span className="opacity-50">
					{icons[item.type] ?? <FileIcon className="w-6 h-6" />}
				</span>
				<div className="flex flex-col items-center px-4 text-center">
					<span className="text-[11px] font-medium opacity-70">
						{labels[item.type] ??
							`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} not available`}
					</span>
				</div>
			</div>
		);
	}

	if (item.type === "photo" || item.type === "gif") {
		return (
			<div
				className="pt-1 w-[280px] min-h-[200px] aspect-[4/5] bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-xl overflow-hidden cursor-zoom-in group"
				onClick={onOpenLightbox}
			>
				<img
					src={objectUrl}
					alt="Photo attachment"
					className="w-full h-full object-cover hover:opacity-95 transition-opacity"
					loading="lazy"
				/>
			</div>
		);
	}

	if (item.type === "video") {
		return (
			<div
				className="relative group cursor-zoom-in pt-1 max-w-[280px] aspect-video bg-[#F0F0F0] dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden"
				onClick={onOpenLightbox}
			>
				<video
					src={objectUrl}
					className="rounded-xl w-full h-auto"
					preload="metadata"
					autoPlay
					muted
					loop
					playsInline
				/>
				<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
					<div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white">
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							className="w-5 h-5 ml-0.5"
						>
							<path d="M8 5.14v14l11-7-11-7z" />
						</svg>
					</div>
				</div>
				{/* Quick Mute Toggle */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						const v = e.currentTarget.parentElement?.querySelector("video");
						if (v) {
							v.muted = !v.muted;
							// Force icon update
							e.currentTarget.setAttribute("data-muted", String(v.muted));
						}
					}}
					className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-30"
				>
					<div className="w-4 h-4 flex items-center justify-center">
						<VolumeIcon />
					</div>
				</button>
			</div>
		);
	}

	if (item.type === "audio") {
		return (
			<div
				className={[
					"pt-1 flex items-center gap-3 px-4 py-3 rounded-xl max-w-[280px]",
					isOwner
						? "bg-[#E6F2FF] dark:bg-[#003366] text-[#0055A4] dark:text-[#66B2FF]"
						: "bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#111] dark:text-[#EAE8E3]",
				].join(" ")}
			>
				<div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center shrink-0">
					<AudioIcon className="w-4 h-4" />
				</div>
				<audio
					src={objectUrl}
					controls
					className="h-8 flex-1 min-w-[150px] opacity-80 hover:opacity-100 transition-opacity"
					preload="metadata"
				/>
			</div>
		);
	}

	// File attachment
	const filename = item.uri?.split("/").pop() ?? "File";
	return (
		<a
			href={objectUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={[
				"pt-1 flex items-center gap-3 px-4 py-3 rounded-xl max-w-[280px]",
				isOwner
					? "bg-[#E6F2FF] dark:bg-[#003366] text-[#0055A4] dark:text-[#66B2FF]"
					: "bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#111] dark:text-[#EAE8E3]",
				"transition-all no-underline hover:brightness-95 active:scale-[0.98]",
			].join(" ")}
		>
			<div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
				<FileIcon className="w-5 h-5" />
			</div>
			<div className="flex flex-col min-w-0">
				<span className="text-[13px] font-bold truncate leading-tight">
					{filename}
				</span>
				<span className="text-[10px] opacity-60 font-medium uppercase tracking-wider">
					Attachment
				</span>
			</div>
		</a>
	);
};

// ── Small primitives ──────────────────────────────────────────────────────────

function mergeReactions(
	server: { emoji: string; actor: string }[],
	local: { emoji: string; count: number }[],
): { emoji: string; count: number }[] {
	const map = new Map<string, number>();
	for (const r of server) {
		map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
	}
	for (const r of local) {
		map.set(r.emoji, (map.get(r.emoji) ?? 0) + r.count);
	}
	return Array.from(map.entries())
		.map(([emoji, count]) => ({ emoji, count }))
		.filter((r) => r.count > 0);
}

const ActionBtn = ({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick();
		}}
		title={label}
		aria-label={label}
		className="w-7 h-7 rounded-full flex items-center justify-center text-[#888] dark:text-[#555] hover:bg-[#F0F0F0] dark:hover:bg-[#222] hover:text-[#111] dark:hover:text-white transition-colors text-[13px]"
	>
		{children}
	</button>
);

const ReplyIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="9 17 4 12 9 7" />
		<path d="M20 18v-2a4 4 0 0 0-4-4H4" />
	</svg>
);

const VolumeIcon = () => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="w-4 h-4"
	>
		<path d="M11 5L6 9H2v6h4l5 4V5z" />
		<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
		<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
	</svg>
);

const FileIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
		<polyline points="13 2 13 9 20 9" />
	</svg>
);

const AudioIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M9 18V5l12-2v13" />
		<circle cx="6" cy="18" r="3" />
		<circle cx="18" cy="16" r="3" />
	</svg>
);

const CloseSmallIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="9 17 4 12 9 7" />
		<path d="M20 18v-2a4 4 0 0 0-4-4H4" />
	</svg>
);

const MoreIcon = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="12" cy="12" r="1" />
		<circle cx="19" cy="12" r="1" />
		<circle cx="5" cy="12" r="1" />
	</svg>
);
