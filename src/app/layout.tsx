import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { AppStateProvider } from "@/lib/store";
import "./globals.css";

// Body text: Inter (Google Fonts, latin-ext for Azerbaijani letters).
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

// Headings: Manrope, bundled locally from the approved font files (SIL OFL, see fonts/OFL-Manrope.txt).
// Note: Manrope has no capital "Ə" (U+018F); the browser draws that one glyph from the next font in the stack (Inter).
const manrope = localFont({
  src: "./fonts/Manrope-VariableFont_wght.ttf",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

// Data and labels: IBM Plex Mono, bundled locally (SIL OFL, see fonts/OFL-IBMPlexMono.txt).
const plex = localFont({
  src: [
    { path: "./fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexMono-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Urbiva | AI for Accessible Cities",
  description: "Əlçatan piyada marşrutları və şəhər planlaşdırması üçün AI. Hakaton prototipi, nümunə məlumat.",
};

export const viewport: Viewport = { themeColor: "#241B42", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${inter.variable} ${manrope.variable} ${plex.variable}`}>
      <body>
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
