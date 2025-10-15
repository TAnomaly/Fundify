"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, Mic, Music, Rss, Upload } from "lucide-react";
import AudioPlayer from "@/components/podcast/AudioPlayer";
import { getCurrentUser } from "@/lib/auth";

export default function PodcastsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<string | null>(null);
  const [showCreatePodcast, setShowCreatePodcast] = useState(false);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);
  const [podcastForm, setPodcastForm] = useState({
    title: "",
    description: "",
    author: "",
    category: "Technology",
    isPublic: true,
  });
  const [episodeForm, setEpisodeForm] = useState({
    title: "",
    description: "",
    audioUrl: "",
    duration: 0,
    episodeNumber: "",
    showNotes: "",
    fileSize: 0,
  });
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    loadPodcasts();
  }, []);

  useEffect(() => {
    if (selectedPodcast) {
      loadEpisodes(selectedPodcast);
    }
  }, [selectedPodcast]);

  const loadPodcasts = async () => {
    setIsLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts/creator/${currentUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setPodcasts(data.data || []);
        if (data.data && data.data.length > 0 && !selectedPodcast) {
          setSelectedPodcast(data.data[0].id);
        }
      } else {
        toast.error(data.message || "Failed to load podcasts");
      }
    } catch (error) {
      console.error("Error loading podcasts:", error);
      toast.error("Failed to load podcasts");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEpisodes = async (podcastId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts/${podcastId}/episodes`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setEpisodes(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load episodes");
    }
  };

  const createPodcast = async () => {
    if (!podcastForm.title || !podcastForm.author) {
      toast.error("Title and author are required");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify(podcastForm),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Podcast created!");
        setShowCreatePodcast(false);
        setPodcastForm({
          title: "",
          description: "",
          author: "",
          category: "Technology",
          isPublic: true,
        });
        loadPodcasts();
      } else {
        toast.error(data.message || "Failed to create podcast");
      }
    } catch (error) {
      toast.error("Failed to create podcast");
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    setAudioFile(file);
    setUploadingAudio(true);

    try {
      // For now, we'll use a placeholder URL since we don't have S3/CDN setup
      // In production, you would upload to S3, Cloudflare R2, or similar
      const formData = new FormData();
      formData.append("file", file);

      // Get audio duration using HTML5 Audio API
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);

      await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          const duration = Math.floor(audio.duration);
          setEpisodeForm({
            ...episodeForm,
            duration,
            fileSize: file.size,
            audioUrl: URL.createObjectURL(file), // Temporary - replace with actual upload
          });
          resolve(null);
        });
      });

      toast.success(`Audio file loaded: ${file.name}`);
    } catch (error) {
      toast.error("Failed to process audio file");
    } finally {
      setUploadingAudio(false);
    }
  };

  const createEpisode = async () => {
    if (!episodeForm.title || !episodeForm.audioUrl || !episodeForm.duration) {
      toast.error("Title, audio URL, and duration are required");
      return;
    }

    if (!selectedPodcast) {
      toast.error("Please select a podcast first");
      return;
    }

    // If audioUrl is a blob URL, warn user
    if (episodeForm.audioUrl.startsWith("blob:")) {
      toast.error("Please upload your audio file to a server and paste the URL");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/podcasts/${selectedPodcast}/episodes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            ...episodeForm,
            episodeNumber: episodeForm.episodeNumber
              ? parseInt(episodeForm.episodeNumber)
              : null,
            fileSize: episodeForm.fileSize || 1000000, // Default 1MB if not set
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Episode created!");
        setShowCreateEpisode(false);
        setEpisodeForm({
          title: "",
          description: "",
          audioUrl: "",
          duration: 0,
          episodeNumber: "",
          showNotes: "",
          fileSize: 0,
        });
        setAudioFile(null);
        loadEpisodes(selectedPodcast);
      } else {
        toast.error(data.message || "Failed to create episode");
      }
    } catch (error) {
      toast.error("Failed to create episode");
    }
  };

  const trackProgress = async (episodeId: string, progress: number, completed: boolean) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/episodes/${episodeId}/listen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({ progress, completed }),
        }
      );
    } catch (error) {
      console.error("Failed to track progress");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRSSFeedUrl = (podcastId: string) => {
    return `${process.env.NEXT_PUBLIC_API_URL}/podcast/${podcastId}/rss`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Podcasts</h1>
          <p className="text-muted-foreground">Manage your podcast episodes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreatePodcast(true)}>
            <Mic className="w-4 h-4 mr-2" />
            New Podcast
          </Button>
          {selectedPodcast && (
            <Button onClick={() => setShowCreateEpisode(true)} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              New Episode
            </Button>
          )}
        </div>
      </div>

      {podcasts.length === 0 ? (
        <Card className="p-12 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No podcasts yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first podcast to start sharing audio content
          </p>
          <Button onClick={() => setShowCreatePodcast(true)}>
            <Mic className="w-4 h-4 mr-2" />
            Create Podcast
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Podcast List */}
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <Card
                key={podcast.id}
                className={`p-4 cursor-pointer transition ${
                  selectedPodcast === podcast.id
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : ""
                }`}
                onClick={() => setSelectedPodcast(podcast.id)}
              >
                <div className="flex items-start gap-3">
                  {podcast.coverImage && (
                    <img
                      src={podcast.coverImage}
                      alt={podcast.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{podcast.title}</h3>
                    <p className="text-sm text-gray-600">
                      {podcast._count.episodes} episodes
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = getRSSFeedUrl(podcast.id);
                          navigator.clipboard.writeText(url);
                          toast.success("RSS feed URL copied!");
                        }}
                      >
                        <Rss className="w-3 h-3 mr-1" />
                        RSS
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Episodes List */}
          <div className="lg:col-span-2 space-y-4">
            {episodes.length === 0 ? (
              <Card className="p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <h3 className="font-semibold mb-2">No episodes yet</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Upload your first episode to get started
                </p>
                <Button onClick={() => setShowCreateEpisode(true)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Episode
                </Button>
              </Card>
            ) : (
              episodes.map((episode) => (
                <Card key={episode.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {episode.episodeNumber && (
                          <span className="text-sm text-gray-500">
                            #{episode.episodeNumber}
                          </span>
                        )}
                        <h3 className="font-semibold text-lg">{episode.title}</h3>
                      </div>
                      {episode.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {episode.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{formatDuration(episode.duration)}</span>
                        <span>•</span>
                        <span>{episode.listenCount} listens</span>
                      </div>
                    </div>
                  </div>

                  <AudioPlayer
                    src={episode.audioUrl}
                    title={episode.title}
                    episodeId={episode.id}
                    onProgress={(progress, completed) =>
                      trackProgress(episode.id, progress, completed)
                    }
                  />

                  {episode.showNotes && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Show Notes</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {episode.showNotes}
                      </p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Podcast Modal */}
      {showCreatePodcast && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Podcast</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={podcastForm.title}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="My Awesome Podcast"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Author *
                </label>
                <input
                  type="text"
                  value={podcastForm.author}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, author: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={podcastForm.description}
                  onChange={(e) =>
                    setPodcastForm({
                      ...podcastForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-24"
                  placeholder="What's your podcast about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={podcastForm.category}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="Technology">Technology</option>
                  <option value="Business">Business</option>
                  <option value="Education">Education</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="News">News</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Music">Music</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="podcastPublic"
                  checked={podcastForm.isPublic}
                  onChange={(e) =>
                    setPodcastForm({ ...podcastForm, isPublic: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="podcastPublic" className="text-sm">
                  Public (anyone can listen)
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={createPodcast} className="flex-1">
                  <Mic className="w-4 h-4 mr-2" />
                  Create Podcast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePodcast(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Episode Modal */}
      {showCreateEpisode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Upload New Episode</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={episodeForm.title}
                  onChange={(e) =>
                    setEpisodeForm({ ...episodeForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Episode title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Audio File *
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="hidden"
                      id="audioFileInput"
                    />
                    <label
                      htmlFor="audioFileInput"
                      className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {audioFile ? audioFile.name : "Choose Audio File"}
                    </label>
                    {uploadingAudio && (
                      <span className="text-sm text-gray-500">Processing...</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Or paste a direct URL below (MP3, WAV, etc.)
                  </p>
                  <input
                    type="text"
                    value={episodeForm.audioUrl.startsWith("blob:") ? "" : episodeForm.audioUrl}
                    onChange={(e) =>
                      setEpisodeForm({ ...episodeForm, audioUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="https://example.com/episode.mp3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (seconds) *
                </label>
                <input
                  type="number"
                  value={episodeForm.duration}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="1800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Episode Number
                </label>
                <input
                  type="number"
                  value={episodeForm.episodeNumber}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      episodeNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={episodeForm.description}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-24"
                  placeholder="Episode description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Show Notes
                </label>
                <textarea
                  value={episodeForm.showNotes}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      showNotes: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg h-32"
                  placeholder="Additional notes, links, timestamps..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={createEpisode} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Episode
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateEpisode(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
