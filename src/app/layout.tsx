import type { Metadata } from "next";
import {
	Be_Vietnam_Pro,
	Inter,
	Outfit,
	Playfair_Display,
	Quicksand,
	Space_Grotesk,
} from "next/font/google";
import "../styles/globals.css";

const inter = Inter({
	subsets: ["latin", "latin-ext", "vietnamese"] as any,
	weight: ["400", "500", "600", "700", "800", "900"],
	variable: "--font-inter",
});
const outfit = Outfit({
	subsets: ["latin", "latin-ext", "vietnamese"] as any,
	weight: ["400", "500", "600", "700", "800", "900"],
	variable: "--font-outfit",
});
const beVietnam = Be_Vietnam_Pro({
	subsets: ["latin", "vietnamese"],
	weight: ["400", "500", "600", "700", "800", "900"],
	variable: "--font-be-vietnam",
});
const playfair = Playfair_Display({
	subsets: ["latin", "latin-ext", "vietnamese"] as any,
	variable: "--font-playfair",
});
const quicksand = Quicksand({
	subsets: ["latin", "latin-ext", "vietnamese"] as any,
	variable: "--font-quicksand",
});
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin", "latin-ext", "vietnamese"] as any,
	variable: "--font-space",
});

import { MobileBlocker } from "../components/MobileBlocker";
import { ThemeToggle } from "../components/ThemeToggle";

export const metadata: Metadata = {
	title: "Messenger Chat Insights",
	description: "Private, local Messenger chat analytics",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${outfit.variable} ${beVietnam.variable} ${playfair.variable} ${quicksand.variable} ${spaceGrotesk.variable} h-full`}
			suppressHydrationWarning
		>
			<body className="min-h-full flex flex-col">
				<MobileBlocker />
				{children}
			</body>
		</html>
	);
}
