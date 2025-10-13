"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PollOption {
  text: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  voteCounts: Record<number, number>;
  totalVotes: number;
  hasVoted: boolean;
  userVotedIndex?: number;
  expiresAt?: string;
  multipleChoice: boolean;
  isActive: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface PollCardProps {
  poll: Poll;
  onVote?: (pollId: string, optionIndex: number) => void;
  showCreator?: boolean;
}

export default function PollCard({ poll, onVote, showCreator = false }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(
    poll.userVotedIndex !== undefined ? poll.userVotedIndex : null
  );
  const [isVoting, setIsVoting] = useState(false);
  const [localVoteCounts, setLocalVoteCounts] = useState(poll.voteCounts);
  const [localTotalVotes, setLocalTotalVotes] = useState(poll.totalVotes);
  const [hasVoted, setHasVoted] = useState(poll.hasVoted);

  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
  const isClosed = !poll.isActive || isExpired;

  const handleVote = async (optionIndex: number) => {
    if (hasVoted && !poll.multipleChoice) {
      toast.error("You have already voted on this poll");
      return;
    }

    if (isClosed) {
      toast.error("This poll is closed");
      return;
    }

    setIsVoting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ optionIndex }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Vote recorded successfully");
        setSelectedOption(optionIndex);
        setHasVoted(true);

        // Update local vote counts
        const newVoteCounts = { ...localVoteCounts };
        newVoteCounts[optionIndex] = (newVoteCounts[optionIndex] || 0) + 1;
        setLocalVoteCounts(newVoteCounts);
        setLocalTotalVotes(localTotalVotes + 1);

        if (onVote) {
          onVote(poll.id, optionIndex);
        }
      } else {
        toast.error(data.message || "Failed to record vote");
      }
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("Failed to record vote");
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (optionIndex: number) => {
    if (localTotalVotes === 0) return 0;
    const votes = localVoteCounts[optionIndex] || 0;
    return Math.round((votes / localTotalVotes) * 100);
  };

  const getVoteCount = (optionIndex: number) => {
    return localVoteCounts[optionIndex] || 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        {showCreator && poll.creator && (
          <div className="flex items-center gap-3 mb-3">
            {poll.creator.avatar ? (
              <img
                src={poll.creator.avatar}
                alt={poll.creator.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                {poll.creator.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{poll.creator.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(poll.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
        <CardTitle className="text-xl">{poll.question}</CardTitle>
        <CardDescription>
          {localTotalVotes} {localTotalVotes === 1 ? "vote" : "votes"}
          {poll.expiresAt && (
            <span className="ml-2">
              • Expires {new Date(poll.expiresAt).toLocaleDateString()}
            </span>
          )}
          {isClosed && (
            <span className="ml-2 text-red-500 font-semibold">• Closed</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {poll.options.map((option, index) => {
            const percentage = getPercentage(index);
            const voteCount = getVoteCount(index);
            const isSelected = selectedOption === index;
            const showResults = hasVoted || isClosed;

            return (
              <div key={index} className="relative">
                {showResults ? (
                  // Show results after voting
                  <div
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2 relative z-10">
                      <span className="font-medium">{option}</span>
                      <span className="text-sm text-muted-foreground">
                        {percentage}% ({voteCount})
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10">
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show voting buttons
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 text-left justify-start hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={() => handleVote(index)}
                    disabled={isVoting || isClosed}
                  >
                    {option}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {!hasVoted && !isClosed && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {poll.multipleChoice
              ? "You can vote for multiple options"
              : "Choose one option"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
