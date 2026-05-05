export default function EditorialDemo() {
	return (
		<div className="min-h-screen bg-[#1c1b1a] text-[#e8e6e3] flex flex-col items-center justify-center p-6 md:p-12 font-[family-name:var(--font-inter)] selection:bg-[#c2a382] selection:text-black">
			<div className="w-full max-w-4xl border border-[#3a3836] p-8 md:p-16 relative">
				{/* Decorative corner markers */}
				<div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#e8e6e3] -translate-x-1 -translate-y-1" />
				<div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#e8e6e3] translate-x-1 -translate-y-1" />
				<div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#e8e6e3] -translate-x-1 translate-y-1" />
				<div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#e8e6e3] translate-x-1 translate-y-1" />

				<div className="text-center mb-16">
					<p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8681] mb-6">
						Archive & Analyze
					</p>
					<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl font-normal leading-tight italic tracking-tight mb-6 text-[#f5f3f0]">
						The Architecture <br /> of Conversation
					</h1>
					<div className="h-px w-24 bg-[#c2a382] mx-auto opacity-50 mb-6" />
					<p className="text-[#a39f9a] max-w-md mx-auto text-sm md:text-base leading-relaxed font-light">
						A private, localized instrument for decoding the patterns, rhythms,
						and vocabulary of your digital correspondence.
					</p>
				</div>

				<div className="flex flex-col items-center gap-6">
					<button className="group relative overflow-hidden px-10 py-3 border border-[#524f4b] hover:border-[#c2a382] transition-colors duration-500 bg-transparent uppercase tracking-[0.2em] text-xs">
						<span className="relative z-10 text-[#e8e6e3] group-hover:text-[#1c1b1a] transition-colors duration-500">
							Initiate Ingestion
						</span>
						<div className="absolute inset-0 bg-[#c2a382] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
					</button>
					<button className="text-[10px] uppercase tracking-[0.1em] text-[#6b6863] hover:text-[#c2a382] transition-colors underline underline-offset-4 decoration-[#3a3836] hover:decoration-[#c2a382]">
						or select specific files
					</button>
				</div>
			</div>
		</div>
	);
}
