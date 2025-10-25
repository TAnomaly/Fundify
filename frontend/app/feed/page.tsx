"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { feedApi, followApi } from "@/lib/api";
import { FeedFilter, FeedItem, FeedRecommendedCreator, FeedSort, FeedContentType } from "@/lib/types";
import FeedItemCard from "@/components/feed/FeedItemCard";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import {
  Compass,
  Sparkles,
  Filter,
  Flame,
  Users,
  Plus,
  ArrowUpRight,
} from "lucide-react";

const SKELETON_PLACEHOLDERS = [1, 2, 3];
const DEFAULT_PERIOD = "72h";

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "highlights", label: "Highlights" },
  { value: "posts", label: "Posts" },
  { value: "articles", label: "Articles" },
  { value: "events", label: "Events" },
];

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: "recent", label: "Latest" },
  { value: "popular", label: "Popular" },
];

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "72h", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
];

const contentTypeForItem = (item: FeedItem): FeedContentType => {
  switch (item.type) {
    case "article":
      return "ARTICLE";
    case "event":
      return "EVENT";
    default:
      return "POST";
  }
};

const formatCompactNumber = (value?: number) => {
  if (!value) return "0";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [highlights, setHighlights] = useState<FeedItem[]>([]);
  const [recommendedContent, setRecommendedContent] = useState<FeedItem[]>([]);
  const [recommendedCreators, setRecommendedCreators] = useState<FeedRecommendedCreator[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingSaves, setPendingSaves] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<{ filter: FeedFilter; sort: FeedSort; period: string }>({
    filter: "all",
    sort: "recent",
    period: DEFAULT_PERIOD,
  });

  const loadFeed = useCallback(
    async ({ cursor: cursorParam, append = false }: { cursor?: string | null; append?: boolean } = {}) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await feedApi.get({
          cursor: cursorParam ?? undefined,
          limit: 20,
          filter: filters.filter,
          sort: filters.sort,
          period: filters.period,
        });

        if (response.success) {
          const data = response.data;
          const nextItems = data.items ?? [];

          setItems(prev => (append ? [...prev, ...nextItems] : nextItems));
          setHighlights(data.highlights ?? []);
          setRecommendedContent(data.recommendedContent ?? []);
          setRecommendedCreators(data.recommendedCreators ?? []);
          setCursor(data.nextCursor ?? null);
          setHasMore(Boolean(data.hasMore));
        } else {
          toast.error(response.message || "Failed to load feed");
        }
      } catch (error: any) {
        console.error("Feed load failed:", error);
        const message = error.response?.data?.message || error.message || "Unable to load feed";
        toast.error(message);
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login?redirect=/feed");
      return;
    }

    loadFeed();
  }, [router, loadFeed]);

  const handleLoadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return;
    loadFeed({ cursor, append: true });
  }, [cursor, isLoadingMore, loadFeed]);

  const updateFilters = (next: Partial<typeof filters>) => {
    setFilters(prev => {
      const merged = { ...prev, ...next };
      return merged;
    });
  };

  useEffect(() => {
    if (!isAuthenticated()) return;
    setCursor(null);
    setHasMore(false);
    loadFeed({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filter, filters.sort, filters.period]);

  const handleToggleSave = async (item: FeedItem, nextState: boolean) => {
    const key = item.id;
    if (pendingSaves[key]) return;
    setPendingSaves(prev => ({ ...prev, [key]: true }));

    try {
      if (nextState) {
        await feedApi.addBookmark({ contentType: contentTypeForItem(item), contentId: item.sourceId });
      } else {
        await feedApi.removeBookmark({ contentType: contentTypeForItem(item), contentId: item.sourceId });
      }

      const updateItem = (entry: FeedItem) =>
        entry.id === item.id ? { ...entry, isSaved: nextState } : entry;

      setItems(prev => prev.map(updateItem));
      setHighlights(prev => prev.map(updateItem));
      setRecommendedContent(prev => prev.map(updateItem));
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unable to update saved item";
      toast.error(message);
    } finally {
      setPendingSaves(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleFollowCreator = async (creator: FeedRecommendedCreator) => {
    try {
      const action = creator.isFollowed ? followApi.unfollow : followApi.follow;
      const response = await action(creator.id);
      if (!response.success) {
        toast.error(response.message || "Failed to update follow state");
        return;
      }

      setRecommendedCreators(prev =>
        prev.map(entry =>
          entry.id === creator.id
            ? {
                ...entry,
                isFollowed: !creator.isFollowed,
                followerCount:
                  creator.followerCount + (creator.isFollowed ? -1 : 1),
              }
            : entry,
        ),
      );
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unable to update follow state";
      toast.error(message);
    }
  };

  const highlightSection = useMemo(() => {
    if (highlights.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Flame className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Highlights</h2>
          </div>
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
            Curated for you
          </Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {highlights.map(item => (
            <FeedItemCard
              key={`highlight-${item.id}`}
              item={item}
              onToggleSave={handleToggleSave}
              disabled={Boolean(pendingSaves[item.id])}
            />
          ))}
        </div>
      </section>
    );
  }, [highlights, handleToggleSave, pendingSaves]);

  const recommendedContentSection = useMemo(() => {
    if (recommendedContent.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Recommended for you</h2>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/explore">
              Explore more <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {recommendedContent.map(item => (
            <FeedItemCard
              key={`rec-${item.id}`}
              item={item}
              onToggleSave={handleToggleSave}
              disabled={Boolean(pendingSaves[item.id])}
            />
          ))}
        </div>
      </section>
    );
  }, [recommendedContent, handleToggleSave, pendingSaves]);

  const recommendedCreatorsSection = useMemo(() => {
    if (recommendedCreators.length === 0) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Creators other fans follow</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedCreators.map(creator => (
            <Card key={creator.id} className="border border-border/40 bg-card/60 backdrop-blur-md">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      creator.avatar
                        ? getFullMediaUrl(creator.avatar)
                        : "https://api.dicebear.com/7.x/initials/svg?seed=" + creator.name
                    }
                    alt={creator.name}
                    className="h-12 w-12 rounded-full border border-border/40 object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{creator.name}</p>
                    {creator.username && (
                      <p className="text-xs text-muted-foreground">@{creator.username}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {formatCompactNumber(creator.followerCount)} followers
                    </p>
                  </div>
                </div>
                {creator.creatorBio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{creator.creatorBio}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/creators/${creator.slug}`}>View profile</Link>
                  </Button>
                  <Button
                    variant={creator.isFollowed ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleFollowCreator(creator)}
                  >
                    {creator.isFollowed ? "Following" : (
                      <>
                        <Plus className="mr-1 h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }, [recommendedCreators]);

  return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4 space-y-12">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex items-center gap-2 rounded-full border border-border/30 bg-muted/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Creator Feed
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            Discover fresh drops from your favourite creators
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Articles, events and premium posts arrive here the moment they publish. Tune your feed with filters to catch
            highlights, trending drops or niche categories just like Substack — but for every format.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={filters.filter === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => updateFilters({ filter: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Sort
            </div>
            {SORT_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={filters.sort === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => updateFilters({ sort: option.value })}
              >
                {option.label}
              </Button>
            ))}
            <div className="ml-2 flex items-center gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-primary" />
              Period
            </div>
            {PERIOD_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={filters.period === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => updateFilters({ period: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {SKELETON_PLACEHOLDERS.map(value => (
              <Skeleton key={value} className="h-[280px] w-full rounded-3xl" />
            ))}
          </div>
        ) : items.length === 0 && highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-border/50 bg-muted/40 p-16 text-center">
            <Compass className="h-12 w-12 text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No updates yet</h2>
              <p className="text-sm text-muted-foreground">
                Follow your favourite creators to see their latest articles, events and premium posts in this personalized feed.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="secondary">
                <Link href="/creators">Browse creators</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">Discover campaigns</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {highlightSection}

            <section className="space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">All updates</h2>
              </div>
              <div className="space-y-6">
                {items.map(item => (
                  <FeedItemCard
                    key={item.id}
                    item={item}
                    onToggleSave={handleToggleSave}
                    disabled={Boolean(pendingSaves[item.id])}
                  />
                ))}
              </div>

              {items.length > 0 && (
                <div className="flex justify-center pt-4">
                  {hasMore ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={!cursor || isLoadingMore}
                      loading={isLoadingMore}
                    >
                      Load more updates
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You&apos;re all caught up! Check back soon for new content.
                    </p>
                  )}
                </div>
              )}
            </section>

            {recommendedContentSection}
            {recommendedCreatorsSection}
          </div>
        )}
      </div>
    </div>
  );
}
