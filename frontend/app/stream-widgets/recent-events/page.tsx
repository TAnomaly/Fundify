"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Event {
  id: string;
  type: "donation" | "subscription";
  name: string;
  amount?: number;
  tierName?: string;
  message?: string;
  timestamp: string;
}

function RecentEventsWidget() {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creator");
  const limit = parseInt(searchParams.get("limit") || "5");
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!creatorId) return;

    const fetchEvents = async () => {
      try {
        const [donationsRes, subscriptionsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/donations/recent?creatorId=${creatorId}&limit=${limit}`
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/subscriptions/recent?creatorId=${creatorId}&limit=${limit}`
          ),
        ]);

        const donations = donationsRes.ok ? await donationsRes.json() : { data: [] };
        const subscriptions = subscriptionsRes.ok
          ? await subscriptionsRes.json()
          : { data: [] };

        const allEvents: Event[] = [
          ...(donations.data || []).map((d: any) => ({
            id: d.id,
            type: "donation" as const,
            name: d.anonymous ? "Anonymous" : d.donor?.name || "Anonymous",
            amount: d.amount,
            message: d.message,
            timestamp: d.createdAt,
          })),
          ...(subscriptions.data || []).map((s: any) => ({
            id: s.id,
            type: "subscription" as const,
            name: s.subscriber?.name || "Anonymous",
            tierName: s.tier?.name,
            timestamp: s.createdAt,
          })),
        ];

        // Sort by timestamp and take latest
        allEvents.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setEvents(allEvents.slice(0, limit));
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [creatorId, limit]);

  const getEventIcon = (type: string) => {
    return type === "donation" ? "💰" : "⭐";
  };

  const formatTime = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="fixed bottom-8 right-8 pointer-events-none">
      <div className="bg-gradient-to-r from-blue-600/95 via-cyan-600/95 to-teal-600/95 backdrop-blur-sm p-1 rounded-2xl shadow-2xl">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 min-w-[400px] max-h-[500px] overflow-hidden">
          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white">📊 Recent Activity</h3>
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-hide">
            {events.length > 0 ? (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3 animate-slide-in"
                >
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-white font-semibold truncate">
                        {event.name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.type === "donation" && event.amount && (
                      <div className="text-green-400 font-bold">
                        ${event.amount.toFixed(2)}
                      </div>
                    )}
                    {event.type === "subscription" && event.tierName && (
                      <div className="text-purple-400 font-medium">
                        {event.tierName}
                      </div>
                    )}
                    {event.message && (
                      <div className="text-sm text-gray-300 italic mt-1 truncate">
                        &quot;{event.message}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default function RecentEventsPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense fallback={<div>Loading...</div>}>
        <RecentEventsWidget />
      </Suspense>
    </div>
  );
}
