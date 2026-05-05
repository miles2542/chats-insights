import type { Metadata } from "next";
import {
	Inter,
	Outfit,
	Playfair_Display,
	Quicksand,
	Space_Grotesk,
} from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
});
const quicksand = Quicksand({
	subsets: ["latin"],
	variable: "--font-quicksand",
});
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
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
			className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${quicksand.variable} ${spaceGrotesk.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body className="min-h-full flex flex-col">
				<MobileBlocker />
				{children}
			</body>
		</html>
	);
}
