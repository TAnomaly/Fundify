"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, useScroll, useTransform } from "framer-motion";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import SocialShare from "@/components/SocialShare";
import {
    Heart, MessageCircle, Calendar, Clock, Eye, ArrowLeft, Send, Share2
} from "lucide-react";

// Interfaces
interface Article { id: string; slug: string; title: string; content: string; excerpt: string; coverImage?: string; publishedAt: string; readTime: number; viewCount: number; hasLiked?: boolean; author: { id: string; name: string; avatar?: string; }; _count: { likes: number; comments: number; }; }
interface Comment { id: string; content: string; createdAt: string; user: { name: string; avatar?: string; }; }

export default function ArticlePage({ params }: { params: { slug: string } }) {
    const router = useRouter();
    const [article, setArticle] = useState<Article | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { scrollY } = useScroll();
    const heroImageY = useTransform(scrollY, [0, 400], [0, -100]);
    const heroImageScale = useTransform(scrollY, [0, 400], [1, 1.1]);

    const loadArticleAndComments = useCallback(async (isInitialLoad = false) => {
        try {
            if (isInitialLoad) {
                setIsLoading(true);
            }
            const token = isAuthenticated() ? localStorage.getItem("authToken") : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const cacheBuster = `_=${new Date().getTime()}`;

            // 1) Fetch article by slug
            const articleResponse = await axios.get(`${apiUrl}/articles/${params.slug}?${cacheBuster}`, { headers });
            if (articleResponse.data.success) {
                const articleData = articleResponse.data.data;
                setArticle(articleData);
                setLikeCount(articleData._count?.likes || 0);
                setIsLiked(articleData.hasLiked || false);

                // 2) Fetch comments by article ID (backend expects :id, not slug)
                const commentsResponse = await axios.get(`${apiUrl}/articles/${articleData.id}/comments?${cacheBuster}`, { headers });
                if (commentsResponse.data.success) {
                    setComments(commentsResponse.data.data);
                }
            }
        } catch (error: any) {
            if (isInitialLoad) {
                toast.error("Failed to load article.");
                router.push("/blog");
            }
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [params.slug, router]);

    useEffect(() => {
        loadArticleAndComments(true);
    }, [loadArticleAndComments]);

    const handleLike = async () => {
        if (!isAuthenticated() || !article) return toast.error("Please login to like articles");
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);
        try {
            const token = localStorage.getItem("authToken");
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/articles/${article.id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            setIsLiked(wasLiked);
            setLikeCount(likeCount);
            toast.error("Failed to update like.");
        }
    };

    const handleComment = async () => {
        if (!isAuthenticated() || !article) return toast.error("Please login to comment");
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/articles/${article.id}/comments`, { content: newComment }, { headers: { Authorization: `Bearer ${token}` } });
            if (response.data.success) {
                toast.success("Comment added!");
                setNewComment("");
                // Re-fetch all data to ensure UI is in sync
                await loadArticleAndComments();
            }
        } catch (error) {
            toast.error("Failed to add comment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <ArticleSkeleton />;
    if (!article) return <div>Article not found</div>;

    return (
        <div className="bg-background min-h-screen">
            {/* Floating Action Bar */}
            <aside className="fixed top-1/2 -translate-y-1/2 left-4 z-30 hidden lg:flex flex-col items-center gap-4 p-2 bg-card/50 backdrop-blur-sm border border-border/30 rounded-full">
                <Button variant="ghost" size="icon" onClick={handleLike} className={`${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                <span className="text-xs font-bold">{likeCount}</span>
                <div className="w-full h-[1px] bg-border/50"></div>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}>
                    <MessageCircle className="w-5 h-5" />
                </Button>
                <span className="text-xs font-bold">{comments.length}</span>
                <div className="w-full h-[1px] bg-border/50"></div>
                <SocialShare url={window.location.href} title={article.title} description={article.excerpt} trigger={<Button variant="ghost" size="icon" className="text-muted-foreground"><Share2 className="w-5 h-5" /></Button>} />
            </aside>

            {/* Header */}
            <header className="relative h-[45vh] min-h-[300px] w-full overflow-hidden">
                <motion.div style={{ y: heroImageY, scale: heroImageScale }} className="absolute inset-0">
                    <Image src={getFullMediaUrl(article.coverImage)!} alt={article.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </motion.div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-4xl mx-auto">
                        <BlurFade delay={0.25} inView>
                            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-4">{article.title}</h1>
                            <div className="flex items-center gap-4">
                                <Image src={getFullMediaUrl(article.author.avatar)!} alt={article.author.name} width={48} height={48} className="rounded-full bg-muted" />
                                <div>
                                    <p className="font-semibold text-foreground">{article.author.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; {article.readTime} min read
                                    </p>
                                </div>
                            </div>
                        </BlurFade>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-8 py-12">
                <BlurFade delay={0.5} inView>
                    <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
                </BlurFade>

                {/* Comments Section */}
                <BlurFade delay={0.75} inView>
                    <section id="comments" className="mt-16 pt-8 border-t border-border/30">
                        <h2 className="text-2xl font-bold mb-6">Comments ({comments.length})</h2>
                        {isAuthenticated() ? (
                            <div className="flex items-start gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Join the discussion..." />
                                    <Button onClick={handleComment} disabled={isSubmitting}>{isSubmitting ? "Posting..." : "Post Comment"}</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-6 bg-muted/50 rounded-lg border border-dashed border-border/30">
                                <p className="mb-3">Want to join the discussion?</p>
                                <Button onClick={() => router.push(`/login?redirect=/blog/${article.slug}`)}>Login to Comment</Button>
                            </div>
                        )}
                        <div className="space-y-6">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex items-start gap-3">
                                    <Image src={getFullMediaUrl(comment.user.avatar)!} alt={comment.user.name} width={40} height={40} className="rounded-full bg-muted" />
                                    <div className="flex-1 bg-muted/50 p-4 rounded-lg">
                                        <p className="font-semibold text-sm">{comment.user.name}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                                        <p className="mt-2">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </BlurFade>
            </main>
        </div>
    );
}

const ArticleSkeleton = () => (
    <div className="min-h-screen bg-background">
        <Skeleton className="h-[45vh] w-full" />
        <div className="max-w-4xl mx-auto px-8 py-12">
            <div className="space-y-4 mb-8">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="space-y-2">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className={`h-4 w-full ${i % 3 === 0 ? 'w-5/6' : i % 3 === 1 ? 'w-11/12' : ''}`} />)}
            </div>
        </div>
    </div>
);
