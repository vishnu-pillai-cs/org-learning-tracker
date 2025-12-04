"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/empty-state";
import type { Employee, Team, EmployeeRole, EmployeeStatus, Invitation } from "@/lib/contentstack/types";

const roleOptions = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "org_admin", label: "Org Admin" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "invited", label: "Invited" },
];

const roleBadgeVariants: Record<string, "default" | "success" | "warning" | "info"> = {
  employee: "default",
  manager: "info",
  org_admin: "success",
};

const statusBadgeVariants: Record<string, "default" | "success" | "warning" | "danger"> = {
  active: "success",
  inactive: "danger",
  invited: "warning",
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [formData, setFormData] = useState({
    role: "employee" as EmployeeRole,
    status: "active" as EmployeeStatus,
    team_uid: "",
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "employee" as "employee" | "manager",
    team_uid: "",
  });

  const isAdmin = session?.user?.role === "org_admin";

  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const [employeesRes, teamsRes, invitesRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/teams"),
          fetch("/api/invitations"),
        ]);

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          setEmployees(data.employees || []);
        }

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.teams || []);
        }

        if (invitesRes.ok) {
          const data = await invitesRes.json();
          setInvitations(data.invitations || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAdmin, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        role: formData.role,
        status: formData.status,
      };

      if (formData.team_uid) {
        payload.team_uid = formData.team_uid;
      } else if (formData.team_uid === "") {
        payload.team_uid = null;
      }

      const res = await fetch(`/api/employees/${editingEmployee.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setEmployees((prev) =>
        prev.map((e) => (e.uid === editingEmployee.uid ? data.employee : e))
      );
      setEditingEmployee(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      role: employee.role,
      status: employee.status,
      team_uid: employee.team?.[0]?.uid || "",
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setInvitations((prev) => [data.invitation, ...prev]);
      setShowInviteModal(false);
      setInviteForm({
        email: "",
        name: "",
        role: "employee",
        team_uid: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (invitationUid: string) => {
    try {
      const res = await fetch("/api/invitations/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_uid: invitationUid }),
      });

      if (res.ok) {
        setInvitations((prev) =>
          prev.filter((inv) => inv.uid !== invitationUid)
        );
      }
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
          <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
          <p className="text-slate-500 mt-1">
            View and manage all organization users
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
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
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[{ value: "", label: "All Roles" }, ...roleOptions]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Users List */}
      {filteredEmployees.length > 0 ? (
        <div className="grid gap-3">
          {filteredEmployees.map((employee) => {
            const team = teams.find((t) => t.uid === employee.team?.[0]?.uid);
            return (
              <Card key={employee.uid}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar
                      src={employee.avatar_url}
                      fallback={employee.name}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {employee.name}
                        </p>
                        <Badge variant={roleBadgeVariants[employee.role]}>
                          {employee.role.replace("_", " ")}
                        </Badge>
                        <Badge variant={statusBadgeVariants[employee.status]}>
                          {employee.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {employee.email}
                      </p>
                      {team && (
                        <p className="text-sm text-slate-400 mt-0.5">
                          Team: {team.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(employee)}
                    disabled={employee.uid === session?.user?.employeeUid}
                  >
                    Edit
                  </Button>
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
            title={searchQuery || roleFilter ? "No matches found" : "No users yet"}
            description={
              searchQuery || roleFilter
                ? "Try adjusting your filters"
                : "Users will appear here once they join"
            }
          />
        </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Pending Invitations</h3>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.uid}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {invitation.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="warning">Pending</Badge>
                      <span className="text-sm text-slate-500 capitalize">
                        {invitation.role}
                      </span>
                      <span className="text-sm text-slate-400">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const url = `${window.location.origin}/invite/accept?token=${invitation.token}`;
                        navigator.clipboard.writeText(url);
                        alert("Invite link copied to clipboard!");
                      }}
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvite(invitation.uid)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingEmployee}
        onClose={() => {
          setEditingEmployee(null);
          setError(null);
        }}
        title={`Edit User: ${editingEmployee?.name}`}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Avatar
              src={editingEmployee?.avatar_url}
              fallback={editingEmployee?.name || ""}
              size="lg"
            />
            <div>
              <p className="font-medium text-slate-900">{editingEmployee?.name}</p>
              <p className="text-sm text-slate-500">{editingEmployee?.email}</p>
            </div>
          </div>

          <Select
            label="Role"
            options={roleOptions}
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value as EmployeeRole })
            }
          />

          <Select
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as EmployeeStatus,
              })
            }
          />

          <Select
            label="Team"
            options={[
              { value: "", label: "No Team" },
              ...teams
                .filter((t) => t.status === "active")
                .map((t) => ({ value: t.uid, label: t.name })),
            ]}
            value={formData.team_uid}
            onChange={(e) =>
              setFormData({ ...formData, team_uid: e.target.value })
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
              onClick={() => setEditingEmployee(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setError(null);
        }}
        title="Invite User"
        description="Send an invitation to join the organization"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email *"
            type="email"
            value={inviteForm.email}
            onChange={(e) =>
              setInviteForm({ ...inviteForm, email: e.target.value })
            }
            placeholder="employee@company.com"
            required
          />
          <Input
            label="Name"
            value={inviteForm.name}
            onChange={(e) =>
              setInviteForm({ ...inviteForm, name: e.target.value })
            }
            placeholder="John Doe"
          />
          <Select
            label="Role"
            options={[
              { value: "employee", label: "Employee" },
              { value: "manager", label: "Manager" },
            ]}
            value={inviteForm.role}
            onChange={(e) =>
              setInviteForm({
                ...inviteForm,
                role: e.target.value as "employee" | "manager",
              })
            }
          />
          <Select
            label="Team (Optional)"
            options={[
              { value: "", label: "No Team" },
              ...teams
                .filter((t) => t.status === "active")
                .map((t) => ({ value: t.uid, label: t.name })),
            ]}
            value={inviteForm.team_uid}
            onChange={(e) =>
              setInviteForm({ ...inviteForm, team_uid: e.target.value })
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
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

