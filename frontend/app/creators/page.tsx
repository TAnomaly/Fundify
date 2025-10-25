"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BlurFade } from "@/components/ui/blur-fade";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Search,
  Users,
  TrendingUp,
  Sparkles,
  Star,
  Clock,
  Heart,
  ChevronRight,
  Filter
} from "lucide-react";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";

interface Creator {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  bannerImage?: string;
  creatorBio?: string;
  isCreator: boolean;
  createdAt?: string;
  _count?: {
    subscribers: number;
    posts: number;
  };
}

const getCreatorSlug = (creator: Creator) => {
  if (creator.username) return creator.username;
  if (creator.name) {
    return creator.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  return creator.id;
};

const getDisplayHandle = (creator: Creator) =>
  creator.username || (creator.name ? getCreatorSlug(creator) : `user${creator.id.slice(0, 6)}`);

const categories = [
  { value: "all", label: "All Creators", icon: "🎨" },
  { value: "art", label: "Art & Design", icon: "🎨" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "tech", label: "Technology", icon: "💻" },
  { value: "lifestyle", label: "Lifestyle", icon: "✨" },
];

const sortOptions = [
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "newest", label: "Newest", icon: Clock },
  { value: "subscribers", label: "Most Popular", icon: Star },
  { value: "posts", label: "Most Active", icon: Heart },
];

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-1 px-6">
    <span className="text-2xl font-semibold text-gradient-monokai">{value}</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    let filtered = [...creators];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (creator) =>
          creator.name.toLowerCase().includes(query) ||
          creator.username?.toLowerCase().includes(query) ||
          creator.creatorBio?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (creator) => creator.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    switch (sortBy) {
      case "trending":
        filtered.sort((a, b) => (b._count?.subscribers || 0) - (a._count?.subscribers || 0));
        break;
      case "newest":
        filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
      case "subscribers":
        filtered.sort((a, b) => (b._count?.subscribers || 0) - (a._count?.subscribers || 0));
        break;
      case "posts":
        filtered.sort((a, b) => (b._count?.posts || 0) - (a._count?.posts || 0));
        break;
    }

    setFilteredCreators(filtered);
  }, [creators, searchQuery, selectedCategory, sortBy]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadCreators = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      console.log('API URL:', apiUrl);
      console.log('Full URL:', `${apiUrl}/creators`);

      const response = await axios.get(
        `${apiUrl}/creators`
      );

      console.log('API Response:', response.data);

      if (response.data.success) {
        const creatorsData: Creator[] = response.data.data || [];
        setCreators(creatorsData);
        setFilteredCreators(creatorsData);
      } else {
        // Backend returns data directly, not wrapped in success/data
        const creatorsData: Creator[] = response.data || [];
        setCreators(creatorsData);
        setFilteredCreators(creatorsData);
      }
    } catch (error) {
      console.error("Error loading creators:", error);
      toast.error("Failed to load creators");
    } finally {
      setIsLoading(false);
    }
  };

  // Get trending creators (top 3)
  const trendingCreators = [...creators]
    .sort((a, b) => (b._count?.subscribers || 0) - (a._count?.subscribers || 0))
    .slice(0, 3);

  // Get new creators (latest 4)
  const newCreators = [...creators]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-16 px-4">
        <Skeleton className="h-12 w-64 mb-10 mx-auto" />
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,38,114,0.1),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_left,rgba(174,129,255,0.12),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/60 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gradient shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-[#F92672]" />
            Discover amazing creators
          </div>
          <TextGenerateEffect
            words="Support your favorite creators"
            className="text-5xl md:text-6xl font-bold mb-5 text-gradient-monokai"
          />
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Browse {creators.length}+ talented creators, subscribe to exclusive content, and become part of their creative journey.
          </p>
          <div className="relative max-w-2xl mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search creators by name, username, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg rounded-2xl bg-background/85 backdrop-blur-xl border border-white/15 shadow-[0_18px_60px_-40px_rgba(249,38,114,0.4)] focus:ring-2 focus:ring-[#F92672]/40"
            />
          </div>
        </div>
      </section>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 rounded-3xl border border-white/12 bg-background/80 backdrop-blur-xl py-6 shadow-[0_25px_70px_-50px_rgba(174,129,255,0.45)]">
          <StatPill label="Creators" value={`${creators.length}+`} />
          <StatPill label="Subscribers" value={`${creators.reduce((sum, c) => sum + (c._count?.subscribers || 0), 0)}+`} />
          <StatPill label="Posts" value={`${creators.reduce((sum, c) => sum + (c._count?.posts || 0), 0)}+`} />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trending Creators Section */}
        {!searchQuery && trendingCreators.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Trending Now</h2>
                  <p className="text-muted-foreground">Most popular creators this month</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {trendingCreators.map((creator, index) => {
                const slug = getCreatorSlug(creator);
                const handle = getDisplayHandle(creator);
                const bannerSrc = getFullMediaUrl(creator.bannerImage);
                const avatarSrc = getFullMediaUrl(creator.avatar);

                return (
                  <Link
                    key={creator.id}
                    href={`/creators/${slug}`}
                    className="group relative block overflow-hidden rounded-3xl border border-white/15 bg-background/80 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_-50px_rgba(249,38,114,0.6)]"
                    prefetch
                  >
                    <Card className="pointer-events-none border-0 shadow-none">
                      {/* Rank Badge */}
                      <div className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-lg font-bold text-white shadow-lg">
                        {index + 1}
                      </div>

                      {/* Banner */}
                      <div className="relative h-32 bg-gradient-to-br from-[#F92672]/80 via-[#AE81FF]/80 to-[#66D9EF]/80">
                        {bannerSrc && (
                          <Image
                            src={bannerSrc}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>

                      {/* Avatar */}
                      <div className="absolute left-1/2 top-20 -translate-x-1/2">
                        {avatarSrc ? (
                          <Image
                            src={avatarSrc}
                            alt={creator.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-xl"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-[#F92672]/90 to-[#FD971F]/80 text-3xl font-bold text-white shadow-lg">
                            {creator.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <CardContent className="px-6 pb-6 pt-14 text-center">
                        <h3 className="mb-1 text-xl font-bold text-foreground transition-colors group-hover:text-gradient-monokai">
                          {creator.name}
                        </h3>
                        <p className="mb-3 text-sm text-muted-foreground">@{handle}</p>

                        {creator.creatorBio && (
                          <p className="mb-4 min-h-[40px] text-sm text-muted-foreground line-clamp-2">
                            {creator.creatorBio}
                          </p>
                        )}

                        <div className="mb-4 flex justify-center gap-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-[#AE81FF]">
                              {creator._count?.subscribers || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Subscribers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-[#66D9EF]">
                              {creator._count?.posts || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Posts</div>
                          </div>
                        </div>

                        <Button variant="gradient" className="w-full" size="sm">
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* New Creators Section */}
        {!searchQuery && newCreators.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">New Creators</h2>
                  <p className="text-muted-foreground">Fresh talent just joined</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {newCreators.map((creator) => {
                const slug = getCreatorSlug(creator);
                const handle = getDisplayHandle(creator);
                const bannerSrc = getFullMediaUrl(creator.bannerImage);
                const avatarSrc = getFullMediaUrl(creator.avatar);

                return (
                  <Link
                    key={creator.id}
                    href={`/creators/${slug}`}
                    className="group relative block overflow-hidden rounded-3xl border border-white/12 bg-background/80 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_-50px_rgba(102,217,239,0.55)]"
                    prefetch
                  >
                    <Card className="pointer-events-none border-0 shadow-none">
                      {/* New Badge */}
                      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#66D9EF] to-[#A6E22E] px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <Sparkles className="h-3 w-3" />
                        NEW
                      </div>

                      <div className="relative h-24 bg-gradient-to-br from-[#66D9EF]/80 via-[#A6E22E]/70 to-[#AE81FF]/70">
                        {bannerSrc && (
                          <Image
                            src={bannerSrc}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>

                      <CardContent className="px-5 pb-5 pt-4 text-center">
                        {avatarSrc ? (
                          <Image
                            src={avatarSrc}
                            alt={creator.name}
                            width={64}
                            height={64}
                            className="mx-auto -mt-12 mb-3 h-16 w-16 rounded-full border-4 border-white object-cover shadow-lg"
                          />
                        ) : (
                          <div className="mx-auto -mt-12 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-[#66D9EF]/90 to-[#AE81FF]/80 text-2xl font-bold text-white shadow-lg">
                            {creator.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <h3 className="mb-1 text-lg font-bold text-foreground transition-colors group-hover:text-gradient-monokai">
                          {creator.name}
                        </h3>
                        <p className="mb-3 text-xs text-muted-foreground">@{handle}</p>

                        <div className="mb-3 flex justify-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-[#AE81FF]">{creator._count?.subscribers || 0}</div>
                            <div className="text-xs text-muted-foreground">Subs</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-[#66D9EF]">{creator._count?.posts || 0}</div>
                            <div className="text-xs text-muted-foreground">Posts</div>
                          </div>
                        </div>

                        <Button size="sm" variant="glass" className="w-full text-foreground">
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters and Sort */}
        <div className="mb-8 space-y-6">
          {/* Category Filter */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Categories</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedCategory === category.value
                    ? "bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] text-white shadow-[0_14px_45px_-24px_rgba(249,38,114,0.55)] scale-105"
                    : "bg-background/80 backdrop-blur border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:-translate-y-[2px]"
                    }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sort By</h3>
            <div className="flex flex-wrap gap-3">
              {sortOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${sortBy === option.value
                      ? "bg-gradient-to-r from-[#AE81FF] to-[#66D9EF] text-white shadow-[0_14px_45px_-24px_rgba(102,217,239,0.55)] scale-105"
                      : "bg-background/80 backdrop-blur border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:-translate-y-[2px]"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* All Creators Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">
              {searchQuery ? "Search Results" : "All Creators"}
            </h2>
            <div className="text-sm text-muted-foreground">
              {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
            </div>
          </div>

          {filteredCreators.length === 0 ? (
            <Card className="shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Creators Found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? `No creators match "${searchQuery}"`
                    : "No creators available at the moment"}
                </p>
                {searchQuery && (
                  <Button onClick={() => setSearchQuery("")} variant="outline">
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCreators.map((creator) => {
                const slug = getCreatorSlug(creator);
                const handle = getDisplayHandle(creator);
                const bannerSrc = getFullMediaUrl(creator.bannerImage);
                const avatarSrc = getFullMediaUrl(creator.avatar);

                return (
                  <Link
                    key={creator.id}
                    href={`/creators/${slug}`}
                    className="group block overflow-hidden rounded-3xl border border-white/12 bg-background/80 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_25px_75px_-45px_rgba(174,129,255,0.55)]"
                    prefetch
                  >
                    <Card className="pointer-events-none border-0 shadow-none">
                      <div className="relative h-28 bg-gradient-to-br from-[#F92672]/75 via-[#AE81FF]/80 to-[#66D9EF]/75">
                        {bannerSrc && (
                          <Image
                            src={bannerSrc}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>

                      <div className="relative -mt-10 px-5">
                        {avatarSrc ? (
                          <Image
                            src={avatarSrc}
                            alt={creator.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-[#F92672]/85 to-[#AE81FF]/80 text-2xl font-bold text-white shadow-lg">
                            {creator.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <CardContent className="px-5 pb-5 pt-3">
                        <h3 className="mb-1 truncate text-lg font-bold text-foreground transition-colors group-hover:text-gradient-monokai">
                          {creator.name}
                        </h3>
                        <p className="mb-3 truncate text-xs text-muted-foreground">@{handle}</p>

                        {creator.creatorBio && (
                          <p className="mb-4 min-h-[40px] text-sm text-muted-foreground line-clamp-2">
                            {creator.creatorBio}
                          </p>
                        )}

                        <div className="mb-4 flex justify-between gap-4 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                          <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-[#AE81FF]">
                              {creator._count?.subscribers || 0}
                            </div>
                            <div>Subs</div>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-[#66D9EF]">
                              {creator._count?.posts || 0}
                            </div>
                            <div>Posts</div>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="flex-1 text-center">
                            <div className="text-lg font-bold text-[#F92672]">
                              {creator.createdAt
                                ? new Date(creator.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })
                                : "—"}
                            </div>
                            <div>Joined</div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="glass"
                          className="flex w-full items-center justify-between text-foreground"
                        >
                          View Profile
                          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA Section */}
        {filteredCreators.length > 0 && (
          <div className="mt-16">
            <Card className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white border-0 shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
              <CardContent className="p-12 relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl font-bold mb-4">Want to Become a Creator?</h2>
                  <p className="text-xl opacity-90 mb-8">
                    Share your passion, build a community, and earn from your content with our creator program
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8 shadow-xl"
                      asChild
                    >
                      <Link href="/creator-dashboard">
                        Start Creating
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white text-lg text-white hover:bg-white/10 px-8"
                      asChild
                    >
                      <Link href="/about">Learn More</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
