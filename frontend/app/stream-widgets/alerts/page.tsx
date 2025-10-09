"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Suspense } from "react";

interface Alert {
  id: string;
  type: "donation" | "subscription";
  amount?: number;
  message?: string;
  donorName: string;
  tierName?: string;
}

function AlertWidget() {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creator");
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // WebSocket connection for real-time alerts
  useEffect(() => {
    if (!creatorId) return;

    // Poll for new donations/subscriptions every 5 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/donations/recent?creatorId=${creatorId}&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const latestDonation = data.data[0];
            showAlert({
              id: latestDonation.id,
              type: "donation",
              amount: latestDonation.amount,
              message: latestDonation.message,
              donorName: latestDonation.anonymous
                ? "Anonymous"
                : latestDonation.donor?.name || "Anonymous",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [creatorId]);

  const showAlert = useCallback((alert: Alert) => {
    setCurrentAlert(alert);
    setIsAnimating(true);

    // Confetti effect
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Play sound (you can add custom sound here)
    if (typeof Audio !== "undefined") {
      const audio = new Audio("/sounds/donation.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore errors if sound file doesn't exist
    }

    // Hide alert after 8 seconds
    setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => setCurrentAlert(null), 1000);
    }, 8000);
  }, []);

  if (!currentAlert || !isAnimating) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`transform transition-all duration-1000 ${
          isAnimating
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-50 opacity-0 translate-y-20"
        }`}
      >
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-1 rounded-3xl shadow-2xl">
          <div className="bg-gray-900 rounded-3xl p-8 min-w-[500px]">
            {/* Alert Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">
                {currentAlert.type === "donation" ? "💰" : "⭐"}
              </div>
              <h2 className="text-4xl font-bold text-white mb-2">
                {currentAlert.type === "donation"
                  ? "New Donation!"
                  : "New Subscriber!"}
              </h2>
            </div>

            {/* Donor Info */}
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                {currentAlert.donorName}
              </div>
              {currentAlert.amount && (
                <div className="text-5xl font-bold text-white">
                  ${currentAlert.amount.toFixed(2)}
                </div>
              )}
              {currentAlert.tierName && (
                <div className="text-2xl text-purple-300 mt-2">
                  {currentAlert.tierName}
                </div>
              )}
            </div>

            {/* Message */}
            {currentAlert.message && (
              <div className="bg-gray-800 rounded-2xl p-6 mt-4">
                <p className="text-xl text-white text-center italic">
                  "{currentAlert.message}"
                </p>
              </div>
            )}

            {/* Animated border */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-50 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StreamAlertsPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense fallback={<div>Loading...</div>}>
        <AlertWidget />
      </Suspense>
    </div>
  );
}
