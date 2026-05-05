"use client";

import { DoubleTextSection } from "../../../components/dashboard/engagement/DoubleTextSection";
import { InitiatorSection } from "../../../components/dashboard/engagement/InitiatorSection";
import { ResponseCadenceSection } from "../../../components/dashboard/engagement/ResponseCadenceSection";
import { useEngagementWorker } from "../../../hooks/useEngagementWorker";
import { useChatStore } from "../../../store";

export default function EngagementPage() {
	const { isLoaded, messages } = useChatStore();
	const {
		isInitialized,
		kpis,
		initiatorData,
		doubleTextData,
		responseCadenceData,
	} = useEngagementWorker();

	if (!isLoaded || messages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[8px_8px_0px_0px_#D93829]">
				<div className="w-12 h-12 border-4 border-[#111] dark:border-[#EAE8E3] border-t-[#D93829] animate-spin mb-6" />
				<h2 className="text-xl font-bold uppercase tracking-widest">
					Awaiting Data Stream
				</h2>
				<p className="text-[#888] font-bold mt-1 uppercase text-[10px]">
					Upload chat history to begin engagement analysis
				</p>
			</div>
		);
	}

	if (!isInitialized) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] border-4 border-[#111] dark:border-[#EAE8E3] bg-white dark:bg-[#111] p-12 shadow-[8px_8px_0px_0px_#D93829]">
				<div className="text-2xl font-bold font-[family-name:var(--font-outfit)] animate-pulse mb-4 text-[#D93829]">
					PROFILING INTERACTIONS...
				</div>
				<div className="w-48 h-1.5 bg-[#f0f0f0] dark:bg-[#333] border border-[#111] dark:border-[#EAE8E3] overflow-hidden">
					<div
						className="h-full bg-[#D93829] animate-pulse"
						style={{ width: "60%" }}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-24 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Page Header */}
			<header className="border-b-4 border-[#111] dark:border-[#EAE8E3] pb-4 flex items-end justify-between">
				<div>
					<h1 className="text-5xl font-[family-name:var(--font-playfair)] font-black text-[#111] dark:text-[#EAE8E3]">
						ENGAGEMENT
					</h1>
					<div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D93829] mt-1">
						Initiation · Cadence · Persistence
					</div>
				</div>
				<div className="text-right">
					<div className="text-[10px] uppercase font-bold text-[#888]">
						Sessions
					</div>
					<div className="text-xl font-bold font-[family-name:var(--font-outfit)]">
						{kpis?.totalSessions?.toLocaleString() ?? "—"}
					</div>
				</div>
			</header>

			{/* Section 01 */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#D93829]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						01 // Initiators &amp; Closers
					</h2>
				</div>
				<p className="text-xs font-bold text-[#888] uppercase tracking-wide ml-12 -mt-6 mb-8">
					Who starts the conversations first, and who texts last in each
					conversation.
				</p>
				<InitiatorSection data={initiatorData} />
			</section>

			{/* Section 02 */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#FFCC00]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						02 // Double Texting
					</h2>
				</div>
				<p className="text-xs font-bold text-[#888] uppercase tracking-wide ml-12 -mt-6 mb-8">
					when you text and get no reply, so you text again - intentionally or
					unintentionally
				</p>
				<DoubleTextSection data={doubleTextData} />
			</section>

			{/* Section 03 */}
			<section className="space-y-8">
				<div className="flex items-center gap-4">
					<div className="w-8 h-8 bg-[#0055A4]" />
					<h2 className="text-2xl font-bold uppercase tracking-tighter italic">
						03 // Response Time
					</h2>
				</div>
				<p className="text-xs font-bold text-[#888] uppercase tracking-wide ml-12 -mt-6 mb-8">
					time before receiving a response for new sessions or exchange speed
					during active conversation
				</p>
				<ResponseCadenceSection
					data={{ ...responseCadenceData, medians: kpis?.medians }}
				/>
			</section>
		</div>
	);
}
