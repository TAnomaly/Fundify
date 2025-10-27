"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { campaignApi } from "@/lib/api";
import type { Campaign } from "@/lib/types";
import {
  Layers,
  Radio,
  Gauge,
  Handshake,
  ArrowRight,
  ShieldCheck,
  Users,
  Zap,
  LineChart,
  Clock,
  Globe2,
} from "lucide-react";

const signalBoard = [
  { label: "Active patrons", value: "3.8M", meta: "+12% QoQ" },
  { label: "Creator LTV uplift", value: "3.2×", meta: "vs stitched stacks" },
  { label: "Payout release", value: "72h", meta: "Avg escrow window" },
  { label: "Retention cadence", value: "87%", meta: "Quarterly renewals" },
];

const lifecycle = [
  {
    stage: "Compose",
    title: "Design a single command centre",
    description:
      "Memberships, campaigns, exclusives, and live seasons share one editorial calendar—no more juggling five platforms to keep patrons aligned.",
    icon: Layers,
  },
  {
    stage: "Broadcast",
    title: "Launch with quiet confidence",
    description:
      "Automated landing templates, escrow-backed pledges, and transparent milestone tracking convert the audience you’ve already earned.",
    icon: Radio,
  },
  {
    stage: "Analyse",
    title: "Read the business at a glance",
    description:
      "Segment revenue, churn, and content sentiment down to the cohort. Export-ready insights make sponsors and accountants equally happy.",
    icon: Gauge,
  },
  {
    stage: "Nurture",
    title: "Reward your earliest believers",
    description:
      "Tier-specific rituals, personalised gratitude flows, and instant make-goods turn casual supporters into lifetime patrons.",
    icon: Handshake,
  },
];

const trustPillars = [
  {
    icon: ShieldCheck,
    title: "Escrow-first payouts",
    description:
      "Contributions clear into regulated custodial accounts. Release triggers are programmable, so every backer sees where their support sits.",
  },
  {
    icon: Users,
    title: "Identity and moderation layers",
    description:
      "Opt-in verification, invite codes, and collaborative moderation dashboards keep communities intimate while scaling reach.",
  },
  {
    icon: Zap,
    title: "Performance-ready delivery",
    description:
      "Edge-rendered storefronts, optimisation for long-form content, and adaptive streaming ensure every drop lands fast worldwide.",
  },
];

const performanceData = [
  { label: "Average launch payback", value: "27 days", icon: Clock },
  { label: "Global supporter footprint", value: "180+ cities", icon: Globe2 },
  { label: "Creator net revenue", value: "$12.7M / mo", icon: LineChart },
];

const testimonials = [
  {
    quote:
      "Fundify feels like a studio operations stack that actually respects the craft. Our patrons experience a single, elegant journey—from discovery to deep membership.",
    name: "Nadia Rivers",
    role: "Documentary Filmmaker & Podcaster",
  },
  {
    quote:
      "Escrow-backed pledges changed how confidently we launch. Supporters see the runway, our finance team sees the ledger, and I see fans sticking around.",
    name: "Dev Malik",
    role: "Narrative Game Designer",
  },
  {
    quote:
      "I replaced a maze of tools with a calm dashboard. The analytics are designed for humans, not just spreadsheets, and my patrons appreciate the polish.",
    name: "Elena Martins",
    role: "Independent Journalist",
  },
];

const getDaysRemaining = (date?: string) => {
  if (!date) return 0;
  const end = new Date(date).getTime();
  if (Number.isNaN(end)) return 0;
  const diff = end - Date.now();
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
          const campaignData = Array.isArray(response.data)
            ? response.data
            : response.data.campaigns || [];
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

  const { spotlight, secondary } = useMemo(() => {
    if (campaigns.length === 0) {
      return { spotlight: null, secondary: [] as Campaign[] };
    }

    return {
      spotlight: campaigns[0],
      secondary: campaigns.slice(1),
    };
  }, [campaigns]);

  return (
    <div className="relative flex flex-col overflow-hidden">
      <section className="container-elegant pt-24 pb-20">
        <div className="grid items-start gap-10 lg:grid-cols-[0.95fr,1fr] xl:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8"
          >
            <span className="pill-elegant w-fit">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Creator revenue command centre
            </span>
            <h1 className="font-display text-4xl leading-tight text-gradient-monokai sm:text-5xl lg:text-[3.75rem] lg:leading-tight">
              Build patronage empires with the calm of a single, doom-inspired workspace.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-foreground/72">
              Fundify fuses crowdfunding, memberships, live experiences, and premium content into a single ledger.
              Launch, nurture, and reconcile without ever leaving your studio view.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="gradient" className="rounded-full px-9">
                Start your patronage OS
              </Button>
              <Button asChild size="lg" variant="glass" className="rounded-full border border-border/40 px-8">
                <Link href="/campaigns" className="inline-flex items-center gap-2">
                  Explore active creators
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="relative rounded-[32px] border border-border/30 bg-gradient-card p-8 shadow-soft"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Signal console</span>
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                  Live metrics
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {signalBoard.map((signal) => (
                  <motion.div
                    key={signal.label}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-border/30 bg-secondary/60 p-5 transition-shadow hover:shadow-soft-hover"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground/70">{signal.label}</p>
                    <p className="mt-3 font-display text-3xl text-gradient">{signal.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{signal.meta}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-6 -bottom-8 h-16 rounded-3xl bg-gradient-to-t from-primary/20 to-transparent blur-3xl" />
          </motion.div>
        </div>
      </section>

      <section className="container-elegant pb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
          <div className="rounded-3xl border border-border/30 bg-secondary/65 p-8 shadow-soft">
            <span className="pill-elegant w-fit">Creator lifecycle</span>
            <h2 className="mt-6 font-display text-3xl text-foreground">
              Everything you need to orchestrate a patron-first business.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/70">
              Each phase of the journey is powered by modular workflows. Go from interest to investment with the same calm, doom-emacs inspired interface.
            </p>
          </div>

          <div className="space-y-4">
            {lifecycle.map((item, idx) => (
              <motion.div
                key={item.stage}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="group relative overflow-hidden rounded-3xl border border-border/30 bg-secondary/60 p-6 transition hover:-translate-y-1 hover:shadow-soft-hover"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/40 bg-secondary/70 text-primary/90">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground/70">{String(idx + 1).padStart(2, "0")} • {item.stage}</p>
                    <h3 className="mt-2 font-display text-xl text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-border/45 to-transparent" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-elegant pb-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr,1fr]">
          <div className="space-y-6">
            <span className="pill-elegant w-fit">Safety and scale</span>
            <h2 className="font-display text-3xl text-foreground">
              Built for the trust your patrons deserve, and the performance your brand demands.
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {performanceData.map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="rounded-2xl border border-border/30 bg-secondary/60 p-5 shadow-soft"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-display text-2xl text-gradient">{item.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {trustPillars.map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.07 }}
                className="rounded-3xl border border-border/30 bg-secondary/60 p-6 shadow-soft hover:-translate-y-1 hover:shadow-soft-hover transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 bg-secondary/70 text-primary/90">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-elegant pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-elegant w-fit">Live campaigns</span>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Funding stories unfolding inside the Fundify studio.
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="hidden rounded-full border border-border/40 px-5 sm:inline-flex">
            <Link href="/campaigns" className="inline-flex items-center gap-2">
              View all campaigns
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-[32px] border border-border/30 bg-secondary/60 p-6 shadow-soft">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : spotlight ? (
              <CampaignCard
                title={spotlight.title}
                description={spotlight.description}
                imageUrl={spotlight.imageUrl}
                goal={spotlight.goal || 0}
                currentAmount={spotlight.currentAmount || 0}
                category={spotlight.category || "CREATIVE"}
                daysRemaining={getDaysRemaining(spotlight.endDate)}
                backers={spotlight.backers || 0}
                slug={spotlight.slug || spotlight.id}
                className="rounded-3xl border border-border/30 bg-card/90 text-foreground shadow-soft hover:-translate-y-1 hover:shadow-soft-hover transition"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-border/30 bg-secondary/70 p-12 text-center text-muted-foreground">
                <p>No campaigns to feature yet. Launch yours to claim the spotlight.</p>
                <Button asChild variant="gradient" size="sm" className="rounded-full">
                  <Link href="/campaigns/create">Launch a campaign</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`secondary-skeleton-${idx}`} className="rounded-3xl border border-border/30 bg-secondary/60 p-5">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                ))
              : secondary.map((campaign) => (
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
                    className="rounded-3xl border border-border/30 bg-secondary/60 text-foreground shadow-soft transition hover:-translate-y-1 hover:shadow-soft-hover"
                  />
                ))}
          </div>
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
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="pill-elegant w-fit">Creator voices</span>
            <h2 className="mt-4 font-display text-3xl text-foreground">
              Evidence from studios already thriving on Fundify.
            </h2>
          </div>
          <Button asChild variant="gradient" size="sm" className="rounded-full">
            <Link href="/creators">Discover creators</Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="flex h-full flex-col justify-between rounded-3xl border border-border/30 bg-secondary/60 p-7 shadow-soft"
            >
              <p className="text-sm leading-relaxed text-foreground/80">“{testimonial.quote}”</p>
              <div className="mt-6">
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
