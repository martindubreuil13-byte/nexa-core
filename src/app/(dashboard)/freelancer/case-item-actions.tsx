"use client";

import { useTransition } from "react";

import { Button } from "../../../components/ui/button";
import type { FreelancerCase, WorkspaceIdentity } from "../../../services/cases";
import { deleteFreelancerCaseAction } from "./case-actions";

type CaseItemActionsProps = {
  caseId: string;
  disabled?: boolean;
  onCaseDeleted?: (result: {
    cases: FreelancerCase[];
    identity: WorkspaceIdentity;
    notice?: string;
  }) => void;
};

export function CaseItemActions({ caseId, disabled = false, onCaseDeleted }: CaseItemActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFreelancerCaseAction(caseId);

      if (!result.success) {
        window.alert(result.error ?? "Unable to delete case.");
        return;
      }

      if (result.cases && result.identity && onCaseDeleted) {
        onCaseDeleted({
          cases: result.cases,
          identity: result.identity,
          notice: result.notice,
        });
      }
    });
  }

  return (
    <div className="button-row workspace-case__actions">
      <Button href={`/onboarding/case?caseId=${caseId}`} variant="ghost">
        Edit
      </Button>
      <button
        className="button button--ghost"
        disabled={disabled || isPending}
        onClick={handleDelete}
        type="button"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
