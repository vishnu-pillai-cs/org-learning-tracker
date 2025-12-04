"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/empty-state";
import type { Team, Employee, Invitation } from "@/lib/contentstack/types";

interface TeamWithMembers extends Team {
  members: Employee[];
}

export default function TeamManagePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMembers | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "employee" as "employee" | "manager",
    team_uid: "",
  });

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "org_admin";
  const isAdmin = session?.user?.role === "org_admin";

  useEffect(() => {
    if (!isManager) {
      router.push("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const [teamsRes, invitesRes] = await Promise.all([
          fetch("/api/employees/team"),
          fetch("/api/invitations"),
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data.teams || []);
          if (data.teams?.length > 0) {
            setSelectedTeam(data.teams[0]);
            setInviteForm((prev) => ({ ...prev, team_uid: data.teams[0].uid }));
          }
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
  }, [isManager, router]);

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
        team_uid: selectedTeam?.uid || "",
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

  const handleRemoveMember = async (teamUid: string, employeeUid: string) => {
    if (!confirm("Remove this member from the team?")) return;

    try {
      const res = await fetch(`/api/teams/${teamUid}/members/${employeeUid}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTeams((prev) =>
          prev.map((team) => {
            if (team.uid === teamUid) {
              return {
                ...team,
                members: team.members.filter((m) => m.uid !== employeeUid),
              };
            }
            return team;
          })
        );
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  if (!isManager) {
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/team")}
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
            Back to Team
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Manage Team</h1>
          <p className="text-slate-500 mt-1">
            Invite new members and manage your team
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
          Invite Employee
        </Button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.uid}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
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
                        Expires{" "}
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvite(invitation.uid)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams & Members */}
      {teams.length > 0 ? (
        teams.map((team) => (
          <Card key={team.uid}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  {team.description && (
                    <p className="text-sm text-slate-500 mt-1">
                      {team.description}
                    </p>
                  )}
                </div>
                <Badge variant="success">{team.members.length} members</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {team.members.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {team.members.map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={member.avatar_url}
                          fallback={member.name}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-slate-900">
                            {member.name}
                          </p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="capitalize">
                          {member.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(team.uid, member.uid)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No members yet"
                  description="Invite employees to join this team"
                  action={{
                    label: "Invite Employee",
                    onClick: () => {
                      setInviteForm((prev) => ({ ...prev, team_uid: team.uid }));
                      setShowInviteModal(true);
                    },
                  }}
                />
              )}
            </CardContent>
          </Card>
        ))
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
            title="No teams assigned"
            description="Contact your administrator to be assigned to a team"
          />
        </Card>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Employee"
        description="Send an invitation to join your team"
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
          {isAdmin && (
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
          )}
          {teams.length > 1 && (
            <Select
              label="Team"
              options={teams.map((t) => ({ value: t.uid, label: t.name }))}
              value={inviteForm.team_uid}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, team_uid: e.target.value })
              }
            />
          )}

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

