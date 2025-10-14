"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

interface GoalCardProps {
  goal: Goal;
  showCreator?: boolean;
}

export default function GoalCard({ goal, showCreator = false }: GoalCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const daysUntilDeadline = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className={`overflow-hidden ${goal.isCompleted ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : ''}`}>
      <CardHeader>
        {showCreator && goal.creator && (
          <div className="flex items-center gap-3 mb-3">
            {goal.creator.avatar ? (
              <img
                src={goal.creator.avatar}
                alt={goal.creator.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                {goal.creator.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{goal.creator.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{goal.title}</CardTitle>
            {goal.description && (
              <CardDescription className="text-sm">{goal.description}</CardDescription>
            )}
          </div>
          {goal.isCompleted && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Completed!
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-bold text-primary">
                {goal.type === 'REVENUE' ? formatCurrency(goal.currentAmount) : goal.currentAmount.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                of {goal.type === 'REVENUE' ? formatCurrency(goal.targetAmount) : goal.targetAmount.toLocaleString()}
              </span>
            </div>
            <Progress value={goal.progress} className="h-3" />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-semibold text-primary">
                {goal.progress}% funded
              </span>
              {!goal.isCompleted && (
                <span className="text-sm text-muted-foreground">
                  {goal.type === 'REVENUE' ? formatCurrency(goal.remaining) : goal.remaining.toLocaleString()} to go
                </span>
              )}
            </div>
          </div>

          {/* Reward */}
          {goal.rewardDescription && (
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                🎁 Reward when goal is reached:
              </p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {goal.rewardDescription}
              </p>
            </div>
          )}

          {/* Deadline */}
          {daysUntilDeadline !== null && !goal.isCompleted && (
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={daysUntilDeadline <= 7 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>
                {daysUntilDeadline > 0
                  ? `${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'} remaining`
                  : 'Deadline passed'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
