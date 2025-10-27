"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientOpacity?: number;
}

export function AuroraBackground({
  children,
  className,
  gradientOpacity = 0.45,
  ...props
}: AuroraBackgroundProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const { currentTarget, clientX, clientY } = event;
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    },
    [mouseX, mouseY]
  );

  const maskImage = useMotionTemplate`
    radial-gradient(
      450px circle at ${mouseX}px ${mouseY}px,
      rgba(255,255,255,0.45),
      transparent 80%
    )
  `;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-background text-foreground",
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(224,192,132,0.08),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(60,70,104,0.12),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(224,192,132,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(224,192,132,0.18)_1px,transparent_1px)] [background-size:80px_80px]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          opacity: gradientOpacity,
          background:
            "radial-gradient(38% 30% at 18% 18%, rgba(245,241,230,0.22), transparent 72%), radial-gradient(42% 36% at 82% 15%, rgba(86,101,140,0.34), transparent 78%), radial-gradient(60% 46% at 48% 88%, rgba(37,40,60,0.55), transparent 75%)",
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),rgba(255,255,255,0))]"
        style={{
          maskImage,
          WebkitMaskImage: maskImage as any,
        }}
      />
      <div className="pointer-events-none absolute inset-x-6 bottom-12 -z-10 h-24 rounded-3xl border border-border/40 bg-gradient-to-t from-secondary/60 to-transparent blur-2xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
