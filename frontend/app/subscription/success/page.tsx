"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/subscriptions");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold mb-4 text-gradient">
            Subscription Successful! 🎉
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Thank you for your support! Your subscription is now active.
          </p>

          {/* Info Box */}
          <div className="bg-gradient-soft rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">What happens next?</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>You now have access to exclusive content from this creator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>You'll receive a confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Your card will be charged monthly/yearly automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>You can manage or cancel your subscription anytime</span>
              </li>
            </ul>
          </div>

          {/* Session ID */}
          {sessionId && (
            <div className="text-xs text-muted-foreground mb-6 font-mono bg-gray-100 p-3 rounded-lg overflow-hidden text-ellipsis">
              Session ID: {sessionId}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gradient"
              size="lg"
              onClick={() => router.push("/subscriptions")}
              className="shadow-lg"
            >
              View My Subscriptions
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/campaigns")}
            >
              Explore More Creators
            </Button>
          </div>

          {/* Auto Redirect Notice */}
          <p className="text-sm text-muted-foreground mt-8">
            Redirecting to your subscriptions in {countdown} seconds...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
