"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { feedApi } from "@/lib/api";
import { FeedItem } from "@/lib/types";
import FeedItemCard from "@/components/feed/FeedItemCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated } from "@/lib/auth";
import { Sparkles, Compass } from "lucide-react";

const SKELETON_PLACEHOLDERS = [1, 2, 3];

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
        });

        if (response.success) {
          const nextItems = response.data.items || [];
          setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
          setCursor(response.data.nextCursor);
          setHasMore(response.data.hasMore);
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
    []
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

  return (
    <div className="bg-background min-h-screen py-12">
      <div className="container mx-auto max-w-6xl px-4 space-y-10">
        <header className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex items-center gap-2 rounded-full border border-border/30 bg-muted/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Your Creator Feed
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            Stay in sync with creators you follow
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            Articles, events, and premium posts from your favorite creators arrive here the moment they publish. Follow more creators to keep this timeline buzzing.
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-6">
            {SKELETON_PLACEHOLDERS.map((value) => (
              <Skeleton key={value} className="h-[280px] w-full rounded-3xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-border/50 bg-muted/40 p-16 text-center">
            <Compass className="h-12 w-12 text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No updates yet</h2>
              <p className="text-sm text-muted-foreground">
                Follow your favorite creators to see their latest articles, events, and premium posts in this personalized feed.
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
          <div className="space-y-6">
            {items.map((item) => (
              <FeedItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-center pt-4">
            {hasMore ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                loading={isLoadingMore}
                disabled={!cursor}
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
      </div>
    </div>
  );
}
