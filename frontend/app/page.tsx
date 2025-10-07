"use client";

import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/ui/card";
import { useState, useEffect } from "react";

// Mock data for demonstration
const trendingCampaigns = [
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
];

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Quick Setup",
    description: "Launch your campaign in minutes with our intuitive platform.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Secure Payments",
    description: "Bank-level security for all transactions and personal data.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Global Reach",
    description: "Connect with backers from around the world instantly.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Real-time Analytics",
    description: "Track your campaign performance with detailed insights.",
  },
];

const stats = [
  { label: "Projects Funded", value: "12,345" },
  { label: "Total Raised", value: "$24.5M" },
  { label: "Active Backers", value: "89,234" },
  { label: "Success Rate", value: "87%" },
];

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="absolute inset-0 bg-gradient-primary opacity-5 animate-gradient-x" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-block mb-6 px-4 py-2 bg-glass rounded-full">
              <span className="text-sm font-semibold text-gradient">🌟 Join 89,234+ Backers Worldwide</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gradient">Make a Difference,</span>
              <br />
              <span className="text-foreground">One Campaign at a Time</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Empower dreams, support innovation, and create positive change. Join the community that's turning ideas into reality through the power of collective giving.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="xl" variant="gradient" className="shadow-soft hover:shadow-soft-hover" asChild>
                <a href="/campaigns/create">Start Your Campaign</a>
              </Button>
              <Button size="xl" variant="outline" className="border-2" asChild>
                <a href="/campaigns">Explore Projects</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="text-3xl md:text-4xl font-bold text-gradient mb-2 group-hover:scale-110 transition-transform">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: "4s" }} />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="text-gradient">Fundify</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to successfully fund your project and bring your vision to reality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-glass-card rounded-2xl p-6 shadow-soft hover:shadow-soft-hover transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center mb-4 shadow-soft group-hover:shadow-glow transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Campaigns Section */}
      <section className="py-24 bg-gradient-soft">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trending <span className="text-gradient">Campaigns</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Discover the most popular projects backed by our community
              </p>
            </div>
            <Button variant="outline" asChild className="hidden md:inline-flex border-2">
              <a href="/campaigns">View All</a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} {...campaign} />
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild className="border-2">
              <a href="/campaigns">View All Campaigns</a>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Make an Impact?
            </h2>
            <p className="text-lg md:text-xl mb-10 text-white/90 leading-relaxed">
              Join thousands of changemakers who are turning their ideas into reality. Start your campaign today and bring your vision to life with the support of a global community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" className="bg-white text-blue-600 hover:bg-white/90 shadow-soft-hover font-semibold" asChild>
                <a href="/campaigns/create">Start Your Campaign</a>
              </Button>
              <Button size="xl" variant="outline" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm" asChild>
                <a href="/campaigns">Explore Projects</a>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-30" />
      </section>
    </div>
  );
}
