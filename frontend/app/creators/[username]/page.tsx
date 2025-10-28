"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { redirectToCheckout } from "@/lib/stripe";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import toast from "react-hot-toast";
import axios from "axios";
import { motion, useScroll, useTransform } from "framer-motion";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Users, Heart, Calendar, ExternalLink, Lock, CheckCircle2, Globe, Play, Video, Camera, Code, MessageCircle, Share2, Bookmark, Send, Rss, Mic, ShoppingBag, FileText, Award, Headphones, UserPlus } from "lucide-react";
import PollsList from "@/components/polls/PollsList";
import ProductCard from "@/components/products/ProductCard";
import { digitalProductsApi, type DigitalProduct } from "@/lib/api/digitalProducts";
import { postEngagementApi, followApi } from "@/lib/api";
import ArticleCard from "@/components/articles/ArticleCard";
import EventCard from "@/components/events/EventCard";

// Interfaces would be here
interface CreatorProfile {
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
    bannerImage?: string;
    creatorBio?: string;
    socialLinks?: any;
    createdAt: string;
    followerCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
  };
  campaign: any;
  tiers: any[];
}
interface CreatorPost { id: string; title: string; content: string; excerpt?: string; images: string[]; videoUrl?: string; isPublic: boolean; hasAccess: boolean; publishedAt: string; likeCount: number; commentCount: number; hasLiked?: boolean; author: { id: string; name: string; avatar?: string; }; }
interface Comment { id: string; content: string; createdAt: string; user: { name: string; avatar?: string; }; }
interface Article { id: string; slug: string; title: string; excerpt?: string; coverImage?: string; status: string; publishedAt?: string; viewCount: number; readTime?: number; author: any; _count?: any; }
interface Event { id: string; title: string; description: string; coverImage?: string; type: string; status: string; startTime: string; endTime: string; location?: string; virtualLink?: string; price?: number; _count?: any; }


export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("posts");

  const [dataLoading, setDataLoading] = useState<Record<string, boolean>>({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = currentUser?.id;

  const { scrollY } = useScroll();
  const bannerScale = useTransform(scrollY, [0, 300], [1, 1.2]);
  const bannerOpacity = useTransform(scrollY, [0, 300], [1, 0.5]);

  const tabs = useMemo(() => [
    { id: "posts", label: "Posts", icon: Rss },
    { id: "shop", label: "Shop", icon: ShoppingBag },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "podcast", label: "Podcast", icon: Headphones },
    { id: "events", label: "Events", icon: Calendar },
  ], []);

  const loadTabData = useCallback(async (tab: string) => {
    if (!profile) return;

    setDataLoading(prev => ({ ...prev, [tab]: true }));
    try {
      let response;
      switch (tab) {
        case "posts": {
          const token = localStorage.getItem("authToken");
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/posts/creator/${profile.user.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (response.data.success) {
            // Map isLiked to hasLiked for consistency
            const posts = (response.data.data.posts || []).map((post: any) => ({
              ...post,
              hasLiked: post.isLiked ?? post.hasLiked ?? false
            }));
            setPosts(posts);
          }
          break;
        }
        case "shop":
          const { success, data } = await digitalProductsApi.list({ creatorId: profile.user.id });
          if (success) setProducts(data);
          break;
        case "blog":
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/articles?authorId=${profile.user.id}`);
          if (response.data.success) setArticles(response.data.data || []);
          break;
        case "podcast":
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/podcasts?creatorId=${profile.user.id}`);
          if (response.data.success) setPodcasts(response.data.data || []);
          break;
        case "events":
          response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/events?hostId=${profile.user.id}`);
          if (response.data.success) setEvents(response.data.data || []);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab}:`, error);
      toast.error(`Failed to load ${tab}.`);
    } finally {
      setDataLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [profile]);

  useEffect(() => {
    const loadCreatorProfile = async () => {
      try {
        setIsLoading(true);
        const token = isAuthenticated() ? localStorage.getItem("authToken") : null;
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/creators/${username}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const userData = response.data;
        const followerCount = userData.followerCount ?? 0;
        const followingCount = userData.followingCount ?? 0;
        const isFollowingUser = userData.isFollowing ?? false;
        const profileData: CreatorProfile = {
          user: {
            id: userData.id,
            name: userData.name,
            username: userData.username ?? undefined,
            avatar: userData.avatar ?? undefined,
            bannerImage: null,
            creatorBio: userData.bio ?? undefined,
            socialLinks: {},
            createdAt: userData.createdAt ?? userData.created_at,
            followerCount,
            followingCount,
            isFollowing: isFollowingUser,
          },
          campaign: null,
          tiers: [],
        };
        setProfile(profileData);
        setIsFollowing(isFollowingUser);
        setFollowerCount(followerCount);
      } catch (error: any) {
        toast.error(error.message || "Creator not found");
        router.push("/explore");
      } finally {
        setIsLoading(false);
      }
    };
    loadCreatorProfile();
  }, [username, router]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (profile) {
      void loadTabData(activeTab);
    }
  }, [activeTab, loadTabData, profile]);

  const handlePostEngagementUpdate = useCallback((postId: string, updates: Partial<Pick<CreatorPost, "likeCount" | "commentCount" | "hasLiked">>) => {
    setPosts(prev => prev.map(post => post.id === postId ? { ...post, ...updates } : post));
  }, []);

  const handleToggleFollow = useCallback(async () => {
    if (!profile) return;

    if (!isAuthenticated()) {
      toast.error("Please login to follow creators");
      router.push(`/login?redirect=/creators/${username}`);
      return;
    }

    if (currentUserId === profile.user.id) {
      return;
    }

    try {
      setIsUpdatingFollow(true);
      if (isFollowing) {
        const response = await followApi.unfollow(profile.user.id);
        const updatedCount = response.data?.followerCount ?? Math.max(followerCount - 1, 0);
        setFollowerCount(updatedCount);
        setIsFollowing(false);
        setProfile(prev => prev ? {
          ...prev,
          user: {
            ...prev.user,
            followerCount: updatedCount,
            isFollowing: false,
          },
        } : prev);
        toast.success("Unfollowed");
      } else {
        const response = await followApi.follow(profile.user.id);
        const updatedCount = response.data?.followerCount ?? followerCount + 1;
        setFollowerCount(updatedCount);
        setIsFollowing(true);
        setProfile(prev => prev ? {
          ...prev,
          user: {
            ...prev.user,
            followerCount: updatedCount,
            isFollowing: true,
          },
        } : prev);
        toast.success(`Now following ${profile.user.name}`);
      }
    } catch (error: any) {
      console.error("Follow toggle failed:", error);
      const message = error.response?.data?.message || "Failed to update follow status";
      toast.error(message);
    } finally {
      setIsUpdatingFollow(false);
    }
  }, [profile, isFollowing, followerCount, currentUserId, router, username]);

  const handleSubscribe = async (tierId: string) => {
    if (!isAuthenticated()) {
      toast.error("Please login to subscribe");
      router.push(`/login?redirect=/creators/${username}`);
      return;
    }
    if (!profile) return;
    try {
      await redirectToCheckout(tierId, profile.user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    }
  };

  const getSocialIcon = (platform: string) => {
    const icons: { [key: string]: JSX.Element } = { twitter: <Rss className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />, github: <Github className="w-4 h-4" />, website: <Globe className="w-4 h-4" /> };
    return icons[platform] || <ExternalLink className="w-4 h-4" />;
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto max-w-6xl px-4 -mt-16">
          <div className="flex items-end gap-4">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
            <div className="py-4 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-6xl px-4 mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { user, tiers } = profile;
  const isOwnProfile = currentUserId === user.id;
  const bannerSrc = getFullMediaUrl(user.bannerImage);
  const avatarSrc = getFullMediaUrl(user.avatar);

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <BlurFade delay={0.25} inView>
        <div className="relative h-80 w-full overflow-hidden">
          <motion.div className="absolute inset-0" style={{ scale: bannerScale, opacity: bannerOpacity }}>
            {bannerSrc ? (
              <Image
                src={bannerSrc}
                alt={`${user.name}'s banner`}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#F92672]/40 via-[#AE81FF]/40 to-[#66D9EF]/40" />
            )}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container mx-auto max-w-6xl px-4 -mt-24 relative z-10">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={user.name}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-full border-4 border-background bg-muted object-cover shadow-lg"
                  priority
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-[#F92672]/70 via-[#AE81FF]/70 to-[#66D9EF]/70 text-4xl font-bold text-white shadow-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
            <div className="flex-1 py-4">
              <h1 className="text-4xl font-bold tracking-tight">{user.name}</h1>
              <p className="text-muted-foreground mt-1">@{user.username}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOwnProfile && (
                <Button
                  variant={isFollowing ? "outline" : "secondary"}
                  size="lg"
                  onClick={handleToggleFollow}
                  loading={isUpdatingFollow}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="icon"><Share2 className="w-4 h-4" /></Button>
              {!isOwnProfile && (
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={() => document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Heart className="w-4 h-4 mr-2" /> Support
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="font-bold text-foreground">{tiers.reduce((sum, tier) => sum + (tier.currentSubscribers || 0), 0)}</span> supporters
            </div>
            <div className="flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span className="font-bold text-foreground">{followerCount}</span> followers
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span className="font-bold text-foreground">{profile.campaign?.currentAmount?.toFixed(0) || 0}</span> raised
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-3">
              {user.socialLinks && Object.entries(user.socialLinks).map(([platform, url]) => url && (
                <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">{getSocialIcon(platform)}</a>
              ))}
            </div>
          </div>
        </div>
      </BlurFade>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column (Content) */}
          <div className="lg:col-span-2">
            <BlurFade delay={0.5} inView>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex h-auto flex-nowrap gap-2 overflow-x-auto border-b-0 bg-transparent p-0">
                  {tabs.map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-muted data-[state=active]:shadow-none -mb-px whitespace-nowrap rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold data-[state=active]:border-primary"
                    >
                      <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="pt-8">
                  {tabs.map(tab => (
                    <TabsContent key={tab.id} value={tab.id}>
                      {dataLoading[tab.id] ? <Skeleton className="w-full h-96" /> : renderTabContent(tab.id)}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </BlurFade>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:sticky top-24 space-y-8">
            <BlurFade delay={0.75} inView>
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle>About {user.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap line-clamp-5">
                    {user.creatorBio || "No biography provided."}
                  </p>
                </CardContent>
              </Card>
            </BlurFade>

            <BlurFade delay={0.9} inView>
              <div id="tiers">
                <TierSection tiers={tiers} onSubscribe={handleSubscribe} />
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </div>
  );

  function renderTabContent(tab: string) {
    const motionProps = { variants: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }, initial: "hidden", animate: "visible" };
    const itemProps = { variants: { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } } };

    switch (tab) {
      case "posts":
        return posts.length > 0 ? (
          <motion.div {...motionProps} className="space-y-8">
            {posts.map(post => (
              <motion.div key={post.id} {...itemProps}>
                <PostCard post={post} onEngagementUpdate={handlePostEngagementUpdate} />
              </motion.div>
            ))}
          </motion.div>
        ) : <EmptyState icon={Rss} message="No posts yet." />;
      case "shop":
        return products.length > 0 ? (
          <motion.div {...motionProps} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {products.map(p => <motion.div key={p.id} {...itemProps}><ProductCard product={p} /></motion.div>)}
          </motion.div>
        ) : <EmptyState icon={ShoppingBag} message="This shop is empty." />;
      case "blog":
        return articles.length > 0 ? (
          <motion.div {...motionProps} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map(article => <motion.div key={article.id} {...itemProps}><ArticleCard article={article} /></motion.div>)}
          </motion.div>
        ) : <EmptyState icon={FileText} message="No articles yet." />;
      case "podcast":
        return podcasts.length > 0 ? (
          <motion.div {...motionProps} className="space-y-6">
            {podcasts.map(podcast => <motion.div key={podcast.id} {...itemProps}><PodcastCard podcast={podcast} /></motion.div>)}
          </motion.div>
        ) : <EmptyState icon={Headphones} message="No podcasts yet." />;
      case "events":
        return events.length > 0 ? (
          <motion.div {...motionProps} className="space-y-6">
            {events.map(event => <motion.div key={event.id} {...itemProps}><EventCard event={event} /></motion.div>)}
          </motion.div>
        ) : <EmptyState icon={Calendar} message="No events scheduled." />;
      default:
        return null;
    }
  }
}

const PodcastCard = ({ podcast }: { podcast: any }) => (
  <Card className="bg-card/50 border-border/30 overflow-hidden dark:bg-gray-800/50 dark:border-gray-700/30">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Headphones className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{podcast.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{podcast.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{podcast.episodeCount || 0} episodes</span>
            <span>{podcast.totalDuration || '0 min'}</span>
            <span>{new Date(podcast.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Play className="w-4 h-4 mr-2" />
          Listen
        </Button>
      </div>
    </CardContent>
  </Card>
);

interface PostCardProps {
  post: CreatorPost;
  onEngagementUpdate?: (postId: string, updates: Partial<Pick<CreatorPost, "likeCount" | "commentCount" | "hasLiked">>) => void;
}

const PostCard = ({ post, onEngagementUpdate }: PostCardProps) => {
  const router = useRouter();
  const [liked, setLiked] = useState(post.hasLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    setLiked(post.hasLiked ?? false);
  }, [post.hasLiked]);

  useEffect(() => {
    setLikeCount(post.likeCount ?? 0);
  }, [post.likeCount]);

  useEffect(() => {
    setCommentCount(post.commentCount ?? 0);
  }, [post.commentCount]);

  const authorAvatar =
    getFullMediaUrl(post.author.avatar) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.author.name)}`;

  const redirectToLogin = () => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  const handleToggleLike = async () => {
    if (!isAuthenticated()) {
      toast.error("Please login to like posts");
      redirectToLogin();
      return;
    }

    if (isLiking) return;

    const previousLiked = liked;
    const previousCount = likeCount;

    setIsLiking(true);
    setLiked(!previousLiked);
    setLikeCount(previousCount + (previousLiked ? -1 : 1));

    try {
      const response = await postEngagementApi.toggleLike(post.id, previousLiked);

      if (!response.success) {
        throw new Error(response.message || "Failed to toggle like");
      }

      const nextLiked = response.liked;
      const updatedCount = response.data?.likeCount ?? (previousCount + (nextLiked ? 1 : -1));

      setLiked(nextLiked);
      setLikeCount(updatedCount);
      onEngagementUpdate?.(post.id, { likeCount: updatedCount, hasLiked: nextLiked });
    } catch (error) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const loadComments = async () => {
    if (hasLoadedComments || isLoadingComments) return;

    setIsLoadingComments(true);
    try {
      const response = await postEngagementApi.getComments(post.id);

      if (!response.success) {
        throw new Error(response.message || "Failed to load comments");
      }

      setComments(response.data);
      setHasLoadedComments(true);
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);

    if (next && !hasLoadedComments) {
      await loadComments();
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated()) {
      toast.error("Please login to comment");
      redirectToLogin();
      return;
    }

    if (!commentInput.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const content = commentInput.trim();

    try {
      const response = await postEngagementApi.addComment(post.id, content);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to add comment");
      }

      const newComment = response.data;
      setComments((prev) => [newComment, ...prev]);
      setCommentInput("");
      const updatedCount = commentCount + 1;
      setCommentCount(updatedCount);
      onEngagementUpdate?.(post.id, { commentCount: updatedCount });
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!post.hasAccess) {
    return (
      <div className="relative text-center p-8 sm:p-12 bg-muted/50 rounded-2xl border-2 border-dashed border-border/30 overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl animate-blob animation-delay-2000"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl animate-blob"></div>
        <Lock className="mx-auto w-10 h-10 text-primary mb-4" />
        <h3 className="font-bold text-xl text-foreground">Content Locked</h3>
        <p className="text-muted-foreground mt-2 mb-6 text-sm max-w-sm mx-auto">This post is exclusive to members. Support the creator to unlock this post and many others!</p>
        <Button onClick={() => document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' })}>
          <Award className="w-4 h-4 mr-2" /> Become a Supporter
        </Button>
      </div>
    );
  }

  return (
    <Card className="bg-card/50 border-border/30 overflow-hidden dark:bg-gray-800/50 dark:border-gray-700/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Image
            src={authorAvatar}
            alt={post.author.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full bg-muted object-cover"
          />
          <div>
            <p className="font-semibold text-foreground dark:text-gray-100">{post.author.name}</p>
            <p className="text-xs text-muted-foreground dark:text-gray-400">{new Date(post.publishedAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h2 className="text-2xl font-bold leading-snug mb-4 text-gray-900 dark:text-gray-100">{post.title}</h2>

        {/* Content: Text, Images, Video */}
        <div className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap line-clamp-6">
            {post.content}
          </div>
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {post.images.slice(0, 4).map((img, i) => {
                const imageSrc = getFullMediaUrl(img) || img;
                const isHero = post.images.length > 2 && i === 0;
                return (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-lg ${isHero ? 'col-span-2 aspect-[16/9]' : 'aspect-video'}`}
                  >
                    <Image
                      src={imageSrc}
                      alt={`Post image ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes={isHero ? "(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw" : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {post.videoUrl && <video controls src={getFullMediaUrl(post.videoUrl)} className="w-full rounded-lg bg-muted" />}
        </div>

        {/* Engagement Bar */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/20 dark:border-gray-700/20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 ${liked ? 'text-red-500' : 'text-muted-foreground dark:text-gray-400'}`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {likeCount}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToggleComments} className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-400">
              <MessageCircle className="w-4 h-4" /> {commentCount}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground dark:text-gray-400"><Bookmark className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground dark:text-gray-400"><Share2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Comments Section (Toggled) */}
        {showComments && (
          <div className="pt-6 mt-6 border-t border-border/20 space-y-4">
            <h4 className="font-semibold">Comments</h4>
            {isAuthenticated() ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Share your thoughts..."
                  className="bg-muted/50"
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={handleSubmitComment} disabled={isSubmittingComment || !commentInput.trim()}>
                    {isSubmittingComment ? "Posting..." : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">
                Login to join the discussion.
              </div>
            )}

            {isLoadingComments ? (
              <div className="text-sm text-muted-foreground">Loading comments...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2 text-sm">
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image
                        src={
                          getFullMediaUrl(comment.user.avatar) ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.user.name)}`
                        }
                        alt={comment.user.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{comment.user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TierSection = ({ tiers, onSubscribe }: { tiers: any[], onSubscribe: (id: string) => void }) => (
  <Card className="border-border/30">
    <CardHeader>
      <CardTitle>Become a Supporter</CardTitle>
      <CardDescription>Choose a tier to support the creator and get exclusive perks.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {tiers.length > 0 ? tiers.map(tier => (
        <div key={tier.id} className="border border-border/30 rounded-lg p-4 hover:bg-muted/50 transition-colors">
          <h3 className="font-bold">{tier.name}</h3>
          <p className="text-2xl font-bold">${tier.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tier.description}</p>
          <Button variant="outline" className="w-full mt-4" onClick={() => onSubscribe(tier.id)}>Subscribe</Button>
        </div>
      )) : <p className="text-sm text-muted-foreground text-center py-4">No membership tiers available.</p>}
    </CardContent>
  </Card>
);

const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType, message: string }) => (
  <div className="text-center py-16 bg-muted/50 rounded-lg border-2 border-dashed border-border/30">
    <Icon className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
    <h3 className="font-semibold text-lg">{message}</h3>
    <p className="text-sm text-muted-foreground">Check back later for new content!</p>
  </div>
);

// Dummy icons for social links
const Youtube = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" /><path d="m10 15 5-3-5-3z" /></svg>;
const Instagram = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>;
const Github = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>;
