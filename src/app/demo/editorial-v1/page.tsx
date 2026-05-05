export default function EditorialV1() {
	return (
		<div className="min-h-screen bg-black text-white p-6 md:p-12 font-[family-name:var(--font-inter)] overflow-hidden selection:bg-white selection:text-black">
			<nav className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] mb-24 md:mb-40">
				<span className="opacity-50">Vol. 01</span>
				<span className="opacity-50">Local Processing Only</span>
			</nav>

			<main className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-12 justify-between items-end">
				<div className="relative">
					{/* Overlapping, massive serif typography */}
					<h1 className="font-[family-name:var(--font-playfair)] text-[5rem] md:text-[9rem] leading-[0.85] tracking-tighter mix-blend-difference relative z-20">
						CHAT
						<br />
						<span className="italic font-light text-zinc-500">INSIGHTS</span>
					</h1>
					{/* Abstract structural line */}
					<div className="absolute top-1/2 left-[-10vw] w-[120vw] h-[1px] bg-white/20 -z-10" />
				</div>

				<div className="max-w-xs pb-4">
					<p className="text-xs tracking-[0.05em] leading-relaxed text-zinc-400 mb-12">
						A brutalist approach to your conversational archive. High contrast,
						uncompromising privacy. Extract patterns from noise.
					</p>

					<div className="flex flex-col gap-4">
						<button className="group relative w-full text-left py-4 border-t border-zinc-800 hover:border-white transition-colors flex justify-between items-center overflow-hidden">
							<span className="relative z-10 text-sm tracking-[0.1em] uppercase font-medium">
								Select Directory
							</span>
							<span className="relative z-10 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
								→
							</span>
							<div className="absolute inset-0 bg-white transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out z-0" />
							<span className="absolute z-10 inset-0 flex items-center justify-between py-4 px-2 opacity-0 group-hover:opacity-100 text-black uppercase tracking-[0.1em] text-sm font-medium transition-opacity duration-500 delay-100">
								<span>Select Directory</span>
								<span>→</span>
							</span>
						</button>
						<button className="group relative w-full text-left py-4 border-t border-zinc-800 hover:border-white transition-colors flex justify-between items-center text-zinc-500 hover:text-white">
							<span className="text-sm tracking-[0.1em] uppercase font-medium">
								Select Files
							</span>
							<span className="text-xs">+</span>
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
