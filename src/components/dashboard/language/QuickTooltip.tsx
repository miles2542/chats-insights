"use client";

import React, { type ReactNode } from "react";

interface QuickTooltipProps {
	content: ReactNode;
	children: ReactNode;
}

export const QuickTooltip = ({ content, children }: QuickTooltipProps) => (
	<div className="group relative inline-block">
		{children}
		<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block px-2 py-1 bg-[#111] dark:bg-[#EAE8E3] text-white dark:text-[#111] text-[9px] uppercase font-bold tracking-widest whitespace-nowrap z-50 pointer-events-none border border-white dark:border-[#111] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
			{content}
		</div>
	</div>
);
