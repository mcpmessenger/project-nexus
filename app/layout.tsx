import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Project Nexus - MCP Registry & Execution Engine",
    template: "%s | Project Nexus",
  },
  description: "The ultimate MCP Registry & Execution Engine. Connect, discover, and execute Model Context Protocol tools with Google Workspace integration. Features AI-powered semantic search, code wizard, and Python sandbox execution.",
  keywords: [
    "MCP",
    "Model Context Protocol",
    "AI tools",
    "Google Workspace",
    "Python sandbox",
    "code wizard",
    "semantic search",
    "LangChain",
    "Gmail integration",
    "MCP servers",
    "developer tools",
    "AI platform",
  ],
  authors: [{ name: "Project Nexus Team" }],
  creator: "Project Nexus",
  publisher: "Project Nexus",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://project-nexus.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Project Nexus",
    title: "Project Nexus - MCP Registry & Execution Engine",
    description: "The ultimate MCP Registry & Execution Engine. Connect, discover, and execute Model Context Protocol tools with Google Workspace integration.",
    images: [
      {
        url: "/nexus-logo.png",
        width: 1200,
        height: 630,
        alt: "Project Nexus Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Nexus - MCP Registry & Execution Engine",
    description: "The ultimate MCP Registry & Execution Engine with AI-powered semantic search and code wizard.",
    images: ["/nexus-logo.png"],
    creator: "@projectnexus",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/nexus-logo.png",
        sizes: "any",
        type: "image/png",
        rel: "icon",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.json",
  generator: "Next.js",
  applicationName: "Project Nexus",
  category: "technology",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
