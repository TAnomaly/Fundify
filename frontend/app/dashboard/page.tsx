"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { userApi, donationApi, campaignApi } from "@/lib/api";
import { Campaign, Donation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRaised: 0,
    totalDonated: 0,
    totalBackers: 0,
  });

  const loadDashboardData = useCallback(async () => {
    console.log('loadDashboardData called');
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      console.log('currentUser:', currentUser);

      if (!currentUser?.id) {
        console.log('No user ID found');
        toast.error("User session not found. Please login again.");
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Debug: Log API URL
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
      console.log('Making API calls...');

      // Fetch all data in parallel for faster loading
      const [userResponse, campaignsResponse, donationsResponse] = await Promise.allSettled([
        userApi.getMe(),
        userApi.getCampaigns(currentUser.id),
        donationApi.getMyDonations(),
      ]);

      console.log('API responses:', {
        user: userResponse.status,
        campaigns: campaignsResponse.status,
        donations: donationsResponse.status
      });

      // Handle user profile
      if (userResponse.status === 'fulfilled' && userResponse.value.success) {
        setUser(userResponse.value.data);
      }

      // Handle campaigns
      if (campaignsResponse.status === 'fulfilled' && campaignsResponse.value.success) {
        const campaignsData = campaignsResponse.value.data || [];

        // Transform campaigns to match frontend types
        const transformedCampaigns = campaignsData.map((c: any) => ({
          ...c,
          goal: c.goal || c.goalAmount,
          imageUrl: c.imageUrl || c.coverImage,
          backers: c.backers || c._count?.donations || 0,
        }));

        setCampaigns(transformedCampaigns);

        // Calculate stats
        const totalRaised = transformedCampaigns.reduce(
          (sum, c) => sum + (c.currentAmount || 0),
          0
        );
        const totalBackers = transformedCampaigns.reduce(
          (sum, c) => sum + (c.backers || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          totalCampaigns: transformedCampaigns.length,
          totalRaised,
          totalBackers,
        }));
      } else if (campaignsResponse.status === 'rejected') {
        console.error("Failed to load campaigns:", campaignsResponse.reason);
      }

      // Handle donations
      if (donationsResponse.status === 'fulfilled' && donationsResponse.value.success) {
        const donationsData = donationsResponse.value.data || [];
        setDonations(donationsData);

        const totalDonated = donationsData.reduce(
          (sum, d) => sum + (d.amount || 0),
          0
        );
        setStats((prev) => ({ ...prev, totalDonated }));
      } else if (donationsResponse.status === 'rejected') {
        console.error("Failed to load donations:", donationsResponse.reason);
      }

    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      let errorMessage = "Failed to load dashboard data";

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "Connection timeout. Please check your internet or try again.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data
      });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    console.log('Dashboard mounting...');
    console.log('isAuthenticated:', isAuthenticated());
    console.log('getCurrentUser:', getCurrentUser());

    if (!isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      router.push("/login");
      return;
    }

    console.log('Loading dashboard data...');
    loadDashboardData();

    // Safety timeout - stop loading after 10 seconds
    const timeout = setTimeout(() => {
      console.warn('Dashboard loading timeout - forcing stop');
      setIsLoading(false);
      toast.error('Dashboard took too long to load. Check console for errors.');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loadDashboardData, router]);

  const deleteCampaign = async (campaignId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this campaign?")) {
      return;
    }

    try {
      const response = await campaignApi.delete(campaignId);
      if (response.success) {
        toast.success("Campaign deleted successfully");
        // Reload dashboard data
        loadDashboardData();
      } else {
        toast.error(response.message || "Failed to delete campaign");
      }
    } catch (error: any) {
      console.error("Failed to delete campaign:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete campaign";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-primary mx-auto mb-4"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-soft">
      <div className="bg-gradient-primary text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold">
              Welcome back, {user?.username || "Friend"}!
            </h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl">
            Track your impact, manage campaigns, and see how you&apos;re making a difference in the community
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="shadow-soft hover:shadow-soft-hover transition-all duration-300 border-0 bg-glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Total Campaigns</p>
                  <p className="text-3xl font-bold text-gradient">
                    {stats.totalCampaigns}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-500/20 dark:to-teal-500/20 rounded-2xl flex items-center justify-center shadow-soft">
                  <svg
                    className="w-7 h-7 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-soft-hover transition-all duration-300 border-0 bg-glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Total Raised</p>
                  <p className="text-3xl font-bold text-gradient">
                    {formatCurrency(stats.totalRaised)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-2xl flex items-center justify-center shadow-soft">
                  <svg
                    className="w-7 h-7 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-soft-hover transition-all duration-300 border-0 bg-glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Total Donated</p>
                  <p className="text-3xl font-bold text-gradient">
                    {formatCurrency(stats.totalDonated)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-500/20 dark:to-rose-500/20 rounded-2xl flex items-center justify-center shadow-soft">
                  <svg
                    className="w-7 h-7 text-pink-600 dark:text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-soft-hover transition-all duration-300 border-0 bg-glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2 font-medium">Total Backers</p>
                  <p className="text-3xl font-bold text-gradient">
                    {stats.totalBackers}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl flex items-center justify-center shadow-soft">
                  <svg
                    className="w-7 h-7 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Campaigns Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Campaigns</h2>
            <Link href="/campaigns/create">
              <Button variant="gradient" size="lg">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Campaign
              </Button>
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your journey by creating your first campaign
                </p>
                <Link href="/campaigns/create">
                  <Button variant="gradient">Create Your First Campaign</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.slug}`}>
                  <Card className="hover:shadow-soft-hover shadow-soft transition-all duration-300 cursor-pointer h-full border-0 bg-glass-card overflow-hidden group">
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span className="px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm text-xs font-semibold rounded-full shadow-soft capitalize">
                          <span className="text-gradient">{campaign.status}</span>
                        </span>
                        <button
                          onClick={(e) => deleteCampaign(campaign.id, e)}
                          className="p-2 bg-red-500/95 hover:bg-red-600 backdrop-blur-sm text-white rounded-full transition-all duration-200 shadow-soft hover:shadow-soft-hover hover:scale-110"
                          title="Delete campaign"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-gradient transition-all">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {campaign.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-gradient">
                            {formatCurrency(campaign.currentAmount)}
                          </span>
                          <span className="text-muted-foreground font-medium">
                            of {formatCurrency(campaign.goal)}
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-primary transition-all duration-500 rounded-full shadow-glow"
                            style={{
                              width: `${calculatePercentage(
                                campaign.currentAmount,
                                campaign.goal
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-muted-foreground">{campaign.backers || 0} backers</span>
                          <span className="text-gradient">{calculatePercentage(campaign.currentAmount, campaign.goal)}% funded</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Donations Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Donations</h2>
          {donations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-6">
                  Support amazing campaigns and make a difference
                </p>
                <Link href="/campaigns">
                  <Button variant="gradient">Explore Campaigns</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {donations.slice(0, 5).map((donation) => (
                    <div
                      key={donation.id}
                      className="flex items-center justify-between py-4 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {donation.campaign?.title || "Campaign"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </p>
                        {donation.message && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            &quot;{donation.message}&quot;
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-primary">
                          {formatCurrency(donation.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {donation.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {donations.length > 5 && (
                  <div className="text-center mt-4">
                    <Button variant="outline">View All Donations</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
