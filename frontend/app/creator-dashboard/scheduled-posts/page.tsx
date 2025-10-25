"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, Clock, Plus, Trash2, Edit } from "lucide-react";

export default function ScheduledPostsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    scheduledFor: "",
    isPublic: true,
  });

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const loadScheduledPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scheduled-posts`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setScheduledPosts(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load scheduled posts");
    } finally {
      setIsLoading(false);
    }
  };

  const createScheduledPost = async () => {
    if (!formData.title || !formData.content || !formData.scheduledFor) {
      toast.error("Title, content, and scheduled date are required");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scheduled-posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Post scheduled successfully!");
        setShowCreateModal(false);
        setFormData({
          title: "",
          content: "",
          excerpt: "",
          scheduledFor: "",
          isPublic: true,
        });
        loadScheduledPosts();
      } else {
        toast.error(data.message || "Failed to schedule post");
      }
    } catch (error) {
      toast.error("Failed to schedule post");
    }
  };

  const deleteScheduledPost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled post?"))
      return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scheduled-posts/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Scheduled post deleted");
        loadScheduledPosts();
      }
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">
            Scheduled Posts
          </h1>
          <p className="text-muted-foreground">
            Schedule posts to publish automatically
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule New Post
        </Button>
      </div>

      {/* Scheduled Posts List */}
      <div className="space-y-4">
        {scheduledPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No scheduled posts</h3>
            <p className="text-gray-600 mb-4">
              Create your first scheduled post to automate content publishing
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </Card>
        ) : (
          scheduledPosts.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">{post.title}</h3>
                    {post.published ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        Scheduled
                      </span>
                    )}
                    {post.isPublic ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        Public
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                        Members Only
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-gray-600 mb-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Scheduled:{" "}
                      {new Date(post.scheduledFor).toLocaleString()}
                    </div>
                    {post.published && post.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Published:{" "}
                        {new Date(post.publishedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                {!post.published && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteScheduledPost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Schedule New Post</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Excerpt (Optional)
                </label>
                <input
                  type="text"
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Short description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-32"
                  placeholder="Post content"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledFor: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublic: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Public (anyone can view)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={createScheduledPost} className="flex-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Post
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
