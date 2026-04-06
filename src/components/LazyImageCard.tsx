"use client";

import React from "react";
import { useInView } from "react-intersection-observer";
import { ImageCard } from "./ImageCard";

interface LazyImageCardProps {
  project: any;
  onClick: () => void;
  priority?: boolean;
}

/**
 * Lazy rendering wrapper for ImageCard.
 * - priority=true: renders immediately (above-fold cards)
 * - priority=false: renders only when near viewport (400px buffer)
 * - triggerOnce: true → once visible, stays mounted (no flicker on scroll back)
 */
export const LazyImageCard = React.memo(function LazyImageCard({
  project,
  onClick,
  priority = false,
}: LazyImageCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "400px",
    skip: priority, // priority cards skip observation, always render
  });

  // Priority cards render immediately
  if (priority) {
    return (
      <div className="w-full">
        <ImageCard onClick={onClick} props={project} priority />
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full">
      {inView ? (
        <ImageCard onClick={onClick} props={project} />
      ) : (
        // Lightweight placeholder matching ImageCard dimensions
        <div className="w-full">
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl transition-all duration-300" />
          <div className="mt-3 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4 transition-all duration-300" />
            <div className="h-3 bg-gray-50 rounded w-1/2 transition-all duration-300" />
          </div>
        </div>
      )}
    </div>
  );
});
