'use client';

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MovingBorderButton({ 
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration,
  className,
  ...otherProps
}: {
  children: React.ReactNode;
  as?: any;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Component
      className={cn(
        "bg-transparent relative text-xl h-16 w-40 p-[1px] overflow-hidden",
        containerClassName
      )}
      {...otherProps}
    >
      <div className="absolute inset-0 w-full h-full">
        <MovingBorder duration={duration} rx="30px" ry="30px">
          <div
            className={cn(
              "h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--sky-500)_40%,transparent_60%)]",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative bg-slate-900/[0.8] border border-slate-800 backdrop-blur-xl text-white flex items-center justify-center w-full h-full text-sm antialiased",
          className
        )}
      >
        {children}
      </div>
    </Component>
  );
}

const MovingBorder = ({
  children,
  duration = 2000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: any;
}) => {
  return (
    <div
      style={{ 
        position: "absolute",
        width: "100%",
        height: "100%",
        transform: "translateZ(0px)",
        overflow: "hidden",
      }}
      {...otherProps}
    >
      <motion.div
        initial={{ rotate: "0deg" }}
        animate={{
          rotate: "360deg",
        }}
        transition={{
          duration: duration / 1000,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          left: "-50%",
          top: "-50%",
          background: "conic-gradient(from 0deg, transparent 0%, #F92672 50%, transparent 100%)", // Monokai Red/Pink
        }}
      />
      {children}
    </div>
  );
};