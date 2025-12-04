"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Employee, Team } from "@/lib/contentstack/types";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/employees/me");
        if (res.ok) {
          const data = await res.json();
          setEmployee(data.employee);
          setName(data.employee.name);

          // Fetch team if employee has one
          if (data.employee.team?.[0]?.uid) {
            const teamRes = await fetch(`/api/teams/${data.employee.team[0].uid}`);
            if (teamRes.ok) {
              const teamData = await teamRes.json();
              setTeam(teamData.team);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!employee) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/employees/${employee.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await res.json();
      setEmployee(data.employee);
      setIsEditing(false);

      // Update session
      await update({ name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar
              src={employee?.avatar_url || session?.user?.image}
              fallback={employee?.name || session?.user?.name || ""}
              size="xl"
            />
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <>
                  <Input
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setName(employee?.name || "");
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} isLoading={isSubmitting}>
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium text-slate-900">{employee?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{employee?.email}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="font-medium text-slate-900 capitalize">
                {employee?.role?.replace("_", " ")}
              </p>
            </div>
            <Badge
              variant={
                employee?.role === "org_admin"
                  ? "success"
                  : employee?.role === "manager"
                  ? "info"
                  : "default"
              }
            >
              {employee?.role?.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-medium text-slate-900 capitalize">
                {employee?.status}
              </p>
            </div>
            <Badge
              variant={
                employee?.status === "active"
                  ? "success"
                  : employee?.status === "invited"
                  ? "warning"
                  : "danger"
              }
            >
              {employee?.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Team Info */}
      {team && (
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-slate-900">{team.name}</p>
              {team.description && (
                <p className="text-sm text-slate-500">{team.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">Member Since</p>
            <p className="font-medium text-slate-900">
              {employee?.created_at
                ? new Date(employee.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Sign-in Method</p>
            <div className="flex items-center gap-2 mt-1">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm text-slate-700">Google</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

