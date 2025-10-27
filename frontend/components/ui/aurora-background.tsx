"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientOpacity?: number;
}

/**
 * AuroraBackground renders a soft animated gradient backdrop inspired by the Monokai Pro palette.
 * It leverages a single absolutely positioned motion.div to keep runtime cost minimal while
 * still providing a premium feel. The component is safe to use across the app layout.
 */
export function AuroraBackground({
  children,
  className,
  gradientOpacity = 0.55,
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
        "relative overflow-hidden bg-background text-foreground",
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 blur-3xl"
        style={{
          opacity: gradientOpacity,
          background:
            "radial-gradient(40% 35% at 15% 20%, rgba(193,158,108,0.4), transparent 70%), radial-gradient(36% 32% at 80% 12%, rgba(134,158,168,0.35), transparent 75%), radial-gradient(65% 45% at 50% 85%, rgba(160,173,150,0.32), transparent 70%)",
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.3),rgba(255,255,255,0))]"
        style={{
          maskImage,
          WebkitMaskImage: maskImage as any,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
