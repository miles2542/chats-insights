"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedMessage } from "../../../lib/parsers/types";
import { MessageCategory } from "../../../lib/parsers/types";
import { useChatStore } from "../../../store";
import { AvatarCircle } from "./InboxPanel";

/**
 * InboxRightSidebar — the collapsible info/customization panel.
 */

interface Props {
	displayName: string;
	participants: string[];
	owner: string;
}

export const InboxRightSidebar = ({
	displayName,
	participants,
	owner,
}: Props) => {
	const {
		inbox,
		messages,
		setInboxData,
		updateNickname,
		updateAvatar,
		updateThreadMetadata,
	} = useChatStore();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [nicknameEditing, setNicknameEditing] = useState<string | null>(null);
	const [nicknameInput, setNicknameInput] = useState("");
	const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
	const [photoExpanded, setPhotoExpanded] = useState(false);
	const [audioExpanded, setAudioExpanded] = useState(false);
	const [filesExpanded, setFilesExpanded] = useState(false);

	const isGroup = participants.length > 2;
	const others = participants.filter((p) => p !== owner && p !== "Meta AI");

	const handleAvatarClick = (participant: string, isThread = false) => {
		fileInputRef.current?.setAttribute("data-for", participant);
		fileInputRef.current?.setAttribute(
			"data-is-thread",
			isThread ? "true" : "false",
		);
		fileInputRef.current?.click();
	};

	const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		const forParticipant = fileInputRef.current?.getAttribute("data-for");
		const isThread =
			fileInputRef.current?.getAttribute("data-is-thread") === "true";
		if (!file || !forParticipant) return;

		const blobUrl = URL.createObjectURL(file);
		if (isThread) {
			updateThreadMetadata(undefined, blobUrl);
		} else {
			updateAvatar(forParticipant, blobUrl);
		}
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const saveNickname = (participant: string) => {
		updateNickname(participant, nicknameInput.trim());
		setNicknameEditing(null);
		setNicknameInput("");
	};

	const saveThreadName = () => {
		updateThreadMetadata(nicknameInput.trim());
		setNicknameEditing(null);
		setNicknameInput("");
	};

	const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥"];

	const allMedia = useMemo(() => {
		const photos: NormalizedMessage[] = [];
		const audio: NormalizedMessage[] = [];
		const files: NormalizedMessage[] = [];

		for (const m of messages) {
			if (!m.mediaItems || m.mediaItems.length === 0) continue;
			const type = m.mediaItems[0].type;
			if (type === "photo" || type === "video" || type === "gif")
				photos.push(m);
			else if (type === "audio") audio.push(m);
			else if (type === "file") files.push(m);
		}

		return { photos, audio, files };
	}, [messages]);

	const mediaStats = {
		photos: allMedia.photos.length,
		audio: allMedia.audio.length,
		files: allMedia.files.length,
	};

	const resolvedThreadName = isGroup
		? inbox.customThreadName || displayName
		: inbox.nicknames[others[0]] || others[0] || displayName;
	const resolvedThreadAvatar = isGroup
		? inbox.customThreadAvatar
		: inbox.customAvatars[others[0]] || null;

	return (
		<aside className="w-[300px] flex-shrink-0 border-l border-[#E5E5E5] dark:border-[#1E1E1E] bg-white dark:bg-[#0A0A0A] flex flex-col overflow-hidden">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleAvatarFile}
			/>

			<div className="flex-1 overflow-y-auto custom-scrollbar">
				<div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[#E5E5E5] dark:border-[#1E1E1E]">
					<div className="relative group">
						<AvatarCircle
							name={others[0] ?? displayName}
							size="lg"
							avatarUrl={resolvedThreadAvatar || undefined}
							onClick={() =>
								isGroup
									? handleAvatarClick("thread", true)
									: handleAvatarClick(others[0] ?? displayName)
							}
						/>
						<div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none cursor-pointer">
							<span className="text-white text-[10px] font-bold text-center leading-tight px-2">
								{isGroup ? "Change Group Photo" : "Change Photo"}
							</span>
						</div>
					</div>

					{nicknameEditing === "thread-name" ? (
						<div className="mt-3 flex flex-col items-center gap-2 w-full">
							<input
								type="text"
								value={nicknameInput}
								onChange={(e) => setNicknameInput(e.target.value)}
								autoFocus
								onKeyDown={(e) => e.key === "Enter" && saveThreadName()}
								className="w-full text-center text-[15px] font-bold bg-transparent border-b-2 border-[#D93829] outline-none text-[#111] dark:text-white"
							/>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={saveThreadName}
									className="text-[10px] font-bold text-[#D93829] uppercase tracking-widest"
								>
									Save
								</button>
								<button
									type="button"
									onClick={() => setNicknameEditing(null)}
									className="text-[10px] font-bold text-[#888] uppercase tracking-widest"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<div className="mt-3 flex flex-col items-center">
							<h3 className="text-[15px] font-bold text-[#111] dark:text-white tracking-tight text-center">
								{resolvedThreadName}
							</h3>
							{isGroup && (
								<button
									type="button"
									onClick={() => {
										setNicknameEditing("thread-name");
										setNicknameInput(resolvedThreadName);
									}}
									className="text-[10px] font-bold text-[#D93829] uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
								>
									Edit Group Name
								</button>
							)}
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={() => setInboxData({ isInfoOpen: false })}
					className="w-full flex items-center gap-3 px-5 py-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] hover:bg-[#F5F5F5] dark:hover:bg-[#111] transition-colors group text-left"
				>
					<div className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-center text-[#555] dark:text-[#777] group-hover:bg-[#D93829]/10 group-hover:text-[#D93829] transition-colors flex-shrink-0">
						<SearchIcon className="w-4 h-4" />
					</div>
					<span className="text-[13px] font-semibold text-[#111] dark:text-[#CCC]">
						Search messages
					</span>
					<ChevronRightIcon className="w-4 h-4 text-[#CCC] dark:text-[#444] ml-auto" />
				</button>

				<button
					type="button"
					onClick={() =>
						setInboxData({ isCalendarOpen: true, isInfoOpen: false })
					}
					className="w-full flex items-center gap-3 px-5 py-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] hover:bg-[#F5F5F5] dark:hover:bg-[#111] transition-colors group text-left"
				>
					<div className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-center text-[#555] dark:text-[#777] group-hover:bg-[#D93829]/10 group-hover:text-[#D93829] transition-colors flex-shrink-0">
						<CalendarIcon className="w-4 h-4" />
					</div>
					<span className="text-[13px] font-semibold text-[#111] dark:text-[#CCC]">
						Jump to date
					</span>
					<ChevronRightIcon className="w-4 h-4 text-[#CCC] dark:text-[#444] ml-auto" />
				</button>

				<section className="border-b border-[#E5E5E5] dark:border-[#1E1E1E] py-5">
					<div className="px-5 flex justify-between items-center mb-4">
						<h4 className="text-[10px] font-black uppercase tracking-widest text-[#999] dark:text-[#555]">
							Chat Participants
						</h4>
						<span className="text-[10px] font-bold text-[#CCC] dark:text-[#444]">
							{participants.length}
						</span>
					</div>

					<div
						className={`space-y-1 ${participants.length > 6 ? "max-h-[320px] overflow-y-auto custom-scrollbar" : ""}`}
					>
						{participants.map((p) => {
							const isEditing = nicknameEditing === p;
							const nickname = inbox.nicknames[p];
							const hasNickname = !!nickname;

							return (
								<div
									key={p}
									className="px-5 py-2 hover:bg-[#F5F5F5] dark:hover:bg-[#111] transition-colors group flex items-center gap-3"
								>
									<div
										className="relative shrink-0 cursor-pointer"
										onClick={() => handleAvatarClick(p)}
									>
										<AvatarCircle
											name={p}
											size="sm"
											avatarUrl={inbox.customAvatars[p] || undefined}
										/>
										<div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
											<div className="w-1.5 h-1.5 bg-white rounded-full" />
										</div>
									</div>

									<div className="flex-1 min-w-0">
										{isEditing ? (
											<div className="flex flex-col gap-1">
												<input
													type="text"
													value={nicknameInput}
													onChange={(e) => setNicknameInput(e.target.value)}
													autoFocus
													onKeyDown={(e) =>
														e.key === "Enter" && saveNickname(p)
													}
													className="w-full text-[12px] font-semibold bg-transparent border-b border-[#D93829] outline-none text-[#111] dark:text-white"
												/>
												<div className="flex gap-2">
													<button
														type="button"
														onClick={() => saveNickname(p)}
														className="text-[9px] font-black text-[#D93829] uppercase tracking-widest"
													>
														Save
													</button>
													<button
														type="button"
														onClick={() => setNicknameEditing(null)}
														className="text-[9px] font-black text-[#888] uppercase tracking-widest"
													>
														Cancel
													</button>
												</div>
											</div>
										) : (
											<div className="flex flex-col">
												<p className="text-[12px] font-semibold text-[#111] dark:text-white truncate">
													{nickname || p}
												</p>
												{hasNickname && (
													<p className="text-[10px] text-[#888] dark:text-[#555] truncate">
														{p}
													</p>
												)}
											</div>
										)}
									</div>

									{!isEditing && (
										<button
											type="button"
											onClick={() => {
												setNicknameEditing(p);
												setNicknameInput(nickname || "");
											}}
											className="text-[10px] font-bold text-[#D93829] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2"
										>
											Change nickname
										</button>
									)}
								</div>
							);
						})}
					</div>
				</section>

				<section className="px-5 py-5">
					<h4 className="text-[10px] font-black uppercase tracking-widest text-[#999] dark:text-[#555] mb-4">
						Media
					</h4>
					<MediaGroup
						icon={<ImageIcon className="w-3.5 h-3.5" />}
						label="Photos & Videos"
						count={mediaStats.photos}
						expanded={photoExpanded}
						onToggle={() => setPhotoExpanded(!photoExpanded)}
						onMore={() =>
							setInboxData({ activeMediaView: "photos", isInfoOpen: false })
						}
					>
						<div className="grid grid-cols-3 gap-1.5 mt-3">
							{allMedia.photos.slice(0, photoExpanded ? 24 : 6).map((m) => (
								<MediaThumbnail key={m.id} message={m} />
							))}
						</div>
					</MediaGroup>
					<MediaGroup
						icon={<MicIcon className="w-3.5 h-3.5" />}
						label="Audio"
						count={mediaStats.audio}
						expanded={audioExpanded}
						onToggle={() => setAudioExpanded(!audioExpanded)}
						onMore={() =>
							setInboxData({ activeMediaView: "audio", isInfoOpen: false })
						}
					>
						<div className="mt-2 space-y-1">
							{allMedia.audio.slice(0, audioExpanded ? 10 : 3).map((m) => (
								<div
									key={m.id}
									className="text-[11px] p-2 rounded-lg bg-[#F8F8F8] dark:bg-[#111] truncate text-[#888]"
								>
									{m.mediaItems?.[0]?.uri?.split("/").pop() ?? "Voice clip"}
								</div>
							))}
						</div>
					</MediaGroup>
					<MediaGroup
						icon={<FileIcon className="w-3.5 h-3.5" />}
						label="Files"
						count={mediaStats.files}
						expanded={filesExpanded}
						onToggle={() => setFilesExpanded(!filesExpanded)}
						onMore={() =>
							setInboxData({ activeMediaView: "files", isInfoOpen: false })
						}
					>
						<div className="mt-2 space-y-1">
							{allMedia.files.slice(0, filesExpanded ? 10 : 3).map((m) => (
								<div
									key={m.id}
									className="text-[11px] p-2 rounded-lg bg-[#F8F8F8] dark:bg-[#111] truncate text-[#888]"
								>
									{m.mediaItems?.[0]?.uri?.split("/").pop() ?? "Document"}
								</div>
							))}
						</div>
					</MediaGroup>
				</section>
			</div>
		</aside>
	);
};

const MediaGroup = ({
	icon,
	label,
	count,
	expanded,
	onToggle,
	onMore,
	children,
}: any) => (
	<div className="mb-1">
		<div
			onClick={onToggle}
			className="w-full flex items-center gap-3 py-2.5 hover:bg-[#F5F5F5] dark:hover:bg-[#111] rounded-xl px-2 -mx-2 transition-colors group cursor-pointer"
		>
			<div className="w-7 h-7 rounded-lg bg-[#F2F2F7] dark:bg-[#1A1A1A] flex items-center justify-center text-[#999] dark:text-[#555] group-hover:text-[#D93829] transition-colors">
				{icon}
			</div>
			<span className="flex-1 text-[13px] font-semibold text-[#111] dark:text-[#CCC] text-left">
				{label}
			</span>
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-bold text-[#BBB] dark:text-[#444]">
					{count || "—"}
				</span>
				{onMore && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onMore();
						}}
						className="text-[9px] font-black uppercase tracking-widest text-[#D93829] hover:underline cursor-pointer"
					>
						View All
					</button>
				)}
			</div>
			<ChevronDownIcon
				className={`w-3.5 h-3.5 text-[#CCC] transition-transform ${expanded ? "rotate-180" : ""}`}
			/>
		</div>
		{expanded && <div>{children}</div>}
	</div>
);

const MediaThumbnail = ({ message }: { message: NormalizedMessage }) => {
	const { mediaMap, setInboxData } = useChatStore();
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		const uri = message.mediaItems?.[0]?.uri;
		if (!uri) return;
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
			const objectUrl = URL.createObjectURL(file);
			setUrl(objectUrl);
			return () => URL.revokeObjectURL(objectUrl);
		}
	}, [message, mediaMap]);

	return (
		<button
			type="button"
			onClick={() => setInboxData({ selectedMessageId: message.id })}
			className="aspect-square rounded-lg bg-[#F5F5F5] dark:bg-[#111] overflow-hidden hover:opacity-80 transition-opacity border border-[#EEE] dark:border-[#222]"
		>
			{url ? (
				<img src={url} alt="" className="w-full h-full object-cover" />
			) : (
				<div className="w-full h-full flex items-center justify-center grayscale opacity-20 text-lg">
					🖼️
				</div>
			)}
		</button>
	);
};

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
export const ChevronRightIcon = ({ className }: any) => (
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
export const ChevronDownIcon = ({ className }: any) => (
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
const FileIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
		<polyline points="13 2 13 9 20 9" />
	</svg>
);
