export default function EditorialV6() {
	return (
		<div className="min-h-screen bg-[#F4F1EB] text-[#1A1A1A] p-4 md:p-12 font-[family-name:var(--font-playfair)] selection:bg-[#1A1A1A] selection:text-[#F4F1EB]">
			<div className="max-w-5xl mx-auto border-x border-[#1A1A1A]/20 min-h-[calc(100vh-6rem)] flex flex-col px-4 md:px-12">
				{/* Header Block */}
				<header className="py-8 border-b-2 border-[#1A1A1A]">
					<div className="flex justify-between items-end mb-4 font-[family-name:var(--font-inter)] text-[10px] uppercase tracking-widest text-[#1A1A1A]/60">
						<span>Vol. 1 — Local Edition</span>
						<span>100% Client-Side Processing</span>
					</div>
					<h1 className="text-5xl md:text-8xl font-medium tracking-tight text-center uppercase">
						The Chronicle
					</h1>
					<h2 className="text-center italic text-xl md:text-2xl mt-4 text-[#1A1A1A]/80">
						of your digital correspondence.
					</h2>
				</header>

				{/* Content Block */}
				<main className="flex-1 py-12 grid grid-cols-1 md:grid-cols-12 gap-12">
					<div className="md:col-span-7">
						<h3 className="font-[family-name:var(--font-inter)] text-xs uppercase tracking-widest mb-6 font-semibold">
							Exhume The Data
						</h3>
						<p className="text-xl leading-relaxed mb-6">
							In an era of vast digital footprints, taking ownership of one's
							conversational history is paramount. This instrument serves to
							parse, categorize, and illuminate the patterns hidden within your
							Messenger archives.
						</p>
						<p className="text-lg leading-relaxed text-[#1A1A1A]/70 italic">
							Rest assured, no byte of your data shall traverse the network. All
							analysis is confined to the bounds of your personal machine.
						</p>
					</div>

					<div className="md:col-span-5 flex flex-col">
						<div className="border-t border-b border-[#1A1A1A]/20 py-6 mb-6">
							<h3 className="font-[family-name:var(--font-inter)] text-xs uppercase tracking-widest mb-6 font-semibold">
								Initiate Process
							</h3>

							<button className="w-full bg-[#1A1A1A] text-[#F4F1EB] font-[family-name:var(--font-inter)] py-4 text-xs uppercase tracking-[0.2em] hover:bg-[#333] transition-colors mb-4">
								Select Directory
							</button>

							<button className="w-full border border-[#1A1A1A] text-[#1A1A1A] font-[family-name:var(--font-inter)] py-4 text-xs uppercase tracking-[0.2em] hover:bg-[#E8E4D9] transition-colors">
								Select Files
							</button>
						</div>

						<div className="mt-auto font-[family-name:var(--font-inter)] text-[10px] text-[#1A1A1A]/50 uppercase tracking-widest">
							End-to-End Encryption Format Supported
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
