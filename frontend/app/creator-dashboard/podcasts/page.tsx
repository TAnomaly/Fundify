"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AudioPlayer from "@/components/podcast/AudioPlayer";
import { getCurrentUser } from "@/lib/auth";
import {
  Headphones,
  Mic,
  Music2,
  PlayCircle,
  Plus,
  Radio,
  Waves,
} from "lucide-react";

type PodcastStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type EpisodeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface Podcast {
  id: string;
  title: string;
  description?: string;
  category: string;
  language: string;
  status: PodcastStatus;
  coverImage?: string;
  spotifyShowUrl?: string;
  externalFeedUrl?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    episodes: number;
  };
}

interface PodcastEpisode {
  id: string;
  title: string;
  description?: string;
  episodeNumber: number;
  duration?: number | null;
  status: EpisodeStatus;
  audioUrl?: string | null;
  spotifyEpisodeUrl?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

interface PodcastFormState {
  title: string;
  description: string;
  category: string;
  language: string;
  status: PodcastStatus;
  coverImage: string;
  spotifyShowUrl: string;
  externalFeedUrl: string;
}

interface EpisodeFormState {
  title: string;
  description: string;
  episodeNumber: string;
  duration: string;
  audioUrl: string;
  status: EpisodeStatus;
  spotifyEpisodeUrl: string;
  publishedAt: string;
}

const PODCAST_DEFAULTS: PodcastFormState = {
  title: "",
  description: "",
  category: "Technology",
  language: "English",
  status: "PUBLISHED",
  coverImage: "",
  spotifyShowUrl: "",
  externalFeedUrl: "",
};

const EPISODE_DEFAULTS: EpisodeFormState = {
  title: "",
  description: "",
  episodeNumber: "",
  duration: "",
  audioUrl: "",
  status: "PUBLISHED",
  spotifyEpisodeUrl: "",
  publishedAt: "",
};

const statusCopy: Record<
  PodcastStatus | EpisodeStatus,
  { label: string; tone: "default" | "secondary" | "outline" }
> = {
  PUBLISHED: { label: "Published", tone: "default" },
  DRAFT: { label: "Draft", tone: "secondary" },
  ARCHIVED: { label: "Archived", tone: "outline" },
};

export default function PodcastsPage() {
  const router = useRouter();
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [savingPodcast, setSavingPodcast] = useState(false);
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | null>(
    null
  );
  const [podcastForm, setPodcastForm] =
    useState<PodcastFormState>(PODCAST_DEFAULTS);
  const [episodeForm, setEpisodeForm] =
    useState<EpisodeFormState>(EPISODE_DEFAULTS);
  const [isPodcastDialogOpen, setPodcastDialogOpen] = useState(false);
  const [isEpisodeDialogOpen, setEpisodeDialogOpen] = useState(false);

  const selectedPodcast = useMemo(
    () => podcasts.find((podcast) => podcast.id === selectedPodcastId) ?? null,
    [podcasts, selectedPodcastId]
  );

  useEffect(() => {
    const initialise = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        toast.error("Please sign in to manage your podcasts");
        router.push("/login");
        return;
      }

      await loadPodcasts(currentUser.id);
    };

    initialise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // loadEpisodes depends on selectedPodcastId; additional dependencies intentionally omitted to avoid re-fetch loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedPodcastId) {
      setEpisodes([]);
      return;
    }
    loadEpisodes(selectedPodcastId);
  }, [loadEpisodes, selectedPodcastId]);

  const loadPodcasts = async (creatorId?: string) => {
    setIsLoadingPodcasts(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("You need to be logged in to manage podcasts");
        router.push("/login");
        return;
      }

      const query = creatorId
        ? `?creatorId=${creatorId}&includeDrafts=true`
        : "";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to load podcasts");
      }

      const nextPodcasts: Podcast[] = data.data?.podcasts ?? [];
      setPodcasts(nextPodcasts);

      if (nextPodcasts.length > 0 && !selectedPodcastId) {
        setSelectedPodcastId(nextPodcasts[0].id);
      }
    } catch (error) {
      console.error("Error loading podcasts", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load podcasts"
      );
    } finally {
      setIsLoadingPodcasts(false);
    }
  };

  const loadEpisodes = useCallback(async (podcastId: string) => {
    setIsLoadingEpisodes(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please log in again");
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts/${podcastId}/episodes?includeDrafts=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to load episodes");
      }

      setEpisodes(data.data?.episodes ?? []);
    } catch (error) {
      console.error("Error loading episodes", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load episodes"
      );
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [router]);

  const handleCreatePodcast = async () => {
    if (!podcastForm.title.trim()) {
      toast.error("Podcast title is required");
      return;
    }

    setSavingPodcast(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please log in again");
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: podcastForm.title.trim(),
            description: podcastForm.description.trim() || undefined,
            category: podcastForm.category,
            language: podcastForm.language,
            status: podcastForm.status,
            coverImage: podcastForm.coverImage.trim() || undefined,
            spotifyShowUrl: podcastForm.spotifyShowUrl.trim() || undefined,
            externalFeedUrl: podcastForm.externalFeedUrl.trim() || undefined,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to create podcast");
      }

      toast.success("Podcast created successfully");
      setPodcastForm(PODCAST_DEFAULTS);
      setPodcastDialogOpen(false);
      await loadPodcasts(data.data?.podcast?.creatorId);
      if (data.data?.podcast?.id) {
        setSelectedPodcastId(data.data.podcast.id);
      }
    } catch (error) {
      console.error("Error creating podcast", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create podcast"
      );
    } finally {
      setSavingPodcast(false);
    }
  };

  const handleCreateEpisode = async () => {
    if (!selectedPodcastId) {
      toast.error("Select a podcast first");
      return;
    }

    if (!episodeForm.title.trim()) {
      toast.error("Episode title is required");
      return;
    }

    if (!episodeForm.audioUrl.trim()) {
      toast.error("Please provide an audio URL");
      return;
    }

    setSavingEpisode(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please log in again");
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts/${selectedPodcastId}/episodes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: episodeForm.title.trim(),
            description: episodeForm.description.trim() || undefined,
            episodeNumber: episodeForm.episodeNumber || undefined,
            duration: episodeForm.duration
              ? parseInt(episodeForm.duration, 10)
              : undefined,
            audioUrl: episodeForm.audioUrl.trim(),
            status: episodeForm.status,
            spotifyEpisodeUrl:
              episodeForm.spotifyEpisodeUrl.trim() || undefined,
            publishedAt: episodeForm.publishedAt || undefined,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to create episode");
      }

      toast.success("Episode published");
      setEpisodeForm(EPISODE_DEFAULTS);
      setEpisodeDialogOpen(false);
      await loadEpisodes(selectedPodcastId);
    } catch (error) {
      console.error("Error creating episode", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create episode"
      );
    } finally {
      setSavingEpisode(false);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderPodcasts = () => {
    if (isLoadingPodcasts) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (podcasts.length === 0) {
      return (
        <Card className="border-dashed bg-muted/30">
          <CardHeader className="flex flex-col items-center text-center">
            <Mic className="mb-4 h-10 w-10 text-muted-foreground" />
            <CardTitle>No podcasts yet</CardTitle>
            <CardDescription>
              Launch your show by creating your first podcast. You can publish
              to supporters instantly or keep it as a draft while you refine
              episodes.
            </CardDescription>
            <Button
              className="mt-4"
              onClick={() => setPodcastDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create podcast
            </Button>
          </CardHeader>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {podcasts.map((podcast) => {
          const statusMeta = statusCopy[podcast.status];
          return (
            <button
              key={podcast.id}
              onClick={() => setSelectedPodcastId(podcast.id)}
              className={`w-full rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5 ${
                selectedPodcastId === podcast.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{podcast.title}</h3>
                    <Badge variant={statusMeta.tone}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                  {podcast.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {podcast.description}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{podcast.category}</div>
                  <div>{podcast.language}</div>
                  <div>
                    {podcast._count?.episodes ?? 0}{" "}
                    {(podcast._count?.episodes ?? 0) === 1
                      ? "episode"
                      : "episodes"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderEpisodes = () => {
    if (!selectedPodcast) {
      return (
        <Card className="h-full border-dashed bg-muted/30">
          <CardHeader className="flex h-full flex-col items-center justify-center text-center">
            <Headphones className="mb-4 h-10 w-10 text-muted-foreground" />
            <CardTitle>Select a podcast</CardTitle>
            <CardDescription>
              Choose a podcast from the list to see its episodes.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className="h-full">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlayCircle className="h-5 w-5 text-primary" />
              {selectedPodcast.title}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span>{selectedPodcast._count?.episodes ?? 0} episodes</span>
              <span>•</span>
              <span>{selectedPodcast.language}</span>
              {selectedPodcast.spotifyShowUrl && (
                <>
                  <span>•</span>
                  <a
                    href={selectedPodcast.spotifyShowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Waves className="h-4 w-4" />
                    Spotify show link
                  </a>
                </>
              )}
              {selectedPodcast.externalFeedUrl && (
                <>
                  <span>•</span>
                  <a
                    href={selectedPodcast.externalFeedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Public RSS feed
                  </a>
                </>
              )}
            </CardDescription>
          </div>
          <Button onClick={() => setEpisodeDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New episode
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingEpisodes ? (
            <div className="space-y-4">
              {[1, 2].map((loader) => (
                <Skeleton key={loader} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <Radio className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No episodes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first episode to start sharing with your followers.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setEpisodeDialogOpen(true)}
              >
                Record episode
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {episodes.map((episode) => {
                const statusMeta = statusCopy[episode.status];
                return (
                  <Card
                    key={episode.id}
                    className="border-border bg-muted/10 shadow-none"
                  >
                    <CardContent className="flex flex-col gap-4 pt-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold">
                            Episode {episode.episodeNumber}. {episode.title}
                          </h4>
                          <Badge variant={statusMeta.tone}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                        {episode.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {episode.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Music2 className="h-3.5 w-3.5" />
                            {formatDuration(episode.duration)}
                          </span>
                          {episode.publishedAt && (
                            <>
                              <span>•</span>
                              <span>
                                Published{" "}
                                {new Date(
                                  episode.publishedAt
                                ).toLocaleDateString()}
                              </span>
                            </>
                          )}
                          {episode.spotifyEpisodeUrl && (
                            <>
                              <span>•</span>
                              <a
                                href={episode.spotifyEpisodeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <Waves className="h-3.5 w-3.5" />
                                Spotify episode
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      {episode.audioUrl && (
                        <div className="w-full md:w-64">
                          <AudioPlayer src={episode.audioUrl} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3d-text text-2xl font-semibold">
            <Mic className="h-6 w-6 text-primary" />
            Podcast studio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Publish your creator podcast, manage episodes, and share Spotify
            links so supporters can follow along anywhere.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPodcastDialogOpen} onOpenChange={setPodcastDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New podcast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create podcast</DialogTitle>
                <DialogDescription>
                  Give your show a name, set visibility, and optionally link an
                  external feed so Spotify stays in sync.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="podcast-title">Title</Label>
                  <Input
                    id="podcast-title"
                    placeholder="Creator Coffee Chats"
                    value={podcastForm.title}
                    onChange={(event) =>
                      setPodcastForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="podcast-description">Description</Label>
                  <Textarea
                    id="podcast-description"
                    placeholder="Tell listeners what your show is about."
                    value={podcastForm.description}
                    onChange={(event) =>
                      setPodcastForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="podcast-category">Category</Label>
                    <Input
                      id="podcast-category"
                      value={podcastForm.category}
                      onChange={(event) =>
                        setPodcastForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="podcast-language">Language</Label>
                    <Input
                      id="podcast-language"
                      value={podcastForm.language}
                      onChange={(event) =>
                        setPodcastForm((prev) => ({
                          ...prev,
                          language: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={podcastForm.status}
                    onValueChange={(value: PodcastStatus) =>
                      setPodcastForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="podcast-cover">Cover image URL</Label>
                  <Input
                    id="podcast-cover"
                    placeholder="https://cdn.yourhost.com/podcasts/cover.jpg"
                    value={podcastForm.coverImage}
                    onChange={(event) =>
                      setPodcastForm((prev) => ({
                        ...prev,
                        coverImage: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="podcast-spotify">Spotify show link</Label>
                  <Input
                    id="podcast-spotify"
                    placeholder="https://open.spotify.com/show/..."
                    value={podcastForm.spotifyShowUrl}
                    onChange={(event) =>
                      setPodcastForm((prev) => ({
                        ...prev,
                        spotifyShowUrl: event.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your Spotify show URL to help fans subscribe. You can
                    also leave this empty and link it later.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="podcast-feed">External RSS feed</Label>
                  <Input
                    id="podcast-feed"
                    placeholder="https://anchor.fm/s/your-feed/rss"
                    value={podcastForm.externalFeedUrl}
                    onChange={(event) =>
                      setPodcastForm((prev) => ({
                        ...prev,
                        externalFeedUrl: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPodcastDialogOpen(false);
                    setPodcastForm(PODCAST_DEFAULTS);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreatePodcast} disabled={savingPodcast}>
                  {savingPodcast ? "Creating..." : "Create podcast"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="h-5 w-5 text-primary" />
              Your podcasts
            </CardTitle>
            <CardDescription>
              Manage visibility, Spotify links, and episodes for each show.
            </CardDescription>
          </CardHeader>
          <CardContent>{renderPodcasts()}</CardContent>
        </Card>

        {renderEpisodes()}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Waves className="h-5 w-5 text-primary" />
            Share on Spotify & podcast apps
          </CardTitle>
          <CardDescription>
            Fundify produces an RSS feed for every published episode. Submit
            that feed to Spotify for Podcasters, Apple Podcasts, and other
            directories to help fans discover you everywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Waves className="h-4 w-4 text-primary" />
              Spotify setup
            </h3>
            <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>1. Head to Spotify for Podcasters and click “Add show”.</li>
              <li>
                2. Paste your Fundify RSS feed (generated automatically once you
                publish).
              </li>
              <li>3. Copy the Spotify show link back here for quick access.</li>
            </ol>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <PlayCircle className="h-4 w-4 text-primary" />
              Episode best practices
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Upload high-quality MP3 or WAV files.</li>
              <li>• Add show notes and Spotify links for cross-promotion.</li>
              <li>• Schedule drafts to build a consistent release cadence.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEpisodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish new episode</DialogTitle>
            <DialogDescription>
              Upload your audio and we&apos;ll handle distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="episode-title">Title</Label>
              <Input
                id="episode-title"
                placeholder="Episode 3 — Behind the campaign"
                value={episodeForm.title}
                onChange={(event) =>
                  setEpisodeForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-description">Description</Label>
              <Textarea
                id="episode-description"
                placeholder="Add show notes, links, and takeaways."
                value={episodeForm.description}
                onChange={(event) =>
                  setEpisodeForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="episode-number">Episode number</Label>
                <Input
                  id="episode-number"
                  type="number"
                  min="1"
                  placeholder="Auto"
                  value={episodeForm.episodeNumber}
                  onChange={(event) =>
                    setEpisodeForm((prev) => ({
                      ...prev,
                      episodeNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="episode-duration">Duration (seconds)</Label>
                <Input
                  id="episode-duration"
                  type="number"
                  min="0"
                  placeholder="3600"
                  value={episodeForm.duration}
                  onChange={(event) =>
                    setEpisodeForm((prev) => ({
                      ...prev,
                      duration: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-audio">Audio file URL</Label>
              <Input
                id="episode-audio"
                placeholder="https://cdn.yourhost.com/audio/episode3.mp3"
                value={episodeForm.audioUrl}
                onChange={(event) =>
                  setEpisodeForm((prev) => ({
                    ...prev,
                    audioUrl: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={episodeForm.status}
                onValueChange={(value: EpisodeStatus) =>
                  setEpisodeForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-spotify">Spotify episode link</Label>
              <Input
                id="episode-spotify"
                placeholder="https://open.spotify.com/episode/..."
                value={episodeForm.spotifyEpisodeUrl}
                onChange={(event) =>
                  setEpisodeForm((prev) => ({
                    ...prev,
                    spotifyEpisodeUrl: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-published">Publish date (optional)</Label>
              <Input
                id="episode-published"
                type="datetime-local"
                value={episodeForm.publishedAt}
                onChange={(event) =>
                  setEpisodeForm((prev) => ({
                    ...prev,
                    publishedAt: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEpisodeDialogOpen(false);
                setEpisodeForm(EPISODE_DEFAULTS);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEpisode} disabled={savingEpisode}>
              {savingEpisode ? "Publishing..." : "Publish episode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
