"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { campaignApi } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { CampaignCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";

const campaignSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(200, "Description must be at most 200 characters"),
  story: z
    .string()
    .min(100, "Story must be at least 100 characters")
    .max(10000, "Story must be at most 10000 characters"),
  category: z.nativeEnum(CampaignCategory),
  goal: z
    .number()
    .min(100, "Goal must be at least $100")
    .max(10000000, "Goal must be at most $10,000,000"),
  imageUrl: z.string().url("Please enter a valid image URL"),
  videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
  endDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: "End date must be in the future",
  }),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error("Please login to create a campaign");
      router.push("/login");
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      category: CampaignCategory.OTHER,
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80",
      videoUrl: "",
    },
  });

  const onSubmit = async (data: CampaignFormData) => {
    setIsLoading(true);
    try {
      const response = await campaignApi.create({
        ...data,
        videoUrl: data.videoUrl || undefined,
      });

      if (response.success && response.data) {
        toast.success("Campaign created successfully!");
        router.push(`/campaigns/${response.data.slug}`);
      } else {
        toast.error(response.error || "Failed to create campaign");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to create campaign. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Object.values(CampaignCategory);

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Create Your Campaign</h1>
          <p className="text-lg opacity-90">
            Share your story and start raising funds for your project
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <Card className="shadow-xl max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill in the details about your campaign. All fields marked with * are required.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Campaign Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="A compelling title for your campaign"
                    {...register("title")}
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {watch("title")?.length || 0}/100 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Short Description *
                  </label>
                  <textarea
                    id="description"
                    placeholder="A brief summary of your campaign (shown in previews)"
                    {...register("description")}
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.description ? "border-red-500" : "border-input"
                    } bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none`}
                    rows={3}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {watch("description")?.length || 0}/200 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    {...register("category")}
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.category ? "border-red-500" : "border-input"
                    } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>
              </div>

              {/* Campaign Story */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Campaign Story</h3>

                <div>
                  <label htmlFor="story" className="block text-sm font-medium mb-2">
                    Full Story *
                  </label>
                  <textarea
                    id="story"
                    placeholder="Tell your story in detail. What are you raising funds for? Why is it important? What will the funds be used for?"
                    {...register("story")}
                    className={`w-full px-3 py-2 rounded-md border ${
                      errors.story ? "border-red-500" : "border-input"
                    } bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none`}
                    rows={10}
                  />
                  {errors.story && (
                    <p className="text-red-500 text-sm mt-1">{errors.story.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {watch("story")?.length || 0}/10000 characters. Support for HTML/Markdown coming soon!
                  </p>
                </div>
              </div>

              {/* Funding Goal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Funding Goal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="goal" className="block text-sm font-medium mb-2">
                      Funding Goal *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="goal"
                        type="number"
                        placeholder="10000"
                        {...register("goal", { valueAsNumber: true })}
                        className={`pl-8 ${errors.goal ? "border-red-500" : ""}`}
                        min="100"
                        step="100"
                      />
                    </div>
                    {errors.goal && (
                      <p className="text-red-500 text-sm mt-1">{errors.goal.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium mb-2">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                    End Date *
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    className={errors.endDate ? "border-red-500" : ""}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a realistic timeframe for your campaign
                  </p>
                </div>
              </div>

              {/* Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media</h3>

                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium mb-2">
                    Campaign Image URL *
                  </label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    {...register("imageUrl")}
                    className={errors.imageUrl ? "border-red-500" : ""}
                  />
                  {errors.imageUrl && (
                    <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a high-quality image that represents your campaign (1200x630px recommended)
                  </p>
                  {watch("imageUrl") && (
                    <div className="mt-4 rounded-lg overflow-hidden border">
                      <img
                        src={watch("imageUrl")}
                        alt="Campaign preview"
                        className="w-full h-64 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/1200x630?text=Invalid+Image+URL";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="videoUrl" className="block text-sm font-medium mb-2">
                    Video URL (Optional)
                  </label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    {...register("videoUrl")}
                    className={errors.videoUrl ? "border-red-500" : ""}
                  />
                  {errors.videoUrl && (
                    <p className="text-red-500 text-sm mt-1">{errors.videoUrl.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a YouTube or Vimeo video to showcase your campaign
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating Campaign...
                    </span>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Launch Campaign
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card className="max-w-4xl mx-auto mt-8 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Tips for a Successful Campaign
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Be clear and specific about what you're raising funds for</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Set a realistic funding goal based on your actual needs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Use high-quality images and videos to tell your story</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Share updates regularly to keep your backers engaged</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Promote your campaign on social media and to your network</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
