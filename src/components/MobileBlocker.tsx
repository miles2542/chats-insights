"use client";

import React from "react";

export function MobileBlocker() {
	return (
		<div className="fixed inset-0 z-[9999] bg-[#EAE8E3] flex items-center justify-center p-6 md:hidden">
			<div className="w-full max-w-md bg-white border border-[#111] p-10 relative">
				{/* Elegant Bauhaus Accent */}
				<div className="absolute -top-3 -left-3 w-6 h-6 bg-[#D93829]" />

				<div className="space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-black uppercase tracking-tighter text-[#111] leading-none">
							Desktop
							<br />
							Required
						</h1>
						<div className="h-1 w-12 bg-[#111]" />
					</div>

					<p className="text-sm text-[#111]/80 font-medium leading-relaxed font-mono">
						Massive JSON processing and Web Worker threads require desktop-class
						memory and CPU. Mobile Safari/Chrome will terminate the analysis
						session.
					</p>

					<div className="pt-4 flex items-center gap-3">
						<div className="flex-1 h-[1px] bg-[#111]/10" />
						<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D93829]">
							V8 Bauhaus Protocol
						</span>
						<div className="flex-1 h-[1px] bg-[#111]/10" />
					</div>
				</div>
			</div>
		</div>
	);
}
