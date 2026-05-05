export default function EditorialV5() {
	return (
		<div className="min-h-screen bg-[#FAFAFA] text-[#2D2D2D] p-8 md:p-24 font-[family-name:var(--font-inter)] selection:bg-[#EAEAEA] selection:text-black">
			<header className="w-full flex justify-between items-center pb-8 border-b border-[#EAEAEA]">
				<div className="font-[family-name:var(--font-playfair)] italic text-lg text-[#555555]">
					Messenger Insights
				</div>
				<div className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">
					Local Archive Environment
				</div>
			</header>

			<main className="mt-24 md:mt-40 max-w-4xl mx-auto flex flex-col md:flex-row gap-16 md:gap-32">
				<div className="flex-1">
					<h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl leading-[1.1] tracking-tight mb-8">
						Clear the noise.
						<br />
						<span className="text-[#888888]">See the narrative.</span>
					</h1>
					<p className="text-sm leading-loose text-[#666666] max-w-md font-light">
						A serene, entirely localized instrument for reflecting on your
						conversational history. Processing happens solely on your device.
					</p>
				</div>

				<div className="flex flex-col gap-8 justify-center min-w-[200px]">
					<button className="group relative w-full text-left pb-4 border-b border-[#EAEAEA] hover:border-[#2D2D2D] transition-colors flex justify-between items-center">
						<span className="text-xs tracking-[0.15em] uppercase text-[#555555] group-hover:text-[#2D2D2D] transition-colors">
							Select Folder
						</span>
						<span className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-500">
							→
						</span>
					</button>

					<button className="group relative w-full text-left pb-4 border-b border-[#EAEAEA] hover:border-[#2D2D2D] transition-colors flex justify-between items-center">
						<span className="text-xs tracking-[0.15em] uppercase text-[#888888] group-hover:text-[#2D2D2D] transition-colors">
							Select Files
						</span>
						<span className="transform -rotate-45 group-hover:rotate-0 transition-transform duration-500 text-[#888888] group-hover:text-[#2D2D2D]">
							→
						</span>
					</button>
				</div>
			</main>
		</div>
	);
}
