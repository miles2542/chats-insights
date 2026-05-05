export default function OrganicDemo() {
	return (
		<div className="min-h-screen bg-[#111118] text-[#f0f0f5] flex items-center justify-center p-4 font-[family-name:var(--font-quicksand)] overflow-hidden relative">
			{/* Organic fluid background blobs */}
			<div className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#ff7e67] to-[#ff4b8b] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] opacity-20 blur-[80px] mix-blend-screen animate-[spin_20s_linear_infinite]" />
			<div className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-gradient-to-bl from-[#7e67ff] to-[#4bb3ff] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] opacity-20 blur-[80px] mix-blend-screen animate-[spin_15s_linear_infinite_reverse]" />

			<main className="relative z-10 flex flex-col items-center text-center max-w-lg w-full bg-[#1c1c24]/80 backdrop-blur-3xl p-12 rounded-[3rem] border border-white/5 shadow-2xl">
				<div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-[#ff7e67]"
					>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				</div>

				<h1 className="text-4xl font-bold mb-4 tracking-tight">
					Your Conversations, <br />
					Visualized
				</h1>
				<p className="text-[#9898a0] text-lg mb-10 font-medium leading-relaxed">
					Explore the heartbeat of your relationships through secure,
					locally-processed insights.
				</p>

				<button className="w-full relative group overflow-hidden bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-full py-4 px-8 font-bold text-lg mb-4 flex justify-center items-center gap-2">
					<span className="relative z-10 text-white flex items-center gap-2">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						Choose Folder
					</span>
					{/* Liquid hover effect container */}
					<div className="absolute inset-0 bg-gradient-to-r from-[#ff7e67]/30 to-[#7e67ff]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" />
				</button>

				<button className="text-[#686870] hover:text-white font-semibold transition-colors">
					or select specific files
				</button>
			</main>
		</div>
	);
}
