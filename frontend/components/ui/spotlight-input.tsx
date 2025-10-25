'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Spotlight } from './spotlight';
import { Input } from './input';

export const SpotlightInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        <Input
          className={cn(
            "w-full rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-600",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

SpotlightInput.displayName = 'SpotlightInput';
