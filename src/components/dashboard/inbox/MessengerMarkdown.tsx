"use client";

import { useMemo } from "react";

/**
 * MessengerMarkdown — renders Facebook Messenger's text formatting.
 *
 * Supported syntax (applied in priority order to avoid conflicts):
 *   ```block```  → <pre><code> block (must be checked BEFORE single backtick)
 *   *text*       → <strong> bold
 *   _text_       → <em> italic
 *   ~text~       → <del> strikethrough
 *   `text`       → <code> inline monospace
 *   > text       → <blockquote> (line-level prefix)
 *   URLs         → <a> with target="_blank" rel="noopener"
 *
 * Design notes:
 * - Returns segments (not dangerouslySetInnerHTML) for security.
 * - Nested formatting (e.g., *_bold italic_*) is NOT supported by Messenger — we match
 *   their behavior and treat each format independently.
 * - Line breaks (\n) in the raw text become <br /> elements.
 * - All text nodes are escaped so raw HTML in message content is shown literally.
 */

type Segment =
	| { type: "text"; value: string }
	| { type: "bold"; value: string }
	| { type: "italic"; value: string }
	| { type: "strike"; value: string }
	| { type: "code"; value: string }
	| { type: "codeblock"; value: string }
	| { type: "blockquote"; value: string }
	| { type: "link"; value: string; href: string };

// URL regex — catches http/https/ftp URLs
const URL_RE =
	/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

// Inline format regexes — Messenger uses single delimiters (not doubled)
// Ordered: code block first (triple backtick), then inline code, then others
const INLINE_PATTERNS: [RegExp, Segment["type"]][] = [
	[/```([\s\S]*?)```/g, "codeblock"],
	[/`([^`\n]+)`/g, "code"],
	[/\*([^*\n]+)\*/g, "bold"],
	[/_([^_\n]+)_/g, "italic"],
	[/~([^~\n]+)~/g, "strike"],
];

/** Parse a plain string into typed segments. */
function parseSegments(text: string): Segment[] {
	// Handle blockquote lines first (line-level transform)
	const lines = text.split("\n");
	const processedLines: string[] = [];
	const blockquoteLines: boolean[] = [];

	for (const line of lines) {
		if (line.startsWith("> ") || line === ">") {
			blockquoteLines.push(true);
			processedLines.push(line.slice(2));
		} else {
			blockquoteLines.push(false);
			processedLines.push(line);
		}
	}

	// Rejoin and parse inline patterns
	// We process the whole text at once to handle multi-line code blocks,
	// then split on \n for line rendering.
	const fullText = processedLines.join("\n");

	// Build a list of spans: { start, end, type, content }
	type Span = {
		start: number;
		end: number;
		type: Segment["type"];
		content: string;
		href?: string;
	};

	const spans: Span[] = [];

	// Find URL spans
	for (const match of fullText.matchAll(URL_RE)) {
		spans.push({
			start: match.index!,
			end: match.index! + match[0].length,
			type: "link",
			content: match[0],
			href: match[0],
		});
	}

	// Find inline format spans (skip if inside existing span)
	for (const [re, segType] of INLINE_PATTERNS) {
		re.lastIndex = 0;
		for (const match of fullText.matchAll(re)) {
			const start = match.index!;
			const end = start + match[0].length;
			// Check overlap with existing spans
			const overlaps = spans.some((s) => start < s.end && end > s.start);
			if (!overlaps) {
				spans.push({
					start,
					end,
					type: segType,
					content: match[1] ?? match[0],
				});
			}
		}
	}

	// Sort spans by position
	spans.sort((a, b) => a.start - b.start);

	// Build final segment array, filling gaps with "text"
	const segments: Segment[] = [];
	let cursor = 0;

	for (const span of spans) {
		if (span.start > cursor) {
			segments.push({
				type: "text",
				value: fullText.slice(cursor, span.start),
			});
		}
		if (span.type === "link") {
			segments.push({ type: "link", value: span.content, href: span.href! });
		} else {
			segments.push({
				type: span.type as Exclude<Segment["type"], "text" | "link">,
				value: span.content,
			});
		}
		cursor = span.end;
	}

	if (cursor < fullText.length) {
		segments.push({ type: "text", value: fullText.slice(cursor) });
	}

	return segments;
}

/** Render a single segment as a React element. */
function SegmentEl({ seg, isOwner }: { seg: Segment; isOwner: boolean }) {
	switch (seg.type) {
		case "bold":
			return <strong className="font-bold">{seg.value}</strong>;
		case "italic":
			return <em className="italic">{seg.value}</em>;
		case "strike":
			return <del className="line-through opacity-75">{seg.value}</del>;
		case "code":
			return (
				<code
					className={[
						"font-mono text-[13px] px-1.5 py-0.5 rounded break-words",
						isOwner
							? "bg-white/15 text-white"
							: "bg-black/8 dark:bg-white/10 text-[#D93829] dark:text-[#FF6B5B]",
					].join(" ")}
				>
					{seg.value}
				</code>
			);
		case "codeblock":
			return (
				<pre
					className={[
						"font-mono text-[12px] rounded-xl p-3 my-1 overflow-x-auto whitespace-pre-wrap break-words font-mono",
						isOwner
							? "bg-white/15 text-white"
							: "bg-[#F0F0F0] dark:bg-[#1A1A1A] text-[#111] dark:text-[#EAE8E3]",
					].join(" ")}
				>
					<code className="font-mono">{seg.value}</code>
				</pre>
			);
		case "blockquote":
			return (
				<blockquote
					className={[
						"border-l-2 pl-3 my-1 italic",
						isOwner
							? "border-white/40 text-white/80"
							: "border-[#D93829]/40 text-[#555] dark:text-[#888]",
					].join(" ")}
				>
					{seg.value}
				</blockquote>
			);
		case "link":
			return (
				<a
					href={seg.href}
					target="_blank"
					rel="noopener noreferrer"
					className={[
						"underline underline-offset-2 break-all",
						isOwner
							? "text-white/90 hover:text-white"
							: "text-[#0055A4] dark:text-[#5B9BD5] hover:text-[#003B7A] dark:hover:text-[#7BB5E8]",
					].join(" ")}
					onClick={(e) => e.stopPropagation()}
				>
					{seg.value}
				</a>
			);
		case "text":
		default:
			// Render text with line breaks
			return (
				<>
					{seg.value.split("\n").map((line, i, arr) => (
						<span key={i}>
							{line}
							{i < arr.length - 1 && <br />}
						</span>
					))}
				</>
			);
	}
}

interface Props {
	text: string;
	/** True if this message was sent by the owner (affects inline code color) */
	isOwner: boolean;
	className?: string;
}

export const MessengerMarkdown = ({ text, isOwner, className }: Props) => {
	const segments = useMemo(() => parseSegments(text.normalize("NFC")), [text]);

	return (
		<span className={className}>
			{segments.map((seg, i) => (
				<SegmentEl key={i} seg={seg} isOwner={isOwner} />
			))}
		</span>
	);
};
