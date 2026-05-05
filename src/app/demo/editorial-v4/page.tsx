export default function EditorialV4() {
	return (
		<div className="min-h-screen bg-[#0C0B0A] text-[#D9CDB8] flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-[#4A3F2E] selection:text-[#F2EFE9]">
			{/* Heavy Film Vignette & Grain Simulation */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background:
						"radial-gradient(circle at center, transparent 0%, #050403 100%)",
				}}
			/>
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.03]"
				style={{
					backgroundImage:
						"url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
				}}
			/>

			<main className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full">
				<div className="mb-8 w-px h-16 bg-gradient-to-b from-transparent to-[#D9CDB8] opacity-30" />

				<h2 className="text-[10px] uppercase tracking-[0.4em] mb-8 text-[#8C7A5E]">
					Act I: The Ingestion
				</h2>

				<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl lg:text-[6rem] leading-[1.1] mb-12 italic text-[#F2EFE9] drop-shadow-lg">
					Conversations <br />
					<span className="text-[#D9CDB8] font-normal not-italic tracking-tighter">
						in the Dark
					</span>
				</h1>

				<p className="font-[family-name:var(--font-inter)] text-xs md:text-sm tracking-[0.1em] leading-loose text-[#8C7A5E] max-w-lg mb-16">
					Exhume the data. Process it locally. Leave no trace on the server.
				</p>

				<div className="flex flex-col items-center gap-6">
					<button className="group relative px-12 py-4 overflow-hidden border border-[#D9CDB8]/20 bg-transparent transition-colors hover:border-[#D9CDB8]">
						<span className="relative z-10 font-[family-name:var(--font-inter)] text-xs uppercase tracking-[0.2em] group-hover:text-[#0C0B0A] transition-colors duration-700">
							Provide Directory
						</span>
						<div className="absolute inset-0 bg-[#D9CDB8] scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-700 ease-in-out" />
					</button>

					<button className="font-[family-name:var(--font-inter)] text-[10px] uppercase tracking-[0.15em] text-[#8C7A5E] hover:text-[#F2EFE9] transition-colors duration-500">
						— or select files —
					</button>
				</div>

				<div className="mt-24 w-px h-16 bg-gradient-to-t from-transparent to-[#D9CDB8] opacity-30" />
			</main>
		</div>
	);
}
