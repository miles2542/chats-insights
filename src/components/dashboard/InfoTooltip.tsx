import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface InfoTooltipProps {
	content: ReactNode;
}

export const InfoTooltip = ({ content }: InfoTooltipProps) => (
	<div className="group relative inline-block ml-1 align-middle">
		<Info className="w-3 h-3 text-[#888] cursor-help hover:text-[#111] dark:hover:text-[#EAE8E3]" />
		<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-white dark:bg-[#111] border-2 border-[#111] dark:border-[#EAE8E3] shadow-[4px_4px_0px_0px_#D93829] z-50 text-[10px] normal-case font-medium font-[family-name:var(--font-inter)] leading-tight text-[#111] dark:text-[#EAE8E3]">
			{content}
		</div>
	</div>
);
