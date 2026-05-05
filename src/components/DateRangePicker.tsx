"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function DateRangePicker({
	startDate,
	endDate,
	onChange,
}: {
	startDate: Date | null;
	endDate: Date | null;
	onChange: (start: Date | null, end: Date | null) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);

	// Current view month/year
	const [viewDate, setViewDate] = useState(() => startDate || new Date());

	// Selection mode: selecting start or end
	const [selectingMode, setSelectingMode] = useState<"start" | "end">("start");

	const popoverRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		if (isOpen) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [isOpen]);

	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();

	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const firstDayIndex = new Date(year, month, 1).getDay();

	const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
	const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

	const handleDayClick = (day: number) => {
		const selected = new Date(year, month, day);

		if (selectingMode === "start") {
			onChange(selected, null);
			setSelectingMode("end");
		} else {
			if (startDate && selected < startDate) {
				// Reverse if selected end is before start
				onChange(selected, startDate);
			} else {
				onChange(startDate, selected);
			}
			setIsOpen(false);
			setSelectingMode("start");
		}
	};

	const formatDate = (d: Date | null) => {
		if (!d) return "YYYY-MM-DD";
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const dy = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${dy}`;
	};

	const isSelected = (day: number) => {
		const d = new Date(year, month, day).getTime();
		const s = startDate?.getTime();
		const e = endDate?.getTime();
		return d === s || d === e;
	};

	const isBetween = (day: number) => {
		if (!startDate || !endDate) return false;
		const d = new Date(year, month, day).getTime();
		return d > startDate.getTime() && d < endDate.getTime();
	};

	const [startInput, setStartInput] = useState("");
	const [endInput, setEndInput] = useState("");

	// Sync local input state when props change
	useEffect(() => {
		setStartInput(startDate ? formatDate(startDate) : "");
	}, [startDate]);

	useEffect(() => {
		setEndInput(endDate ? formatDate(endDate) : "");
	}, [endDate]);

	const handleStartBlur = () => {
		const d = new Date(startInput);
		if (!isNaN(d.getTime())) {
			onChange(d, endDate);
		} else {
			setStartInput(startDate ? formatDate(startDate) : "");
		}
	};

	const handleEndBlur = () => {
		const d = new Date(endInput);
		if (!isNaN(d.getTime())) {
			onChange(startDate, d);
		} else {
			setEndInput(endDate ? formatDate(endDate) : "");
		}
	};

	const monthNames = [
		"JAN",
		"FEB",
		"MAR",
		"APR",
		"MAY",
		"JUN",
		"JUL",
		"AUG",
		"SEP",
		"OCT",
		"NOV",
		"DEC",
	];

	return (
		<div className="relative" ref={popoverRef}>
			{/* Trigger Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#111111] border-2 border-[#111111] dark:border-[#EAE8E3] text-xs font-bold shadow-[2px_2px_0px_0px_rgba(17,17,17,1)] dark:shadow-[2px_2px_0px_0px_rgba(234,232,227,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all group"
			>
				<Calendar className="w-3.5 h-3.5" />
				<span>
					{startDate ? formatDate(startDate) : "START"}
					{" → "}
					{endDate ? formatDate(endDate) : "END"}
				</span>
			</button>

			{/* Popover */}
			{isOpen && (
				<div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1A1A1A] border-2 border-[#111111] dark:border-[#EAE8E3] shadow-[4px_4px_0px_0px_rgba(17,17,17,1)] dark:shadow-[4px_4px_0px_0px_rgba(234,232,227,1)] z-50 p-4">
					{/* Header Controls */}
					<div className="flex items-center justify-between mb-4 border-b-2 border-[#111111] dark:border-[#EAE8E3] pb-2">
						<button
							onClick={handlePrevMonth}
							className="hover:bg-[#111111] hover:text-white dark:hover:bg-[#EAE8E3] dark:hover:text-[#111111] p-1 transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<div className="font-[family-name:var(--font-playfair)] font-bold tracking-widest text-lg uppercase">
							{monthNames[month]} {year}
						</div>
						<button
							onClick={handleNextMonth}
							className="hover:bg-[#111111] hover:text-white dark:hover:bg-[#EAE8E3] dark:hover:text-[#111111] p-1 transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>

					{/* Manual Input Overrides */}
					<div className="flex gap-2 mb-4">
						<input
							type="text"
							placeholder="YYYY-MM-DD"
							value={startInput}
							onChange={(e) => setStartInput(e.target.value)}
							onBlur={handleStartBlur}
							onKeyDown={(e) => e.key === "Enter" && handleStartBlur()}
							className="w-full bg-[#F5F5F5] dark:bg-[#111111] border border-[#ccc] dark:border-[#444] px-2 py-1 text-xs font-bold focus:outline-none focus:border-[#D93829]"
						/>
						<span className="flex items-center text-[#888]">→</span>
						<input
							type="text"
							placeholder="YYYY-MM-DD"
							value={endInput}
							onChange={(e) => setEndInput(e.target.value)}
							onBlur={handleEndBlur}
							onKeyDown={(e) => e.key === "Enter" && handleEndBlur()}
							className="w-full bg-[#F5F5F5] dark:bg-[#111111] border border-[#ccc] dark:border-[#444] px-2 py-1 text-xs font-bold focus:outline-none focus:border-[#D93829]"
						/>
					</div>

					{/* Grid */}
					<div className="grid grid-cols-7 gap-1 text-center mb-1">
						{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
							<div key={i} className="text-[10px] font-bold text-[#888]">
								{d}
							</div>
						))}
					</div>

					<div className="grid grid-cols-7 gap-1 text-center">
						{Array.from({ length: firstDayIndex }).map((_, i) => (
							<div key={`empty-${i}`} />
						))}

						{Array.from({ length: daysInMonth }).map((_, i) => {
							const day = i + 1;
							const selected = isSelected(day);
							const inRange = isBetween(day);

							return (
								<button
									key={day}
									onClick={() => handleDayClick(day)}
									className={`
                    h-8 flex items-center justify-center text-xs font-bold border transition-colors
                    ${selected ? "bg-[#D93829] text-white border-[#D93829]" : ""}
                    ${inRange && !selected ? "bg-[#F5F5F5] dark:bg-[#333] border-transparent" : ""}
                    ${!selected && !inRange ? "border-transparent hover:border-[#111111] dark:hover:border-[#EAE8E3]" : ""}
                  `}
								>
									{day}
								</button>
							);
						})}
					</div>

					{/* Quick Actions */}
					<div className="flex justify-between mt-4 pt-2 border-t border-[#EAE8E3] dark:border-[#333]">
						<button
							onClick={() => {
								onChange(null, null);
								setIsOpen(false);
								setSelectingMode("start");
							}}
							className="text-[10px] uppercase font-bold text-[#D93829] hover:underline"
						>
							Clear
						</button>
						<div className="text-[10px] uppercase font-bold text-[#888]">
							{selectingMode === "start" ? "Select Start" : "Select End"}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
