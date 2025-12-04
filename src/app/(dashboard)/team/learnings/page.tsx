"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LearningCard } from "@/components/learning-card";
import { EmptyState } from "@/components/empty-state";
import type { LearningEntry, LearningType, Employee } from "@/lib/contentstack/types";

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "course", label: "Course" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

export default function TeamLearningsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "org_admin";

  useEffect(() => {
    if (!isManager) {
      router.push("/dashboard");
      return;
    }

    async function fetchData() {
      try {
        const params = new URLSearchParams({ scope: "team" });
        if (typeFilter) params.set("type", typeFilter);

        const [learningsRes, employeesRes] = await Promise.all([
          fetch(`/api/learnings?${params}`),
          fetch("/api/employees/team"),
        ]);

        if (learningsRes.ok) {
          const data = await learningsRes.json();
          setLearnings(data.learnings || []);
        }

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          // Create a map of employee UID to employee
          const empMap: Record<string, Employee> = {};
          data.teams?.forEach((team: { members: Employee[] }) => {
            team.members.forEach((member) => {
              empMap[member.uid] = member;
            });
          });
          setEmployees(empMap);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isManager, router, typeFilter]);

  if (!isManager) {
    return null;
  }

  // Client-side search filter
  const filteredLearnings = learnings.filter((learning) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const employee = employees[learning.employee[0]?.uid];
    return (
      learning.name.toLowerCase().includes(query) ||
      learning.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
      employee?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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
        <h1 className="text-2xl font-bold text-slate-900">Team Learnings</h1>
        <p className="text-slate-500 mt-1">
          View all learnings from your team members
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by title, tags, or employee..."
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
            <LearningCard
              key={learning.uid}
              learning={learning}
              employee={employees[learning.employee[0]?.uid]}
              showEmployee
            />
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
              : "Your team members haven't logged any learnings yet"
          }
        />
      )}
    </div>
  );
}

