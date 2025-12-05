"use client";

import { useState } from "react";
import Image from "next/image";

interface SuggestionThumbnailProps {
  imageUrl: string | null;
  topic: string;
  size?: "sm" | "md" | "lg";
}

// Generate a consistent gradient based on topic string
function getGradientFromTopic(topic: string): string {
  const gradients = [
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-purple-400 to-pink-500",
    "from-orange-400 to-red-500",
    "from-cyan-400 to-blue-500",
    "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-lime-400 to-green-500",
  ];

  // Simple hash from topic string
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  }

  return gradients[Math.abs(hash) % gradients.length];
}

// Get initials or icon for fallback
function getTopicInitials(topic: string): string {
  const words = topic.split(" ").filter((w) => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return topic.substring(0, 2).toUpperCase();
}

export function SuggestionThumbnail({
  imageUrl,
  topic,
  size = "md",
}: SuggestionThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const gradient = getGradientFromTopic(topic);
  const initials = getTopicInitials(topic);

  const showFallback = !imageUrl || hasError;

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br ${gradient}`}
    >
      {/* Loading shimmer */}
      {isLoading && imageUrl && !hasError && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" />
      )}

      {/* Image - using object-contain to prevent cropping */}
      {imageUrl && !hasError && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center p-1">
          <Image
            src={imageUrl}
            alt={topic}
            fill
            className={`object-contain transition-opacity duration-300 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            unoptimized
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* Fallback with initials */}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-white/90 font-bold ${textSizeClasses[size]}`}>{initials}</span>
        </div>
      )}
    </div>
  );
}

