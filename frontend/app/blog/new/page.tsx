"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import axios from "axios";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Eye } from "lucide-react";

export default function NewArticlePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    coverImage: "",
    metaTitle: "",
    metaDescription: "",
    keywords: [] as string[],
    status: "DRAFT",
    isPublic: true,
    scheduledFor: "",
  });

  const handleSubmit = async (status: "DRAFT" | "PUBLISHED") => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("authToken");

      // Prepare data
      const dataToSend = {
        ...formData,
        status,
        scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : null,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/articles`,
        dataToSend,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        toast.success(
          status === "PUBLISHED"
            ? "Article published successfully!"
            : "Article saved as draft"
        );
        router.push(`/blog/${response.data.data.slug}`);
      }
    } catch (error: any) {
      console.error("Error creating article:", error);
      toast.error(error.response?.data?.message || "Failed to create article");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit("DRAFT")}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Write New Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter article title..."
                className="mt-2 text-2xl font-bold"
              />
            </div>

            {/* Excerpt */}
            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Input
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary of your article..."
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                A short description that appears in article listings
              </p>
            </div>

            {/* Cover Image */}
            <div>
              <Label htmlFor="coverImage">Cover Image URL</Label>
              <Input
                id="coverImage"
                type="url"
                value={formData.coverImage}
                onChange={(e) =>
                  setFormData({ ...formData, coverImage: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                className="mt-2"
              />
              {formData.coverImage && (
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="mt-3 rounded-lg max-h-48 object-cover"
                />
              )}
            </div>

            {/* Content Editor */}
            <div>
              <Label>Content *</Label>
              <div className="mt-2">
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  placeholder="Write your article content here..."
                />
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">⏰ Schedule Publishing (Optional)</h3>

              <div>
                <Label htmlFor="scheduledFor">Scheduled Publish Date & Time</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledFor: e.target.value })
                  }
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.scheduledFor
                    ? `Article will auto-publish on ${new Date(formData.scheduledFor).toLocaleString()}`
                    : "Leave empty to publish immediately or save as draft"
                  }
                </p>
              </div>
            </div>

            {/* SEO Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">SEO Settings (Optional)</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, metaTitle: e.target.value })
                    }
                    placeholder="SEO title (defaults to article title)"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Input
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, metaDescription: e.target.value })
                    }
                    placeholder="SEO description (defaults to excerpt)"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords.join(", ")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        keywords: e.target.value
                          .split(",")
                          .map((k) => k.trim())
                          .filter((k) => k),
                      })
                    }
                    placeholder="javascript, tutorial, web development"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

