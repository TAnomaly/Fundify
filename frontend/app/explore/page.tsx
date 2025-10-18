"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CampaignCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import axios from "axios";
import { motion } from "framer-motion";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BlurFade } from "@/components/ui/blur-fade";
import { Input } from "@/components/ui/input";
import {
  Flame,
  Users,
  Heart,
  Search
} from "lucide-react";
import { getFullMediaUrl } from "@/lib/utils/mediaUrl";

// Interfaces (assuming these are defined elsewhere, but including for context)
interface Creator { id: string; name: string; username?: string; email: string; avatar?: string; bannerImage?: string; creatorBio?: string; isCreator: boolean; _count?: { subscribers: number; posts: number; }; }
interface Campaign { id: string; title: string; slug: string; description: string; goal: number; currentAmount: number; category: string; imageUrl: string; endDate: string; backers?: number; featured?: boolean; }

export default function ExplorePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [selectedTab, setSelectedTab] = useState<'creators' | 'campaigns'>('creators');
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadExploreData();
  }, []);

  useEffect(() => {
    // Filter campaigns based on search term
    if (searchTerm === "") {
      setFilteredCampaigns(campaigns);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = campaigns.filter(c =>
        c.title.toLowerCase().includes(lowercasedTerm) ||
        c.description.toLowerCase().includes(lowercasedTerm) ||
        c.category.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredCampaigns(filtered);
    }
  }, [searchTerm, campaigns]);


  const loadExploreData = async () => {
    setIsLoading(true);
    try {
      const [creatorsResponse, campaignsResponse] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/creators`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/campaigns`)
      ]);

      if (creatorsResponse.data.success) {
        const creatorData = creatorsResponse.data.data || [];
        const sorted = creatorData.sort((a: Creator, b: Creator) => (b._count?.subscribers || 0) - (a._count?.subscribers || 0));
        setCreators(sorted);
      }

      if (campaignsResponse.data.success) {
        const campaignData = (Array.isArray(campaignsResponse.data.data) ? campaignsResponse.data.data : campaignsResponse.data.data.campaigns) || [];
        setCampaigns(campaignData);
        setFilteredCampaigns(campaignData);
      }
    } catch (error) {
      console.error("Failed to load explore data:", error);
      toast.error("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const renderSkeletons = () => (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {[...Array(6)].map((_, i) => (
        <motion.div key={i} variants={itemVariants}>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,38,114,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-64 -z-10 h-[320px] bg-[radial-gradient(circle_at_center,rgba(102,217,239,0.08),transparent_65%)] blur-3xl" />

      <BlurFade delay={0.25} inView>
        <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/60 dark:bg-white/10 px-4 py-2 text-sm font-medium text-gradient shadow-sm mb-6">
              <Flame className="w-4 h-4 text-[#F92672]" />
              Curated spotlight
            </div>
            <TextGenerateEffect
              words="Discover Your Next Inspiration"
              className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 text-gradient-monokai"
            />
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore trending creators and innovative campaigns from our global community.
            </p>
          </div>
        </section>
      </BlurFade>

      <div className="container mx-auto px-4 py-8">
        <BlurFade delay={0.5} inView>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
            <div className="p-1.5 rounded-full bg-background/70 backdrop-blur-lg border border-white/15 flex items-center shadow-[0_18px_60px_-35px_rgba(174,129,255,0.4)]">
              <button
                onClick={() => setSelectedTab('creators')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedTab === 'creators' ? 'bg-gradient-to-r from-[#F92672] to-[#AE81FF] text-white shadow-[0_12px_35px_-18px_rgba(249,38,114,0.6)]' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="w-4 h-4 mr-2 inline" />
                Creators
              </button>
              <button
                onClick={() => setSelectedTab('campaigns')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${selectedTab === 'campaigns' ? 'bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] text-white shadow-[0_12px_35px_-18px_rgba(102,217,239,0.55)]' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Flame className="w-4 h-4 mr-2 inline" />
                Campaigns
              </button>
            </div>

            {/* Search Bar */}
            {selectedTab === 'campaigns' && (
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="pl-10 w-full bg-background/80 border border-white/15 backdrop-blur-xl shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </BlurFade>

        <BlurFade delay={0.75} inView>
          {isLoading ? renderSkeletons() : (
            selectedTab === 'creators' ? (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {creators.map(creator => (
                  <motion.div key={creator.id} variants={itemVariants}>
                    <CreatorCard creator={creator} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {filteredCampaigns.map(campaign => (
                  <motion.div key={campaign.id} variants={itemVariants}>
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
              </motion.div>
            )
          )}
        </BlurFade>
      </div>
    </div>
  );
}

// A new, improved Creator Card component
function CreatorCard({ creator }: { creator: Creator }) {
  const getCreatorSlug = (creator: Creator) => {
    if (creator.username) return creator.username;
    if (creator.name) {
      return creator.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    return creator.id;
  };
  const profileSlug = getCreatorSlug(creator);
  const displayHandle =
    creator.username || (creator.name ? profileSlug : `user${creator.id.slice(0, 6)}`);
  const bannerSrc = getFullMediaUrl(creator.bannerImage);
  const avatarSrc = getFullMediaUrl(creator.avatar);

  return (
    <Link
      href={`/creators/${profileSlug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-white/80 shadow-[0_25px_70px_-40px_rgba(249,38,114,0.45)] transition-transform hover:-translate-y-2 dark:bg-[#1b1b1b]/85"
      prefetch
    >
      <div className="relative h-36 overflow-hidden">
        {bannerSrc ? (
          <Image
            src={bannerSrc}
            alt={`${creator.name}'s banner`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#F92672]/40 via-[#AE81FF]/40 to-[#66D9EF]/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
      </div>

      <div className="relative flex flex-1 flex-col px-6 pb-6 pt-0">
        <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-background/80 bg-background/80 text-3xl font-semibold text-foreground shadow-[0_12px_30px_-16px_rgba(249,38,114,0.5)]">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={creator.name}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            creator.name?.charAt(0).toUpperCase()
          )}
        </div>

        <h3 className="mb-1 truncate text-xl font-semibold">{creator.name}</h3>
        <p className="mb-3 text-sm text-muted-foreground">@{displayHandle}</p>

        {creator.creatorBio && (
          <p className="mb-4 line-clamp-3 flex-grow text-sm leading-relaxed text-muted-foreground/90">
            {creator.creatorBio}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm text-muted-foreground/90">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#A6E22E]" />
            <span className="font-semibold text-foreground">{creator._count?.subscribers || 0}</span>
            <span>supporters</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-[#F92672]" />
            <span className="font-semibold text-foreground">{creator._count?.posts || 0}</span>
            <span>posts</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
