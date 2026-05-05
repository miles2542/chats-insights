"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DayWindowSliderProps {
	/** nightEnd: 0-24 (exclusive), e.g. 5 = "up to 4:59" */
	nightEnd: number;
	morningStart: number;
	morningEnd: number;
	nightStart: number;
	onChange: (
		nightEnd: number,
		morningStart: number,
		morningEnd: number,
		nightStart: number,
	) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Format an hour (0-24) as HH:MM, showing exclusive end as -1 min */
const fmt = (h: number, isExclusiveEnd = false): string => {
	const display = isExclusiveEnd ? h - 1 : h;
	const clamped = ((display % 24) + 24) % 24;
	return `${String(clamped).padStart(2, "0")}:${isExclusiveEnd ? "59" : "00"}`;
};

/** Clamp a value between min and max */
const clamp = (v: number, min: number, max: number) =>
	Math.max(min, Math.min(max, v));

/** Convert a fraction (0-1) to hour (0-24), snapped to integer */
const fractionToHour = (f: number) => Math.round(clamp(f, 0, 1) * 24);

// ─── Handle label positions ────────────────────────────────────────────────────

type HandleKey = "nightEnd" | "morningStart" | "morningEnd" | "nightStart";

// Min spacing between adjacent handles (in hours)
const MIN_SPACING = 1;

interface Handles {
	nightEnd: number;
	morningStart: number;
	morningEnd: number;
	nightStart: number;
}

const ORDER: HandleKey[] = [
	"nightEnd",
	"morningStart",
	"morningEnd",
	"nightStart",
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const DayWindowSlider: React.FC<DayWindowSliderProps> = ({
	nightEnd,
	morningStart,
	morningEnd,
	nightStart,
	onChange,
}) => {
	const trackRef = useRef<HTMLDivElement>(null);
	const dragging = useRef<HandleKey | null>(null);
	const [tooltip, setTooltip] = useState<HandleKey | null>(null);

	const handles: Handles = { nightEnd, morningStart, morningEnd, nightStart };

	// ── Drag logic ──────────────────────────────────────────────────────────────

	const getHourFromEvent = useCallback((clientX: number): number => {
		const track = trackRef.current;
		if (!track) return 0;
		const rect = track.getBoundingClientRect();
		const fraction = (clientX - rect.left) / rect.width;
		return fractionToHour(fraction);
	}, []);

	const applyDrag = useCallback(
		(key: HandleKey, rawHour: number) => {
			const next = { ...handles };
			const idx = ORDER.indexOf(key);

			// Constrain between neighbours with MIN_SPACING
			const prevKey = idx > 0 ? ORDER[idx - 1] : null;
			const nextKey = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
			const minVal = prevKey ? next[prevKey] + MIN_SPACING : 0;
			const maxVal = nextKey ? next[nextKey] - MIN_SPACING : 24;

			next[key] = clamp(rawHour, minVal, maxVal);
			onChange(
				next.nightEnd,
				next.morningStart,
				next.morningEnd,
				next.nightStart,
			);
		},
		[handles, onChange],
	);

	const onMouseDown = useCallback(
		(key: HandleKey) => (e: React.MouseEvent) => {
			e.preventDefault();
			dragging.current = key;
			setTooltip(key);
		},
		[],
	);

	useEffect(() => {
		const onMove = (e: MouseEvent) => {
			if (!dragging.current) return;
			applyDrag(dragging.current, getHourFromEvent(e.clientX));
		};
		const onUp = () => {
			dragging.current = null;
			setTooltip(null);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [applyDrag, getHourFromEvent]);

	// Touch support
	useEffect(() => {
		const onTouchMove = (e: TouchEvent) => {
			if (!dragging.current || !e.touches[0]) return;
			applyDrag(dragging.current, getHourFromEvent(e.touches[0].clientX));
		};
		const onTouchEnd = () => {
			dragging.current = null;
			setTooltip(null);
		};
		window.addEventListener("touchmove", onTouchMove, { passive: true });
		window.addEventListener("touchend", onTouchEnd);
		return () => {
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
		};
	}, [applyDrag, getHourFromEvent]);

	// ── Rendering ───────────────────────────────────────────────────────────────

	const toPercent = (h: number) => `${(h / 24) * 100}%`;

	// Night zones: 0→nightEnd AND nightStart→24 (the wrap-around part)
	const nightLeftWidth = (nightEnd / 24) * 100;
	const nightRightLeft = (nightStart / 24) * 100;
	const nightRightWidth = ((24 - nightStart) / 24) * 100;
	const morningLeft = (morningStart / 24) * 100;
	const morningWidth = ((morningEnd - morningStart) / 24) * 100;

	// Hour tick marks
	const ticks = [0, 3, 6, 9, 12, 15, 18, 21, 24];

	// Handle config
	const handleConfig: Record<
		HandleKey,
		{ label: string; color: string; isExclEnd: boolean }
	> = {
		nightEnd: { label: "Night end", color: "#0055A4", isExclEnd: true },
		morningStart: {
			label: "Morning start",
			color: "#FFCC00",
			isExclEnd: false,
		},
		morningEnd: { label: "Morning end", color: "#FFCC00", isExclEnd: true },
		nightStart: { label: "Night start", color: "#0055A4", isExclEnd: false },
	};

	return (
		<div className="space-y-4 select-none">
			{/* Legend */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5">
						<div className="w-3 h-3 bg-[#0055A4]" />
						<span className="text-[9px] uppercase font-bold text-[#888]">
							Night
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-3 h-3 bg-[#FFCC00]" />
						<span className="text-[9px] uppercase font-bold text-[#888]">
							Morning
						</span>
					</div>
				</div>
				<div className="text-[9px] font-bold text-[#888] uppercase">
					{fmt(nightStart)} – {fmt(nightEnd, true)} &nbsp;|&nbsp;{" "}
					{fmt(morningStart)} – {fmt(morningEnd, true)}
				</div>
			</div>

			{/* Track */}
			<div className="relative">
				<div
					ref={trackRef}
					className="relative h-4 bg-[#F0F0F0] dark:bg-[#1A1A1A] border-2 border-[#111] dark:border-[#EAE8E3] cursor-default overflow-visible"
					style={{ borderRadius: 0 }}
				>
					{/* Night zone: left (0→nightEnd) */}
					<div
						className="absolute top-0 bottom-0 bg-[#0055A4] opacity-50"
						style={{ left: 0, width: `${nightLeftWidth}%` }}
					/>
					{/* Morning zone */}
					<div
						className="absolute top-0 bottom-0 bg-[#FFCC00] opacity-60"
						style={{ left: `${morningLeft}%`, width: `${morningWidth}%` }}
					/>
					{/* Night zone: right (nightStart→24) */}
					<div
						className="absolute top-0 bottom-0 bg-[#0055A4] opacity-50"
						style={{ left: `${nightRightLeft}%`, width: `${nightRightWidth}%` }}
					/>

					{/* Handles */}
					{ORDER.map((key) => {
						const cfg = handleConfig[key];
						const hour = handles[key];
						const isActive = tooltip === key;
						return (
							<div
								key={key}
								className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
								style={{ left: toPercent(hour) }}
								onMouseDown={onMouseDown(key)}
								onTouchStart={(e) => {
									e.preventDefault();
									dragging.current = key;
									setTooltip(key);
								}}
								onMouseEnter={() => setTooltip(key)}
								onMouseLeave={() => {
									if (!dragging.current) setTooltip(null);
								}}
							>
								{/* Tooltip */}
								{isActive && (
									<div
										className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 whitespace-nowrap bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111] text-[9px] font-black uppercase px-2 py-1 pointer-events-none"
										style={{ borderRadius: 0 }}
									>
										{cfg.label}: {fmt(hour, cfg.isExclEnd)}
									</div>
								)}
								{/* Handle square */}
								<div
									className="w-4 h-5 border-2 cursor-ew-resize transition-transform"
									style={{
										background: cfg.color,
										borderColor: "#111",
										transform: isActive ? "scaleY(1.25)" : "scaleY(1)",
										boxShadow: isActive ? `0 0 0 2px ${cfg.color}44` : "none",
									}}
								/>
							</div>
						);
					})}
				</div>

				{/* Hour tick marks */}
				<div className="relative mt-1.5 h-4">
					{ticks.map((h) => (
						<div
							key={h}
							className="absolute flex flex-col items-center"
							style={{ left: toPercent(h), transform: "translateX(-50%)" }}
						>
							<div className="w-px h-1.5 bg-[#CCC] dark:bg-[#444]" />
							<span className="text-[8px] font-bold text-[#AAA] dark:text-[#555] mt-0.5">
								{h === 24 ? "0" : h}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Gap labels underneath — shows the "dead zones" */}
			<div className="flex justify-between text-[8px] font-bold text-[#999] uppercase">
				<span>← Night wraps midnight</span>
				<span>
					Gap: {fmt(nightEnd)} – {fmt(morningStart)}
				</span>
				<span>
					Gap: {fmt(morningEnd)} – {fmt(nightStart)} →
				</span>
			</div>
		</div>
	);
};
