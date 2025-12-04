"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { LearningEntry, LearningType, LearningVisibility } from "@/lib/contentstack/types";

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

export default function LearningDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [learning, setLearning] = useState<LearningEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "course" as LearningType,
    source_url: "",
    date: "",
    duration_minutes: "",
    tags: "",
    visibility: "team" as LearningVisibility,
  });

  useEffect(() => {
    async function fetchLearning() {
      try {
        const res = await fetch(`/api/learnings/${uid}`);
        if (res.ok) {
          const data = await res.json();
          setLearning(data.learning);
          setFormData({
            title: data.learning.title,
            description: data.learning.description || "",
            type: data.learning.type,
            source_url: data.learning.source_url || "",
            date: data.learning.date?.split("T")[0] || "",
            duration_minutes: data.learning.duration_minutes?.toString() || "",
            tags: data.learning.tags?.join(", ") || "",
            visibility: data.learning.visibility,
          });
        }
      } catch (err) {
        console.error("Failed to fetch learning:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLearning();
  }, [uid]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        source_url: formData.source_url || undefined,
        date: formData.date,
        duration_minutes: formData.duration_minutes
          ? parseInt(formData.duration_minutes)
          : undefined,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        visibility: formData.visibility,
      };

      const res = await fetch(`/api/learnings/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      const data = await res.json();
      setLearning(data.learning);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/learnings/${uid}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/learnings");
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!learning) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900">Not Found</h2>
        <p className="text-slate-500 mt-2">This learning entry doesn&apos;t exist.</p>
        <Button onClick={() => router.push("/learnings")} className="mt-4">
          Back to Learnings
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button
          onClick={() => router.push("/learnings")}
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
          Back to Learnings
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle>{isEditing ? "Edit Learning" : learning.title}</CardTitle>
          {!isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <Input
                label="Title *"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

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

              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Source URL"
                  type="url"
                  value={formData.source_url}
                  onChange={(e) =>
                    setFormData({ ...formData, source_url: e.target.value })
                  }
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: e.target.value })
                  }
                  min="0"
                />
              </div>

              <Input
                label="Tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                hint="Comma separated"
              />

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

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success" className="capitalize">
                  {learning.type}
                </Badge>
                <Badge variant="default" className="capitalize">
                  {learning.visibility}
                </Badge>
              </div>

              {learning.description && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">
                    Description
                  </h3>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {learning.description}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Date</h3>
                  <p className="text-slate-700">
                    {new Date(learning.date).toLocaleDateString()}
                  </p>
                </div>
                {learning.duration_minutes && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">
                      Duration
                    </h3>
                    <p className="text-slate-700">
                      {learning.duration_minutes >= 60
                        ? `${Math.floor(learning.duration_minutes / 60)}h ${learning.duration_minutes % 60}m`
                        : `${learning.duration_minutes} minutes`}
                    </p>
                  </div>
                )}
              </div>

              {learning.source_url && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">
                    Source
                  </h3>
                  <a
                    href={learning.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 break-all"
                  >
                    {learning.source_url}
                  </a>
                </div>
              )}

              {learning.tags && learning.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {learning.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Learning Entry"
        description="This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Are you sure you want to delete &quot;{learning.title}&quot;?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

