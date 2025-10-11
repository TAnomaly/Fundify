"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPost, setIsLoadingPost] = useState(true);
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

    useEffect(() => {
        loadPost();
    }, [postId]);

    const loadPost = async () => {
        try {
            const response = await creatorPostApi.getById(postId);
            if (response.success && response.data) {
                const post = response.data;
                setFormData({
                    title: post.title,
                    content: post.content,
                    excerpt: post.excerpt || "",
                    isPublic: post.isPublic,
                    published: post.published,
                });
                setPostType((post.type as PostType) || 'TEXT');
                setImages(post.images || []);
                setVideoUrl(post.videoUrl || null);
                setAudioUrl(post.audioUrl || null);
            }
        } catch (error: any) {
            toast.error("Failed to load post");
            router.push("/creator-dashboard/posts");
        } finally {
            setIsLoadingPost(false);
        }
    };

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
            };

            const response = await creatorPostApi.update(postId, postData);

            if (response.success) {
                toast.success("Post updated successfully!");
                router.push("/creator-dashboard/posts");
            } else {
                toast.error(response.message || "Failed to update post");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update post");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingPost) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading post...</p>
                </div>
            </div>
        );
    }

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
                    Back
                </button>
                <h1 className="text-4xl font-bold mb-2 text-gradient">Edit Post</h1>
                <p className="text-gray-600 dark:text-gray-400">Update your post content</p>
            </div>

            <Card className="bg-glass-card shadow-soft">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Post Type Selector */}
                        <div>
                            <Label htmlFor="postType">Content Type *</Label>
                            <select
                                id="postType"
                                value={postType}
                                onChange={(e) => setPostType(e.target.value as PostType)}
                                className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            >
                                {POST_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label} - {type.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="title">Post Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="excerpt">Excerpt</Label>
                            <Input
                                id="excerpt"
                                value={formData.excerpt}
                                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="mt-2 min-h-[300px]"
                                required
                            />
                        </div>

                        {/* Media */}
                        <div>
                            <Label>Media Attachments</Label>
                            <MediaUpload
                                onImagesChange={setImages}
                                onVideoChange={setVideoUrl}
                                maxImages={10}
                                allowVideo={true}
                                allowAttachments={false}
                            />
                        </div>

                        {postType === 'AUDIO' && (
                            <div>
                                <Label>Audio URL</Label>
                                <Input
                                    type="url"
                                    value={audioUrl || ''}
                                    onChange={(e) => setAudioUrl(e.target.value)}
                                    placeholder="Enter audio file URL"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Label htmlFor="isPublic">Public Post</Label>
                            <Switch
                                id="isPublic"
                                checked={formData.isPublic}
                                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit" disabled={isLoading} className="flex-1">
                                {isLoading ? "Updating..." : "Update Post"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

