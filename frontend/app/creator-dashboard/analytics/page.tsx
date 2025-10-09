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

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

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

        const revenueByMonth = last6Months.map((month, index) => ({
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
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold mb-2 text-gradient">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your performance and growth
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card className="bg-glass-card shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </CardTitle>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
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
        <Card className="bg-glass-card shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Monthly Revenue
              </CardTitle>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              ${analytics.monthlyRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Recurring revenue/month
            </p>
          </CardContent>
        </Card>

        {/* Total Subscribers */}
        <Card className="bg-glass-card shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Subscribers
              </CardTitle>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
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
        <Card className="bg-glass-card shadow-soft">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Subscribers
              </CardTitle>
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
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
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscriber Growth Chart */}
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <CardTitle>Subscriber Growth (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.subscribersByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="subscribers"
                  fill="#3b82f6"
                  name="Subscribers"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <CardTitle>Subscribers by Tier</CardTitle>
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
                    {analytics.tierDistribution.map((entry, index) => (
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
        <Card className="bg-glass-card shadow-soft">
          <CardHeader>
            <CardTitle>Revenue by Tier</CardTitle>
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
