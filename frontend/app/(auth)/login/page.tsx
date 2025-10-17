"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authApi } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spotlight } from "@/components/ui/spotlight";
import { BlurFade } from "@/components/ui/blur-fade";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Github, Sparkles } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    toast.loading("Signing in...");
    try {
      const response = await authApi.login(data.email, data.password);
      toast.dismiss();
      if (response.success && response.data?.token) {
        await saveToken(response.data.token);
        toast.success("Login successful! Welcome back!");
        router.push("/dashboard");
      } else {
        toast.error(response.error || "Login failed. Please try again.");
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full rounded-md flex flex-col items-center justify-center relative overflow-hidden bg-background">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      <div className="p-4 max-w-md w-full z-10">
        <BlurFade delay={0.25} inView>
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent mb-2"
            >
              Welcome Back
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground"
            >
              Sign in to your Fundify account to continue.
            </motion.p>
          </div>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <motion.div
            className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-xl shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className={`w-full bg-background/50 ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs pt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className={`w-full bg-background/50 ${errors.password ? "border-red-500" : ""}`}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs pt-1">{errors.password.message}</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full group"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                  <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/github`}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </Button>
                </div>
                
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-primary font-semibold hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </BlurFade>
        
        <BlurFade delay={0.75} inView>
          <p className="text-center text-xs text-muted-foreground mt-8">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-primary">
              Terms of Service
            </Link>
            .
          </p>
        </BlurFade>
      </div>
    </div>
  );
}
