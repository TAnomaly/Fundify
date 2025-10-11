"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { redirectToCheckout } from "@/lib/stripe";
import { isAuthenticated } from "@/lib/auth";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Users,
  Heart,
  Calendar,
  ExternalLink,
  Lock,
  CheckCircle2,
  Globe,
  Play,
  Video,
  Camera,
  Code,
} from "lucide-react";

interface CreatorProfile {
  user: {
    id: string;
    name: string;
    avatar?: string;
    creatorBio?: string;
    socialLinks?: {
      twitter?: string;
      youtube?: string;
      instagram?: string;
      github?: string;
      website?: string;
    };
    createdAt: string;
  };
  campaign: {
    id: string;
    slug: string;
    title: string;
    description: string;
    story: string;
    coverImage: string;
    currentAmount: number;
  };
  tiers: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    interval: "MONTHLY" | "YEARLY";
    perks: string[];
    hasExclusiveContent: boolean;
    hasEarlyAccess: boolean;
    hasPrioritySupport: boolean;
    currentSubscribers: number;
    maxSubscribers?: number;
  }>;
}

interface CreatorPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  images: string[];
  videoUrl?: string;
  isPublic: boolean;
  hasAccess: boolean;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  useEffect(() => {
    loadCreatorProfile();
  }, [username]);

  useEffect(() => {
    if (activeTab === "posts" && profile && posts.length === 0) {
      loadCreatorPosts();
    }
  }, [activeTab, profile]);

  const loadCreatorProfile = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/users/creator/${username}`
      );

      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error: any) {
      console.error("Error loading creator profile:", error);
      toast.error(error.response?.data?.message || "Creator not found");
      router.push("/campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreatorPosts = async () => {
    if (!profile) return;

    try {
      setPostsLoading(true);
      const token = localStorage.getItem("authToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/posts/creator/${profile.user.id}`,
        { headers }
      );

      if (response.data.success) {
        setPosts(response.data.data.posts || []);
        setHasSubscription(response.data.data.hasSubscription || false);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setPostsLoading(false);
    }
  };

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
    switch (platform) {
      case "twitter":
        return <Play className="w-5 h-5" />;
      case "youtube":
        return <Video className="w-5 h-5" />;
      case "instagram":
        return <Camera className="w-5 h-5" />;
      case "github":
        return <Code className="w-5 h-5" />;
      case "website":
        return <Globe className="w-5 h-5" />;
      default:
        return <ExternalLink className="w-5 h-5" />;
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Skeleton className="h-64 w-full mb-8 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero Section */}
        <Card className="shadow-2xl mb-8 overflow-hidden">
          {/* Cover Image */}
          <div
            className="h-48 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 relative"
            style={{
              backgroundImage: `url(${profile.campaign.coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/40"></div>
          </div>

          <CardContent className="pt-0 pb-8">
            {/* Avatar & Name */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 relative z-10">
              <div className="relative">
                {profile.user.avatar ? (
                  <img
                    src={profile.user.avatar}
                    alt={profile.user.name}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold">
                    {profile.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{profile.user.name}</h1>
                <p className="text-muted-foreground mb-4">
                  {profile.campaign.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold">
                      {profile.tiers.reduce(
                        (sum, tier) => sum + tier.currentSubscribers,
                        0
                      )}
                    </span>
                    <span className="text-muted-foreground">subscribers</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <span className="font-semibold">
                      ${profile.campaign.currentAmount.toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">raised</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-muted-foreground">
                      Joined {formatDate(profile.user.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Social Links */}
                {profile.user.socialLinks && (
                  <div className="flex gap-3 mt-4">
                    {Object.entries(profile.user.socialLinks).map(
                      ([platform, url]) =>
                        url && (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-gray-100 hover:bg-purple-100 transition-colors"
                          >
                            {getSocialIcon(platform)}
                          </a>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="tiers">Membership</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>About {profile.user.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-lg whitespace-pre-wrap">
                    {profile.user.creatorBio || profile.campaign.story}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Tiers Tab */}
          <TabsContent value="tiers">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold mb-2">
                Support <span className="text-gradient">{profile.user.name}</span>
              </h2>
              <p className="text-muted-foreground">
                Choose a membership tier to get exclusive perks and support their work
              </p>
            </div>

            {profile.tiers.length === 0 ? (
              <Card className="shadow-xl">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No membership tiers available yet. Check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.tiers.map((tier) => (
                  <Card
                    key={tier.id}
                    className="shadow-xl hover:shadow-2xl transition-all border-2 hover:border-purple-500"
                  >
                    <CardHeader>
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      <CardDescription>{tier.description}</CardDescription>
                      <div className="pt-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">
                            ${tier.price}
                          </span>
                          <span className="text-muted-foreground">
                            /{tier.interval === "MONTHLY" ? "month" : "year"}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Perks List */}
                      <div className="space-y-3 mb-6">
                        {tier.perks.map((perk, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{perk}</span>
                          </div>
                        ))}
                        {tier.hasExclusiveContent && (
                          <div className="flex items-start gap-2">
                            <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Exclusive content access</span>
                          </div>
                        )}
                        {tier.hasEarlyAccess && (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Early access to content</span>
                          </div>
                        )}
                        {tier.hasPrioritySupport && (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-pink-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">Priority support</span>
                          </div>
                        )}
                      </div>

                      {/* Subscribe Button */}
                      <Button
                        variant="gradient"
                        className="w-full"
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={
                          tier.maxSubscribers
                            ? tier.currentSubscribers >= tier.maxSubscribers
                            : false
                        }
                      >
                        {tier.maxSubscribers &&
                          tier.currentSubscribers >= tier.maxSubscribers
                          ? "Tier Full"
                          : "Subscribe"}
                      </Button>

                      {/* Subscriber Count */}
                      <p className="text-xs text-center text-muted-foreground mt-3">
                        {tier.currentSubscribers}{" "}
                        {tier.currentSubscribers === 1 ? "subscriber" : "subscribers"}
                        {tier.maxSubscribers && ` / ${tier.maxSubscribers} max`}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  Posts from <span className="text-gradient">{profile.user.name}</span>
                </h2>
                {hasSubscription && (
                  <Badge variant="default" className="mt-2">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active Subscriber
                  </Badge>
                )}
              </div>
            </div>

            {postsLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="shadow-xl">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No posts yet. Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className={`overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ${
                      !post.hasAccess
                        ? "border-2 border-purple-300 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20"
                        : "hover:-translate-y-1"
                    }`}
                  >
                    {/* Post Header */}
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Author Info */}
                        <div className="flex items-center gap-3 flex-1">
                          {post.author.avatar ? (
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-12 h-12 rounded-full border-2 border-purple-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                              {post.author.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-2xl font-bold mb-1 line-clamp-2">
                              {post.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-medium">{post.author.name}</span>
                              <span>•</span>
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badge */}
                        {!post.isPublic && (
                          <Badge 
                            variant="secondary" 
                            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-200 dark:border-purple-700"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="font-medium">Members Only</span>
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {post.hasAccess ? (
                        <div className="space-y-6">
                          {/* Content */}
                          <div className="prose prose-lg max-w-none dark:prose-invert">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {post.content}
                            </p>
                          </div>

                          {/* Video Player */}
                          {post.videoUrl && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Video className="w-4 h-4" />
                                <span>Video</span>
                              </div>
                              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
                                <video
                                  controls
                                  className="w-full aspect-video object-contain"
                                  preload="metadata"
                                  controlsList="nodownload"
                                >
                                  <source src={getFullMediaUrl(post.videoUrl)} type="video/mp4" />
                                  <source src={getFullMediaUrl(post.videoUrl)} type="video/webm" />
                                  <source src={getFullMediaUrl(post.videoUrl)} type="video/ogg" />
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            </div>
                          )}

                          {/* Image Gallery - Always show if images exist */}
                          {post.images.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Camera className="w-4 h-4" />
                                <span>{post.images.length} {post.images.length === 1 ? 'Image' : 'Images'}</span>
                              </div>
                              <div className={`grid gap-4 ${
                                post.images.length === 1 
                                  ? "grid-cols-1" 
                                  : post.images.length === 2 
                                  ? "grid-cols-2" 
                                  : "grid-cols-2 md:grid-cols-3"
                              }`}>
                                {post.images.map((image, idx) => (
                                  <div
                                    key={idx}
                                    className="relative group overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
                                  >
                                    <img
                                      src={getFullMediaUrl(image)}
                                      alt={`${post.title} - Image ${idx + 1}`}
                                      className="w-full h-full object-cover aspect-video group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                                      loading="lazy"
                                    />
                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/90 rounded-full p-2">
                                        <ExternalLink className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Engagement Bar */}
                          <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                              <Heart className="w-5 h-5" />
                              <span className="text-sm font-medium">Like</span>
                            </button>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Globe className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                {post.isPublic ? "Public" : "Members Only"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative overflow-hidden">
                          {/* Blurred Preview */}
                          {post.excerpt && (
                            <div className="relative mb-6">
                              <p className="text-gray-600 dark:text-gray-400 blur-sm select-none">
                                {post.excerpt}
                              </p>
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-900"></div>
                            </div>
                          )}

                          {/* Locked Content CTA */}
                          <div className="text-center py-16 px-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700">
                            <div className="relative inline-block mb-6">
                              <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-30 animate-pulse"></div>
                              <Lock className="relative w-20 h-20 text-purple-600 dark:text-purple-400 mx-auto" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              Exclusive Members Content
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
                              {post.excerpt || "Unlock this premium content and get access to exclusive posts, updates, and behind-the-scenes material"}
                            </p>
                            <Button
                              variant="gradient"
                              size="lg"
                              onClick={() => setActiveTab("tiers")}
                              className="shadow-lg hover:shadow-xl transition-shadow"
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Unlock with Membership
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
