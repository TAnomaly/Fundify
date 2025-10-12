"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function CreatorsPage() {
  const router = useRouter();
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
    filterAndSortCreators();
  }, [searchQuery, selectedCategory, sortBy, creators]);

  const loadCreators = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/creators`
      );

      if (response.data.success) {
        const creatorsData: Creator[] = response.data.data || [];
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

  const filterAndSortCreators = () => {
    let filtered = [...creators];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (creator) =>
          creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          creator.creatorBio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
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
  };

  const handleCreatorClick = (creator: Creator) => {
    const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");
    router.push(`/creators/${username}`);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-20 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl animate-pulse delay-75"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 animate-fade-in">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-semibold">Discover Amazing Creators</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
              Support Your Favorite <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200">
                Creators
              </span>
            </h1>
            
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in-up delay-100">
              Browse {creators.length}+ talented creators, subscribe to exclusive content, and become part of their creative journey
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto animate-fade-in-up delay-200">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search creators by name, username, or interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-xl focus:ring-4 focus:ring-white/20"
              />
            </div>

            {/* Quick Stats */}
            <div className="flex justify-center gap-8 mt-8 animate-fade-in-up delay-300">
              <div className="text-center">
                <div className="text-3xl font-bold">{creators.length}+</div>
                <div className="text-sm text-white/80">Creators</div>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {creators.reduce((sum, c) => sum + (c._count?.subscribers || 0), 0)}+
                </div>
                <div className="text-sm text-white/80">Subscribers</div>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {creators.reduce((sum, c) => sum + (c._count?.posts || 0), 0)}+
                </div>
                <div className="text-sm text-white/80">Posts</div>
              </div>
            </div>
          </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingCreators.map((creator, index) => {
                const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Card
                    key={creator.id}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-2 border-orange-200 relative"
                    onClick={() => handleCreatorClick(creator)}
                  >
                    {/* Rank Badge */}
                    <div className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {index + 1}
                    </div>

                    {/* Banner */}
                    <div className="relative h-32 bg-gradient-to-br from-orange-400 via-pink-400 to-purple-400">
                      {creator.bannerImage && (
                        <img src={creator.bannerImage} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>

                    {/* Avatar */}
                    <div className="absolute top-20 left-1/2 -translate-x-1/2">
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-xl bg-white flex items-center justify-center text-3xl font-bold text-purple-600">
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <CardContent className="pt-14 pb-6 px-6 text-center">
                      <h3 className="text-xl font-bold mb-1 group-hover:text-purple-600 transition-colors">
                        {creator.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">@{username}</p>
                      
                      {creator.creatorBio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                          {creator.creatorBio}
                        </p>
                      )}

                      <div className="flex justify-center gap-6 mb-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {creator._count?.subscribers || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Subscribers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {creator._count?.posts || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Posts</div>
                        </div>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg">
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {newCreators.map((creator) => {
                const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Card
                    key={creator.id}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-2 border-green-200"
                    onClick={() => handleCreatorClick(creator)}
                  >
                    {/* New Badge */}
                    <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      NEW
                    </div>

                    <div className="relative h-24 bg-gradient-to-br from-green-400 via-teal-400 to-blue-400">
                      {creator.bannerImage && (
                        <img src={creator.bannerImage} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>

                    <CardContent className="pt-4 pb-5 px-5 text-center">
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-16 h-16 rounded-full border-4 border-white shadow-lg object-cover mx-auto -mt-12 mb-3"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center text-2xl font-bold text-purple-600 mx-auto -mt-12 mb-3">
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <h3 className="text-lg font-bold mb-1 group-hover:text-purple-600 transition-colors">
                        {creator.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">@{username}</p>

                      <div className="flex justify-center gap-4 text-sm mb-3">
                        <div className="text-center">
                          <div className="font-bold text-purple-600">{creator._count?.subscribers || 0}</div>
                          <div className="text-xs text-muted-foreground">Subs</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{creator._count?.posts || 0}</div>
                          <div className="text-xs text-muted-foreground">Posts</div>
                        </div>
                      </div>

                      <Button size="sm" className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white">
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
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
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Categories</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg ${
                    selectedCategory === category.value
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white scale-105"
                      : "bg-white text-gray-700 hover:scale-105"
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
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
                      sortBy === option.value
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105"
                        : "bg-white text-gray-700 hover:scale-105"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators.map((creator) => {
                const username = creator.username || creator.name.toLowerCase().replace(/\s+/g, "-");

                return (
                  <Card
                    key={creator.id}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-0 shadow-xl"
                    onClick={() => handleCreatorClick(creator)}
                  >
                    {/* Banner/Header */}
                    <div className="relative h-28 bg-gradient-to-br from-purple-400 via-blue-400 to-teal-400">
                      {creator.bannerImage && (
                        <img src={creator.bannerImage} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>

                    {/* Avatar */}
                    <div className="relative px-5 -mt-10">
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center text-2xl font-bold text-purple-600">
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <CardContent className="pt-3 pb-5 px-5">
                      <h3 className="text-lg font-bold mb-1 group-hover:text-purple-600 transition-colors truncate">
                        {creator.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 truncate">@{username}</p>

                      {creator.creatorBio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                          {creator.creatorBio}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex justify-between gap-4 mb-4 pt-3 border-t">
                        <div className="text-center flex-1">
                          <div className="text-lg font-bold text-purple-600">
                            {creator._count?.subscribers || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Subs</div>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div className="text-center flex-1">
                          <div className="text-lg font-bold text-blue-600">
                            {creator._count?.posts || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Posts</div>
                        </div>
                      </div>

                      <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg group-hover:shadow-xl transition-all">
                        View Profile
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
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
                      className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl text-lg px-8"
                      onClick={() => router.push("/creator-dashboard")}
                    >
                      Start Creating
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white/10 text-lg px-8"
                      onClick={() => router.push("/about")}
                    >
                      Learn More
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
