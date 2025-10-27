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
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { notificationApi } from "@/lib/api";
import { NotificationItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-2xl shadow-[0_22px_68px_-48px_rgba(36,24,12,0.6)]">
      <div className="pointer-events-none absolute inset-x-0 top-full h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="container-elegant">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Brand + Desktop Nav */}
          <div className="flex items-center gap-3">
            <Link href="/" className="relative group flex items-center gap-3 rounded-full px-2 py-1 transition hover:opacity-90">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary shadow-glow-sm ring-1 ring-border/40">
                <span className="font-display text-lg text-primary-foreground">F</span>
              </div>
              <span className="font-display text-2xl leading-none text-gradient">Fundify</span>
            </Link>

            <div className="hidden md:flex items-center gap-1 ml-6">
              {primaryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group/link relative px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition">
                  <span className="inline-flex items-center gap-1">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="absolute left-3 right-3 -bottom-1 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-primary/60 via-primary/40 to-transparent transition-transform duration-300 group-hover/link:scale-x-100" />
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
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-white/75 dark:bg-background/60 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-soft"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-foreground/70" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-soft">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/50 bg-background/95 shadow-soft backdrop-blur-xl z-50">
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
                              notification.isRead ? "bg-background hover:bg-muted/40" : "bg-muted/70 hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-glow-sm">
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-white/75 dark:bg-background/60 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-soft"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-foreground/70" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
            </button>

            {/* Desktop CTA / Account */}
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full border-border/60 bg-white/70 dark:bg-background/60 text-foreground shadow-soft hover:bg-secondary/40">
                <Link href="/campaigns/create" className="inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Start Project
                </Link>
              </Button>

              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-gradient-primary text-primary-foreground shadow-soft hover:shadow-soft-hover hover:-translate-y-0.5 transition"
                  >
                    <span>{user?.name || user?.username || "Account"}</span>
                    <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-56 bg-background/95 border border-border/50 rounded-2xl shadow-soft py-2 backdrop-blur-2xl">
                      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link href="/dashboard#my-campaigns" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <FolderKanban className="w-4 h-4" /> My Projects
                      </Link>
                      <Link href="/creator-dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <Users className="w-4 h-4" /> Creator Hub
                      </Link>
                      <Link href="/creator-dashboard/referrals" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <Sparkles className="w-4 h-4" /> Referral Program
                      </Link>
                      <Link href="/subscriptions" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <CreditCard className="w-4 h-4" /> Subscriptions
                      </Link>
                      <Link href="/purchases" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <ShoppingBag className="w-4 h-4" /> My Purchases
                      </Link>
                      <div className="my-1 border-t border-border/40" />
                      <Link href="/creators/me" className="flex items-center gap-3 px-4 py-3 text-sm font-medium bg-secondary/40 text-foreground hover:bg-secondary/60 transition" onClick={() => setShowDropdown(false)}>
                        <User className="w-4 h-4" /> View Profile
                      </Link>
                      <Link href="/creator-dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <Link href="/dashboard#my-donations" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition" onClick={() => setShowDropdown(false)}>
                        <Heart className="w-4 h-4" /> Contributions
                      </Link>
                      <hr className="my-2 border-border/40" />
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button asChild variant="gradient" size="sm" className="rounded-full">
                  <Link href="/login">Sign In</Link>
                </Button>
              )}
            </div>

            {/* Mobile menu */}
            <div className="sm:hidden">
              <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <DialogTrigger asChild>
                  <button aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-white/75 dark:bg-background/60 backdrop-blur-xl shadow-soft hover:-translate-y-0.5 transition">
                    <Menu className="w-5 h-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="p-0 w-[90vw] max-w-sm overflow-hidden border border-border/50 bg-background/95 backdrop-blur-2xl [&>button[data-radix-dialog-close]]:hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary shadow-glow-sm ring-1 ring-border/30">
                        <span className="font-display text-base text-primary-foreground">F</span>
                      </div>
                      <span className="font-display text-xl text-gradient">Fundify</span>
                    </div>
                    <DialogClose asChild>
                      <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 hover:bg-muted/60 transition" aria-label="Close menu">
                        <X className="w-4 h-4" />
                      </button>
                    </DialogClose>
                  </div>
                  <div className="p-4 space-y-1">
                    {primaryLinks.map((item) => (
                      <DialogClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className="block rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/40 hover:text-foreground transition"
                        >
                          {item.label}
                        </Link>
                      </DialogClose>
                    ))}

                    <div className="pt-2">
                      <DialogClose asChild>
                        <Link
                          href="/campaigns/create"
                          className="block rounded-full px-3 py-3 text-sm font-semibold bg-gradient-primary text-primary-foreground text-center shadow-soft"
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
                            className="block rounded-xl px-3 py-3 hover:bg-muted/40"
                          >
                            Dashboard
                          </Link>
                        </DialogClose>
                        <DialogClose asChild>
                          <Link
                            href="/creator-dashboard"
                            className="block rounded-xl px-3 py-3 hover:bg-muted/40"
                          >
                            Creator Hub
                          </Link>
                        </DialogClose>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-semibold text-destructive hover:bg-destructive/10 transition"
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
                            className="block rounded-full px-3 py-3 text-sm font-semibold bg-gradient-primary text-primary-foreground text-center shadow-soft"
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
