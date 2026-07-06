import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "JobMatch — Better jobs, thoughtfully applied",
    template: "%s · JobMatch",
  },
  description:
    "A personal AI job-search copilot that finds relevant roles, organizes applications, and helps you apply with confidence.",
  applicationName: "JobMatch",
  keywords: ["AI job search", "job application assistant", "resume profile", "job tracker"],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    title: 'JobMatch',
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${geist.variable} ${geistMono.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
