"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated } from "@/lib/auth";
import { Headphones, Plus, Play, Edit, Trash2, Calendar, Clock } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

interface Podcast {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  episodeCount: number;
  totalDuration: string;
  createdAt: string;
  updatedAt: string;
}

export default function PodcastManagement() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);

  useEffect(() => {
    loadPodcasts();
  }, []);

  const loadPodcasts = async () => {
    setIsLoading(true);
    try {
      const token = isAuthenticated() ? localStorage.getItem("authToken") : null;
      if (!token) {
        setPodcasts([]);
      } else {
        const api = process.env.NEXT_PUBLIC_API_URL;
        const res = await axios.get(`${api}/podcasts/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(res.data?.data?.podcasts) ? res.data.data.podcasts : [];
        setPodcasts(data);
      }
    } catch (error: any) {
      toast.error("Failed to load podcasts");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Podcasts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your podcast shows and episodes</p>
        </div>
        <Button onClick={() => router.push("/creator-dashboard/podcast/new")} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Podcast
        </Button>
      </div>

      {podcasts.length === 0 ? (
        <Card className="text-center py-20">
          <CardContent>
            <Headphones className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No podcasts yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first podcast to start sharing your content</p>
            <Button onClick={() => router.push("/creator-dashboard/podcast/new")} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Podcast
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {podcasts.map((podcast) => (
            <Card key={podcast.id} className="overflow-hidden hover:shadow-lg transition-shadow dark:bg-gray-800/50 dark:border-gray-700/30">
              <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                {podcast.coverImage ? (
                  <img
                    src={podcast.coverImage}
                    alt={podcast.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Headphones className="w-16 h-16 text-white" />
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-2 text-gray-900 dark:text-gray-100">{podcast.title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{podcast.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {podcast.episodeCount} episodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {podcast.totalDuration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(podcast.updatedAt)}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/creator-dashboard/podcast/${podcast.id}`)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/podcast/${podcast.id}`)}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
