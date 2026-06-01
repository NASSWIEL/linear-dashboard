"use client";

import { createContext, useContext } from "react";
import type { MetaResponse, UpdateIssueInput } from "@/lib/types";

export interface DashboardActions {
  meta: MetaResponse | null;
  busyIssueId: string | null;
  updateIssue: (id: string, patch: UpdateIssueInput) => Promise<void>;
  archiveIssue: (id: string) => Promise<void>;
  editIssue: (issueId: string) => void;
}

const DashboardCtx = createContext<DashboardActions | null>(null);

export const DashboardProvider = DashboardCtx.Provider;

export function useDashboard(): DashboardActions {
  const ctx = useContext(DashboardCtx);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
