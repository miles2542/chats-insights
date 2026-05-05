export default function EditorialV8() {
	return (
		<div className="min-h-screen bg-[#EAE8E3] text-[#111111] p-6 md:p-12 font-[family-name:var(--font-outfit)] selection:bg-[#D93829] selection:text-white">
			<div className="max-w-6xl mx-auto min-h-[calc(100vh-6rem)] grid grid-cols-1 md:grid-cols-12 gap-6">
				{/* Left Column - Graphic/Color block */}
				<div className="md:col-span-4 bg-[#D93829] p-8 flex flex-col justify-between text-[#EAE8E3]">
					<div className="w-16 h-16 bg-[#EAE8E3] rounded-full mix-blend-screen" />

					<div>
						<h2 className="text-4xl font-bold tracking-tighter mb-4 uppercase">
							Data <br /> Module
						</h2>
						<div className="text-xs uppercase tracking-widest opacity-80 font-[family-name:var(--font-inter)]">
							Client-Side Processing
						</div>
					</div>
				</div>

				{/* Right Column - Typography & Controls */}
				<div className="md:col-span-8 flex flex-col justify-between p-8 md:p-16 border-t-8 border-l-[0px] md:border-t-0 md:border-l-8 border-[#111111] bg-white">
					<div className="flex justify-end">
						<span className="bg-[#111111] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1">
							Version 1.0
						</span>
					</div>

					<div className="my-16">
						<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl leading-none mb-8 text-[#111111]">
							Conversational <br />
							<span className="italic">Geometry.</span>
						</h1>
						<p className="text-[#555] max-w-md text-sm md:text-base leading-relaxed font-[family-name:var(--font-inter)]">
							Structurally analyze the patterns of your messenger archives. A
							private instrument built on robust, entirely local parsing
							mechanisms.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-4 border-t border-[#EAE8E3] pt-8">
						<button className="flex-1 bg-[#111111] text-white py-5 px-6 uppercase text-xs font-bold tracking-widest hover:bg-[#D93829] transition-colors flex justify-between items-center group">
							<span>Select Directory</span>
							<span className="bg-white text-[#111111] w-6 h-6 flex items-center justify-center rounded-full group-hover:rotate-45 transition-transform">
								+
							</span>
						</button>
						<button className="flex-1 bg-[#EAE8E3] text-[#111111] py-5 px-6 uppercase text-xs font-bold tracking-widest hover:bg-[#D93829] hover:text-white transition-colors">
							Select Files
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
