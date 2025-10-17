import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Fundify - Crowdfunding Platform for Creative Projects",
  description: "Bring your creative projects to life with Fundify. The modern crowdfunding platform for innovative ideas.",
  keywords: ["crowdfunding", "fundraising", "creative projects", "startup", "innovation"],
  authors: [{ name: "Fundify Team" }],
  openGraph: {
    title: "Fundify - Crowdfunding Platform",
    description: "Bring your creative projects to life with Fundify",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fundify - Crowdfunding Platform",
    description: "Bring your creative projects to life with Fundify",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          "font-sans antialiased"
        )}
      >
        <Toaster position="top-right" />
        <AuroraBackground className="min-h-screen">
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:60px_60px] opacity-20 pointer-events-none" />
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border/40 bg-background/60 backdrop-blur-xl mt-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <span className="text-white font-bold text-xl">F</span>
                    </div>
                    <span className="text-xl font-bold text-gradient">Fundify</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The modern crowdfunding platform for creative projects and innovative ideas.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Platform</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/campaigns" className="hover:text-foreground transition-colors">Explore Campaigns</Link></li>
                    <li><Link href="/campaigns/create" className="hover:text-foreground transition-colors">Start a Campaign</Link></li>
                    <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Company</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                    <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                    <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Legal</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                    <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                    <li><a href="/guidelines" className="hover:text-foreground transition-colors">Community Guidelines</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Fundify. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </AuroraBackground>
      </body>
    </html>
  );
}
