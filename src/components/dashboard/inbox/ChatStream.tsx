"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { MessageBubble, SessionDivider } from "./MessageBubble";

/**
 * ChatStream — virtualized message list.
 */

type Divider = { kind: "divider"; timestamp: number; key: string };
type MessageItem = { kind: "message"; message: NormalizedMessage; key: string };
type VirtualItem = Divider | MessageItem;

interface Props {
	messages: NormalizedMessage[];
	owner: string;
	stagedMessages: NormalizedMessage[];
	onSendStaged: (text: string) => void;
}

export const ChatStream = ({
	messages,
	owner,
	stagedMessages,
	onSendStaged,
}: Props) => {
	const { inbox, setInboxData, sessionGapThreshold, mediaMap, participants } =
		useChatStore();

	const [showJumpToBottom, setShowJumpToBottom] = useState(false);
	const [atBottom, setAtBottom] = useState(true);
	const [replyTo, setReplyTo] = useState<NormalizedMessage | null>(null);
	const [inputText, setInputText] = useState("");
	const [showLocalNotice, setShowLocalNotice] = useState(false);
	const [localNoticeDismissed, setLocalNoticeDismissed] = useState(false);

	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const scrollerRef = useRef<HTMLElement | null>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const objectUrlMapRef = useRef<Map<string, string>>(new Map());
	const [, forceRender] = useState(0);

	const allMessages = useMemo(
		() =>
			[...messages, ...stagedMessages].sort(
				(a, b) => a.timestampMs - b.timestampMs,
			),
		[messages, stagedMessages],
	);

	const virtualItems = useMemo<VirtualItem[]>(() => {
		if (allMessages.length === 0) return [];
		const gapMs = sessionGapThreshold * 60 * 1000;
		const items: VirtualItem[] = [];
		items.push({
			kind: "divider",
			timestamp: allMessages[0].timestampMs,
			key: `divider-start`,
		});

		for (let i = 0; i < allMessages.length; i++) {
			const msg = allMessages[i];
			const prev = allMessages[i - 1];
			if (i > 0 && msg.timestampMs - prev.timestampMs > gapMs) {
				items.push({
					kind: "divider",
					timestamp: msg.timestampMs,
					key: `divider-${msg.id}`,
				});
			}
			items.push({ kind: "message", message: msg, key: msg.id });
		}
		return items;
	}, [allMessages, sessionGapThreshold]);

	const resolveMediaUrls = useCallback(
		(message: NormalizedMessage): Record<string, string> => {
			const urls: Record<string, string> = {};
			if (!message.mediaItems) return urls;

			for (const item of message.mediaItems) {
				if (!item.uri) continue;
				const cached = objectUrlMapRef.current.get(`${message.id}-${item.uri}`);
				if (cached) {
					urls[item.uri] = cached;
					continue;
				}

				// [35] Fix: Decode URI and try multiple matching strategies
				const uri = decodeURIComponent(item.uri);
				const filename = uri.split("/").pop() ?? "";

				// 1. Direct match
				let file = mediaMap.get(item.uri) || mediaMap.get(uri);

				// 2. Suffix match (handles cases where root folder was included in upload)
				if (!file) {
					for (const [key, f] of mediaMap.entries()) {
						if (key.endsWith(uri)) {
							file = f;
							break;
						}
					}
				}

				// 3. Last resort: filename match
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
					objectUrlMapRef.current.set(`${message.id}-${item.uri}`, url);
					urls[item.uri] = url;
				}
			}
			return urls;
		},
		[mediaMap],
	);

	const handleRangeChange = useCallback(
		({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
			const bufferItems = 30;
			const keepStart = Math.max(0, startIndex - bufferItems);
			const keepEnd = Math.min(virtualItems.length - 1, endIndex + bufferItems);
			const keepIds = new Set<string>();
			for (let i = keepStart; i <= keepEnd; i++) {
				const item = virtualItems[i];
				if (item?.kind === "message") keepIds.add(item.message.id);
			}
			for (const [msgId, url] of objectUrlMapRef.current.entries()) {
				if (!keepIds.has(msgId)) {
					URL.revokeObjectURL(url);
					objectUrlMapRef.current.delete(msgId);
				}
			}
			forceRender((n) => n + 1);
			setShowJumpToBottom(endIndex < virtualItems.length - 10);
		},
		[virtualItems],
	);

	useEffect(() => {
		return () => {
			for (const url of objectUrlMapRef.current.values())
				URL.revokeObjectURL(url);
			objectUrlMapRef.current.clear();
		};
	}, []);

	const scrollToBottom = useCallback(
		(behavior: "smooth" | "auto" = "smooth") => {
			// Punch 1: Instant jump to estimated bottom (no visible animation to stutter)
			virtuosoRef.current?.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior: "auto",
			});

			// Punch 2: Smooth cleanup after layout measurements settle
			setTimeout(() => {
				virtuosoRef.current?.scrollTo({
					top: Number.MAX_SAFE_INTEGER,
					behavior,
				});
			}, 100);
		},
		[],
	);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const step = 50; // Fixed pixels per notch
			scroller.scrollBy({
				top: Math.sign(e.deltaY) * step,
				behavior: "auto",
			});
		};

		scroller.addEventListener("wheel", handleWheel, { passive: false });
		return () => scroller.removeEventListener("wheel", handleWheel);
	}, []);

	useEffect(() => {
		const targetId = inbox.selectedMessageId;
		if (!targetId) return;
		const index = virtualItems.findIndex(
			(i) => i.kind === "message" && i.message.id === targetId,
		);
		if (index !== -1) {
			virtuosoRef.current?.scrollToIndex({
				index,
				align: "center",
				behavior: "auto",
			});
			setTimeout(() => setInboxData({ selectedMessageId: null }), 1000);
		}
	}, [inbox.selectedMessageId, virtualItems, setInboxData]);

	const renderItem = useCallback(
		(index: number) => {
			const item = virtualItems[index];
			if (!item) return null;
			if (item.kind === "divider")
				return <SessionDivider key={item.key} timestamp={item.timestamp} />;

			const isOwner = item.message.senderName === owner;
			const isStaged = stagedMessages.some((m) => m.id === item.message.id);

			const prevMsg = (() => {
				for (let i = index - 1; i >= 0; i--) {
					const p = virtualItems[i];
					if (p?.kind === "message") return p.message;
					if (p?.kind === "divider") break;
				}
				return null;
			})();
			const nextMsg = (() => {
				for (let i = index + 1; i < virtualItems.length; i++) {
					const n = virtualItems[i];
					if (n?.kind === "message") return n.message;
					if (n?.kind === "divider") break;
				}
				return null;
			})();

			return (
				<MessageBubble
					key={item.key}
					message={item.message}
					isOwner={isOwner}
					isConsecutive={prevMsg?.senderName === item.message.senderName}
					isGroupedWithNext={nextMsg?.senderName === item.message.senderName}
					isStaged={isStaged}
					mediaObjectUrls={resolveMediaUrls(item.message)}
					onReply={(msg) => {
						setReplyTo(msg);
						inputRef.current?.focus();
					}}
					onRequestMedia={() => forceRender((n) => n + 1)}
					showLocalBadge={isStaged && prevMsg === null} // [15] Only show on the very first staged message
					showParticipantName={
						participants.length > 2 &&
						!isOwner &&
						prevMsg?.senderName !== item.message.senderName
					}
				/>
			);
		},
		[virtualItems, owner, stagedMessages, resolveMediaUrls, participants],
	);

	return (
		<div className="flex-1 flex flex-col min-h-0 relative overflow-x-hidden">
			{allMessages.length === 0 ? (
				<EmptyState />
			) : (
				<>
					{showJumpToBottom && (
						<button
							type="button"
							onClick={() => scrollToBottom("smooth")}
							className="absolute bottom-24 right-8 w-10 h-10 rounded-full bg-white dark:bg-[#222] shadow-xl border border-[#EEE] dark:border-[#333] flex items-center justify-center text-[#D93829] hover:bg-[#F5F5F5] dark:hover:bg-[#333] transition-all animate-[fadeInUp_0.2s_ease-out] z-30"
						>
							<ChevronDownIcon className="w-5 h-5" />
						</button>
					)}
					<Virtuoso
						ref={virtuosoRef}
						scrollerRef={(el) => {
							scrollerRef.current = el as HTMLElement;
						}}
						totalCount={virtualItems.length}
						itemContent={renderItem}
						initialTopMostItemIndex={virtualItems.length - 1}
						followOutput="smooth"
						overscan={1200}
						atBottomStateChange={setAtBottom}
						atBottomThreshold={100}
						rangeChanged={handleRangeChange}
						className="flex-1 custom-scrollbar overflow-x-hidden"
						increaseViewportBy={1500}
						components={{
							Header: () => <div className="h-4" />,
							Footer: () => <div className="h-12" />,
						}}
					/>
				</>
			)}

			{replyTo && (
				<div className="mx-4 mb-1 flex items-center gap-3 px-4 py-2.5 bg-[#F5F5F5] dark:bg-[#1A1A1A] rounded-xl border-l-2 border-[#D93829]">
					<div className="flex-1 min-w-0">
						<p className="text-[10px] font-bold text-[#D93829] uppercase tracking-wider mb-0.5">
							Replying to {replyTo.senderName}
						</p>
						<p className="text-[12px] text-[#666] dark:text-[#888] truncate">
							{replyTo.content?.slice(0, 80) ?? "[Media]"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setReplyTo(null)}
						className="w-6 h-6 rounded-full flex items-center justify-center text-[#999] hover:bg-[#EEE] dark:hover:bg-[#333] transition-colors flex-shrink-0"
					>
						<CloseSmallIcon className="w-3 h-3" />
					</button>
				</div>
			)}

			<div className="border-t border-[#E5E5E5] dark:border-[#1E1E1E] bg-white/80 dark:bg-[#0E0E0E]/80 backdrop-blur-md px-4 py-3.5 flex-shrink-0">
				{/* <div className={`text-[10px] text-[#BBB] dark:text-[#444] text-center mb-2 transition-opacity duration-500 ${showLocalNotice ? "opacity-100" : "opacity-0"}`}>
					Messages typed here are local only — not sent anywhere :D
				</div> */}
				<div className="flex items-end gap-2">
					<DecorativeInputIcons />
					<div className="flex-1 bg-[#F2F2F7] dark:bg-[#1A1A1A] rounded-[22px] border border-transparent dark:border-[#222] focus-within:border-[#D93829]/30 transition-colors px-4 py-2">
						<textarea
							ref={inputRef}
							rows={1}
							value={inputText}
							onChange={(e) => {
								setInputText(e.target.value);
								e.target.style.height = "auto";
								e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									const t = inputText.trim();
									if (t) {
										onSendStaged(t);
										setInputText("");
										setReplyTo(null);
										if (inputRef.current)
											inputRef.current.style.height = "auto";
										// Ensure we jump to bottom after sending
										requestAnimationFrame(() => scrollToBottom("smooth"));
									}
								}
							}}
							placeholder="Aa"
							className="w-full bg-transparent outline-none text-[14px] text-[#111] dark:text-white placeholder-[#AAA] dark:placeholder-[#444] resize-none leading-5 min-h-[20px] max-h-[120px]"
						/>
					</div>
					<button
						type="button"
						onClick={() => {
							const t = inputText.trim();
							if (t) {
								onSendStaged(t);
								setInputText("");
								setReplyTo(null);
								if (inputRef.current) inputRef.current.style.height = "auto";
							} else {
								onSendStaged(inbox.quickReaction);
							}
							requestAnimationFrame(() => scrollToBottom("smooth"));
						}}
						className="w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-[#F2F2F7] dark:hover:bg-[#222] transition-colors flex-shrink-0 mb-0.5"
					>
						{inputText.trim() ? (
							<SendIcon className="w-5 h-5 text-[#D93829]" />
						) : (
							<span>{inbox.quickReaction}</span>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

const EmptyState = () => (
	<div className="flex-1 flex flex-col items-center justify-center text-center px-8">
		<div className="w-16 h-16 rounded-full bg-[#F5F5F5] dark:bg-[#1A1A1A] flex items-center justify-center mb-4">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="w-8 h-8 text-[#CCC] dark:text-[#444]"
			>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
		</div>
		<p className="text-[14px] font-semibold text-[#999] dark:text-[#555]">
			No messages loaded
		</p>
	</div>
);

const DecorativeInputIcons = () => {
	const [tooltip, setTooltip] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);
	const icons = [
		{ icon: <MicIcon className="w-4 h-4" />, label: "Voice" },
		{ icon: <ImageIcon className="w-4 h-4" />, label: "Image" },
		{ icon: <StickerIcon className="w-4 h-4" />, label: "Sticker" },
		{ icon: "GIF", label: "GIF", isText: true },
	];
	return (
		<div className="flex items-center gap-0.5 flex-shrink-0 mb-1.5">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-9 h-9 rounded-full flex items-center justify-center text-[#888] dark:text-[#555] hover:bg-[#F2F2F7] dark:hover:bg-[#222] transition-colors"
			>
				{expanded ? (
					<CloseSmallIcon className="w-4 h-4" />
				) : (
					<PlusIcon className="w-4 h-4" />
				)}
			</button>
			<div
				className={`flex items-center gap-0.5 overflow-hidden transition-all duration-200 ${expanded ? "max-w-[140px] opacity-100" : "max-w-0 opacity-0"}`}
			>
				{icons.map((item) => (
					<button
						key={item.label}
						type="button"
						onClick={() => {
							setTooltip("Doesn't work here! 😉");
							setTimeout(() => setTooltip(null), 3000);
						}}
						className="w-9 h-9 rounded-full flex items-center justify-center text-[#888] dark:text-[#555] hover:bg-[#F2F2F7] dark:hover:bg-[#222] transition-colors text-sm font-bold"
					>
						{item.isText ? (
							<span className="text-[10px] font-black">{item.icon}</span>
						) : (
							item.icon
						)}
					</button>
				))}
				{tooltip && (
					<div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111] text-[11px] font-semibold rounded-xl shadow-lg z-20 pointer-events-none">
						{tooltip}
					</div>
				)}
			</div>
		</div>
	);
};

const ChevronDownIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<polyline points="6 9 12 15 18 9" />
	</svg>
);
const CloseSmallIcon = ({ className }: any) => (
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
const PlusIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	</svg>
);
const SendIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<line x1="22" y1="2" x2="11" y2="13" />
		<polygon points="22 2 15 22 11 13 2 9 22 2" />
	</svg>
);
const MicIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
		<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
		<line x1="12" y1="19" x2="12" y2="23" />
		<line x1="8" y1="23" x2="16" y2="23" />
	</svg>
);
const ImageIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
		<circle cx="8.5" cy="8.5" r="1.5" />
		<polyline points="21 15 16 10 5 21" />
	</svg>
);
const StickerIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
		<path d="M12 7v10" />
		<path d="M7 12h10" />
	</svg>
);
