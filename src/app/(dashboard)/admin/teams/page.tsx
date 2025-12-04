"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/empty-state";
import type { Team, Employee } from "@/lib/contentstack/types";

export default function AdminTeamsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    manager_uid: "",
  });

  const isAdmin = session?.user?.role === "org_admin";

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const [teamsRes, employeesRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/employees?role=manager"),
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.teams || []);
        }

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          // Filter to managers and admins
          const mgrs = (data.employees || []).filter(
            (e: Employee) => e.role === "manager" || e.role === "org_admin"
          );
          setManagers(mgrs);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAdmin, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setTeams((prev) => [...prev, data.team]);
      setShowCreateModal(false);
      setFormData({ name: "", description: "", manager_uid: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${editingTeam.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update team");
      }

      setTeams((prev) =>
        prev.map((t) => (t.uid === editingTeam.uid ? data.team : t))
      );
      setEditingTeam(null);
      setFormData({ name: "", description: "", manager_uid: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (teamUid: string) => {
    if (!confirm("Archive this team? This will deactivate it.")) return;

    try {
      const res = await fetch(`/api/teams/${teamUid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (res.ok) {
        setTeams((prev) =>
          prev.map((t) =>
            t.uid === teamUid ? { ...t, status: "archived" } : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to archive team:", err);
    }
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || "",
      manager_uid: team.manager[0]?.uid || "",
    });
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center text-slate-500 hover:text-slate-700 transition-colors mb-4"
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
            Back to Admin
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Manage Teams</h1>
          <p className="text-slate-500 mt-1">
            Create and manage organization teams
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
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
          Create Team
        </Button>
      </div>

      {/* Teams List */}
      {teams.length > 0 ? (
        <div className="grid gap-4">
          {teams.map((team) => {
            const manager = managers.find((m) => m.uid === team.manager[0]?.uid);
            return (
              <Card key={team.uid}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{team.name}</h3>
                      <Badge
                        variant={team.status === "active" ? "success" : "default"}
                      >
                        {team.status}
                      </Badge>
                    </div>
                    {team.description && (
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {team.description}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-2">
                      Manager:{" "}
                      <span className="font-medium text-slate-700">
                        {manager?.name || "Unassigned"}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(team)}
                    >
                      Edit
                    </Button>
                    {team.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(team.uid)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
            title="No teams yet"
            description="Create your first team to get started"
            action={{
              label: "Create Team",
              onClick: () => setShowCreateModal(true),
            }}
          />
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ name: "", description: "", manager_uid: "" });
          setError(null);
        }}
        title="Create Team"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Team Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Engineering Team"
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Team description..."
            rows={3}
          />
          <Select
            label="Manager *"
            options={[
              { value: "", label: "Select a manager" },
              ...managers.map((m) => ({ value: m.uid, label: m.name })),
            ]}
            value={formData.manager_uid}
            onChange={(e) =>
              setFormData({ ...formData, manager_uid: e.target.value })
            }
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!formData.name || !formData.manager_uid}
            >
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingTeam}
        onClose={() => {
          setEditingTeam(null);
          setFormData({ name: "", description: "", manager_uid: "" });
          setError(null);
        }}
        title="Edit Team"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Team Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
          <Select
            label="Manager *"
            options={managers.map((m) => ({ value: m.uid, label: m.name }))}
            value={formData.manager_uid}
            onChange={(e) =>
              setFormData({ ...formData, manager_uid: e.target.value })
            }
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingTeam(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

