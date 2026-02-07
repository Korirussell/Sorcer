import type { Metadata } from "next";
import { Nanum_Pen_Script, Caveat, DM_Sans, Victor_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { EnergyProvider } from "@/context/EnergyContext";
import { LayoutClient } from "@/components/LayoutClient";

import "./globals.css";

const metadataBaseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: "Sorcer - AI Carbon Arbitrage Engine",
  description:
    "Route prompts to the cleanest available intelligence using real-time carbon and weather signals.",
};

export const viewport = {
  maximumScale: 1,
};

const headerFont = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-header",
});

const subFont = Caveat({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sub",
});

const bodyFont = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const codeFont = Victor_Mono({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-code",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${headerFont.variable} ${subFont.variable} ${bodyFont.variable} ${codeFont.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased bg-parchment text-oak font-sans">
        {/* Hidden SVG filters for paper texture & hand-drawn borders */}
        <svg className="absolute h-0 w-0" aria-hidden="true">
          <defs>
            <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={5} result="noise" />
              <feDiffuseLighting in="noise" lightingColor="#fff5ee" surfaceScale={2}>
                <feDistantLight azimuth={45} elevation={60} />
              </feDiffuseLighting>
            </filter>
            <filter id="rough-edge" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves={4} result="warp" seed={2} />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale={4} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <EnergyProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
            enableSystem={false}
          >
            <LayoutClient>
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "!bg-parchment-dark !text-oak !border-oak/20 !font-sans !shadow-specimen",
                }}
              />
              {children}
            </LayoutClient>
          </ThemeProvider>
        </EnergyProvider>
      </body>
    </html>
  );
}
