"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function SubscriptionCancelledPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Cancel Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center">
              <XCircle className="w-16 h-16 text-orange-600" />
            </div>
          </div>

          {/* Cancel Message */}
          <h1 className="text-4xl font-bold mb-4">Subscription Cancelled</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your subscription was not completed. No charges have been made.
          </p>

          {/* Info Box */}
          <div className="bg-gradient-soft rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">What happened?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You closed the payment window before completing your subscription.
              Don&apos;t worry - you can try again anytime!
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span>💳</span>
                <span>Your card was not charged</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🔄</span>
                <span>You can retry the subscription process</span>
              </li>
              <li className="flex items-start gap-2">
                <span>💬</span>
                <span>Contact support if you need help</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gradient"
              size="lg"
              onClick={() => router.back()}
              className="shadow-lg"
            >
              ← Go Back & Try Again
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/campaigns")}
            >
              Browse Creators
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-sm text-muted-foreground mt-8">
            Having trouble? Contact us at{" "}
            <a
              href="mailto:support@fundify.com"
              className="text-purple-600 hover:underline"
            >
              support@fundify.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
