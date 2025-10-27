"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Compass,
  Users,
  ShoppingBag,
  Newspaper,
  Calendar,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  TrendingUp,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAuthenticated } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  requiresAuth?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Feed", href: "/feed", icon: TrendingUp, requiresAuth: true },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Creators", href: "/creators", icon: Users },
  { label: "Shop", href: "/explore/shop", icon: ShoppingBag },
  { label: "Blog", href: "/blog", icon: Newspaper },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Campaigns", href: "/campaigns", icon: TrendingUp },
];

const creatorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/creator-dashboard", icon: LayoutDashboard, requiresAuth: true },
  { label: "Posts", href: "/creator-dashboard/posts", icon: Newspaper, requiresAuth: true },
  { label: "Analytics", href: "/creator-dashboard/analytics", icon: TrendingUp, requiresAuth: true },
];

export default function Sidebar() {
  const [isHovering, setIsHovering] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();
  const isAuth = isAuthenticated();

  useEffect(() => {
    if (isAuth) {
      const storedUsername = localStorage.getItem("username");
      setUsername(storedUsername);
    }
  }, [isAuth]);

  const isExpanded = isHovering;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar */}
      <motion.aside
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-card border-r border-border/20 shadow-renaissance-lg z-50 flex flex-col overflow-hidden"
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-border/20">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-sage flex items-center justify-center shadow-sage flex-shrink-0">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            {isExpanded && (
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-display font-semibold text-gradient-renaissance whitespace-nowrap"
              >
                Fundify
              </motion.h1>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            {isExpanded && (
              <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Main
              </p>
            )}
            {mainNavItems
              .filter((item) => !item.requiresAuth || isAuth)
              .map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary shadow-sage"
                        : "text-foreground/70 hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && (
                      <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </div>
                </Link>
              ))}
          </div>

          {/* Creator Navigation */}
          {isAuth && (
            <div className="space-y-1 pt-6">
              {isExpanded && (
                <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Creator
                </p>
              )}
              {creatorNavItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary shadow-sage"
                        : "text-foreground/70 hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && (
                      <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-border/20 p-3 space-y-1">
          {isAuth ? (
            <>
              {username && (
                <Link href={`/creators/${username}`}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary/40 hover:text-foreground transition-all">
                    <UserCircle className="w-5 h-5 flex-shrink-0" />
                    {isExpanded && <span className="text-sm font-medium whitespace-nowrap">View Profile</span>}
                  </div>
                </Link>
              )}
              <Link href="/settings">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary/40 hover:text-foreground transition-all">
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Logout</span>}
              </button>
            </>
          ) : (
            <Link href="/login">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sage">
                <User className="w-5 h-5 flex-shrink-0" />
                {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Login</span>}
              </div>
            </Link>
          )}
        </div>
      </motion.aside>

      {/* Main content offset */}
      <div className="ml-20" />
    </>
  );
}
