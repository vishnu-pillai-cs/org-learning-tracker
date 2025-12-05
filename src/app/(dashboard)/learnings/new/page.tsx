"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearnings, useTodos } from "@/lib/context";
import type { LearningType, LearningVisibility } from "@/lib/contentstack/types";

const typeOptions = [
  { value: "course", label: "Course" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

const visibilityOptions = [
  { value: "team", label: "Team - Visible to your team" },
  { value: "org", label: "Organization - Visible to everyone" },
  { value: "private", label: "Private - Only you" },
];

export default function NewLearningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addWithSuggestions } = useLearnings();
  const { remove: removeTodo } = useTodos();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "course" as LearningType,
    source_url: "",
    date: new Date().toISOString().split("T")[0],
    duration_minutes: "",
    tags: "",
    visibility: "team" as LearningVisibility,
  });

  // Pre-fill form from URL params (from completed todo)
  useEffect(() => {
    const topic = searchParams.get("topic");
    const description = searchParams.get("description");
    const type = searchParams.get("type");
    const sourceUrl = searchParams.get("source_url");
    const durationMinutes = searchParams.get("duration_minutes");

    if (topic || description || type || sourceUrl || durationMinutes) {
      setFormData((prev) => ({
        ...prev,
        title: topic || prev.title,
        description: description || prev.description,
        type: (type as LearningType) || prev.type,
        source_url: sourceUrl || prev.source_url,
        duration_minutes: durationMinutes || prev.duration_minutes,
      }));
    }
  }, [searchParams]);

  // Validate form
  const isFormValid = () => {
    return formData.title.trim() !== "" && formData.date.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate mandatory fields
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.date.trim()) {
      setError("Date is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        source_url: formData.source_url.trim() || undefined,
        date: formData.date,
        duration_minutes: formData.duration_minutes
          ? parseInt(formData.duration_minutes)
          : undefined,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        visibility: formData.visibility,
      };

      // Use context to add learning and trigger suggestion generation
      const learning = await addWithSuggestions(payload);

      if (!learning) {
        throw new Error("Failed to create learning entry");
      }

      // If this came from a todo, delete it
      const todoUid = searchParams.get("todo_uid");
      if (todoUid) {
        await removeTodo(todoUid);
      }

      // Navigate to dashboard - suggestions will be generated in the background
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-slate-700 transition-colors"
        >
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Learning</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <Input
              label="Title *"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="What did you learn?"
              required
            />

            {/* Type & Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type *"
                options={typeOptions}
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as LearningType,
                  })
                }
              />
              <Input
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            {/* Description */}
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What did you learn? Key takeaways?"
              rows={4}
            />

            {/* Source URL & Duration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Source URL"
                type="url"
                value={formData.source_url}
                onChange={(e) =>
                  setFormData({ ...formData, source_url: e.target.value })
                }
                placeholder="https://..."
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, duration_minutes: e.target.value })
                }
                placeholder="e.g., 60"
                min="0"
              />
            </div>

            {/* Tags */}
            <Input
              label="Tags"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="react, typescript, testing (comma separated)"
              hint="Add skills or topics separated by commas"
            />

            {/* Visibility */}
            <Select
              label="Visibility"
              options={visibilityOptions}
              value={formData.visibility}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  visibility: e.target.value as LearningVisibility,
                })
              }
            />

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                disabled={!isFormValid() || isSubmitting}
              >
                Save Learning
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
