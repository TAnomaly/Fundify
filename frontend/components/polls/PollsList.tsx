"use client";

import React, { useEffect, useState } from "react";
import PollCard from "./PollCard";
import CreatePollModal from "./CreatePollModal";
import { toast } from "sonner";

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

interface PollsListProps {
  creatorId: string;
  isOwner?: boolean;
  showCreateButton?: boolean;
}

export default function PollsList({
  creatorId,
  isOwner = false,
  showCreateButton = true,
}: PollsListProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/polls/creator/${creatorId}`,
        { headers }
      );

      const data = await response.json();

      if (data.success) {
        setPolls(data.data);
      } else {
        console.error("Failed to fetch polls:", data.message);
      }
    } catch (error) {
      console.error("Fetch polls error:", error);
      toast.error("Failed to load polls");
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPolls();
  }, [creatorId]);

  const handlePollCreated = () => {
    fetchPolls();
  };

  const handleVote = (pollId: string, optionIndex: number) => {
    // Update local state to reflect vote
    setPolls((prevPolls) =>
      prevPolls.map((poll) => {
        if (poll.id === pollId) {
          const newVoteCounts = { ...poll.voteCounts };
          newVoteCounts[optionIndex] = (newVoteCounts[optionIndex] || 0) + 1;
          return {
            ...poll,
            voteCounts: newVoteCounts,
            totalVotes: poll.totalVotes + 1,
            hasVoted: true,
            userVotedIndex: optionIndex,
          };
        }
        return poll;
      })
    );
  };

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
          <h2 className="text-2xl font-bold">Polls</h2>
          <CreatePollModal onPollCreated={handlePollCreated} />
        </div>
      )}

      {polls.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <p className="text-lg font-semibold text-muted-foreground mb-2">
            No polls yet
          </p>
          {isOwner ? (
            <p className="text-sm text-muted-foreground mb-4">
              Create your first poll to engage with your supporters
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This creator hasn&apos;t created any polls yet
            </p>
          )}
          {isOwner && <CreatePollModal onPollCreated={handlePollCreated} />}
        </div>
      ) : (
        <div className="grid gap-6">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              showCreator={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
