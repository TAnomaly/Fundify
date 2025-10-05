import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          "font-sans antialiased"
        )}
      >
        <div className="relative min-h-screen bg-background">
          {/* Background gradient */}
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />

          {/* Navigation */}
          <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                  <a href="/" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <span className="text-white font-bold text-xl">F</span>
                    </div>
                    <span className="text-xl font-bold text-gradient">Fundify</span>
                  </a>

                  <div className="hidden md:flex items-center gap-6">
                    <a href="/campaigns" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Explore
                    </a>
                    <a href="/campaigns?category=trending" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      Trending
                    </a>
                    <a href="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                      About
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <a href="/campaigns/create" className="hidden sm:block">
                    <button className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                      Start a Campaign
                    </button>
                  </a>
                  <a href="/login">
                    <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-primary text-white hover:opacity-90 transition-opacity">
                      Sign In
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t bg-muted/50 mt-20">
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
                    <li><a href="/campaigns" className="hover:text-foreground transition-colors">Explore Campaigns</a></li>
                    <li><a href="/campaigns/create" className="hover:text-foreground transition-colors">Start a Campaign</a></li>
                    <li><a href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Company</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="/about" className="hover:text-foreground transition-colors">About Us</a></li>
                    <li><a href="/blog" className="hover:text-foreground transition-colors">Blog</a></li>
                    <li><a href="/contact" className="hover:text-foreground transition-colors">Contact</a></li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Legal</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                    <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                    <li><a href="/guidelines" className="hover:text-foreground transition-colors">Community Guidelines</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Fundify. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
