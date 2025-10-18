"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUser, removeToken, AUTH_EVENT } from "@/lib/auth";
import {
  Moon,
  Sun,
  Menu,
  X,
  Heart,
  MessageSquare,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Users,
  CreditCard,
  ShoppingBag,
  Settings,
  LogOut,
  User,
  Bell,
  Rss,
} from "lucide-react";
import { MovingBorderButton } from "@/components/ui/moving-border";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { notificationApi } from "@/lib/api";
import { NotificationItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ username?: string; name?: string; avatar?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const primaryLinks = useMemo(() => {
    const links = [
      { href: "/explore", label: "Discover", icon: <Sparkles className="w-4 h-4" /> },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/creators", label: "Creators" },
      { href: "/blog", label: "Blog", icon: <MessageSquare className="w-4 h-4" /> },
      { href: "/events", label: "Events" },
      { href: "/explore/shop", label: "Shop" },
      { href: "/campaigns?category=trending", label: "Trending", icon: <Heart className="w-4 h-4" /> },
    ];

    if (isLoggedIn) {
      links.splice(3, 0, { href: "/feed", label: "Feed", icon: <Rss className="w-4 h-4" /> });
    }

    return links;
  }, [isLoggedIn]);

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';

    setTheme(initialTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(initialTheme);

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
    const handleStorageChange = () => {
      console.log("📡 Storage change detected, updating Navbar...");
      checkAuth();
    };

    const handleAuthChange = (_event: Event) => {
      console.log("🔑 Auth change event received, refreshing Navbar state...");
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(AUTH_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
  };

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    setUser(null);
    setShowDropdown(false);
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated()) return;
    try {
      setIsLoadingNotifications(true);
      const response = await notificationApi.list({ limit: 10 });
      if (response.success) {
        setNotifications(response.data.items ?? []);
        setUnreadCount(response.data.unreadCount ?? 0);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // refresh every minute
      return () => clearInterval(interval);
    }

    setNotifications([]);
    setUnreadCount(0);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationsOpen]);

  const toggleNotifications = () => {
    const next = !isNotificationsOpen;
    setIsNotificationsOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      try {
        await notificationApi.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }

    if (notification.link) {
      router.push(notification.link);
      setIsNotificationsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const formatNotificationTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/30 dark:border-white/10 bg-background/80 backdrop-blur-2xl shadow-[0_10px_60px_-40px_rgba(249,38,114,0.65)]">
      <div className="pointer-events-none absolute inset-x-0 top-full h-[1px] bg-gradient-to-r from-transparent via-[#F92672]/50 to-transparent" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand + Desktop Nav */}
          <div className="flex items-center gap-3">
            <Link href="/" className="relative group flex items-center gap-2">
              <div className="relative h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_12px_35px_-20px_rgba(249,38,114,0.9)] ring-1 ring-white/30">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-xl font-semibold text-gradient">Fundify</span>
            </Link>

            <div className="hidden md:flex items-center gap-1 ml-6">
              {primaryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group/link relative px-3 py-2 text-sm font-semibold text-foreground/70 hover:text-foreground transition">
                  <span className="inline-flex items-center gap-1">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="absolute left-3 right-3 -bottom-0.5 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] transition-transform duration-300 group-hover/link:scale-x-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={toggleNotifications}
                  className="relative p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/70 hover:border-[#F92672] transition-all hover:scale-105 shadow-sm"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] px-1.5 py-0.5 rounded-full bg-[#F92672] text-white text-[10px] font-semibold">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/40 bg-background/95 shadow-2xl backdrop-blur-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                      <p className="font-semibold">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                      ) : notifications.length === 0 ? (
                        <div className="p-6 text-sm text-muted-foreground text-center">No notifications yet.</div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full text-left px-4 py-3 border-b border-border/30 transition ${
                              notification.isRead ? "bg-background hover:bg-muted/40" : "bg-muted/60 hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F92672] via-[#AE81FF] to-[#66D9EF] text-white font-semibold">
                                {notification.actor?.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={notification.actor.avatar}
                                    alt={notification.actor.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  notification.actor?.name?.charAt(0) ?? "F"
                                )}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold text-sm leading-tight">{notification.title}</p>
                                  {!notification.isRead && (
                                    <Badge variant="default" className="text-[10px]">
                                      New
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-snug">{notification.message}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatNotificationTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 text-center">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground transition"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          router.push("/creator-dashboard/subscribers");
                        }}
                      >
                        View all activity
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link href="/dashboard#my-campaigns" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <FolderKanban className="w-4 h-4" /> My Projects
                      </Link>
                      <Link href="/creator-dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Users className="w-4 h-4" /> Creator Hub
                      </Link>
                      <Link href="/creator-dashboard/referrals" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Sparkles className="w-4 h-4" /> Referral Program
                      </Link>
                      <Link href="/subscriptions" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <CreditCard className="w-4 h-4" /> Subscriptions
                      </Link>
                      <Link href="/purchases" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <ShoppingBag className="w-4 h-4" /> My Purchases
                      </Link>
                      <div className="my-1 border-t border-slate-200/50 dark:border-slate-700/50" />
                      <Link href="/creators/me" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft bg-blue-50 dark:bg-blue-950/20" onClick={() => setShowDropdown(false)}>
                        <User className="w-4 h-4" /> View Profile
                      </Link>
                      <Link href="/creator-dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <Link href="/dashboard#my-donations" className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-gradient-soft" onClick={() => setShowDropdown(false)}>
                        <Heart className="w-4 h-4" /> Contributions
                      </Link>
                      <hr className="my-2 border-slate-200 dark:border-slate-700" />
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-primary text-white shadow-[0_12px_35px_-20px_rgba(249,38,114,0.85)] hover:shadow-[0_18px_45px_-24px_rgba(174,129,255,0.65)] transition">
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden">
              <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <DialogTrigger asChild>
                  <button aria-label="Open menu" className="p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/70 dark:border-gray-700/70 shadow-sm">
                    <Menu className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="p-0 w-[90vw] max-w-sm overflow-hidden border-0 bg-white/95 dark:bg-slate-900/95 [&>button[data-radix-dialog-close]]:hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold">F</span>
                      </div>
                      <span className="font-bold">Fundify</span>
                    </div>
                    <DialogClose asChild>
                      <button className="p-2 rounded-lg hover:bg-muted" aria-label="Close menu">
                        <X className="w-5 h-5" />
                      </button>
                    </DialogClose>
                  </div>
                  <div className="p-4 space-y-1">
                    {primaryLinks.map((item) => (
                      <DialogClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                        >
                          {item.label}
                        </Link>
                      </DialogClose>
                    ))}

                    <div className="pt-2">
                      <DialogClose asChild>
                        <Link
                          href="/campaigns/create"
                          className="block rounded-xl px-3 py-3 text-sm font-semibold bg-gradient-primary text-white text-center shadow-soft"
                        >
                          Start Project
                        </Link>
                      </DialogClose>
                    </div>

                    {isLoggedIn && (
                      <div className="pt-4 space-y-1 text-sm font-medium">
                        <p className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                          Account
                        </p>
                        <DialogClose asChild>
                          <Link
                            href="/dashboard"
                            className="block rounded-lg px-3 py-3 hover:bg-muted"
                          >
                            Dashboard
                          </Link>
                        </DialogClose>
                        <DialogClose asChild>
                          <Link
                            href="/creator-dashboard"
                            className="block rounded-lg px-3 py-3 hover:bg-muted"
                          >
                            Creator Hub
                          </Link>
                        </DialogClose>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Logout
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {!isLoggedIn && (
                      <div className="pt-2">
                        <DialogClose asChild>
                          <Link
                            href="/login"
                            className="block rounded-xl px-3 py-3 text-sm font-semibold bg-slate-900/90 text-white text-center"
                          >
                            Sign In
                          </Link>
                        </DialogClose>
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
