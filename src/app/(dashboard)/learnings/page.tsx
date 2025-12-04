"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LearningCard } from "@/components/learning-card";
import { EmptyState } from "@/components/empty-state";
import type { LearningEntry, LearningType } from "@/lib/contentstack/types";

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "course", label: "Course" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchLearnings() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ scope: "me" });
        if (typeFilter) params.set("type", typeFilter);

        const res = await fetch(`/api/learnings?${params}`);
        if (res.ok) {
          const data = await res.json();
          setLearnings(data.learnings || []);
        }
      } catch (error) {
        console.error("Failed to fetch learnings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLearnings();
  }, [typeFilter]);

  // Client-side search filter
  const filteredLearnings = learnings.filter((learning) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      learning.name.toLowerCase().includes(query) ||
      learning.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Learnings</h1>
          <p className="text-slate-500 mt-1">
            Track and manage your learning entries
          </p>
        </div>
        <Link href="/learnings/new">
          <Button>
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Learning
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as LearningType | "")}
          />
        </div>
      </div>

      {/* Learnings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        </div>
      ) : filteredLearnings.length > 0 ? (
        <div className="space-y-3">
          {filteredLearnings.map((learning) => (
            <LearningCard key={learning.uid} learning={learning} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          title={searchQuery || typeFilter ? "No matches found" : "No learnings yet"}
          description={
            searchQuery || typeFilter
              ? "Try adjusting your filters"
              : "Start tracking your learning journey"
          }
          action={
            !searchQuery && !typeFilter
              ? {
                  label: "Add Learning",
                  onClick: () => (window.location.href = "/learnings/new"),
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

