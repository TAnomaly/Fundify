import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { AuroraBackground } from "@/components/ui/aurora-background";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fundify – The Creator Growth Platform",
  description: "Build communities, launch products, host events, and grow recurring revenue with Fundify’s all-in-one creator platform.",
  keywords: ["creator economy", "subscriptions", "digital products", "events", "membership", "community", "crowdfunding"],
  authors: [{ name: "Fundify Team" }],
  openGraph: {
    title: "Fundify – The Creator Growth Platform",
    description: "Launch campaigns, memberships, events and premium content from a single dashboard.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fundify – The Creator Growth Platform",
    description: "Launch campaigns, memberships, events and premium content from a single dashboard.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head />
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          cormorant.variable,
          "font-sans antialiased bg-background text-foreground"
        )}
      >
        <Toaster position="top-right" />
        <AuroraBackground className="min-h-screen">
          <div className="fixed inset-0 -z-10 opacity-40 pointer-events-none [background-image:linear-gradient(to_right,rgba(224,192,132,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(224,192,132,0.08)_1px,transparent_1px)] [background-size:88px_88px]" />
          <div className="fixed inset-x-6 top-10 -z-10 h-24 rounded-3xl bg-gradient-to-r from-transparent via-primary/15 to-transparent blur-3xl" />
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="mt-24 border-t border-border/50 bg-background/80 backdrop-blur-2xl">
            <div className="container-elegant py-16">
              <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr,1fr,1fr,1fr]">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow-sm ring-1 ring-border/40">
                      <span className="font-display text-lg text-primary-foreground">F</span>
                    </div>
                    <span className="font-display text-2xl text-gradient">Fundify</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    A considered home for creators to build enduring patronage — thoughtful campaigns, recurring support, and meaningful community moments all in one trusted platform.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="rounded-full border border-border/50 px-3 py-1">Safe Payouts</span>
                    <span className="rounded-full border border-border/50 px-3 py-1">Creator-Led</span>
                    <span className="rounded-full border border-border/50 px-3 py-1">Global Reach</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground">Platform</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/campaigns" className="transition hover:text-foreground">Explore Campaigns</Link></li>
                    <li><Link href="/campaigns/create" className="transition hover:text-foreground">Start a Campaign</Link></li>
                    <li><Link href="/creators" className="transition hover:text-foreground">Discover Creators</Link></li>
                    <li><Link href="/events" className="transition hover:text-foreground">Events Calendar</Link></li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground">Company</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/about" className="transition hover:text-foreground">About Us</Link></li>
                    <li><Link href="/blog" className="transition hover:text-foreground">Journal</Link></li>
                    <li><Link href="/contact" className="transition hover:text-foreground">Contact</Link></li>
                    <li><a href="mailto:press@fundify.com" className="transition hover:text-foreground">Press & Partnerships</a></li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-[0.18em] text-muted-foreground">Trust</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/privacy" className="transition hover:text-foreground">Privacy Policy</Link></li>
                    <li><Link href="/terms" className="transition hover:text-foreground">Terms of Service</Link></li>
                    <li><Link href="/guidelines" className="transition hover:text-foreground">Community Standards</Link></li>
                    <li><a href="mailto:support@fundify.com" className="transition hover:text-foreground">Support</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground md:flex-row">
                <p>&copy; {new Date().getFullYear()} Fundify. All rights reserved.</p>
                <div className="flex items-center gap-4">
                  <a href="mailto:legal@fundify.com" className="transition hover:text-foreground">Legal</a>
                  <a href="mailto:support@fundify.com" className="transition hover:text-foreground">Support</a>
                  <a href="mailto:trust@fundify.com" className="transition hover:text-foreground">Trust & Safety</a>
                </div>
              </div>
            </div>
          </footer>
        </AuroraBackground>
      </body>
    </html>
  );
}
