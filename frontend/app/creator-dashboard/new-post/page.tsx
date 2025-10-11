"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creatorPostApi } from "@/lib/api/creatorPost";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MediaUpload } from "@/components/MediaUpload";
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Layers 
} from "lucide-react";

type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'MIXED';

const POST_TYPES = [
  { value: 'TEXT', label: 'Blog Post', icon: FileText, description: 'Text-based content' },
  { value: 'IMAGE', label: 'Photo Gallery', icon: ImageIcon, description: 'Images & photos' },
  { value: 'VIDEO', label: 'Video Content', icon: Video, description: 'Video uploads' },
  { value: 'AUDIO', label: 'Podcast/Audio', icon: Mic, description: 'Audio content' },
  { value: 'MIXED', label: 'Mixed Media', icon: Layers, description: 'Text, images & videos' },
] as const;

export default function NewPostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [postType, setPostType] = useState<PostType>('TEXT');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    isPublic: false,
    published: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Please enter content");
      return;
    }

    setIsLoading(true);
    try {
      const postData = {
        ...formData,
        type: postType,
        images: (postType === 'IMAGE' || postType === 'MIXED') ? images : [],
        videoUrl: (postType === 'VIDEO' || postType === 'MIXED') ? (videoUrl || undefined) : undefined,
        audioUrl: (postType === 'AUDIO') ? (audioUrl || undefined) : undefined,
        publishedAt: new Date().toISOString(),
      };
      
      console.log('📝 Creating post with data:', postData);
      console.log('   - Type:', postType);
      console.log('   - Images:', images);
      console.log('   - Video:', videoUrl);
      console.log('   - Audio:', audioUrl);
      
      const response = await creatorPostApi.create(postData);

      if (response.success) {
        console.log('✅ Post created successfully:', response.data);
        toast.success("Post created successfully!");
        router.push("/creator-dashboard");
      } else {
        console.error('❌ Post creation failed:', response);
        toast.error(response.message || "Failed to create post");
      }
    } catch (error: any) {
      console.error('❌ Post creation error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold mb-2 text-gradient">Create New Post</h1>
        <p className="text-gray-600 dark:text-gray-400">Share updates with your supporters</p>
      </div>

      <Card className="bg-glass-card shadow-soft">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Post Type Selector */}
            <div>
              <Label className="mb-4 block">Content Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {POST_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPostType(type.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        postType === type.value
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${postType === type.value ? 'text-primary' : 'text-gray-500'}`} />
                      <div className="font-semibold text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {type.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Post Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter post title..."
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Input
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Short description (optional)"
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">A brief summary shown in post previews</p>
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your post content here..."
                className="mt-2 min-h-[300px]"
                required
              />
            </div>

            {/* Conditional Media Uploads based on Post Type */}
            {(postType === 'IMAGE' || postType === 'MIXED') && (
              <div>
                <Label>Images {postType === 'IMAGE' && '*'}</Label>
                <p className="text-sm text-gray-500 mb-3">
                  {postType === 'IMAGE' 
                    ? 'Upload one or more images for your photo gallery' 
                    : 'Add images to your post (optional)'}
                </p>
                <MediaUpload
                  onImagesChange={setImages}
                  onVideoChange={() => {}}
                  maxImages={10}
                  allowVideo={false}
                  allowAttachments={false}
                />
              </div>
            )}

            {(postType === 'VIDEO' || postType === 'MIXED') && (
              <div>
                <Label>Video {postType === 'VIDEO' && '*'}</Label>
                <p className="text-sm text-gray-500 mb-3">
                  {postType === 'VIDEO'
                    ? 'Upload your video content (required)'
                    : 'Add a video to your post (optional)'}
                </p>
                <MediaUpload
                  onImagesChange={() => {}}
                  onVideoChange={setVideoUrl}
                  maxImages={0}
                  allowVideo={true}
                  allowAttachments={false}
                />
              </div>
            )}

            {postType === 'AUDIO' && (
              <div>
                <Label>Audio File *</Label>
                <Input
                  type="url"
                  value={audioUrl || ''}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="Enter audio file URL or upload (coming soon)"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter URL to your podcast episode or audio file
                </p>
              </div>
            )}

            {postType === 'TEXT' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Blog Post Mode:</strong> Focus on your written content. 
                  Media uploads are optional for text-based posts.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="isPublic" className="text-base font-medium">
                  Public Post
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make this post visible to everyone (not just supporters)
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="published" className="text-base font-medium">
                  Publish Immediately
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uncheck to save as draft
                </p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  formData.published ? "Create & Publish" : "Save as Draft"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
