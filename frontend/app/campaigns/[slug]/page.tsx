"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, calculatePercentage } from "@/lib/utils";

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

export default function CampaignDetailPage({ params }: { params: { slug: string } }) {
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [donationMessage, setDonationMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "updates" | "comments">("story");

  const percentage = calculatePercentage(mockCampaign.currentAmount, mockCampaign.goal);
  const remaining = mockCampaign.goal - mockCampaign.currentAmount;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (amount && amount > 0) {
      alert(`Donation of $${amount} initiated! This would connect to payment processing.`);
    } else {
      alert("Please enter a valid donation amount.");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <img
          src={mockCampaign.imageUrl}
          alt={mockCampaign.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-purple-700 capitalize mb-4">
              {mockCampaign.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {mockCampaign.title}
            </h1>
            <p className="text-lg text-white/90">
              {mockCampaign.description}
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
                    src={mockCampaign.creator.avatar}
                    alt={mockCampaign.creator.username}
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {mockCampaign.creator.firstName} {mockCampaign.creator.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      @{mockCampaign.creator.username}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mockCampaign.creator.bio}
                    </p>
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
                  className={`pb-4 text-sm font-medium transition-colors ${
                    activeTab === "story"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Campaign Story
                </button>
                <button
                  onClick={() => setActiveTab("updates")}
                  className={`pb-4 text-sm font-medium transition-colors ${
                    activeTab === "updates"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Updates
                </button>
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`pb-4 text-sm font-medium transition-colors ${
                    activeTab === "comments"
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
                <div className="prose prose-lg max-w-none">
                  {mockCampaign.videoUrl && (
                    <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        width="100%"
                        height="450"
                        src={mockCampaign.videoUrl}
                        title="Campaign video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full"
                      />
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: mockCampaign.story }} />
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
                        The creator hasn't posted any updates yet. Check back soon!
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
                    {formatCurrency(mockCampaign.currentAmount)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    raised of {formatCurrency(mockCampaign.goal)} goal
                  </p>

                  <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-primary transition-all duration-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-bold text-lg">{mockCampaign.backers}</div>
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
                        className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                          selectedAmount === amount
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
                >
                  Back This Project
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
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="flex-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="flex-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </Button>
                  <Button variant="outline" size="icon" className="flex-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
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
