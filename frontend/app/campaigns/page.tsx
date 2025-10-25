"use client";

import { useState, useEffect, useCallback } from "react";
import { campaignApi } from "@/lib/api";
import { Campaign } from "@/lib/types";
import { CampaignCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BlurFade } from "@/components/ui/blur-fade";
import toast from "react-hot-toast";

const categories = [
  "All",
  "TECHNOLOGY",
  "CREATIVE",
  "COMMUNITY",
  "BUSINESS",
  "EDUCATION",
  "HEALTH",
  "ENVIRONMENT",
  "OTHER",
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        page,
        limit: 12,
        // Show all campaigns for now (DRAFT and ACTIVE)
      };

      if (selectedCategory !== "All") {
        filters.category = selectedCategory;
      }

      const response = await campaignApi.getAll(filters);
      console.log('Campaigns API Response:', response);
      if (response.success && response.data) {
        const data = response.data as any;
        const campaignData = Array.isArray(response.data) ? response.data : (data.campaigns || []);
        console.log('Campaign Data:', campaignData);
        if (page === 1) {
          setCampaigns(campaignData);
        } else {
          setCampaigns((prev) => [...prev, ...campaignData]);
        }
        const pagination = data.pagination;
        setHasMore(pagination ? pagination.page < pagination.pages : false);
      } else {
        console.log('No success or data in response:', response);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setPage(1);
      loadCampaigns();
      return;
    }

    setIsLoading(true);
    try {
      const response = await campaignApi.getAll({
        search: searchQuery,
        page: 1,
      } as any);

      if (response.success && response.data) {
        const data = response.data as any;
        const campaignData = Array.isArray(response.data) ? response.data : (data.campaigns || []);
        setCampaigns(campaignData);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to search campaigns:", error);
      toast.error("Failed to search campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setCampaigns([]);
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,38,114,0.1),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_bottom_right,rgba(102,217,239,0.08),transparent_60%)]" />
        <div className="container mx-auto max-w-6xl text-center">
          <BlurFade delay={0.15} inView>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/60 dark:bg-white/10 px-4 py-2 text-sm font-semibold text-gradient shadow-sm mb-6">
              Community-powered breakthroughs
            </div>
          </BlurFade>
          <TextGenerateEffect
            words="Explore campaigns making an impact"
            className="text-5xl md:text-6xl font-bold mb-5 text-gradient-monokai"
          />
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover ambitious ideas from visionary creators and help turn their next milestone into reality.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and Filters */}
        <div className="mb-10 space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-12 pr-28 py-4 rounded-2xl border border-white/15 bg-background/80 backdrop-blur-xl shadow-[0_18px_60px_-40px_rgba(249,38,114,0.4)] focus:outline-none focus:ring-2 focus:ring-[#F92672]/40 focus:border-transparent transition-all"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] text-white font-semibold shadow-[0_12px_30px_-18px_rgba(249,38,114,0.55)] hover:shadow-[0_16px_45px_-20px_rgba(174,129,255,0.6)] hover:scale-[1.02] transition-all"
            >
              Search
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedCategory === category
                    ? "bg-gradient-to-r from-[#F92672] through-[#AE81FF] to-[#66D9EF] text-white shadow-[0_14px_40px_-24px_rgba(249,38,114,0.55)] scale-105"
                    : "bg-background/75 backdrop-blur border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:-translate-y-[2px]"
                  }`}
              >
                {category === "All" ? category : category.charAt(0) + category.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        {isLoading && page === 1 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-dashed border-[#F92672]/60 animate-spin" />
              <p className="text-muted-foreground">Loading campaigns...</p>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-white/10 bg-background/60 backdrop-blur">
            <p className="text-lg text-muted-foreground">No campaigns found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  title={campaign.title}
                  description={campaign.description}
                  imageUrl={campaign.imageUrl}
                  goal={campaign.goal}
                  currentAmount={campaign.currentAmount}
                  category={campaign.category}
                  daysRemaining={campaign.endDate ? Math.max(Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)), 0) : 0}
                  backers={campaign.backers || 0}
                  slug={campaign.slug}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && !searchQuery && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoading}
                  variant="gradient"
                  size="lg"
                >
                  {isLoading ? "Loading..." : "Load More Campaigns"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
