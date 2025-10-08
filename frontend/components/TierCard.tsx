"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface TierCardProps {
  tier: {
    id: string;
    name: string;
    description: string;
    price: number;
    interval: "MONTHLY" | "YEARLY";
    perks: string[];
    currentSubscribers?: number;
    maxSubscribers?: number;
    isActive: boolean;
  };
  isPopular?: boolean;
  onSubscribe: (tierId: string) => void;
  isSubscribed?: boolean;
  isLoading?: boolean;
}

export function TierCard({
  tier,
  isPopular,
  onSubscribe,
  isSubscribed,
  isLoading,
}: TierCardProps) {
  const isFull = tier.maxSubscribers && tier.currentSubscribers
    ? tier.currentSubscribers >= tier.maxSubscribers
    : false;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
        isPopular ? "border-2 border-purple-500 shadow-xl" : ""
      } ${!tier.isActive || isFull ? "opacity-60" : ""}`}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">{tier.name}</CardTitle>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-bold">${tier.price}</span>
          <span className="text-muted-foreground">
            /{tier.interval === "MONTHLY" ? "month" : "year"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {tier.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Perks List */}
        <ul className="space-y-2">
          {tier.perks.map((perk, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{perk}</span>
            </li>
          ))}
        </ul>

        {/* Subscriber Count */}
        {tier.maxSubscribers && (
          <div className="text-xs text-muted-foreground">
            {tier.currentSubscribers || 0} / {tier.maxSubscribers} subscribers
          </div>
        )}

        {/* Subscribe Button */}
        <Button
          variant={isPopular ? "gradient" : "outline"}
          className="w-full"
          onClick={() => onSubscribe(tier.id)}
          disabled={!tier.isActive || isFull || isSubscribed || isLoading}
        >
          {isLoading
            ? "Processing..."
            : isSubscribed
            ? "✓ Subscribed"
            : isFull
            ? "Tier Full"
            : !tier.isActive
            ? "Unavailable"
            : "Subscribe Now"}
        </Button>

        {isSubscribed && (
          <p className="text-xs text-center text-green-600">
            You have access to this tier
          </p>
        )}
      </CardContent>
    </Card>
  );
}
