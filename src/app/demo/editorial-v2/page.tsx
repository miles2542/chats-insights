export default function EditorialV2() {
	return (
		<div className="min-h-screen bg-[#2A2624] text-[#E0D8D0] flex flex-col p-8 md:p-16 font-[family-name:var(--font-inter)] selection:bg-[#B87A62] selection:text-white">
			<div className="flex-1 border-[0.5px] border-[#E0D8D0]/10 flex flex-col p-8 relative">
				{/* Soft decorative elements */}
				<div className="absolute top-12 left-12 w-2 h-2 rounded-full bg-[#B87A62]/60" />

				<div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto text-center">
					<p className="font-[family-name:var(--font-playfair)] italic text-[#B87A62] text-xl mb-6">
						Archive
					</p>
					<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-[5.5rem] leading-[1.1] tracking-tight mb-12 text-[#F2EFE9] font-normal">
						The Shape of <br /> Your Stories
					</h1>

					<p className="text-sm md:text-base leading-loose text-[#A39A92] font-light max-w-md mx-auto mb-16">
						A serene, entirely localized environment to reflect on your
						conversational history. No data leaves this space.
					</p>

					<div className="flex flex-col sm:flex-row justify-center items-center gap-6">
						<button className="px-10 py-4 rounded-full border border-[#E0D8D0]/20 hover:border-[#B87A62] hover:bg-[#B87A62]/5 text-sm tracking-[0.15em] uppercase transition-all duration-500 font-medium">
							Open Directory
						</button>
						<div className="h-px w-8 bg-[#E0D8D0]/20 sm:hidden" />
						<button className="text-xs tracking-[0.15em] uppercase text-[#A39A92] hover:text-[#F2EFE9] transition-colors underline underline-offset-[6px] decoration-[#E0D8D0]/20 hover:decoration-[#F2EFE9]">
							Select Files
						</button>
					</div>
				</div>

				<div className="text-center text-[10px] uppercase tracking-[0.2em] text-[#A39A92]/50 mt-auto pt-8">
					End-to-End Encrypted Compatible
				</div>
			</div>
		</div>
	);
}
