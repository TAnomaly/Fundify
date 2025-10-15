"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser, removeToken } from "@/lib/auth";
import { Moon, Sun } from "lucide-react";

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
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-soft">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-xl font-bold text-gradient">Fundify</span>
            </a>

            <div className="hidden md:flex items-center gap-6">
              <a
                href="/campaigns"
                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors relative group"
              >
                Explore
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all"></span>
              </a>
              <a
                href="/creators"
                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors relative group"
              >
                Creators
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all"></span>
              </a>
              <a
                href="/blog"
                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors relative group"
              >
                📝 Blog
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all"></span>
              </a>
              <a
                href="/events"
                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors relative group"
              >
                📅 Events
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all"></span>
              </a>
              <a
                href="/campaigns?category=trending"
                className="text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors relative group"
              >
                Trending
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-primary group-hover:w-full transition-all"></span>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#F92672] transition-all hover:scale-105 shadow-sm hover:shadow-md"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
            </button>

            {isLoggedIn ? (
              <>
                <a href="/campaigns/create" className="hidden sm:block">
                  <button className="px-4 py-2 text-sm font-semibold text-gradient hover:opacity-80 transition-opacity">
                    Start Project
                  </button>
                </a>
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-primary text-white shadow-soft hover:shadow-glow transition-all"
                  >
                    <span>{user?.name || user?.username || "Account"}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-56 bg-glass-card rounded-2xl shadow-soft-hover border-0 py-2 backdrop-blur-xl">
                      <a
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </a>
                      <a
                        href="/dashboard#my-campaigns"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        My Projects
                      </a>
                      <a
                        href="/creator-dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        Creator Hub
                      </a>
                      <a
                        href="/subscriptions"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Subscriptions
                      </a>
                      <div className="my-1 border-t border-slate-200/50 dark:border-slate-700/50"></div>
                      <a
                        href="/creator-dashboard/profile"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </a>
                      <a
                        href="/dashboard#my-donations"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-gradient-soft transition-all"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Contributions
                      </a>
                      <hr className="my-2 border-slate-200 dark:border-slate-700" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a href="/campaigns/create" className="hidden sm:block">
                  <button className="px-4 py-2 text-sm font-semibold text-gradient hover:opacity-80 transition-opacity">
                    Start Project
                  </button>
                </a>
                <a href="/login">
                  <button className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-primary text-white shadow-soft hover:shadow-glow transition-all">
                    Sign In
                  </button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
