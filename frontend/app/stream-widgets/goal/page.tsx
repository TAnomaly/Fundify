"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface GoalData {
  current: number;
  target: number;
  title: string;
  percentage: number;
}

function GoalWidget() {
  const searchParams = useSearchParams();
  const creatorId = searchParams.get("creator");
  const goalId = searchParams.get("goal");
  const [goalData, setGoalData] = useState<GoalData>({
    current: 0,
    target: 1000,
    title: "Stream Goal",
    percentage: 0,
  });

  useEffect(() => {
    if (!creatorId) return;

    const fetchGoalData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/goals/${goalId || "default"}?creatorId=${creatorId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const current = data.data.currentAmount || 0;
            const target = data.data.targetAmount || 1000;
            setGoalData({
              current,
              target,
              title: data.data.title || "Stream Goal",
              percentage: Math.min((current / target) * 100, 100),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching goal:", error);
      }
    };

    fetchGoalData();
    const interval = setInterval(fetchGoalData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [creatorId, goalId]);

  return (
    <div className="fixed bottom-8 left-8 pointer-events-none">
      <div className="bg-gradient-to-r from-purple-600/95 via-pink-600/95 to-blue-600/95 backdrop-blur-sm p-1 rounded-2xl shadow-2xl">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-6 min-w-[400px]">
          {/* Title */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-white mb-1">{goalData.title}</h3>
            <div className="text-sm text-gray-300">
              ${goalData.current.toFixed(2)} / ${goalData.target.toFixed(2)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-8 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-1000 ease-out flex items-center justify-center"
              style={{ width: `${goalData.percentage}%` }}
            >
              {goalData.percentage > 15 && (
                <span className="text-white font-bold text-sm px-2">
                  {goalData.percentage.toFixed(0)}%
                </span>
              )}
            </div>
            {goalData.percentage <= 15 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {goalData.percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>Remaining: ${(goalData.target - goalData.current).toFixed(2)}</span>
            <span>{goalData.percentage >= 100 ? "🎉 COMPLETED!" : "In Progress"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalTrackerPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <Suspense fallback={<div>Loading...</div>}>
        <GoalWidget />
      </Suspense>
    </div>
  );
}
