/**
 * Fixes Messenger's Latin-1 escaped UTF-8 strings.
 * E.g. "Th\u00e1o" -> "Thảo"
 */
export function fixMojibake(str: string): string {
	if (!str) return str;
	const bytes = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) {
		bytes[i] = str.charCodeAt(i);
	}
	try {
		return new TextDecoder("utf-8").decode(bytes);
	} catch {
		return str;
	}
}

/**
 * Recursively traverses an object and fixes mojibake in all string values.
 */
export function fixObjectMojibake<T>(obj: T): T {
	if (typeof obj === "string") {
		return fixMojibake(obj) as unknown as T;
	}

	if (Array.isArray(obj)) {
		return obj.map(fixObjectMojibake) as unknown as T;
	}

	if (obj !== null && typeof obj === "object") {
		const result: any = {};
		for (const key in obj) {
			if (Object.hasOwn(obj, key)) {
				result[key] = fixObjectMojibake((obj as any)[key]);
			}
		}
		return result as T;
	}

	return obj;
}
