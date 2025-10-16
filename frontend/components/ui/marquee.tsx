'use client';

import { cn } from "@/lib/utils";
import React from "react";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
  [key: string]: any;
}

export const Marquee = React.forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      className,
      reverse,
      pauseOnHover = false,
      children,
      vertical = false,
      repeat = 4,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
          { "flex-row": !vertical, "flex-col": vertical },
          className
        )}
      >
        {Array(repeat)
          .fill(0)
          .map((_, i) => (
            <React.Fragment key={i}>
              {
                React.Children.map(children, (child) => (
                  <div
                    className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
                      "animate-marquee-horizontal": !vertical,
                      "animate-marquee-vertical": vertical,
                      "group-hover:[animation-play-state:paused]": pauseOnHover,
                      "[animation-direction:reverse]": reverse,
                    })}
                  >
                    {child}
                  </div>
                ))
              }
            </React.Fragment>
          ))}
      </div>
    );
  }
);

Marquee.displayName = "Marquee";
