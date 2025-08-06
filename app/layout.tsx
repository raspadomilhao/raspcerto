import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { FloatingBalance } from "@/components/floating-balance"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "RaspCerto - Jogos de Raspadinha Online",
  description: "Raspe, ganhe e divirta-se com os melhores jogos de raspadinha online! Prêmios de até R$ 10.000,00",
  keywords: "raspadinha, jogos online, prêmios, sorte, ganhar dinheiro, cassino online",
  authors: [{ name: "RaspCerto" }],
  creator: "RaspCerto",
  publisher: "RaspCerto",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://raspcerto.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "RaspCerto - Jogos de Raspadinha Online",
    description: "Raspe, ganhe e divirta-se com os melhores jogos de raspadinha online! Prêmios de até R$ 10.000,00",
    url: "https://raspcerto.vercel.app",
    siteName: "RaspCerto",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RaspCerto - Jogos de Raspadinha Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RaspCerto - Jogos de Raspadinha Online",
    description: "Raspe, ganhe e divirta-se com os melhores jogos de raspadinha online! Prêmios de até R$ 10.000,00",
    images: ["/og-image.png"],
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
  verification: {
    google: "your-google-verification-code",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className={poppins.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <FloatingBalance />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
