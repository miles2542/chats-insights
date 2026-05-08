"use client";

import { useChatStore } from "../../../store";

/**
 * Fixed right-edge tab trigger for the Inbox panel.
 *
 * UX design rationale:
 * - Default state: only a 4px red sliver visible. Unintrusive — doesn't compete with
 *   analytics content. But the red color is distinctive enough to be noticed peripherally.
 * - Hover: slides fully out, showing icon + "Inbox" label. Smooth CSS width transition.
 * - Clicking opens the panel. Tab hides while panel is open (panel has its own close path).
 * - Vertically centered on viewport.
 */
export const InboxTabTrigger = () => {
	const { inbox, toggleInbox } = useChatStore();
	const hasInteracted =
		typeof window !== "undefined" &&
		sessionStorage.getItem("hasInteractedWithInbox") === "true";
	const isFirstPrompt = !hasInteracted;

	// Hide tab while panel is open
	if (inbox.isOpen) return null;

	const handleOpen = () => {
		if (typeof window !== "undefined")
			sessionStorage.setItem("hasInteractedWithInbox", "true");
		toggleInbox();
	};

	return (
		<div
			className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] group"
			style={{ padding: "40px 0 40px 60px", marginRight: "-4px" }}
		>
			<button
				type="button"
				onClick={handleOpen}
				aria-label="Open Inbox"
				className={[
					"flex flex-col items-center justify-center gap-2",
					"h-32 overflow-hidden",
					isFirstPrompt ? "w-16" : "w-4 group-hover:w-16",
					"transition-[width] duration-300 ease-out",
					"rounded-l-2xl",
					"bg-white/95 dark:bg-[#1A1A1A]/95",
					"backdrop-blur-md",
					"border border-r-0 border-[#EAE8E3] dark:border-[#333]",
					"shadow-[-4px_0_20px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_20px_rgba(0,0,0,0.4)]",
					"border-l-[3px] border-l-[#D93829]",
					"cursor-pointer",
					"hover:bg-white dark:hover:bg-[#222]",
				].join(" ")}
			>
				<div
					className={`flex flex-col items-center gap-3 transition-all duration-300 ${isFirstPrompt ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="w-5 h-5 text-[#D93829]"
					>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>

					<div className="flex flex-col items-center text-[10px] font-black text-[#111] dark:text-[#EEE] leading-[1.1] tracking-tighter select-none">
						<span>I</span>
						<span>N</span>
						<span>B</span>
						<span>O</span>
						<span>X</span>
					</div>
				</div>
			</button>
		</div>
	);
};
