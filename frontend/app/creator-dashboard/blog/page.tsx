"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { getCurrentUser } from "@/lib/auth";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  viewCount: number;
  createdAt: string;
  _count?: {
    likes: number;
    comments: number;
  };
}

export default function BlogManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Loading my articles...");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://perfect-happiness-production.up.railway.app/api";

      // Get current creator ID from localStorage
      const currentCreatorId = getCurrentUser()?.id;
      console.log("🔍 Current creator ID:", currentCreatorId);

      if (!currentCreatorId) {
        console.warn("⚠️ No authenticated creator found while loading articles");
        setArticles([]);
        return;
      }

      const response = await authFetch(`${apiUrl}/articles?authorId=${currentCreatorId}`);

      if (response.ok) {
        const data = await response.json();
        console.log("📡 Articles response:", data);
        if (data.success && data.data) {
          setArticles(data.data);
          console.log("✅ Articles loaded:", data.data.length);
        } else {
          console.log("⚠️ No articles found");
          setArticles([]);
        }
      } else {
        console.error("❌ Failed to load articles:", response.status);
        setArticles([]);
      }
    } catch (error: any) {
      console.error("❌ Error loading articles:", error);
      toast.error("Failed to load articles");
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Blog Articles</h1>
          <p className="text-gray-600 dark:text-gray-400">Write and manage your blog posts</p>
        </div>
        <button
          onClick={() => router.push("/creator-dashboard/blog/new")}
          className="px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </button>
      </div>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div key={article.id} className="bg-glass-card rounded-2xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow">
              {article.coverImage && (
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${article.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    article.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {article.status}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2 line-clamp-2">{article.title}</h3>
                {article.excerpt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                    {article.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {article.viewCount}
                  </span>
                  {article._count && (
                    <>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {article._count.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {article._count.comments}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/creator-dashboard/blog/${article.id}/edit`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-glass-card rounded-2xl p-12 text-center shadow-soft">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">No Articles Yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start writing your first blog article to share your thoughts and expertise with your audience.
          </p>
          <button
            onClick={() => router.push("/creator-dashboard/blog/new")}
            className="px-8 py-4 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
          >
            Write Your First Article
          </button>
        </div>
      )}
    </div>
  );
}
