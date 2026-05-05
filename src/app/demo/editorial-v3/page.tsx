export default function EditorialV3() {
	return (
		<div className="min-h-screen bg-[#F4F4F0] text-[#1A1A1A] p-6 md:p-12 font-[family-name:var(--font-space)] relative overflow-hidden selection:bg-[#E1DFD6] selection:text-[#1A1A1A]">
			{/* Structural Grid Lines */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute left-[33%] top-0 bottom-0 w-px bg-[#E1DFD6]" />
				<div className="absolute left-[66%] top-0 bottom-0 w-px bg-[#E1DFD6]" />
				<div className="absolute top-[25%] left-0 right-0 h-px bg-[#E1DFD6]" />
				<div className="absolute top-[75%] left-0 right-0 h-px bg-[#E1DFD6]" />
			</div>

			<div className="relative z-10 max-w-screen-2xl mx-auto h-[calc(100vh-6rem)] grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Col 1 */}
				<div className="flex flex-col justify-between pt-[25vh]">
					<div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">
						System / Active
						<br />
						Status: Awaiting Input
					</div>
					<div className="text-xs uppercase tracking-wider text-zinc-400">
						[ Local Architecture ]
					</div>
				</div>

				{/* Col 2 & 3: Content */}
				<div className="md:col-span-2 flex flex-col justify-between pt-[10vh] pb-[10vh]">
					<div>
						<h2 className="text-xs uppercase tracking-widest text-[#D35400] mb-8 font-bold">
							Chat Insights — V1
						</h2>
						<h1 className="font-[family-name:var(--font-playfair)] text-[4rem] md:text-[6rem] lg:text-[8rem] leading-[0.9] tracking-tighter mb-12">
							Parse the <br />
							<span className="italic">Archive.</span>
						</h1>
						<p className="max-w-md text-sm leading-relaxed text-zinc-600 font-[family-name:var(--font-inter)]">
							An analytical lens for your digital conversations. All processing
							runs entirely client-side, ensuring strict data privacy and zero
							server footprint.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-6 mt-16 md:mt-0">
						<button className="bg-[#1A1A1A] text-white px-8 py-4 text-xs uppercase tracking-widest hover:bg-[#D35400] transition-colors duration-300">
							Mount Directory
						</button>
						<button className="border border-[#1A1A1A] text-[#1A1A1A] px-8 py-4 text-xs uppercase tracking-widest hover:bg-[#E1DFD6] transition-colors duration-300">
							Select Files
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
