"use client";

import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../../../store";

interface Props {
	onBack: () => void;
	onJump: (messageId: string) => void;
}

type DrillLevel = "year" | "month" | "day" | "time";
type TimeStage = "hour" | "minute" | "second";

export const InboxCalendarView = ({ onBack, onJump }: Props) => {
	const { messages, setInboxData } = useChatStore();

	const bounds = useMemo(() => {
		if (messages.length === 0) return { min: new Date(), max: new Date() };
		return {
			min: new Date(messages[0].timestampMs),
			max: new Date(messages[messages.length - 1].timestampMs),
		};
	}, [messages]);

	const [drillLevel, setDrillLevel] = useState<DrillLevel>("year");
	const [timeStage, setTimeStage] = useState<TimeStage>("hour");
	const [day, setDay] = useState("");
	const [month, setMonth] = useState("");
	const [year, setYear] = useState("");

	const [selHour, setSelHour] = useState(0);
	const [selMinute, setSelMinute] = useState(0);
	const [selSecond, setSelSecond] = useState(0);

	// Smart initialization: find first message of the day
	useEffect(() => {
		if (drillLevel === "time" && year && month && day) {
			const y = parseInt(year);
			const m = parseInt(month) - 1;
			const d = parseInt(day);
			const targetStart = new Date(y, m, d).getTime();
			const targetEnd = new Date(y, m, d, 23, 59, 59, 999).getTime();

			const firstMsg = messages.find(
				(msg) => msg.timestampMs >= targetStart && msg.timestampMs <= targetEnd,
			);
			if (firstMsg) {
				const date = new Date(firstMsg.timestampMs);
				setSelHour(date.getHours());
				setSelMinute(date.getMinutes());
				setSelSecond(date.getSeconds());
			} else {
				setSelHour(0);
				setSelMinute(0);
				setSelSecond(0);
			}
		}
	}, [drillLevel, year, month, day, messages]);

	const handleYearSelect = (y: number) => {
		setYear(y.toString());
		setDrillLevel("month");
	};

	const handleMonthSelect = (m: number) => {
		setMonth((m + 1).toString().padStart(2, "0"));
		setDrillLevel("day");
	};

	const handleDaySelect = (d: number) => {
		setDay(d.toString().padStart(2, "0"));
		setDrillLevel("time");
	};

	const handleReset = () => {
		setYear("");
		setMonth("");
		setDay("");
		setSelHour(0);
		setSelMinute(0);
		setSelSecond(0);
		setDrillLevel("year");
		setTimeStage("hour");
	};

	const years = useMemo(() => {
		const start = bounds.min.getFullYear();
		const end = bounds.max.getFullYear();
		const list = [];
		for (let i = end; i >= start; i--) list.push(i);
		return list;
	}, [bounds]);

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	const daysInMonth = useMemo(() => {
		if (!year || !month) return [];
		const y = parseInt(year);
		const m = parseInt(month) - 1;
		const date = new Date(y, m, 1);
		const days = [];
		while (date.getMonth() === m) {
			days.push(date.getDate());
			date.setDate(date.getDate() + 1);
		}
		return days;
	}, [year, month]);

	const executeJump = () => {
		const y = parseInt(year);
		const m = parseInt(month) - 1;
		const d = parseInt(day);

		// 1. Strict Date Validation
		const testDate = new Date(y, m, d);
		if (
			testDate.getFullYear() !== y ||
			testDate.getMonth() !== m ||
			testDate.getDate() !== d
		) {
			return; // Invalid date (e.g. Feb 30)
		}

		const targetTime = new Date(
			y,
			m,
			d,
			selHour,
			selMinute,
			selSecond,
		).getTime();

		// 2. Binary search for first message >= targetTime
		let left = 0;
		let right = messages.length - 1;
		let afterIdx = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			if (messages[mid].timestampMs >= targetTime) {
				afterIdx = mid;
				right = mid - 1;
			} else {
				left = mid + 1;
			}
		}

		// 3. Find closest (either afterIdx or afterIdx - 1)
		let bestIndex = afterIdx;
		if (afterIdx === -1) {
			// All messages are before targetTime
			bestIndex = messages.length - 1;
		} else if (afterIdx > 0) {
			const beforeIdx = afterIdx - 1;
			const diffAfter = Math.abs(messages[afterIdx].timestampMs - targetTime);
			const diffBefore = Math.abs(messages[beforeIdx].timestampMs - targetTime);
			if (diffBefore < diffAfter) {
				bestIndex = beforeIdx;
			}
		}

		const targetMsg = messages[bestIndex];
		if (targetMsg) {
			setInboxData({ highlightedMessageId: targetMsg.id });
			onJump(targetMsg.id);
		}
	};

	const isValid = useMemo(() => {
		const y = parseInt(year);
		const m = parseInt(month);
		const d = parseInt(day);
		if (!y || !m || !d) return false;
		const date = new Date(y, m - 1, d);
		return (
			date.getFullYear() === y &&
			date.getMonth() === m - 1 &&
			date.getDate() === d
		);
	}, [year, month, day]);

	const canJump = !!year && isValid;

	return (
		<aside className="w-[300px] flex-shrink-0 border-l border-[#E5E5E5] dark:border-[#1E1E1E] bg-white dark:bg-[#0A0A0A] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
			{/* Header */}
			<div className="p-4 border-b border-[#E5E5E5] dark:border-[#1E1E1E] flex items-center gap-3 bg-[#F8F8F8] dark:bg-[#111]">
				<button
					type="button"
					onClick={onBack}
					className="w-8 h-8 rounded-full flex items-center justify-center text-[#888] hover:bg-[#EEE] dark:hover:bg-[#222] transition-colors"
				>
					<BackIcon className="w-4 h-4" />
				</button>
				<h3 className="text-sm font-bold text-[#111] dark:text-white tracking-tight">
					Jump to Date
				</h3>
			</div>

			{/* Manual Inputs */}
			<div className="p-5 border-b border-[#E5E5E5] dark:border-[#1E1E1E]">
				<div className="flex items-center justify-center gap-2">
					<InputGroup
						label="Day"
						value={day}
						placeholder="DD"
						onChange={setDay}
						width="w-10"
					/>
					<span className="text-[#DDD] dark:text-[#222] font-light">/</span>
					<InputGroup
						label="Month"
						value={month}
						placeholder="MM"
						onChange={setMonth}
						width="w-10"
					/>
					<span className="text-[#DDD] dark:text-[#222] font-light">/</span>
					<InputGroup
						label="Year"
						value={year}
						placeholder="YYYY"
						onChange={setYear}
						width="w-16"
						maxLength={4}
					/>
				</div>
			</div>

			{/* Views */}
			<div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col">
				{drillLevel === "year" && (
					<Grid items={years} onSelect={handleYearSelect} />
				)}
				{drillLevel === "month" && (
					<>
						<SubHeader
							label="Years"
							onBack={() => setDrillLevel("year")}
							onReset={handleReset}
						/>
						<Grid items={months} onSelect={(_, i) => handleMonthSelect(i)} />
					</>
				)}
				{drillLevel === "day" && (
					<>
						<SubHeader
							label={`${months[parseInt(month) - 1]} ${year}`}
							onBack={() => setDrillLevel("month")}
							onReset={handleReset}
						/>
						<CalendarGrid
							days={daysInMonth}
							year={year}
							month={month}
							onSelect={handleDaySelect}
						/>
					</>
				)}
				{drillLevel === "time" && (
					<div className="flex-1 flex flex-col items-center gap-6 animate-[fadeIn_0.3s_ease-out]">
						<div className="text-center w-full">
							<SubHeader
								label="Date"
								onBack={() => setDrillLevel("day")}
								onReset={handleReset}
							/>
							<div className="w-12 h-12 rounded-full bg-[#D93829]/10 flex items-center justify-center text-[#D93829] mx-auto mb-2">
								<CalendarIcon className="w-6 h-6" />
							</div>
							<p className="text-sm font-bold text-[#111] dark:text-white leading-tight">
								Ready to jump?
							</p>
							<p className="text-[11px] text-[#888] mt-1">
								{day}/{month}/{year}
							</p>
						</div>

						<div className="w-full h-px bg-[#F0F0F0] dark:bg-[#1A1A1A]" />

						<div className="flex flex-col items-center gap-4 w-full">
							<p className="text-[10px] font-black uppercase tracking-widest text-[#999] dark:text-[#555]">
								{timeStage.toUpperCase()} SELECTOR (OPTIONAL)
							</p>

							<ClockPicker
								stage={timeStage}
								value={
									timeStage === "hour"
										? selHour
										: timeStage === "minute"
											? selMinute
											: selSecond
								}
								onSelect={(v) => {
									if (timeStage === "hour") {
										setSelHour(v);
										setTimeStage("minute");
									} else if (timeStage === "minute") {
										setSelMinute(v);
										setTimeStage("second");
									} else {
										setSelSecond(v);
									}
								}}
							/>

							<div className="flex gap-2 text-[13px] font-bold">
								<button
									onClick={() => setTimeStage("hour")}
									className={
										timeStage === "hour" ? "text-[#D93829]" : "text-[#CCC]"
									}
								>
									{selHour.toString().padStart(2, "0")}
								</button>
								<span className="text-[#EEE]">:</span>
								<button
									onClick={() => setTimeStage("minute")}
									className={
										timeStage === "minute" ? "text-[#D93829]" : "text-[#CCC]"
									}
								>
									{selMinute.toString().padStart(2, "0")}
								</button>
								<span className="text-[#EEE]">:</span>
								<button
									onClick={() => setTimeStage("second")}
									className={
										timeStage === "second" ? "text-[#D93829]" : "text-[#CCC]"
									}
								>
									{selSecond.toString().padStart(2, "0")}
								</button>
							</div>

							<button
								onClick={() => setDrillLevel("day")}
								className="text-[10px] font-black uppercase tracking-widest text-[#D93829]/60 hover:text-[#D93829]"
							>
								Change Date
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Jump Footer */}
			<div className="p-5 border-t border-[#E5E5E5] dark:border-[#1E1E1E] bg-[#F8F8F8] dark:bg-[#111]">
				<button
					type="button"
					disabled={!canJump}
					onClick={executeJump}
					className="w-full py-4 rounded-lg bg-[#111] dark:bg-white text-white dark:text-[#111] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#D93829] dark:hover:bg-[#D93829] dark:hover:text-white transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed active:scale-[0.98]"
				>
					Jump to {year}
					{month ? `-${month}` : ""}
					{day ? `-${day}` : ""}
				</button>
			</div>
		</aside>
	);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const InputGroup = ({
	label,
	value,
	placeholder,
	onChange,
	width,
	maxLength = 2,
}: any) => (
	<div className="flex flex-col items-center gap-1">
		<input
			type="text"
			placeholder={placeholder}
			value={value}
			maxLength={maxLength}
			onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
			className={`${width} h-10 rounded-xl bg-[#F2F2F7] dark:bg-[#1A1A1A] text-center text-sm font-bold text-[#111] dark:text-white outline-none focus:ring-2 ring-[#D93829]/20 transition-all placeholder-[#BBB] dark:placeholder-[#444]`}
		/>
		<span className="text-[9px] font-black uppercase tracking-tighter text-[#CCC] dark:text-[#333]">
			{label}
		</span>
	</div>
);

const Grid = ({
	items,
	onSelect,
}: {
	items: any[];
	onSelect: (item: any, i: number) => void;
}) => (
	<div className="grid grid-cols-3 gap-2">
		{items.map((it, i) => (
			<button
				key={i}
				type="button"
				onClick={() => onSelect(it, i)}
				className="aspect-square rounded-xl bg-[#F8F8F8] dark:bg-[#111] flex items-center justify-center text-sm font-bold text-[#666] dark:text-[#888] hover:bg-[#D93829] hover:text-white transition-all shadow-sm active:scale-95"
			>
				{it}
			</button>
		))}
	</div>
);

const CalendarGrid = ({
	days,
	year,
	month,
	onSelect,
}: {
	days: number[];
	year: string;
	month: string;
	onSelect: (d: number) => void;
}) => {
	const firstDay = useMemo(() => {
		const d = new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
		// Convert Sunday=0 to Sunday=6 for Monday-first layout
		return (d + 6) % 7;
	}, [year, month]);

	return (
		<div className="grid grid-cols-7 gap-1">
			{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
				<div
					key={i}
					className="h-6 flex items-center justify-center text-[9px] font-black text-[#BBB] dark:text-[#444]"
				>
					{d}
				</div>
			))}
			{/* Empty slots for Monday-first */}
			{Array.from({ length: firstDay }).map((_, i) => (
				<div key={`empty-${i}`} className="aspect-square" />
			))}
			{days.map((d) => (
				<button
					key={d}
					type="button"
					onClick={() => onSelect(d)}
					className="aspect-square rounded-lg bg-[#F8F8F8] dark:bg-[#111] flex items-center justify-center text-[11px] font-bold text-[#666] dark:text-[#888] hover:bg-[#D93829] hover:text-white transition-all shadow-sm active:scale-95"
				>
					{d}
				</button>
			))}
		</div>
	);
};

const SubHeader = ({
	label,
	onBack,
	onReset,
}: {
	label: string;
	onBack: () => void;
	onReset: () => void;
}) => (
	<div className="flex justify-between items-center mb-4 px-1">
		<button
			type="button"
			onClick={onBack}
			className="text-[10px] font-black uppercase tracking-widest text-[#D93829]"
		>
			← Back to {label}
		</button>
		<button
			type="button"
			onClick={onReset}
			className="text-[10px] font-black uppercase tracking-widest text-[#888] hover:text-[#D93829]"
		>
			Reset
		</button>
	</div>
);

const ClockPicker = ({
	stage,
	value,
	onSelect,
}: {
	stage: TimeStage;
	value: number;
	onSelect: (v: number) => void;
}) => {
	const isHour = stage === "hour";

	const points = useMemo(() => {
		const res = [];
		if (isHour) {
			for (let i = 13; i <= 24; i++) {
				const val = i === 24 ? 0 : i;
				const angle = ((i - 12) / 12) * 2 * Math.PI - Math.PI / 2;
				res.push({
					val,
					x: 110 + 85 * Math.cos(angle),
					y: 110 + 85 * Math.sin(angle),
				});
			}
			for (let i = 1; i <= 12; i++) {
				const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
				res.push({
					val: i,
					x: 110 + 55 * Math.cos(angle),
					y: 110 + 55 * Math.sin(angle),
				});
			}
		} else {
			for (let i = 0; i < 60; i += 5) {
				const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
				res.push({
					val: i,
					x: 110 + 80 * Math.cos(angle),
					y: 110 + 80 * Math.sin(angle),
				});
			}
		}
		return res;
	}, [isHour]);

	return (
		<div className="relative w-[220px] h-[220px] bg-[#F2F2F7] dark:bg-[#1A1A1A] rounded-full shadow-inner select-none transition-all duration-500">
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#D93829] rounded-full z-20" />
			{points.map((p, i) => {
				const isActive = p.val === value;
				return (
					<button
						key={i}
						type="button"
						onClick={() => onSelect(p.val)}
						style={{ left: p.x, top: p.y }}
						className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold transition-all ${isActive ? "bg-[#D93829] text-white scale-110 z-10" : "text-[#888] hover:bg-[#D93829]/10 hover:text-[#D93829]"}`}
					>
						{p.val}
					</button>
				);
			})}
		</div>
	);
};

const BackIcon = ({ className }: any) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<line x1="19" y1="12" x2="5" y2="12" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

const CalendarIcon = ({ className }: any) => (
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
