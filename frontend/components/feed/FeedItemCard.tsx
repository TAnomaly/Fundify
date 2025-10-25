/* eslint-disable @next/next/no-img-element */
'use client';

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedItem } from "@/lib/types";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { cn } from "@/lib/utils";
import {
  Calendar,
  FileText,
  Rss,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Flame,
  Bookmark,
  BookmarkCheck,
  Sparkles,
} from "lucide-react";

const TYPE_CONFIG: Record<
  FeedItem["type"],
  {
    label: string;
    icon: typeof FileText;
    badgeClass: string;
  }
> = {
  article: {
    label: "Article",
    icon: FileText,
    badgeClass: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
  },
  post: {
    label: "Creator Post",
    icon: Rss,
    badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  },
  event: {
    label: "Event",
    icon: Calendar,
    badgeClass: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
  },
};

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/avataaars/svg?seed=fundify";

const formatMetaDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "PPp");
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || value <= 0) {
    return "Free";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value?: number) => {
  if (!value) return "0";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

interface FeedItemCardProps {
  item: FeedItem;
  onToggleSave?: (item: FeedItem, nextState: boolean) => Promise<void> | void;
  disabled?: boolean;
}

export default function FeedItemCard({ item, onToggleSave, disabled = false }: FeedItemCardProps) {
  const config = TYPE_CONFIG[item.type];
  const TypeIcon = config.icon;
  const publishedAt = new Date(item.publishedAt);
  const timeAgo = formatDistanceToNow(publishedAt, { addSuffix: true });

  const metaBadges = useMemo(() => {
    const badges: string[] = [];

    if (item.type === "article" || item.type === "post") {
      if (item.meta?.likes && item.meta.likes > 0) {
        badges.push(`${item.meta.likes} ${item.meta.likes === 1 ? "like" : "likes"}`);
      }
      if (item.meta?.comments && item.meta.comments > 0) {
        badges.push(`${item.meta.comments} ${item.meta.comments === 1 ? "comment" : "comments"}`);
      }
    }

    if (item.type === "article" && item.meta?.readTime) {
      badges.push(`${item.meta.readTime} min read`);
    }

    if (item.type === "event") {
      if (item.meta?.rsvps && item.meta.rsvps > 0) {
        badges.push(`${item.meta.rsvps} RSVPs`);
      }
      if (item.meta?.price !== undefined) {
        badges.push(formatCurrency(item.meta.price as number));
      }
    }

    return badges;
  }, [item]);

  const startDate = formatMetaDate(item.type === "event" ? item.meta?.startTime : undefined);
  const endDate = formatMetaDate(item.type === "event" ? item.meta?.endTime : undefined);

  const avatarSrc = item.creator.avatar ? getFullMediaUrl(item.creator.avatar) : DEFAULT_AVATAR;

  const handleSaveClick = async () => {
    if (disabled || !onToggleSave) return;
    await onToggleSave(item, !item.isSaved);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border/40 bg-card/70 shadow-[0_30px_60px_-45px_rgba(249,38,114,0.45)] backdrop-blur-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_90px_-45px_rgba(249,38,114,0.55)]",
        item.isHighlight && "border-primary/70 shadow-[0_40px_110px_-60px_rgba(249,38,114,0.8)]",
      )}
    >
      {item.coverImage && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={getFullMediaUrl(item.coverImage)}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
      )}
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("flex items-center gap-2 px-3 py-1.5", config.badgeClass)}>
              <TypeIcon className="h-4 w-4" />
              {config.label}
            </Badge>
            {item.badges?.map(badge => (
              <Badge
                key={badge}
                variant="secondary"
                className={cn(
                  "flex items-center gap-1 border border-white/10 bg-white/20 text-xs font-semibold uppercase tracking-wide",
                  badge === "Highlight" && "bg-amber-500/20 text-amber-100 border-amber-500/50",
                  badge === "Popular" && "bg-rose-500/20 text-rose-100 border-rose-500/40",
                  badge === "New" && "bg-emerald-500/20 text-emerald-100 border-emerald-500/50",
                  badge === "Supporters" && "bg-primary/20 text-primary-foreground border-primary/40",
                )}
              >
                {badge === "Highlight" && <Flame className="h-3.5 w-3.5" />}
                {badge === "Popular" && <Sparkles className="h-3.5 w-3.5" />}
                {badge}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {timeAgo}
            </span>
            {onToggleSave && (
              <Button
                variant={item.isSaved ? "secondary" : "outline"}
                size="icon"
                className={cn("h-9 w-9 rounded-full", item.isSaved && "bg-primary text-primary-foreground")}
                onClick={handleSaveClick}
                disabled={disabled}
                aria-label={item.isSaved ? "Remove from saved" : "Save for later"}
              >
                {item.isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img
            src={avatarSrc}
            alt={item.creator.name}
            className="h-12 w-12 rounded-full border border-border/40 object-cover shadow-md"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">{item.creator.name}</p>
            {(item.creator.username || item.creator.slug) && (
              <p className="text-xs text-muted-foreground">@{item.creator.slug || item.creator.username}</p>
            )}
            {item.creator.followerCount !== undefined && (
              <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(item.creator.followerCount)} followers
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight text-foreground">{item.title}</h3>
          {item.preview && (
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">{item.preview}</p>
          )}
        </div>

        {item.type === "event" && (
          <div className="grid gap-2 rounded-lg border border-border/30 bg-muted/30 p-3 text-sm text-muted-foreground">
            {startDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  {startDate}
                  {endDate ? ` – ${endDate}` : ""}
                </span>
              </div>
            )}
            {item.meta?.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{item.meta.location}</span>
              </div>
            )}
          </div>
        )}

        {(metaBadges.length > 0 || item.meta?.visibility === "supporters") && (
          <div className="flex flex-wrap gap-2">
            {metaBadges.map(badge => (
              <Badge
                key={badge}
                variant="outline"
                className="border-border/40 bg-background/60 text-xs font-medium text-muted-foreground"
              >
                {badge}
              </Badge>
            ))}
            {item.meta?.visibility === "supporters" && (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                Supporters only
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              <Flame className="h-4 w-4 text-primary" />
              {formatNumber(item.popularityScore)} score
            </span>
            {item.isNew && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Sparkles className="h-4 w-4" />
                Fresh drop
              </span>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={item.link}>View details →</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
