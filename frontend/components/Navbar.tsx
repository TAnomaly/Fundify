"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser, removeToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      if (authenticated) {
        setUser(getCurrentUser());
      }
    };

    checkAuth();
    // Check auth on every route change
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setUser(null);
    router.push("/");
  };

  return (
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
              <a
                href="/campaigns"
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                Explore
              </a>
              <a
                href="/campaigns?category=trending"
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                Trending
              </a>
              <a
                href="/about"
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                About
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <a href="/campaigns/create" className="hidden sm:block">
                  <button className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Start a Campaign
                  </button>
                </a>
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-primary text-white hover:opacity-90 transition-opacity"
                  >
                    <span>{user?.username || "Account"}</span>
                    <svg
                      className="w-4 h-4"
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
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1">
                      <a
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        Dashboard
                      </a>
                      <a
                        href="/dashboard#my-campaigns"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        My Campaigns
                      </a>
                      <a
                        href="/dashboard#my-donations"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        My Donations
                      </a>
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
