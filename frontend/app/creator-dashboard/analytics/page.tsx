"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  DollarSign,
  FileText,
  MessageCircle,
  Heart,
  Calendar,
} from "lucide-react";

type TrendPoint = {
  date: string;
  revenue?: number;
  subscribers?: number;
};

interface AnalyticsResponse {
  overview: {
    activeSubscribers: number;
    newSubscribers: number;
    canceledSubscribers: number;
    monthlyRevenue: number;
    totalPosts: number;
    totalPolls: number;
    totalEvents: number;
    totalArticles: number;
    totalGoals: number;
    completedGoals: number;
    totalLikes: number;
    totalComments: number;
    totalDownloads: number;
  };
  trends: {
    revenue: TrendPoint[];
    subscribers: TrendPoint[];
  };
  content: {
    postsInPeriod: number;
    topPosts: Array<{
      id: string;
      title: string;
      likeCount: number;
      commentCount: number;
      createdAt: string;
    }>;
  };
  tiers: Array<{
    count: number;
    revenue: number;
    tier: {
      id: string;
      name: string;
      price: number;
    } | null;
  }>;
}

const CHART_COLORS = ["#F92672", "#A6E22E", "#66D9EF", "#E6DB74", "#AE81FF", "#FD971F"];

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Last 90 days", value: "90days" },
  { label: "Last 12 months", value: "12months" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const formatPercentage = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

const computeGrowth = (trend: TrendPoint[], key: "revenue" | "subscribers") => {
  if (!trend.length) return 0;
  const firstValue = trend[0][key] ?? 0;
  const lastValue = trend[trend.length - 1][key] ?? 0;

  if (firstValue === 0) {
    return lastValue > 0 ? 100 : 0;
  }

  return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
};

const normalizeDateLabel = (isoDate: string) => {
  try {
    return format(parseISO(isoDate), "MMM d");
  } catch {
    return isoDate;
  }
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<string>("30days");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await analyticsApi.getDashboard({ period });
        if (response.success) {
          setAnalytics(response.data);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load analytics");
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [period]);

  const revenueGrowth = useMemo(
    () => computeGrowth(analytics?.trends.revenue ?? [], "revenue"),
    [analytics?.trends.revenue]
  );

  const subscriberGrowth = useMemo(
    () => computeGrowth(analytics?.trends.subscribers ?? [], "subscribers"),
    [analytics?.trends.subscribers]
  );

  const revenueChartData = useMemo(
    () =>
      (analytics?.trends.revenue ?? []).map((point) => ({
        date: normalizeDateLabel(point.date),
        revenue: point.revenue ?? 0,
      })),
    [analytics?.trends.revenue]
  );

  const subscriberChartData = useMemo(
    () =>
      (analytics?.trends.subscribers ?? []).map((point) => ({
        date: normalizeDateLabel(point.date),
        subscribers: point.subscribers ?? 0,
      })),
    [analytics?.trends.subscribers]
  );

  const tierPieData = useMemo(
    () =>
      (analytics?.tiers ?? []).map((tier) => ({
        name: tier.tier?.name ?? "Unknown",
        value: tier.count,
        revenue: tier.revenue,
      })),
    [analytics?.tiers]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl text-center">
        <p className="text-muted-foreground mb-4">No analytics data available yet.</p>
        <button
          onClick={() => router.push("/creator-dashboard")}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] text-white shadow-lg hover:shadow-xl transition"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const { overview, content } = analytics;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="flex flex-col gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </button>
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Track your subscriber growth, revenue trends, and content performance in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Period:</span>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  period === option.value
                    ? "bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] text-white shadow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Active subscribers"
          value={numberFormatter.format(overview.activeSubscribers)}
          icon={<Users className="w-5 h-5 text-white" />}
          tone="primary"
          footer={`${formatPercentage(subscriberGrowth)} vs start of period`}
          footerPositive={subscriberGrowth >= 0}
        />
        <AnalyticsCard
          title="Monthly revenue"
          value={currencyFormatter.format(overview.monthlyRevenue)}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          tone="secondary"
          footer={`${formatPercentage(revenueGrowth)} vs start of period`}
          footerPositive={revenueGrowth >= 0}
        />
        <AnalyticsCard
          title="New subscribers"
          value={numberFormatter.format(overview.newSubscribers)}
          icon={<UserPlus className="w-5 h-5 text-white" />}
          tone="positive"
          footer={`${numberFormatter.format(overview.canceledSubscribers)} cancellations`}
          footerPositive={overview.newSubscribers >= overview.canceledSubscribers}
        />
        <AnalyticsCard
          title="Engagement"
          value={`${numberFormatter.format(overview.totalLikes)} likes`}
          icon={<Heart className="w-5 h-5 text-white" />}
          tone="purple"
          footer={`${numberFormatter.format(overview.totalComments)} comments`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-background/60 backdrop-blur-xl border border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Revenue trend</span>
              <Badge variant="outline">{PERIOD_OPTIONS.find((opt) => opt.value === period)?.label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F92672"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-xl border border-border/40">
          <CardHeader>
            <CardTitle>Subscriber growth</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscriberChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#66D9EF"
                  strokeWidth={2}
                  dot={false}
                  name="Subscribers"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-background/60 backdrop-blur-xl border border-border/40">
          <CardHeader>
            <CardTitle>Content performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="uppercase tracking-wide">
                Posts in period
              </Badge>
              <span className="text-xl font-semibold">{content.postsInPeriod}</span>
            </div>
            <div className="space-y-3">
              {content.topPosts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No posts yet.</p>
              ) : (
                content.topPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg border border-border/40 px-4 py-3 hover:border-border transition"
                  >
                    <div>
                      <h3 className="font-semibold">{post.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Published {format(new Date(post.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {post.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post.commentCount}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-xl border border-border/40">
          <CardHeader>
            <CardTitle>Tier distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col">
            {tierPieData.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                No active tiers yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="60%">
                  <PieChart>
                    <Pie
                      data={tierPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {tierPieData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, payload) =>
                        [`${value} subscribers`, payload && payload.payload ? payload.payload.name : ""]
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {tierPieData.map((tier, index) => (
                    <div key={tier.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span>{tier.name}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {tier.value} members · {currencyFormatter.format(tier.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background/60 backdrop-blur-xl border border-border/40">
        <CardHeader>
          <CardTitle>Platform footprint</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FootprintStat icon={<FileText className="w-4 h-4" />} label="Total posts" value={overview.totalPosts} />
          <FootprintStat icon={<Calendar className="w-4 h-4" />} label="Events hosted" value={overview.totalEvents} />
          <FootprintStat icon={<MessageCircle className="w-4 h-4" />} label="Comments" value={overview.totalComments} />
          <FootprintStat icon={<Heart className="w-4 h-4" />} label="Likes" value={overview.totalLikes} />
        </CardContent>
      </Card>
    </div>
  );
}

interface AnalyticsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "primary" | "secondary" | "positive" | "purple";
  footer?: string;
  footerPositive?: boolean;
}

const CARD_TONE_STYLES: Record<
  NonNullable<AnalyticsCardProps["tone"]>,
  { gradient: string; icon: string }
> = {
  primary: {
    gradient: "from-[#F92672]/10 via-[#AE81FF]/10 to-[#66D9EF]/10",
    icon: "from-[#F92672] to-[#AE81FF]",
  },
  secondary: {
    gradient: "from-[#A6E22E]/10 via-[#E6DB74]/10 to-[#FD971F]/10",
    icon: "from-[#A6E22E] to-[#FD971F]",
  },
  positive: {
    gradient: "from-emerald-500/10 via-green-500/10 to-teal-500/10",
    icon: "from-emerald-500 to-teal-500",
  },
  purple: {
    gradient: "from-[#66D9EF]/10 via-[#AE81FF]/10 to-[#F92672]/10",
    icon: "from-[#66D9EF] to-[#AE81FF]",
  },
};

function AnalyticsCard({
  title,
  value,
  icon,
  tone = "primary",
  footer,
  footerPositive,
}: AnalyticsCardProps) {
  const styles = CARD_TONE_STYLES[tone];

  return (
    <Card className="relative overflow-hidden border border-border/40 bg-background/60 backdrop-blur-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} -z-10`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${styles.icon} flex items-center justify-center shadow`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl md:text-4xl font-bold">{value}</div>
        {footer && (
          <div className="flex items-center gap-2 text-xs mt-2 text-muted-foreground">
            {footerPositive !== undefined && footerPositive !== null ? (
              footerPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )
            ) : null}
            <span>{footer}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FootprintStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{numberFormatter.format(value)}</p>
      </div>
    </div>
  );
}
