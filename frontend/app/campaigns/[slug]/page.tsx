"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import { campaignApi, donationApi } from "@/lib/api";
import { Campaign, PaymentMethod } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";
import toast from "react-hot-toast";

// Mock campaign data
const mockCampaign = {
  id: "1",
  title: "Revolutionary Solar-Powered Water Purifier",
  slug: "solar-water-purifier",
  description: "Bringing clean water to remote communities using renewable energy technology.",
  story: `
    <h2>The Problem</h2>
    <p>Over 2 billion people worldwide lack access to clean drinking water. Traditional water purification methods require electricity or frequent filter replacements, making them impractical for remote communities.</p>

    <h2>Our Solution</h2>
    <p>We've developed a revolutionary solar-powered water purification system that requires no electricity, no filter replacements, and minimal maintenance. Using advanced UV purification technology powered entirely by solar energy, our system can purify up to 100 liters of water per day.</p>

    <h2>How It Works</h2>
    <p>Our purifier uses a three-stage process:</p>
    <ul>
      <li>Solar-powered UV purification eliminates 99.99% of bacteria and viruses</li>
      <li>Advanced filtration removes sediment and particles</li>
      <li>Mineral retention ensures healthy, great-tasting water</li>
    </ul>

    <h2>Impact</h2>
    <p>With your support, we can manufacture and distribute 500 units to communities in need across Africa and Southeast Asia. Each unit will provide clean water to approximately 50 people, impacting 25,000 lives.</p>
  `,
  goal: 50000,
  currentAmount: 37500,
  category: "technology",
  imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  createdAt: "2024-01-01",
  backers: 342,
  creator: {
    id: "1",
    username: "cleanwater",
    firstName: "Sarah",
    lastName: "Johnson",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Johnson&background=667eea&color=fff",
    bio: "Environmental engineer passionate about sustainable water solutions",
  },
};

const donationAmounts = [10, 25, 50, 100, 250, 500];

// Helper function to convert YouTube URLs to embed format
const getEmbedUrl = (url: string): string => {
  if (!url) return "";

  // If it's already an embed URL, return as is
  if (url.includes("embed")) return url;

  // YouTube watch URL
  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  // YouTube short URL
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  // Vimeo URL
  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }

  return url;
};

export default function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDonating, setIsDonating] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [donationMessage, setDonationMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "updates" | "comments">("story");

  const loadCampaign = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Loading campaign with slug:", resolvedParams.slug);
      const response = await campaignApi.getBySlug(resolvedParams.slug);
      console.log("📡 Campaign API response:", response);
      
      if (response.success && response.data) {
        console.log("✅ Campaign loaded successfully:", response.data);
        setCampaign(response.data);
      } else {
        console.error("❌ Campaign not found in API response");
        toast.error("Campaign not found");
        router.push("/campaigns");
      }
    } catch (error) {
      console.error("❌ Failed to load campaign:", error);
      console.log("🔄 Using mock data as fallback");
      // Use mock data as fallback
      setCampaign(mockCampaign as any);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.slug, router]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const campaignData = campaign || mockCampaign;
  const percentage = calculatePercentage(campaignData.currentAmount, campaignData.goal);
  const remaining = campaignData.goal - campaignData.currentAmount;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleDonate = async () => {
    // Check authentication
    if (!isAuthenticated()) {
      toast.error("Please login to make a donation");
      router.push("/login");
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    if (amount < 1) {
      toast.error("Minimum donation amount is $1");
      return;
    }

    setIsDonating(true);
    try {
      const response = await donationApi.create(campaignData.id, {
        amount,
        message: donationMessage || undefined,
        anonymous: isAnonymous,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      if (response.success && response.data) {
        toast.success(`Thank you for your donation of ${formatCurrency(amount)}!`);

        // Reset form
        setSelectedAmount(null);
        setCustomAmount("");
        setDonationMessage("");
        setIsAnonymous(false);

        // Reload campaign to show updated stats
        await loadCampaign();
      } else {
        toast.error(response.error || "Donation failed. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Donation failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsDonating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-primary mx-auto mb-4"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <img
          src={campaignData.imageUrl}
          alt={campaignData.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-purple-700 capitalize mb-4">
              {campaignData.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {campaignData.title}
            </h1>
            <p className="text-lg text-white/90">
              {campaignData.description}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Creator Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={campaignData.creator?.avatar || `https://ui-avatars.com/api/?name=${campaignData.creator?.firstName || campaignData.creator?.username || 'Creator'}&background=667eea&color=fff`}
                    alt={campaignData.creator?.firstName || campaignData.creator?.username || "Creator"}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {campaignData.creator?.firstName && campaignData.creator?.lastName
                        ? `${campaignData.creator.firstName} ${campaignData.creator.lastName}`
                        : campaignData.creator?.username || "Creator"
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      @{campaignData.creator?.username || "creator"}
                    </p>
                    {campaignData.creator?.bio && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaignData.creator.bio}
                      </p>
                    )}
                  </div>
                  <Button variant="outline">Follow</Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab("story")}
                  className={`pb-4 text-sm font-medium transition-colors ${activeTab === "story"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Campaign Story
                </button>
                <button
                  onClick={() => setActiveTab("updates")}
                  className={`pb-4 text-sm font-medium transition-colors ${activeTab === "updates"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Updates
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`pb-4 text-sm font-medium transition-colors ${activeTab === "comments"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Comments
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "story" && (
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  {campaignData.videoUrl && (
                    <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        width="100%"
                        height="450"
                        src={getEmbedUrl(campaignData.videoUrl)}
                        title="Campaign video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-foreground/80 dark:text-foreground/90 leading-relaxed">
                    {campaignData.story || campaignData.description}
                  </div>
                </div>
              )}

              {activeTab === "updates" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>No updates yet</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        The creator hasn&apos;t posted any updates yet. Check back soon!
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "comments" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <textarea
                          placeholder="Leave a comment..."
                          className="w-full p-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          rows={4}
                        />
                        <Button>Post Comment</Button>
                      </div>
                      <p className="text-muted-foreground text-center py-8">
                        No comments yet. Be the first to comment!
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Donation Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 shadow-lg">
              <CardContent className="p-6 space-y-6">
                {/* Progress */}
                <div>
                  <div className="text-3xl font-bold text-gradient mb-2">
                    {formatCurrency(campaignData.currentAmount)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    raised of {formatCurrency(campaignData.goal)} goal
                  </p>

                  <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-primary transition-all duration-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-bold text-lg">{campaignData.backers || 0}</div>
                      <div className="text-muted-foreground">backers</div>
                    </div>
                    <div>
                      <div className="font-bold text-lg">15</div>
                      <div className="text-muted-foreground">days left</div>
                    </div>
                  </div>
                </div>

                {/* Donation Amounts */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Select amount
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {donationAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleAmountSelect(amount)}
                        className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${selectedAmount === amount
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                          }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                      min="1"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Add a message (optional)
                  </label>
                  <textarea
                    placeholder="Say something nice..."
                    value={donationMessage}
                    onChange={(e) => setDonationMessage(e.target.value)}
                    className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                </div>

                {/* Anonymous */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="anonymous" className="text-sm">
                    Make this donation anonymous
                  </label>
                </div>

                {/* Donate Button */}
                <Button
                  size="lg"
                  variant="gradient"
                  className="w-full"
                  onClick={handleDonate}
                  disabled={isDonating}
                >
                  {isDonating ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Back This Project"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>

            {/* Share Card */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Share this campaign</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const url = window.location.href;
                      const text = `Check out this campaign: ${campaignData.title}`;
                      window.open(
                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                        "_blank",
                        "width=600,height=400"
                      );
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const url = window.location.href;
                      const text = `Check out this campaign: ${campaignData.title}`;
                      window.open(
                        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                        "_blank",
                        "width=600,height=400"
                      );
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const url = window.location.href;
                      const text = `Check out this campaign: ${campaignData.title} - ${url}`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                        "_blank"
                      );
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url).then(() => {
                        toast.success("Link copied to clipboard!");
                      }).catch(() => {
                        toast.error("Failed to copy link");
                      });
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
