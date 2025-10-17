"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser, removeToken } from "@/lib/auth";
import { Moon, Sun, Menu, X, Heart, MessageSquare, Sparkles, LayoutDashboard, FolderKanban, Users, CreditCard, ShoppingBag, Settings, LogOut, User } from "lucide-react";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ username?: string; name?: string; avatar?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;

    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        console.log("🔄 Navbar updated with user:", currentUser);
      }
    };

    checkAuth();
    // Check auth on every route change and storage updates
    window.addEventListener("storage", checkAuth);

    // Also listen for custom storage events (from same window)
    const handleStorageChange = () => {
      console.log("📡 Storage change detected, updating Navbar...");
      checkAuth();
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setUser(null);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/30 dark:border-white/10 bg-background/80 backdrop-blur-2xl shadow-[0_10px_60px_-40px_rgba(249,38,114,0.65)]">
      <div className="pointer-events-none absolute inset-x-0 top-full h-[1px] bg-gradient-to-r from-transparent via-[#F92672]/50 to-transparent" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand + Desktop Nav */}
          <div className="flex items-center gap-3">
            <a href="/" className="relative group flex items-center gap-2">
              <div className="relative h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_12px_35px_-20px_rgba(249,38,114,0.9)] ring-1 ring-white/30">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-xl font-semibold text-gradient">Fundify</span>
            </a>

            <div className="hidden md:flex items-center gap-1 ml-6">
              {[
                { href: "/explore", label: "Discover", icon: <Sparkles className="w-4 h-4" /> },
                { href: "/campaigns", label: "Campaigns" },
                { href: "/creators", label: "Creators" },
                { href: "/blog", label: "Blog", icon: <MessageSquare className="w-4 h-4" /> },
                { href: "/events", label: "Events" },
                { href: "/explore/shop", label: "Shop" },
                { href: "/campaigns?category=trending", label: "Trending", icon: <Heart className="w-4 h-4" /> },
              ].map((item) => (
                <a key={item.href} href={item.href} className="group/link relative px-3 py-2 text-sm font-semibold text-foreground/70 hover:text-foreground transition">
                  <span className="inline-flex items-center gap-1">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="absolute left-3 right-3 -bottom-0.5 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] transition-transform duration-300 group-hover/link:scale-x-100" />
                </a>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/70 hover:border-[#F92672] transition-all hover:scale-105 shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
            </button>

            {/* Desktop CTA / Account */}
            <div className="hidden sm:flex items-center gap-2">
              <MovingBorderButton
                as="a"
                href="/campaigns/create"
                containerClassName="rounded-xl"
                borderClassName="bg-[radial-gradient(var(--monokai-red)_40%,transparent_60%)]"
                className="items-center gap-2 px-4 py-2 text-sm font-semibold text-white dark:text-white bg-slate-900/80"
              >
                Start Project
              </MovingBorderButton>

              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-primary text-white shadow-[0_12px_35px_-20px_rgba(249,38,114,0.85)] hover:shadow-[0_18px_45px_-24px_rgba(174,129,255,0.65)] transition"
                  >
                    <span>{user?.name || user?.username || "Account"}</span>
                    <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-56 bg-background/95 border border-white/10 rounded-2xl shadow-[0_22px_65px_-40px_rgba(249,38,114,0.65)] py-2 backdrop-blur-xl">
                      <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </a>
                      <a href="/dashboard#my-campaigns" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <FolderKanban className="w-4 h-4" /> My Projects
                      </a>
                      <a href="/creator-dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Users className="w-4 h-4" /> Creator Hub
                      </a>
                      <a href="/subscriptions" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <CreditCard className="w-4 h-4" /> Subscriptions
                      </a>
                      <a href="/purchases" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <ShoppingBag className="w-4 h-4" /> My Purchases
                      </a>
                      <div className="my-1 border-t border-slate-200/50 dark:border-slate-700/50" />
                      <a href="/creators/me" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft bg-blue-50 dark:bg-blue-950/20" onClick={() => setShowDropdown(false)}>
                        <User className="w-4 h-4" /> View Profile
                      </a>
                      <a href="/creator-dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </a>
                      <a href="/dashboard#my-donations" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Heart className="w-4 h-4" /> Contributions
                      </a>
                      <hr className="my-2 border-slate-200 dark:border-slate-700" />
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a href="/login" className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-primary text-white shadow-[0_12px_35px_-20px_rgba(249,38,114,0.85)] hover:shadow-[0_18px_45px_-24px_rgba(174,129,255,0.65)] transition">
                  Sign In
                </a>
              )}
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden">
              <Dialog>
                <DialogTrigger asChild>
                  <button aria-label="Open menu" className="p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm">
                    <Menu className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="p-0 w-[90vw] max-w-sm overflow-hidden border-0 bg-white/95 dark:bg-slate-900/95">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold">F</span>
                      </div>
                      <span className="font-bold">Fundify</span>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 space-y-1">
                    {[
                      { href: "/explore", label: "Discover" },
                      { href: "/campaigns", label: "Campaigns" },
                      { href: "/creators", label: "Creators" },
                      { href: "/blog", label: "Blog" },
                      { href: "/events", label: "Events" },
                      { href: "/explore/shop", label: "Shop" },
                      { href: "/campaigns?category=trending", label: "Trending" },
                    ].map((item) => (
                      <a key={item.href} href={item.href} className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">
                        {item.label}
                      </a>
                    ))}

                    <div className="pt-2">
                      <a href="/campaigns/create" className="block rounded-xl px-3 py-3 text-sm font-semibold bg-gradient-primary text-white text-center shadow-soft">Start Project</a>
                    </div>

                    {!isLoggedIn && (
                      <div className="pt-2">
                        <a href="/login" className="block rounded-xl px-3 py-3 text-sm font-semibold bg-slate-900/90 text-white text-center">Sign In</a>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
