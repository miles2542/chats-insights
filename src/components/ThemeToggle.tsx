"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string }) {
	const [isDark, setIsDark] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		const isDarkMode = document.documentElement.classList.contains("dark");
		setIsDark(isDarkMode);
	}, []);

	const toggleTheme = () => {
		const newTheme = !isDark;
		setIsDark(newTheme);

		if (newTheme) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	};

	if (!mounted) return null;

	return (
		<button
			onClick={toggleTheme}
			className={`flex items-center justify-center w-12 h-12 bg-[#EAE8E3] dark:bg-[#111111] border-[3px] border-[#111111] dark:border-[#EAE8E3] text-[#111111] dark:text-[#EAE8E3] hover:bg-[#D93829] dark:hover:bg-[#D93829] hover:text-white dark:hover:text-white hover:border-[#D93829] dark:hover:border-[#D93829] transition-colors shadow-[4px_4px_0px_0px_rgba(17,17,17,1)] dark:shadow-[4px_4px_0px_0px_rgba(234,232,227,1)] active:translate-y-1 active:translate-x-1 active:shadow-none ${className}`}
			aria-label="Toggle theme"
		>
			{isDark ? (
				<Sun className="w-5 h-5 stroke-[2.5]" />
			) : (
				<Moon className="w-5 h-5 stroke-[2.5]" />
			)}
		</button>
	);
}
