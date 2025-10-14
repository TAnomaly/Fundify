"use client";

import React, { useEffect, useState } from "react";
import GoalCard from "./GoalCard";
import CreateGoalModal from "./CreateGoalModal";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  remaining: number;
  rewardDescription?: string;
  deadline?: string;
  isCompleted: boolean;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface GoalsListProps {
  creatorId: string;
  isOwner?: boolean;
  showCreateButton?: boolean;
}

export default function GoalsList({
  creatorId,
  isOwner = false,
  showCreateButton = true,
}: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/goals/creator/${creatorId}`,
        { headers }
      );

      const data = await response.json();

      if (data.success) {
        setGoals(data.data);
      }
    } catch (error) {
      console.error("Fetch goals error:", error);
      toast.error("Failed to load goals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [creatorId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner && showCreateButton && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Goals</h2>
          <CreateGoalModal onGoalCreated={fetchGoals} />
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            No goals yet
          </p>
          {isOwner ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first goal to motivate your supporters!
              </p>
              <CreateGoalModal onGoalCreated={fetchGoals} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This creator hasn't set any goals yet
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} showCreator={false} />
          ))}
        </div>
      )}
    </div>
  );
}
