import { detectMessengerFormat } from "../lib/parsers/detect";
import { parseMessengerE2EE } from "../lib/parsers/messenger-e2ee";
import { parseMessengerLegacy } from "../lib/parsers/messenger-legacy";
import { MessageCategory } from "../lib/parsers/types";

export interface SocialCircleRequest {
	files: File[];
	timezoneOffset: number;
	systemOffset: number;
	workerId: number;
}

export type SocialCircleWorkerResponse =
	| {
			type: "PROGRESS";
			current: number;
			total: number;
			fileName: string;
			workerId: number;
	  }
	| {
			type: "SUCCESS";
			threads: Record<string, ThreadData>;
			workerId: number;
	  };

export interface ThreadData {
	threadName: string;
	threadPath: string;
	isGroup: boolean;
	totalCount: number;
	participants: string[];
	daysActive: string[];
	catCounts: Record<string, number>;
	msgStats: {
		types: Record<string, number>;
		totalWords: number;
		emojiCount: number;
	};
	heatmap: number[][]; // [dayIdx][hourIdx]
	wdDetails: Record<string, Record<string, number>>;
	hDetails: Record<string, Record<string, number>>;
	slotDetails: Record<string, Record<string, number>>;
	timelineCounts: Record<string, { total: number; senders: Record<string, number> }>;
	peakTrackers: Record<string, Record<string, number>>;
	timestamps: number[];
}

const urlRegex = /(https?:\/\/[^\s]+)/g;
const emojiRegex = /\p{Emoji_Presentation}/gu;

self.onmessage = async (event: MessageEvent<SocialCircleRequest>) => {
	const { files, timezoneOffset, systemOffset, workerId } = event.data;

	const threads: Record<string, ThreadData> = {};

	const getLocalDateKey = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

	const validMedia = [
		MessageCategory.Photo,
		MessageCategory.Video,
		MessageCategory.Audio,
		MessageCategory.Sticker,
		MessageCategory.GIF,
		MessageCategory.File,
	];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		self.postMessage({
			type: "PROGRESS",
			current: i + 1,
			total: files.length,
			fileName: file.name,
			workerId,
		});

		try {
			const text = await file.text();
			const json = JSON.parse(text);
			const format = detectMessengerFormat(json);

			if (format === "unknown") continue;

			const chat = format === "legacy" ? parseMessengerLegacy(json) : parseMessengerE2EE(json);

			const threadName = chat.metadata.threadName || "Unknown Chat";
			// Use the folder path to uniquely identify threads with the same name
			const threadPath = (file as any).webkitRelativePath ? (file as any).webkitRelativePath.split("/").slice(0, -1).join("/") : threadName;
			
			if (!threads[threadPath]) {
				const trueParticipants = chat.metadata.participants.filter((p) => p !== "Meta AI");
				threads[threadPath] = {
					threadName,
					threadPath,
					isGroup: trueParticipants.length > 2,
					totalCount: 0,
					participants: chat.metadata.participants,
					daysActive: [],
					catCounts: {},
					msgStats: {
						types: {
							text: 0, links: 0, images: 0, gifs: 0, videos: 0,
							stickers: 0, audio: 0, files: 0, other: 0, unsent: 0,
						},
						totalWords: 0,
						emojiCount: 0,
					},
					heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
					wdDetails: {},
					hDetails: {},
					slotDetails: {},
					timelineCounts: {},
					peakTrackers: { year: {}, month: {}, day: {}, hour: {} },
					timestamps: [],
				};
			}

			const t = threads[threadPath];
			const daysSet = new Set(t.daysActive);

			for (const m of chat.messages) {
				t.totalCount++;
				t.timestamps.push(m.timestampMs);

				const cat = m.category;
				if (validMedia.includes(cat)) {
					t.catCounts[cat] = (t.catCounts[cat] || 0) + 1;
				}

				if (cat === MessageCategory.Text) t.msgStats.types.text++;
				else if (cat === MessageCategory.Photo) t.msgStats.types.images++;
				else if (cat === MessageCategory.GIF) t.msgStats.types.gifs++;
				else if (cat === MessageCategory.Video) t.msgStats.types.videos++;
				else if (cat === MessageCategory.Sticker) t.msgStats.types.stickers++;
				else if (cat === MessageCategory.Audio) t.msgStats.types.audio++;
				else if (cat === MessageCategory.File) t.msgStats.types.files++;
				else if (cat === MessageCategory.Unsent) t.msgStats.types.unsent++;
				else if (cat !== MessageCategory.Link) t.msgStats.types.other++;

				const messageLinks = new Set<string>();
				if (m.content) {
					const textLinks = m.content.match(urlRegex);
					if (textLinks) {
						for (const url of textLinks) messageLinks.add(url);
					}
				}
				if (cat === MessageCategory.Link && m.mediaUri) {
					messageLinks.add(m.mediaUri);
				}
				t.msgStats.types.links += messageLinks.size;

				if (m.content) {
					const isSystem =
						cat === MessageCategory.SystemEvent ||
						cat === MessageCategory.ReactionNotification ||
						cat === MessageCategory.VoiceCall ||
						cat === MessageCategory.VideoCall ||
						cat === MessageCategory.MissedCall;

					if (!isSystem) {
						t.msgStats.totalWords += m.content.split(/\s+/).filter(Boolean).length;
						const emojis = m.content.match(emojiRegex);
						if (emojis) t.msgStats.emojiCount += emojis.length;
					}
				}

				// Localized date handling matching Overview page
				const d = new Date(m.timestampMs + (timezoneOffset - systemOffset) * 60000);
				const dy = getLocalDateKey(d);
				daysSet.add(dy);

				const dayIdx = (d.getDay() + 6) % 7;
				const hourIdx = d.getHours();

				t.heatmap[dayIdx][hourIdx]++;

				const sender = m.senderName;
				const slotKey = `${dayIdx}-${hourIdx}`;
				if (!t.slotDetails[slotKey]) t.slotDetails[slotKey] = {};
				t.slotDetails[slotKey][sender] = (t.slotDetails[slotKey][sender] || 0) + 1;

				if (!t.wdDetails[dayIdx]) t.wdDetails[dayIdx] = {};
				t.wdDetails[dayIdx][sender] = (t.wdDetails[dayIdx][sender] || 0) + 1;

				if (!t.hDetails[hourIdx]) t.hDetails[hourIdx] = {};
				t.hDetails[hourIdx][sender] = (t.hDetails[hourIdx][sender] || 0) + 1;

				if (!t.timelineCounts[dy]) {
					t.timelineCounts[dy] = { total: 0, senders: {} };
				}
				t.timelineCounts[dy].total++;
				t.timelineCounts[dy].senders[sender] = (t.timelineCounts[dy].senders[sender] || 0) + 1;

				const y = d.getFullYear().toString();
				const mon = `${y}-${String(d.getMonth() + 1).padStart(2, "0")}`;
				const hr = `${dy} ${String(d.getHours()).padStart(2, "0")}:00`;
				t.peakTrackers.year[y] = (t.peakTrackers.year[y] || 0) + 1;
				t.peakTrackers.month[mon] = (t.peakTrackers.month[mon] || 0) + 1;
				t.peakTrackers.day[dy] = (t.peakTrackers.day[dy] || 0) + 1;
				t.peakTrackers.hour[hr] = (t.peakTrackers.hour[hr] || 0) + 1;
			}
			t.daysActive = Array.from(daysSet);
		} catch (e) {
			console.error("Error parsing file", file.name, e);
		}
	}

	self.postMessage({
		type: "SUCCESS",
		workerId,
		threads,
	});
};
