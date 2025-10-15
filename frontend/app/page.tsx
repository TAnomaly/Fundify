"use client";

import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { campaignApi } from "@/lib/api";
import { Campaign } from "@/lib/types";
import { motion } from "framer-motion";
import {
  Sparkles, Rocket, Shield, TrendingUp, Users, Heart,
  Zap, Globe, DollarSign, Star, ArrowRight, Play, Award
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadTrendingCampaigns();

    // Mouse tracking for interactive effects
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const loadTrendingCampaigns = async () => {
    try {
      const response = await campaignApi.getAll({});
      if (response.success && response.data) {
        const campaignData = Array.isArray(response.data) ? response.data : response.data.campaigns || [];
        setCampaigns(campaignData.slice(0, 6));
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Rocket className="w-7 h-7" />,
      title: "Launch in Minutes",
      description: "Create your campaign with our intuitive builder. No technical skills needed.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Bank-Level Security",
      description: "Your funds are protected with enterprise-grade encryption and compliance.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Global Reach",
      description: "Connect with supporters from 190+ countries. Accept payments anywhere.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: "Real-Time Analytics",
      description: "Track performance, engagement, and revenue with beautiful dashboards.",
      gradient: "from-orange-500 to-red-500"
    },
  ];

  const stats = [
    { icon: <Users className="w-6 h-6" />, label: "Active Creators", value: "12,345+", gradient: "from-purple-500 to-pink-500" },
    { icon: <DollarSign className="w-6 h-6" />, label: "Total Raised", value: "$24.5M", gradient: "from-blue-500 to-cyan-500" },
    { icon: <Heart className="w-6 h-6" />, label: "Supporters", value: "89,234", gradient: "from-red-500 to-pink-500" },
    { icon: <Award className="w-6 h-6" />, label: "Success Rate", value: "87%", gradient: "from-yellow-500 to-orange-500" },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Tech Entrepreneur",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      quote: "Fundify helped me raise $50K in just 2 weeks. The platform is incredible!"
    },
    {
      name: "Marcus Chen",
      role: "Game Developer",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      quote: "Best crowdfunding platform I've used. The analytics dashboard is a game-changer."
    },
    {
      name: "Emily Rodriguez",
      role: "Artist",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      quote: "I built a community of 1000+ patrons. Fundify made it so easy!"
    }
  ];

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Animated Background - Monokai */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 dark:from-[#1E1E1E] dark:via-[#272822] dark:to-[#2D2A2E]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 38, 114, 0.2), transparent 50%)`
          }}
        />
        {/* Floating orbs - Monokai colors */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#F92672]/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob dark:bg-[#F92672]/10" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#E6DB74]/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000 dark:bg-[#E6DB74]/10" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-[#66D9EF]/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000 dark:bg-[#66D9EF]/10" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Join 89,234+ Creators Worldwide
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                Fund Your Dreams
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                Build Your Community
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed"
            >
              The modern platform for creators, entrepreneurs, and innovators.
              Launch campaigns, build memberships, and connect with supporters who believe in you.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/campaigns/create">
                <Button size="lg" className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                  <span className="relative z-10 flex items-center gap-2">
                    Start Your Campaign
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Play className="w-5 h-5 mr-2" />
                  Explore Campaigns
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative group bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4`}>
                  <div className="text-white">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful tools designed to help you succeed, from launch to scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 transition-transform`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Campaigns */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Trending Campaigns
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Discover amazing projects from creators worldwide
              </p>
            </div>
            <Link href="/campaigns">
              <Button variant="outline" className="hidden sm:flex items-center gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <CampaignCard
                    title={campaign.title}
                    description={campaign.description}
                    imageUrl={campaign.imageUrl}
                    currentAmount={campaign.currentAmount}
                    goal={campaign.goal}
                    slug={campaign.slug}
                    category={campaign.category}
                    daysRemaining={Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    backers={campaign.backers}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Loved by Creators
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join thousands of successful creators who chose Fundify
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are already funding their dreams on Fundify
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg">
                  <Zap className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
