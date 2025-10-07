"use client";

import { useState, useEffect } from "react";
import { campaignApi } from "@/lib/api";
import { Campaign, CampaignCategory } from "@/lib/types";
import { CampaignCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    loadCampaigns();
  }, [selectedCategory, page]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const filters: any = {
        page,
        limit: 12,
        status: "ACTIVE",
      };

      if (selectedCategory !== "All") {
        filters.category = selectedCategory;
      }

      const response = await campaignApi.getAll(filters);
      if (response.success && response.data) {
        if (page === 1) {
          setCampaigns(response.data.campaigns);
        } else {
          setCampaigns((prev) => [...prev, ...response.data.campaigns]);
        }
        setHasMore(response.data.pagination.page < response.data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

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
        status: "ACTIVE",
        page: 1,
        limit: 12,
      });

      if (response.success && response.data) {
        setCampaigns(response.data.campaigns);
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-hero py-16 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore Campaigns
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl">
            Discover amazing projects from creators around the world and help bring them to life
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search and Filters */}
        <div className="mb-8 space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-xl">
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
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
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
              <p className="text-muted-foreground">Loading campaigns...</p>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">No campaigns found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && !searchQuery && (
              <div className="flex justify-center">
                <Button
                  onClick={loadMore}
                  disabled={isLoading}
                  variant="outline"
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
