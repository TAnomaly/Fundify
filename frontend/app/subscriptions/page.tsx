"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated } from "@/lib/auth";
import { openCustomerPortal } from "@/lib/stripe";
import toast from "react-hot-toast";
import axios from "axios";
import { ExternalLink, CreditCard, Calendar, DollarSign } from "lucide-react";

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "PAUSED" | "EXPIRED";
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  tier: {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: "MONTHLY" | "YEARLY";
    perks: string[];
  };
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login?redirect=/subscriptions");
      return;
    }
    loadSubscriptions();
  }, [router]);

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/my-subscriptions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSubscriptions(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setOpeningPortal(true);
      await openCustomerPortal();
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
      setOpeningPortal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-800";
      case "EXPIRED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              My <span className="text-gradient">Subscriptions</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your creator subscriptions and billing
            </p>
          </div>
          {subscriptions.length > 0 && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={openingPortal}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {openingPortal ? "Opening..." : "Manage Billing"}
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <Card className="shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  No Active Subscriptions
                </h3>
                <p className="text-muted-foreground mb-6">
                  Support your favorite creators by subscribing to their membership tiers
                </p>
              </div>
              <Button
                variant="gradient"
                size="lg"
                onClick={() => router.push("/campaigns")}
              >
                Explore Creators
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {subscription.creator.avatar ? (
                        <img
                          src={subscription.creator.avatar}
                          alt={subscription.creator.name}
                          className="w-16 h-16 rounded-full"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                          {subscription.creator.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl">
                          {subscription.creator.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {subscription.tier.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Price</div>
                        <div className="font-semibold">
                          ${subscription.tier.price}/{subscription.tier.interval === "MONTHLY" ? "mo" : "yr"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">Started</div>
                        <div className="font-semibold">
                          {formatDate(subscription.startDate)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {subscription.status === "CANCELLED" ? "Ends" : "Next Billing"}
                        </div>
                        <div className="font-semibold">
                          {formatDate(subscription.endDate || subscription.nextBillingDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/creators/${subscription.creator.name.toLowerCase().replace(/\s+/g, "-")}`)
                      }
                      className="flex-1"
                    >
                      View Creator
                    </Button>
                    {subscription.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageBilling}
                        disabled={openingPortal}
                        className="flex-1"
                      >
                        {openingPortal ? "Opening..." : "Manage"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
