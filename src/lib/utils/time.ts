/**
 * Get system timezone offset in minutes
 */
export const getSystemOffset = () => -new Date().getTimezoneOffset();

/**
 * Adjust timestamp based on user-selected timezone offset
 */
export const getAdjustedDate = (ts: number, timezoneOffset: number) => {
	const systemOffset = getSystemOffset();
	return new Date(ts + (timezoneOffset - systemOffset) * 60000);
};

/**
 * Get YYYY-MM-DD key from Date object
 */
export const getLocalDateKey = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dy = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dy}`;
};

/**
 * Format timestamp for display
 */
export const formatDate = (
	ts: number,
	timezoneOffset: number,
	mode: "full" | "date" | "month" = "date",
) => {
	const d = getAdjustedDate(ts, timezoneOffset);
	if (mode === "month") {
		return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
	}
	const dateStr = d.toLocaleDateString("en-US", {
		month: "long",
		day: "2-digit",
		year: "numeric",
	});
	if (mode === "date") return dateStr;
	const timeStr = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	return `${dateStr} at ${timeStr}`;
};
