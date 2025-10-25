"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Supporter {
  id: string;
  name: string;
  avatar?: string;
  totalAmount: number;
  rank: number;
}

function TopSupportersWidget() {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creator");
  const limit = parseInt(searchParams.get("limit") || "5");
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  useEffect(() => {
    if (!creatorId) return;

    const fetchTopSupporters = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/donations/top-supporters?creatorId=${creatorId}&limit=${limit}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSupporters(data.data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching supporters:", error);
      }
    };

    fetchTopSupporters();
    const interval = setInterval(fetchTopSupporters, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [creatorId, limit]);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "⭐";
  };

  return (
    <div className="fixed top-8 right-8 pointer-events-none">
      <div className="bg-gradient-to-r from-yellow-600/95 via-orange-600/95 to-red-600/95 backdrop-blur-sm p-1 rounded-2xl shadow-2xl">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 min-w-[350px]">
          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              🏆 Top Supporters
            </h3>
          </div>

          {/* Supporters List */}
          <div className="space-y-3">
            {supporters.length > 0 ? (
              supporters.map((supporter) => (
                <div
                  key={supporter.id}
                  className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 transition-all hover:bg-gray-800"
                >
                  {/* Rank */}
                  <div className="text-2xl w-8 text-center flex-shrink-0">
                    {getMedalEmoji(supporter.rank)}
                  </div>

                  {/* Avatar */}
                  {supporter.avatar ? (
                    <img
                      src={supporter.avatar}
                      alt={supporter.name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {supporter.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      {supporter.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      ${supporter.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                No supporters yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopSupportersPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense fallback={<div>Loading...</div>}>
        <TopSupportersWidget />
      </Suspense>
    </div>
  );
}
