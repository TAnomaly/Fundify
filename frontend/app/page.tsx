"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { campaignApi } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import {
  Shield,
  Users,
  Award,
  Feather,
  Globe,
  Coins,
  Heart,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const trustSignals: { icon: LucideIcon; label: string }[] = [
  { icon: Shield, label: "Escrow-backed payouts" },
  { icon: Award, label: "Creator verification" },
  { icon: Users, label: "Communities in 180+ cities" },
];

const features: { icon: LucideIcon; title: string; description: string; tone: string }[] = [
  {
    icon: Feather,
    title: "Memberships with narrative arcs",
    description:
      "Design tiered patronage, release long-form drops, and send private notes — all with elegant templates that respect your voice.",
    tone: "bg-card/80 text-primary",
  },
  {
    icon: Coins,
    title: "Campaigns that convert with calm",
    description:
      "Flexible funding models, limited editions, and transparent milestone tracking nurture trust with every supporter update.",
    tone: "bg-secondary/60 text-primary",
  },
  {
    icon: Globe,
    title: "Events and experiences in concert",
    description:
      "Schedule livestreams, salons, and tours with RSVP workflows, ticketing, and follow-up sequences that feel bespoke.",
    tone: "bg-muted/60 text-primary",
  },
  {
    icon: Heart,
    title: "Supporter care, beautifully handled",
    description:
      "Segmented messaging, gratitude automations, and quiet analytics help you respond thoughtfully at scale.",
    tone: "bg-card/70 text-primary",
  },
];

const stats: { label: string; value: string; icon: ReactNode; delay: number }[] = [
  {
    label: "Creators in residence",
    value: "12k+",
    icon: <Users className="h-5 w-5 text-primary" />,
    delay: 0,
  },
  {
    label: "Supporters worldwide",
    value: "3.8M",
    icon: <Globe className="h-5 w-5 text-primary" />,
    delay: 0.05,
  },
  {
    label: "Monthly revenue uplift",
    value: "3.2×",
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
    delay: 0.1,
  },
  {
    label: "Funding released on time",
    value: "99.2%",
    icon: <Shield className="h-5 w-5 text-primary" />,
    delay: 0.15,
  },
];

const testimonials = [
  {
    name: "Sarah Ellison",
    role: "Tech educator & filmmaker",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    quote:
      "Our patrons feel looked after. Fundify’s cadence tools make our updates feel handcrafted, and the ledger keeps the business composed.",
  },
  {
    name: "Marcus Chen",
    role: "Narrative game designer",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    quote:
      "We retired five tools. Campaigns, live premieres, merch drops, and newsletters now share one timeline — supporters finally see the full story.",
  },
  {
    name: "Emily Rodriguez",
    role: "Illustrator & podcaster",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    quote:
      "The financial calm is real. Escrowed payouts and transparent metrics mean I can plan seasons with confidence.",
  },
];

const getDaysRemaining = (date?: string) => {
  if (!date) return 0;
  const end = new Date(date).getTime();
  if (Number.isNaN(end)) return 0;
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    loadTrendingCampaigns();
  }, []);

  const fallbackCampaigns = isLoading ? Array.from({ length: 3 }) : [];

  return (
    <div className="relative flex flex-col overflow-hidden">
      <section className="container-elegant pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[32px] border border-border/40 bg-secondary/70 px-8 py-16 shadow-soft"
        >
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-secondary/75 via-secondary/50 to-background/70" />
          <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(90%_60%_at_10%_0%,rgba(245,241,230,0.18),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(80%_70%_at_85%_15%,rgba(91,106,147,0.22),transparent_72%)]" />
          <div className="relative flex flex-col gap-8">
            <span className="pill-elegant w-fit bg-card/80 text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Patronage with poise
            </span>
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
              <span className="text-gradient-monokai">
                A renaissance studio for sustainable creator income.
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-foreground/75">
              Fundify assembles memberships, campaigns, live experiences, and premium content into a single ledger — so you
              can nurture patronage with calm, confident tooling.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="gradient" className="rounded-full px-8">
                Launch your studio
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href="/explore" className="inline-flex items-center gap-2">
                  Browse live creators
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {trustSignals.map((signal) => (
                <div key={signal.label} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-card/70 text-primary">
                    <signal.icon className="h-4 w-4" />
                  </span>
                  <span className="max-w-[150px] leading-relaxed">{signal.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="container-elegant pb-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: stat.delay }}
              className="rounded-3xl border border-border/40 bg-secondary/70 p-6 shadow-soft backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-display text-3xl text-gradient">{stat.value}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/40 bg-card/80">
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container-elegant pb-16">
        <div className="mb-10 flex flex-col gap-3">
          <span className="pill-elegant w-fit">Why creators stay</span>
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            An atelier of calm, conversion, and care
          </h2>
          <p className="max-w-3xl text-foreground/70">
            Your audience experiences a refined journey from first pledge to lifelong patron. Fundify quietly handles the
            revenue mechanics, compliance, and supporter rituals so you can focus on the work.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative overflow-hidden rounded-3xl border border-border/40 bg-secondary/70 p-8 shadow-soft transition hover:-translate-y-1 hover:shadow-soft-hover"
            >
              <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border border-border/40 ${feature.tone}`}>
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-xl text-foreground">{feature.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">{feature.description}</p>
              <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            </div>
          ))}
        </div>
      </section>

      <section className="container-elegant pb-16">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-elegant w-fit">Trending studios</span>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Curated campaigns this week</h2>
            <p className="mt-2 max-w-2xl text-foreground/70">
              A glimpse at creators weaving memberships, live launches, and supporter perks into one steady rhythm.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden rounded-full border border-border/40 px-5 sm:inline-flex">
            <Link href="/campaigns" className="inline-flex items-center gap-2">
              View all campaigns
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? fallbackCampaigns.map((_, index) => (
                <div key={`campaign-skeleton-${index}`} className="rounded-3xl border border-border/40 bg-secondary/70 p-6 shadow-soft">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <div className="mt-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))
            : campaigns.length > 0
            ? campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  title={campaign.title}
                  description={campaign.description}
                  imageUrl={campaign.imageUrl}
                  goal={campaign.goal || 0}
                  currentAmount={campaign.currentAmount || 0}
                  category={campaign.category || "CREATIVE"}
                  daysRemaining={getDaysRemaining(campaign.endDate)}
                  backers={campaign.backers || 0}
                  slug={campaign.slug || campaign.id}
                  className="rounded-3xl border border-border/40 bg-card/90 text-foreground shadow-soft transition hover:-translate-y-1 hover:shadow-soft-hover"
                />
              ))
            : (
              <div className="col-span-full rounded-3xl border border-border/40 bg-secondary/70 p-12 text-center text-muted-foreground">
                No campaigns to showcase just yet. Launch yours to be featured.
              </div>
            )}
        </div>

        <div className="mt-8 flex justify-center sm:hidden">
          <Button asChild variant="ghost" size="sm" className="rounded-full border border-border/40 px-5">
            <Link href="/campaigns" className="inline-flex items-center gap-2">
              View all campaigns
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container-elegant pb-24">
        <div className="mb-10 flex flex-col gap-3">
          <span className="pill-elegant w-fit">Refined results</span>
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">Creators who feel at home</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="bg-glass-card flex h-full flex-col gap-4 rounded-3xl p-8 shadow-soft">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full border border-border/40 object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground/75">“{testimonial.quote}”</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
