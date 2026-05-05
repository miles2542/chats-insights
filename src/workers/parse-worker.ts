import { deduplicateMessages } from "../lib/parsers/dedup";
import { detectMessengerFormat } from "../lib/parsers/detect";
import { parseMessengerE2EE } from "../lib/parsers/messenger-e2ee";
import { parseMessengerLegacy } from "../lib/parsers/messenger-legacy";
import type { NormalizedMessage, ParsedChat } from "../lib/parsers/types";

export type WorkerRequest = {
	type: "PARSE_FILES";
	files: File[];
	workerId?: number;
};

export type WorkerResponse =
	| {
			type: "PROGRESS";
			current: number;
			total: number;
			status: string;
			workerId?: number;
	  }
	| {
			type: "SUCCESS";
			data: {
				messages: NormalizedMessage[];
				participants: string[];
				threadName: string;
			};
			workerId?: number;
	  }
	| { type: "ERROR"; message: string; workerId?: number };

addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
	if (event.data.type === "PARSE_FILES") {
		const { files, workerId } = event.data;
		try {
			const allParticipants = new Set<string>();
			let threadName = "";
			const allMessages: NormalizedMessage[] = [];

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				postMessage({
					type: "PROGRESS",
					current: i + 1,
					total: files.length,
					status: `Reading ${file.name}...`,
					workerId,
				});

				const content = await file.text();
				postMessage({
					type: "PROGRESS",
					current: i + 1,
					total: files.length,
					status: `Parsing ${file.name}...`,
					workerId,
				});

				const json = JSON.parse(content);
				const format = detectMessengerFormat(json);

				let parsed: ParsedChat;
				if (format === "legacy") {
					parsed = parseMessengerLegacy(json);
				} else if (format === "e2ee") {
					parsed = parseMessengerE2EE(json);
				} else {
					continue; // Skip unknown
				}

				parsed.metadata.participants.forEach((p) => allParticipants.add(p));
				if (parsed.metadata.threadName.length > threadName.length) {
					threadName = parsed.metadata.threadName;
				}

				allMessages.push(...parsed.messages);

				// Free memory explicitly
				parsed.messages.length = 0;
			}

			postMessage({
				type: "PROGRESS",
				current: files.length,
				total: files.length,
				status: `Deduplicating...`,
				workerId,
			});

			const uniqueMessages = deduplicateMessages(allMessages);

			// Free massive raw array immediately
			allMessages.length = 0;

			postMessage({
				type: "SUCCESS",
				data: {
					messages: uniqueMessages,
					participants: Array.from(allParticipants),
					threadName,
				},
				workerId,
			});
		} catch (error: any) {
			postMessage({ type: "ERROR", message: error.message, workerId });
		}
	}
});
