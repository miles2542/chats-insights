export default function EditorialV7() {
	return (
		<div className="min-h-screen bg-[#F9F6F0] text-[#3A4032] flex flex-col items-center justify-center p-6 relative overflow-hidden font-[family-name:var(--font-playfair)] selection:bg-[#3A4032] selection:text-[#F9F6F0]">
			{/* Decorative Blur */}
			<div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#8F3B2F]/5 rounded-full blur-[100px]" />
			<div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#3A4032]/5 rounded-full blur-[100px]" />

			<main className="relative z-10 text-center max-w-2xl w-full">
				<div className="font-[family-name:var(--font-inter)] text-[9px] uppercase tracking-[0.4em] text-[#8F3B2F] mb-12">
					Chapter One: The Archive
				</div>

				<h1 className="text-4xl md:text-6xl font-normal tracking-wide mb-8 leading-snug">
					The <span className="italic">poetry</span> of your <br />
					past conversations
				</h1>

				<p className="font-[family-name:var(--font-inter)] text-sm leading-loose text-[#3A4032]/70 max-w-md mx-auto mb-16 font-light">
					A delicate, private space to visualize the history of your
					relationships. Analyzed locally, kept intimately yours.
				</p>

				<div className="flex flex-col items-center gap-8">
					<button className="group relative overflow-hidden rounded-full border border-[#3A4032]/20 px-12 py-4 bg-transparent hover:border-[#3A4032] transition-colors duration-500">
						<span className="font-[family-name:var(--font-inter)] text-[10px] uppercase tracking-[0.2em] relative z-10 group-hover:text-[#F9F6F0] transition-colors duration-500">
							Provide Directory
						</span>
						<div className="absolute inset-0 bg-[#3A4032] rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]" />
					</button>

					<button className="font-[family-name:var(--font-inter)] text-[10px] uppercase tracking-[0.2em] text-[#3A4032]/50 hover:text-[#8F3B2F] transition-colors border-b border-transparent hover:border-[#8F3B2F] pb-1">
						or select files manually
					</button>
				</div>
			</main>
		</div>
	);
}
