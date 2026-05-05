import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { NormalizedMessage } from "../parsers/types";

interface MessengerInsightsDB extends DBSchema {
	messages: {
		key: string;
		value: NormalizedMessage;
		indexes: {
			"by-timestamp": number;
			"by-sender": string;
		};
	};
	metadata: {
		key: string;
		value: any;
	};
}

const DB_NAME = "messenger-insights";
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase<MessengerInsightsDB>> {
	return openDB<MessengerInsightsDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains("messages")) {
				const store = db.createObjectStore("messages", { keyPath: "hash" });
				store.createIndex("by-timestamp", "timestampMs");
				store.createIndex("by-sender", "senderName");
			}
			if (!db.objectStoreNames.contains("metadata")) {
				db.createObjectStore("metadata");
			}
		},
	});
}

export async function clearDB() {
	const db = await initDB();
	const tx = db.transaction(["messages", "metadata"], "readwrite");
	await tx.objectStore("messages").clear();
	await tx.objectStore("metadata").clear();
	await tx.done;
}

export async function insertMessagesChunk(messages: NormalizedMessage[]) {
	const db = await initDB();
	const tx = db.transaction("messages", "readwrite");
	const store = tx.objectStore("messages");

	// Upsert automatically deduplicates by keyPath (hash)
	for (const msg of messages) {
		store.put(msg);
	}

	await tx.done;
}

export async function updateMetadata(key: string, value: any) {
	const db = await initDB();
	await db.put("metadata", value, key);
}

export async function getMetadata(key: string) {
	const db = await initDB();
	return db.get("metadata", key);
}

// Example query: Get first N messages
export async function getMessages(limit = 100, offset = 0) {
	const db = await initDB();
	const tx = db.transaction("messages", "readonly");
	const index = tx.objectStore("messages").index("by-timestamp");

	const messages: NormalizedMessage[] = [];
	let cursor = await index.openCursor();

	// Skip offset
	if (offset > 0 && cursor) {
		await cursor.advance(offset);
	}

	while (cursor && messages.length < limit) {
		messages.push(cursor.value);
		cursor = await cursor.continue();
	}

	return messages;
}

export async function getTotalMessageCount(): Promise<number> {
	const db = await initDB();
	return db.count("messages");
}
