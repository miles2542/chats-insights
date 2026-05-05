export default function SurpriseDemo() {
	return (
		<div className="min-h-screen bg-black text-white flex flex-col justify-between p-8 md:p-16 font-[family-name:var(--font-space)] uppercase tracking-[0.1em] selection:bg-[#ff3b00] selection:text-white">
			<header className="flex justify-between items-start w-full">
				<div className="text-[10px] text-[#ff3b00] tracking-[0.3em] font-bold">
					Local.01
				</div>
				<div className="text-[10px] text-zinc-600 tracking-[0.2em] text-right">
					FB // MSGR <br />
					100% Client-Side
				</div>
			</header>

			<main className="flex-1 flex flex-col justify-center items-start w-full max-w-7xl mx-auto relative">
				{/* Abstract geometric element */}
				<div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] opacity-20 pointer-events-none">
					<div className="absolute inset-0 border-[0.5px] border-white rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
					<div className="absolute inset-[10%] border-[0.5px] border-white rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
					<div className="absolute inset-[20%] border-[0.5px] border-[#ff3b00] rounded-full" />
					<div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-white transform -translate-y-1/2 rotate-45" />
					<div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-white transform -translate-y-1/2 -rotate-45" />
				</div>

				<div className="relative z-10 mix-blend-difference">
					<h1 className="text-6xl md:text-[9rem] font-medium leading-[0.8] tracking-tighter mb-8">
						DATA
						<br />
						<span className="text-zinc-600">VOID</span>
					</h1>
					<p className="max-w-md text-xs tracking-[0.2em] leading-loose text-zinc-400 mb-16 normal-case font-[family-name:var(--font-inter)]">
						A precise instrument for parsing conversational data. Your archives
						remain strictly on this machine. Process to begin.
					</p>

					<div className="flex flex-col sm:flex-row gap-6">
						<button className="group relative w-fit flex items-center gap-4 text-sm font-medium hover:text-[#ff3b00] transition-colors">
							<span className="w-12 h-[1px] bg-white group-hover:bg-[#ff3b00] group-hover:w-16 transition-all duration-300" />
							<span>Select Directory</span>
						</button>
						<button className="group relative w-fit flex items-center gap-4 text-sm font-medium text-zinc-600 hover:text-white transition-colors">
							<span className="w-4 h-[1px] bg-zinc-600 group-hover:bg-white transition-colors" />
							<span>Select Files</span>
						</button>
					</div>
				</div>
			</main>

			<footer className="flex justify-between items-end w-full text-[10px] text-zinc-600">
				<div>v1.0 // Ready</div>
				<div className="w-32 h-[1px] bg-zinc-800" />
			</footer>
		</div>
	);
}
