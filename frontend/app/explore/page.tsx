"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CampaignCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import axios from "axios";
import { motion } from "framer-motion";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { BlurFade } from "@/components/ui/blur-fade";
import { Spotlight } from "@/components/ui/spotlight";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  Flame,
  Star,
  Users,
  Zap,
  Award,
  Clock,
  Heart,
  Search
} from "lucide-react";

// Interfaces (assuming these are defined elsewhere, but including for context)
interface Creator { id: string; name: string; username?: string; email: string; avatar?: string; bannerImage?: string; creatorBio?: string; isCreator: boolean; _count?: { subscribers: number; posts: number; }; }
interface Campaign { id: string; title: string; slug: string; description: string; goal: number; currentAmount: number; category: string; imageUrl: string; endDate: string; backers?: number; featured?: boolean; }

export default function ExplorePage() {
  const router = useRouter();
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
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      {/* Hero Section */}
      <BlurFade delay={0.25} inView>
        <section className="text-center pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <TextGenerateEffect
            words="Discover Your Next Inspiration"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4"
          />
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore trending creators and innovative campaigns from our global community.
          </p>
        </section>
      </BlurFade>

      <div className="container mx-auto px-4 py-8">
        <BlurFade delay={0.5} inView>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
            {/* Tabs */}
            <div className="p-1.5 rounded-full bg-muted border border-border flex items-center">
              <button
                onClick={() => setSelectedTab('creators')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${selectedTab === 'creators' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="w-4 h-4 mr-2 inline"/>
                Creators
              </button>
              <button
                onClick={() => setSelectedTab('campaigns')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${selectedTab === 'campaigns' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Flame className="w-4 h-4 mr-2 inline"/>
                Campaigns
              </button>
            </div>

            {/* Search Bar */}
            {selectedTab === 'campaigns' && (
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search campaigns..."
                  className="pl-10 w-full bg-muted border-border"
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
  const router = useRouter();
  return (
    <div 
      className="group relative bg-card/50 dark:bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden h-full flex flex-col"
      onClick={() => router.push(`/creators/${creator.username || creator.id}`)}
    >
      <div className="h-36 relative overflow-hidden">
        <img
          src={creator.bannerImage || `https://source.unsplash.com/random/400x200?abstract&${creator.id}`}
          alt={`${creator.name}'s banner`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <div className="relative px-6 -mt-12 flex-1 flex flex-col pb-6">
        <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center text-foreground font-bold text-3xl shadow-lg overflow-hidden mb-4">
          {creator.avatar ? (
            <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
          ) : (
            creator.name?.charAt(0).toUpperCase()
          )}
        </div>
        
        <h3 className="text-xl font-bold mb-1 truncate">{creator.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          @{creator.username || `user${creator.id.slice(0, 6)}`}
        </p>

        {creator.creatorBio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
            {creator.creatorBio}
          </p>
        )}

        <div className="flex items-center justify-between text-sm mt-auto pt-4 border-t border-border/20">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold">{creator._count?.subscribers || 0}</span>
            <span className="text-muted-foreground">supporters</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold">{creator._count?.posts || 0}</span>
            <span className="text-muted-foreground">posts</span>
          </div>
        </div>
      </div>
    </div>
  );
}