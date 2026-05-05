export default function GlassDemo() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] font-[family-name:var(--font-outfit)] text-white flex items-center justify-center p-4">
			{/* Background animated mesh (simulated with large blurred absolute divs) */}
			<div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] animate-pulse pointer-events-none" />
			<div
				className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[150px] animate-pulse pointer-events-none"
				style={{ animationDelay: "2s" }}
			/>
			<div
				className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-pink-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none"
				style={{ animationDelay: "4s" }}
			/>

			<main className="relative z-10 w-full max-w-2xl">
				<div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-10 md:p-14 shadow-2xl overflow-hidden relative">
					{/* subtle inner light reflection */}
					<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

					<h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
						Messenger Insights
					</h1>
					<p className="text-lg md:text-xl text-white/60 mb-10 font-light leading-relaxed max-w-lg">
						Unlock the stories hidden in your chat history. 100% local. 100%
						private.
					</p>

					<div className="flex flex-col sm:flex-row gap-4">
						<button className="relative group px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 border border-white/10 overflow-hidden flex items-center justify-center gap-2 font-medium">
							<span className="relative z-10 flex items-center gap-2">
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
								Select Folder
							</span>
							<div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-500/20 to-purple-500/20 transition-opacity duration-300" />
						</button>
						<button className="px-8 py-4 rounded-full bg-transparent hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 text-white/70 hover:text-white font-medium">
							Select Files
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
