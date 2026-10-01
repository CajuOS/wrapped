import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = "https://wrapped.cajuos.dev";
const desc = "Teu ano no GitHub em 1 card. Commits, PRs, stars e as verdades (café, deploy de sexta). Gera e posta no X.";

export const metadata: Metadata = {
  title: { default: "Dev Wrapped", template: "%s · Dev Wrapped" },
  description: desc,
  metadataBase: new URL(siteUrl),
  openGraph: { type: "website", locale: "pt_BR", siteName: "Dev Wrapped", url: siteUrl, title: "Dev Wrapped", description: desc },
  twitter: { card: "summary_large_image", title: "Dev Wrapped", description: desc },
  alternates: { canonical: siteUrl },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
