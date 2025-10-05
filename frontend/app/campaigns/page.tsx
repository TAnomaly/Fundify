"use client";

import { useState } from "react";
import { CampaignCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock campaigns data
const mockCampaigns = [
  {
    id: "1",
    title: "Revolutionary Solar-Powered Water Purifier",
    description: "Bringing clean water to remote communities using renewable energy technology.",
    slug: "solar-water-purifier",
    imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
    goal: 50000,
    currentAmount: 37500,
    category: "technology",
    daysRemaining: 15,
    backers: 342,
  },
  {
    id: "2",
    title: "Indie Game: Mystic Realms - An Epic Adventure",
    description: "An immersive RPG experience with stunning visuals and captivating storytelling.",
    slug: "mystic-realms-game",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
    goal: 75000,
    currentAmount: 62000,
    category: "games",
    daysRemaining: 22,
    backers: 891,
  },
  {
    id: "3",
    title: "Sustainable Urban Garden Kit",
    description: "Grow fresh organic vegetables in your apartment with our innovative hydroponic system.",
    slug: "urban-garden-kit",
    imageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80",
    goal: 30000,
    currentAmount: 28500,
    category: "environment",
    daysRemaining: 8,
    backers: 523,
  },
  {
    id: "4",
    title: "Documentary: Ocean Guardians",
    description: "Following marine conservationists protecting endangered ocean species worldwide.",
    slug: "ocean-guardians-documentary",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    goal: 45000,
    currentAmount: 23000,
    category: "film",
    daysRemaining: 30,
    backers: 287,
  },
  {
    id: "5",
    title: "Smart Home Automation Hub",
    description: "Control all your smart devices from one beautiful, intuitive interface.",
    slug: "smart-home-hub",
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80",
    goal: 60000,
    currentAmount: 48000,
    category: "technology",
    daysRemaining: 12,
    backers: 612,
  },
  {
    id: "6",
    title: "Artisan Coffee Roastery Expansion",
    description: "Helping us expand our sustainable coffee roasting operation to serve more communities.",
    slug: "artisan-coffee-roastery",
    imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80",
    goal: 35000,
    currentAmount: 31500,
    category: "food",
    daysRemaining: 6,
    backers: 428,
  },
];

const categories = [
  "All",
  "Technology",
  "Arts",
  "Music",
  "Film",
  "Games",
  "Design",
  "Food",
  "Fashion",
  "Environment",
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "ending", label: "Ending Soon" },
  { value: "funded", label: "Most Funded" },
];

export default function CampaignsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesCategory = selectedCategory === "All" || campaign.category === selectedCategory.toLowerCase();
    const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              className="w-full pl-12 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Categories:
            </span>
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? "bg-gradient-primary text-white shadow-glow-sm"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort and Results Count */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{filteredCampaigns.length}</span> campaigns
            </p>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} {...campaign} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search query
            </p>
            <Button variant="outline" onClick={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Load More Button */}
        {filteredCampaigns.length > 0 && (
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg">
              Load More Campaigns
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
