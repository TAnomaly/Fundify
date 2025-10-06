"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { userApi, donationApi } from "@/lib/api";
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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);

      // Fetch user's full profile
      const userResponse = await userApi.getMe();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
      }

      // Fetch user's campaigns
      if (currentUser?.id) {
        const campaignsResponse = await userApi.getCampaigns(currentUser.id);
        if (campaignsResponse.success && campaignsResponse.data) {
          setCampaigns(campaignsResponse.data);

          // Calculate stats
          const totalRaised = campaignsResponse.data.reduce(
            (sum, c) => sum + c.currentAmount,
            0
          );
          const totalBackers = campaignsResponse.data.reduce(
            (sum, c) => sum + (c.backers || 0),
            0
          );

          setStats((prev) => ({
            ...prev,
            totalCampaigns: campaignsResponse.data.length,
            totalRaised,
            totalBackers,
          }));
        }
      }

      // Fetch user's donations
      const donationsResponse = await donationApi.getMyDonations();
      if (donationsResponse.success && donationsResponse.data) {
        setDonations(donationsResponse.data);

        const totalDonated = donationsResponse.data.reduce(
          (sum, d) => sum + d.amount,
          0
        );
        setStats((prev) => ({ ...prev, totalDonated }));
      }
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.username || "Friend"}!
          </h1>
          <p className="text-lg opacity-90">
            Here's what's happening with your campaigns and donations
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Campaigns</p>
                  <p className="text-3xl font-bold text-gradient">
                    {stats.totalCampaigns}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
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

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Raised</p>
                  <p className="text-3xl font-bold text-gradient">
                    {formatCurrency(stats.totalRaised)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
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

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Donated</p>
                  <p className="text-3xl font-bold text-gradient">
                    {formatCurrency(stats.totalDonated)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
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

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Backers</p>
                  <p className="text-3xl font-bold text-gradient">
                    {stats.totalBackers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-orange-600"
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
                  <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                    <div className="relative h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-purple-700 capitalize">
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {campaign.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-primary">
                            {formatCurrency(campaign.currentAmount)}
                          </span>
                          <span className="text-muted-foreground">
                            of {formatCurrency(campaign.goal)}
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-primary transition-all"
                            style={{
                              width: `${calculatePercentage(
                                campaign.currentAmount,
                                campaign.goal
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{campaign.backers || 0} backers</span>
                          <span>{calculatePercentage(campaign.currentAmount, campaign.goal)}% funded</span>
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
                            "{donation.message}"
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
