import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Manager - All your money, one dashboard",
  description: "Track accounts, transactions, loans & net worth with a unified, privacy‑first manager. Secure, fast, synced across devices.",
  keywords: [
    "finance manager",
    "money tracking",
    "expense tracker",
    "budget planner",
    "loan management",
    "net worth calculator",
    "personal finance",
    "financial dashboard"
  ],
  authors: [{ name: "Finance Manager Team" }],
  creator: "Finance Manager",
  publisher: "Finance Manager",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#4f46e5' }
  ],
  viewport: 'width=device-width, initial-scale=1',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://your-domain.com',
    siteName: 'Finance Manager',
    title: 'Finance Manager - All your money, one dashboard',
    description: 'Track accounts, transactions, loans & net worth with a unified, privacy‑first manager. Secure, fast, synced across devices.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Finance Manager - Personal Finance Dashboard',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finance Manager - All your money, one dashboard',
    description: 'Track accounts, transactions, loans & net worth with a unified, privacy‑first manager.',
    images: ['/twitter-image.png'],
    creator: '@yourhandle', // Replace with your Twitter handle if you have one
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
