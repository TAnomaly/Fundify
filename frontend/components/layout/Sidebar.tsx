"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Compass,
  Users,
  ShoppingBag,
  Newspaper,
  Calendar,
  Mic,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAuthenticated } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const isAuth = isAuthenticated();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
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
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="fixed left-0 top-0 h-screen bg-card border-r border-border/20 shadow-renaissance-lg z-50 flex flex-col"
      >
        {/* Logo & Toggle */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-border/20">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Link href="/" className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-sage flex items-center justify-center shadow-sage">
                    <span className="text-primary-foreground font-bold text-lg">F</span>
                  </div>
                  <h1 className="text-xl font-display font-semibold text-gradient-renaissance">
                    Fundify
                  </h1>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-secondary/40 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="px-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-secondary/30 border border-border/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!isCollapsed && (
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
                    <item.icon className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
          </div>

          {/* Creator Navigation */}
          {isAuth && (
            <div className="space-y-1 pt-6">
              {!isCollapsed && (
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
                    <item.icon className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
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
              <Link href="/settings">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary/40 hover:text-foreground transition-all">
                  <Settings className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
                  {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
                {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sage">
                  <User className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
                  {!isCollapsed && <span className="text-sm font-medium">Login</span>}
                </div>
              </Link>
            </>
          )}
        </div>
      </motion.aside>

      {/* Main content offset */}
      <div className={cn("transition-all duration-300", isCollapsed ? "ml-20" : "ml-72")} />
    </>
  );
}
