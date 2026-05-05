import type { ReactNode } from "react";

interface ChartContainerProps {
	title?: string;
	children: ReactNode;
	height?: string;
	controls?: ReactNode;
	leftControls?: ReactNode;
}

export const ChartContainer = ({
	title,
	children,
	height = "h-64",
	controls,
	leftControls,
}: ChartContainerProps) => (
	<div
		className={`w-full ${height} bg-white dark:bg-[#1A1A1A] border border-[#EAE8E3] dark:border-[#333] relative shadow-sm flex flex-col`}
	>
		{(title || controls || leftControls) && (
			<div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
				<div className="flex items-center gap-4">
					{title && (
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-[#D93829]" />
							<span className="text-[10px] uppercase tracking-widest font-bold text-[#555] dark:text-[#aaa]">
								{title}
							</span>
						</div>
					)}
					{leftControls && (
						<div className="flex items-center">{leftControls}</div>
					)}
				</div>
				{controls && <div className="flex items-center">{controls}</div>}
			</div>
		)}
		<div className={`flex-1 ${title || controls ? "pt-12" : "pt-0"} pb-4 px-4`}>
			{children}
		</div>
	</div>
);
