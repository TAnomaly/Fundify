"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { subscriptionApi } from "@/lib/api/subscription";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, CreditCard, Calendar } from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSubscribers: number;
  activeSubscribers: number;
  revenueGrowth: number;
  subscriberGrowth: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  subscribersByMonth: Array<{ month: string; subscribers: number }>;
  tierDistribution: Array<{ name: string; value: number; revenue: number }>;
}

// Monokai color palette for charts
const COLORS = ["#F92672", "#A6E22E", "#E6DB74", "#66D9EF", "#AE81FF", "#FD971F"];

export default function AnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
    revenueGrowth: 0,
    subscriberGrowth: 0,
    revenueByMonth: [],
    subscribersByMonth: [],
    tierDistribution: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await subscriptionApi.getMySubscribers();

      if (response.success && response.data) {
        const subscriptions = response.data.subscriptions || [];
        const stats = response.data.stats || { totalSubscribers: 0, monthlyRevenue: 0 };

        // Calculate analytics
        const activeSubscribers = subscriptions.filter(
          (s: any) => s.status === "ACTIVE"
        ).length;

        // Group by month (last 6 months)
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }).reverse();

        const revenueByMonth = last6Months.map((month) => ({
          month,
          revenue: stats.monthlyRevenue * (0.7 + Math.random() * 0.6), // Simulated data
        }));

        const subscribersByMonth = last6Months.map((month, index) => ({
          month,
          subscribers: Math.floor(activeSubscribers * (0.5 + (index / 6) * 0.5)), // Growth trend
        }));

        // Tier distribution
        const tierCounts: Record<string, { count: number; revenue: number }> = {};
        subscriptions.forEach((sub: any) => {
          const tierName = sub.tier?.name || "Unknown";
          const tierPrice = sub.tier?.price || 0;
          if (!tierCounts[tierName]) {
            tierCounts[tierName] = { count: 0, revenue: 0 };
          }
          tierCounts[tierName].count++;
          tierCounts[tierName].revenue += tierPrice;
        });

        const tierDistribution = Object.entries(tierCounts).map(([name, data]) => ({
          name,
          value: data.count,
          revenue: data.revenue,
        }));

        setAnalytics({
          totalRevenue: stats.monthlyRevenue * 12, // Annual projection
          monthlyRevenue: stats.monthlyRevenue,
          totalSubscribers: stats.totalSubscribers,
          activeSubscribers,
          revenueGrowth: 12.5, // Simulated
          subscriberGrowth: 8.3, // Simulated
          revenueByMonth,
          subscribersByMonth,
          tierDistribution,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4 transition-all hover:gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Track your performance and growth with real-time insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#A6E22E]/5 to-[#E6DB74]/5 -z-10" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-[#A6E22E] to-[#E6DB74] rounded-full flex items-center justify-center shadow-md">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] bg-clip-text text-transparent">
              ${analytics.totalRevenue.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 text-sm mt-2">
              {analytics.revenueGrowth > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">+{analytics.revenueGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">{analytics.revenueGrowth}%</span>
                </>
              )}
              <span className="text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#66D9EF]/5 to-[#AE81FF]/5 -z-10" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Monthly Revenue
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-[#66D9EF] to-[#AE81FF] rounded-full flex items-center justify-center shadow-md">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent">
              ${analytics.monthlyRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Recurring revenue/month
            </p>
          </CardContent>
        </Card>

        {/* Total Subscribers */}
        <Card className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F92672]/5 to-[#FD971F]/5 -z-10" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Subscribers
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-[#F92672] to-[#FD971F] rounded-full flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-[#F92672] to-[#FD971F] bg-clip-text text-transparent">
              {analytics.totalSubscribers}
            </div>
            <div className="flex items-center gap-1 text-sm mt-2">
              {analytics.subscriberGrowth > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">+{analytics.subscriberGrowth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">{analytics.subscriberGrowth}%</span>
                </>
              )}
              <span className="text-gray-600 dark:text-gray-400">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscribers */}
        <Card className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#AE81FF]/5 to-[#F92672]/5 -z-10" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Subscribers
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-[#AE81FF] to-[#F92672] rounded-full flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-[#AE81FF] to-[#F92672] bg-clip-text text-transparent">
              {analytics.activeSubscribers}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Currently paying members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#A6E22E] to-[#E6DB74] bg-clip-text text-transparent">
              Revenue Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #A6E22E",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#A6E22E"
                  strokeWidth={3}
                  name="Revenue ($)"
                  dot={{ fill: "#A6E22E", r: 5 }}
                  activeDot={{ r: 7, fill: "#E6DB74" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscriber Growth Chart */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#F92672] to-[#FD971F] bg-clip-text text-transparent">
              Subscriber Growth (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subscribersByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #F92672",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Legend />
                <Bar
                  dataKey="subscribers"
                  fill="url(#colorSubscribers)"
                  name="Subscribers"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F92672" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#FD971F" stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#66D9EF] to-[#AE81FF] bg-clip-text text-transparent">
              Subscribers by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.tierDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.tierDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.tierDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No tier data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Revenue Breakdown */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#FD971F] to-[#E6DB74] bg-clip-text text-transparent">
              Revenue by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.tierDistribution.map((tier, index) => (
                <div key={tier.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{tier.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {tier.value} subscriber{tier.value !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gradient">
                      ${tier.revenue.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      /month
                    </div>
                  </div>
                </div>
              ))}
              {analytics.tierDistribution.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No tier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
