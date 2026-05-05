import { create } from "zustand";
import type { NormalizedMessage } from "../lib/parsers/types";

export interface FileNode {
	id: string;
	name: string;
	type: "file" | "folder";
	children?: FileNode[];
	rawFile?: File;
	path: string;
}

interface ChatStore {
	messages: NormalizedMessage[];
	participants: string[];
	owner: string;
	threadName: string;
	isLoaded: boolean;

	// Corpus Management
	activeFiles: FileNode[];
	queuedFiles: FileNode[];
	isExplorerOpen: boolean;

	// Filters
	selectedParticipants: string[];
	timeRange: [Date | null, Date | null];
	timezoneOffset: number; // minutes from UTC
	sessionGapThreshold: number; // minutes
	overnightMinGap: number; // minutes
	morningStartHour: number;
	morningEndHour: number;
	nightStartHour: number;
	nightEndHour: number;
	doubleTextMinGap: number; // minutes
	doubleTextMaxGap: number; // minutes
	maxResponseGapThreshold: number; // days
	hasSeenTutorial: boolean;

	// Language State
	language: {
		isInitialized: boolean;
		kpis: any | null;
		wordResults: { text: string; count: number }[];
		emojiResults: { text: string; count: number }[];
		wordDetails: any;
		emojiDetails: any;
		linkResults: { text: string; count: number }[];
		linkDetails: any;
		error: string | null;
		emojiSource: "messages" | "reactions" | "both";
	};

	// Engagement State
	engagement: {
		isInitialized: boolean;
		kpis: any | null;
		initiatorData: any | null;
		doubleTextData: any | null;
		responseCadenceData: any | null;
		error: string | null;
	};

	// Calls State
	calls: {
		isInitialized: boolean;
		kpis: any | null;
		participantStats: any | null;
		timelineData: any | null;
		distributionData: any | null;
		error: string | null;
		granularity: "Day" | "Month" | "Year";
	};

	// Social Circle State
	socialCircle: {
		isInitialized: boolean;
		rawThreads: Record<string, any> | null;
		error: string | null;
	};

	setChatData: (data: {
		messages: NormalizedMessage[];
		participants: string[];
		owner: string;
		threadName: string;
	}) => void;
	setOwner: (owner: string) => void;
	setQueuedFiles: (files: FileNode[]) => void;
	setActiveFiles: (files: FileNode[]) => void;
	setExplorerOpen: (open: boolean) => void;
	toggleExplorer: () => void;
	setSelectedParticipants: (participants: string[]) => void;
	setTimeRange: (range: [Date | null, Date | null]) => void;
	setTimezoneOffset: (offset: number) => void;
	setSessionGapThreshold: (threshold: number) => void;
	setOvernightMinGap: (gap: number) => void;
	setDayWindows: (
		nightEnd: number,
		morningStart: number,
		morningEnd: number,
		nightStart: number,
	) => void;
	setDoubleTextGaps: (min: number, max: number) => void;
	setMaxResponseGapThreshold: (threshold: number) => void;
	setLanguageData: (data: Partial<ChatStore["language"]>) => void;
	setEngagementData: (data: Partial<ChatStore["engagement"]>) => void;
	setCallsData: (data: Partial<ChatStore["calls"]>) => void;
	setSocialCircleData: (data: Partial<ChatStore["socialCircle"]>) => void;
	setHasSeenTutorial: (val: boolean) => void;
	reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
	messages: [],
	participants: [],
	owner: "",
	threadName: "",
	isLoaded: false,

	activeFiles: [],
	queuedFiles: [],
	isExplorerOpen: false,

	selectedParticipants: [],
	timeRange: [null, null],
	timezoneOffset: -new Date().getTimezoneOffset(), // Default to local
	sessionGapThreshold: 10,
	overnightMinGap: 180,
	morningStartHour: 5,
	morningEndHour: 11,
	nightStartHour: 22,
	nightEndHour: 5,
	doubleTextMinGap: 10,
	doubleTextMaxGap: 120,
	maxResponseGapThreshold: 10,
	hasSeenTutorial: typeof window !== "undefined" ? sessionStorage.getItem("hasSeenOnboarding") === "true" : false,

	language: {
		isInitialized: false,
		kpis: null,
		wordResults: [],
		emojiResults: [],
		wordDetails: null,
		emojiDetails: null,
		linkResults: [],
		linkDetails: null,
		error: null,
		emojiSource: "both",
	},

	engagement: {
		isInitialized: false,
		kpis: null,
		initiatorData: null,
		doubleTextData: null,
		responseCadenceData: null,
		error: null,
	},

	calls: {
		isInitialized: false,
		kpis: null,
		participantStats: null,
		timelineData: null,
		distributionData: null,
		error: null,
		granularity: "Month",
	},

	socialCircle: {
		isInitialized: false,
		rawThreads: null,
		error: null,
	},

	setChatData: (data) =>
		set({
			...data,
			isLoaded: true,
			selectedParticipants: data.participants, // Default to all selected
		}),
	setOwner: (owner) => set({ owner }),
	setQueuedFiles: (files) => set({ queuedFiles: files }),
	setActiveFiles: (files) => set({ activeFiles: files }),
	setExplorerOpen: (open) => set({ isExplorerOpen: open }),
	toggleExplorer: () =>
		set((state) => ({ isExplorerOpen: !state.isExplorerOpen })),
	setSelectedParticipants: (p) => set({ selectedParticipants: p }),
	setTimeRange: (r) => set({ timeRange: r }),
	setTimezoneOffset: (o) => set({ timezoneOffset: o }),
	setSessionGapThreshold: (t) => set({ sessionGapThreshold: t }),
	setOvernightMinGap: (g) => set({ overnightMinGap: g }),
	setDayWindows: (nightEnd, morningStart, morningEnd, nightStart) =>
		set({
			nightEndHour: nightEnd,
			morningStartHour: morningStart,
			morningEndHour: morningEnd,
			nightStartHour: nightStart,
		}),
	setDoubleTextGaps: (min, max) =>
		set({ doubleTextMinGap: min, doubleTextMaxGap: max }),
	setMaxResponseGapThreshold: (t) => set({ maxResponseGapThreshold: t }),
	setLanguageData: (data) =>
		set((state) => ({
			language: { ...state.language, ...data },
		})),
	setEngagementData: (data) =>
		set((state) => ({
			engagement: { ...state.engagement, ...data },
		})),
	setCallsData: (data) =>
		set((state) => ({
			calls: { ...state.calls, ...data },
		})),
	setSocialCircleData: (data) =>
		set((state) => ({
			socialCircle: { ...state.socialCircle, ...data },
		})),
	setHasSeenTutorial: (val) => {
		if (typeof window !== "undefined") {
			sessionStorage.setItem("hasSeenOnboarding", val ? "true" : "false");
		}
		set({ hasSeenTutorial: val });
	},
	reset: () =>
		set({
			messages: [],
			participants: [],
			owner: "",
			threadName: "",
			isLoaded: false,
			activeFiles: [],
			queuedFiles: [],
			isExplorerOpen: false,
			selectedParticipants: [],
			timeRange: [null, null],
			timezoneOffset: -new Date().getTimezoneOffset(),
			sessionGapThreshold: 10,
			overnightMinGap: 180,
			morningStartHour: 5,
			morningEndHour: 11,
			nightStartHour: 22,
			nightEndHour: 5,
			doubleTextMinGap: 10,
			doubleTextMaxGap: 120,
			maxResponseGapThreshold: 10,
			language: {
				isInitialized: false,
				kpis: null,
				wordResults: [],
				emojiResults: [],
				wordDetails: null,
				emojiDetails: null,
				linkResults: [],
				linkDetails: null,
				error: null,
				emojiSource: "both",
			},
			engagement: {
				isInitialized: false,
				kpis: null,
				initiatorData: null,
				doubleTextData: null,
				responseCadenceData: null,
				error: null,
			},
			calls: {
				isInitialized: false,
				kpis: null,
				participantStats: null,
				timelineData: null,
				distributionData: null,
				error: null,
				granularity: "Month",
			},
			socialCircle: {
				isInitialized: false,
				rawThreads: null,
				error: null,
			},
		}),
}));
