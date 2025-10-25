"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Search,
  Calendar,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  BookOpen,
  PenSquare,
  Filter,
  Tag as TagIcon,
} from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  content?: string;
  author_id: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export default function BlogPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/articles?${params.toString()}`
      );

      if (response.data.success) {
        setArticles(response.data.data || []);
      } else {
        // Backend direkt array döndürüyor
        setArticles(response.data || []);
      }
    } catch (error) {
      console.error("Error loading articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-semibold">Creator Blog</span>
            </div>

            <h1 className="text-5xl font-bold mb-4">
              Stories from Our <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
                Creative Community
              </span>
            </h1>

            <p className="text-xl text-white/90 mb-6">
              Discover insights, tutorials, and stories from talented creators
            </p>

            {isAuthenticated() && (
              <Button
                onClick={() => router.push("/blog/new")}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                <PenSquare className="w-4 h-4 mr-2" />
                Write Article
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg rounded-2xl shadow-md"
            />
          </div>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Articles Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `No articles match "${searchQuery}"`
                  : "No articles have been published yet"}
              </p>
              {searchQuery && (
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                onClick={() => router.push(`/blog/${article.slug}`)}
              >
                {/* Cover Image - Placeholder */}
                <div className="relative h-48 bg-gradient-to-br from-purple-400 to-blue-400 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white/50" />
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Categories - Simplified */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-600">
                      Article
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {article.title}
                  </h3>

                  {/* Content Preview */}
                  {article.content && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {article.content.substring(0, 150)}...
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(article.published_at || article.created_at)}</span>
                    </div>
                  </div>

                  {/* Read More */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-1 text-purple-600">
                      <BookOpen className="w-4 h-4" />
                      <span>Read more</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
