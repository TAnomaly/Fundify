"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import axios from "axios";
import toast from "react-hot-toast";
import {
    Heart,
    MessageCircle,
    Calendar,
    Clock,
    Eye,
    ArrowLeft,
    User,
    Tag as TagIcon,
    Share2,
} from "lucide-react";
import SocialShare from "@/components/SocialShare";

interface Article {
    id: string;
    slug: string;
    title: string;
    content: string;
    excerpt: string;
    coverImage?: string;
    publishedAt: string;
    readTime: number;
    viewCount: number;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    categories: Array<{
        category: {
            name: string;
            color?: string;
        };
    }>;
    tags: Array<{
        tag: {
            name: string;
        };
    }>;
    _count: {
        likes: number;
        comments: number;
    };
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        name: string;
        avatar?: string;
    };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
    const router = useRouter();
    const [article, setArticle] = useState<Article | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    useEffect(() => {
        loadArticle();
    }, [params.slug]);

    const loadArticle = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const response = await axios.get(`${apiUrl}/articles/${params.slug}`);

            if (response.data.success) {
                const articleData = response.data.data;
                setArticle(articleData);
                setLikeCount(articleData._count?.likes || 0);

                // Check if user liked this article
                if (isAuthenticated()) {
                    const token = localStorage.getItem("authToken");
                    const likedResponse = await axios.get(`${apiUrl}/articles/likes`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const likedArticleIds = likedResponse.data.data.map((like: any) => like.articleId);
                    setIsLiked(likedArticleIds.includes(articleData.id));
                }
            }
        } catch (error: any) {
            console.error("Load article error:", error);
            toast.error("Failed to load article");
        } finally {
            setIsLoading(false);
        }
    };

    const loadComments = async () => {
        if (!article) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const response = await axios.get(`${apiUrl}/articles/${article.id}/comments`);

            if (response.data.success) {
                setComments(response.data.data);
            }
        } catch (error) {
            console.error("Load comments error:", error);
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated()) {
            toast.error("Please login to like articles");
            router.push("/login");
            return;
        }

        if (!article) return;

        const wasLiked = isLiked;
        const originalCount = likeCount;

        // Optimistic update
        setIsLiked(!wasLiked);
        setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);

        try {
            const token = localStorage.getItem("authToken");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

            await axios.post(
                `${apiUrl}/articles/${article.id}/like`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            // Revert on error
            setIsLiked(wasLiked);
            setLikeCount(originalCount);
            toast.error("Failed to update like");
        }
    };

    const handleComment = async () => {
        if (!isAuthenticated()) {
            toast.error("Please login to comment");
            router.push("/login");
            return;
        }

        if (!newComment.trim() || !article) return;

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem("authToken");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

            await axios.post(
                `${apiUrl}/articles/${article.id}/comments`,
                { content: newComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNewComment("");
            toast.success("Comment added!");
            loadComments();
        } catch (error) {
            console.error("Comment error:", error);
            toast.error("Failed to add comment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <Skeleton className="h-12 w-32 mb-8" />
                    <Skeleton className="h-96 w-full mb-8" />
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 py-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
                    <Button onClick={() => router.push("/blog")}>← Back to Blog</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Hero with Cover Image */}
            {article.coverImage && (
                <div
                    className="h-96 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${article.coverImage})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                        <div className="max-w-4xl mx-auto">
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                className="mb-4 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 py-12">
                {!article.coverImage && (
                    <Button variant="outline" onClick={() => router.back()} className="mb-8">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                )}

                {/* Article Header */}
                <article>
                    <header className="mb-8">
                        {/* Categories */}
                        {article.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {article.categories.map((cat, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 rounded-full text-sm font-semibold"
                                        style={{
                                            backgroundColor: cat.category.color || "#6366f1",
                                            color: "white",
                                        }}
                                    >
                                        {cat.category.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Title */}
                        <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                            {article.title}
                        </h1>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 mb-6">
                            <div className="flex items-center gap-2">
                                {article.author.avatar ? (
                                    <img
                                        src={article.author.avatar}
                                        alt={article.author.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                        {article.author.name[0]}
                                    </div>
                                )}
                                <span className="font-semibold">{article.author.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(article.publishedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{article.readTime} min read</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                <span>{article.viewCount} views</span>
                            </div>
                        </div>

                        {/* Engagement Bar */}
                        <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLike}
                                className={isLiked ? "text-red-500 border-red-500" : ""}
                            >
                                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                                {likeCount}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowComments(!showComments);
                                    if (!showComments) loadComments();
                                }}
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                {article._count.comments}
                            </Button>
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowShareMenu(!showShareMenu)}
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                                {showShareMenu && (
                                    <div className="absolute top-full mt-2 z-50">
                                        <SocialShare
                                            url={typeof window !== "undefined" ? window.location.href : ""}
                                            title={article.title}
                                            description={article.excerpt}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Article Content */}
                    <div
                        className="prose prose-lg dark:prose-invert max-w-none mb-12"
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />

                    {/* Tags */}
                    {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                            <TagIcon className="w-5 h-5 text-gray-500" />
                            {article.tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300"
                                >
                                    #{tag.tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Comments Section */}
                    {showComments && (
                        <div className="mt-12">
                            <h3 className="text-2xl font-bold mb-6">Comments ({article._count.comments})</h3>

                            {/* Add Comment */}
                            {isAuthenticated() ? (
                                <div className="mb-8">
                                    <Textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Share your thoughts..."
                                        className="mb-3"
                                    />
                                    <Button onClick={handleComment} disabled={isSubmitting || !newComment.trim()}>
                                        {isSubmitting ? "Posting..." : "Post Comment"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                                    <p className="mb-3">Please login to comment</p>
                                    <Button onClick={() => router.push("/login")}>Login</Button>
                                </div>
                            )}

                            {/* Comments List */}
                            <div className="space-y-4">
                                {comments.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">
                                        No comments yet. Be the first to comment!
                                    </p>
                                ) : (
                                    comments.map((comment) => (
                                        <Card key={comment.id}>
                                            <CardContent className="p-4">
                                                <div className="flex gap-3">
                                                    {comment.user.avatar ? (
                                                        <img
                                                            src={comment.user.avatar}
                                                            alt={comment.user.name}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                            {comment.user.name[0]}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold">{comment.user.name}</span>
                                                            <span className="text-sm text-gray-500">
                                                                {formatDate(comment.createdAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </article>
            </div>
        </div>
    );
}

