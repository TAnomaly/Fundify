"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { referralApi } from "@/lib/api/referral";
import type { ReferralCode, ReferralRewardType } from "@/types/referral";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ArrowLeft, RefreshCw } from "lucide-react";

const REWARD_OPTIONS: { label: string; value: ReferralRewardType; description: string }[] = [
  {
    label: "Subscription Credit",
    value: "SUBSCRIPTION_CREDIT",
    description: "Reward loyal supporters with bonus subscription time",
  },
  {
    label: "Discount",
    value: "DISCOUNT",
    description: "Offer a discount on membership or products",
  },
  {
    label: "Bonus Content",
    value: "BONUS_CONTENT",
    description: "Unlock exclusive content for referred supporters",
  },
  {
    label: "No Reward",
    value: "NONE",
    description: "Track referrals without an automated reward",
  },
];

interface FormState {
  code: string;
  description: string;
  usageLimit: string;
  expiresAt: string;
  rewardType: ReferralRewardType;
}

const initialForm: FormState = {
  code: "",
  description: "",
  usageLimit: "",
  expiresAt: "",
  rewardType: "SUBSCRIPTION_CREDIT",
};

export default function ReferralDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReferralCodes = async () => {
    try {
      setIsLoading(true);
      const response = await referralApi.list();
      if (response.success) {
        setReferralCodes(response.data || []);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load referral codes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReferralCodes();
  }, []);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const handleCreateReferralCode = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const usageLimitValue = form.usageLimit.trim();
      const payload = {
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        usageLimit:
          usageLimitValue === "" ? undefined : Number(usageLimitValue),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        rewardType: form.rewardType,
      };

      if (payload.usageLimit !== undefined && Number.isNaN(payload.usageLimit)) {
        toast.error("Usage limit must be a number");
        return;
      }

      const response = await referralApi.create(payload);
      if (response.success && response.data) {
        toast.success("Referral code created");
        setReferralCodes((prev) => [response.data!, ...prev]);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create referral code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (code: ReferralCode) => {
    try {
      setUpdatingId(code.id);
      const response = await referralApi.update(code.id, { isActive: !code.isActive });
      if (response.success && response.data) {
        setReferralCodes((prev) =>
          prev.map((item) => (item.id === code.id ? { ...item, ...response.data } : item))
        );
        toast.success(`Referral code ${!code.isActive ? "activated" : "paused"}`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update referral code");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied referral code to clipboard");
    } catch (error) {
      toast.error("Unable to copy code");
    }
  };

  const activeCodes = useMemo(
    () => referralCodes.filter((code) => code.isActive),
    [referralCodes]
  );

  const totalQuota = useMemo(() => {
    const totalLimit = referralCodes.reduce((sum, code) => {
      if (code.usageLimit && code.usageLimit > 0) {
        return sum + code.usageLimit;
      }
      return sum;
    }, 0);

    const totalUsed = referralCodes.reduce((sum, code) => sum + code.usageCount, 0);

    return { totalLimit, totalUsed };
  }, [referralCodes]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#F92672] via-[#AE81FF] to-[#66D9EF] bg-clip-text text-transparent">
          Referral Program
        </h1>
      </div>

      <p className="text-muted-foreground max-w-2xl">
        Create invite codes to reward supporters who bring friends on board. Track usage, set limits,
        and decide how you want to thank your community.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-border/40 shadow-lg">
          <CardHeader>
            <CardTitle>Create a referral code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Custom code (optional)</label>
              <Input
                value={form.code}
                maxLength={20}
                placeholder="E.g. CREATOR2025"
                onChange={(event) => handleInputChange("code", event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to auto-generate a short code.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reward</label>
              <Select
                value={form.rewardType}
                onValueChange={(value) => handleInputChange("rewardType", value as ReferralRewardType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reward" />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description (optional)</label>
              <Textarea
                value={form.description}
                rows={3}
                placeholder="e.g. Invite 3 friends and unlock a bonus livestream"
                onChange={(event) => handleInputChange("description", event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Usage limit</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.usageLimit}
                  onChange={(event) => handleInputChange("usageLimit", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Leave blank for no limit.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Expires on</label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => handleInputChange("expiresAt", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Optional expiration date.</p>
              </div>
            </div>

            <Button disabled={isSubmitting} onClick={handleCreateReferralCode} className="w-full gap-2">
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Create referral code
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-border/40 shadow-lg">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Your referral codes</CardTitle>
            <div className="text-sm text-muted-foreground">
              Active codes: <strong>{activeCodes.length}</strong>
              {totalQuota.totalLimit > 0 && (
                <span className="ml-2">• {totalQuota.totalUsed}/{totalQuota.totalLimit} uses</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : referralCodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                You haven&apos;t created any referral codes yet.
              </div>
            ) : (
              <div className="space-y-4">
                {referralCodes.map((code) => {
                  const remainingUses = code.usageLimit ? Math.max(code.usageLimit - code.usageCount, 0) : null;
                  const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;

                  return (
                    <div
                      key={code.id}
                      className="rounded-xl border border-border/40 bg-white/80 dark:bg-gray-900/60 p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold tracking-tight">{code.code}</h3>
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Paused"}
                            </Badge>
                            {isExpired && <Badge variant="destructive">Expired</Badge>}
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {code.description || "No description provided."}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              Reward: <strong>{code.rewardType.replace(/_/g, " ")}</strong>
                            </span>
                            <span>
                              Usage: <strong>{code.usageCount}</strong>
                              {code.usageLimit ? ` / ${code.usageLimit}` : " (unlimited)"}
                            </span>
                            <span>
                              Created {formatDistanceToNow(new Date(code.createdAt), { addSuffix: true })}
                            </span>
                            {code.expiresAt && (
                              <span>
                                Expires {formatDistanceToNow(new Date(code.expiresAt), { addSuffix: true })}
                              </span>
                            )}
                            {remainingUses !== null && (
                              <Badge variant={remainingUses > 0 ? "outline" : "destructive"}>
                                {remainingUses > 0 ? `${remainingUses} uses left` : "Limit reached"}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:items-end">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(code.code)}
                              className="gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copy
                            </Button>
                            <Button
                              variant={code.isActive ? "secondary" : "default"}
                              size="sm"
                              disabled={updatingId === code.id}
                              onClick={() => handleToggleActive(code)}
                              className="gap-2"
                            >
                              {updatingId === code.id && <RefreshCw className="w-4 h-4 animate-spin" />}
                              {code.isActive ? "Pause" : "Activate"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Usage totals include all time; reducing the limit won&apos;t remove existing referrals.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
