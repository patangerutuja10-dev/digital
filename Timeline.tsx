import React from "react";

export interface TimelineStep {
  key: string;
  label: string;
  uiStatus: "done" | "current" | "locked" | "skipped";
  requiredRole?: string | null;
  support?: { count: number; required: number };
  approval?: { decision: string; actor: string; comment?: string | null; at: string };
}

function iconFor(step: TimelineStep) {
  if (step.uiStatus === "done") return "\u2713";
  if (step.uiStatus === "current") return "\u23f3";
  return "\u25cb";
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="timeline">
      {steps.map((step) => (
        <div key={step.key} className={`timeline-step ${step.uiStatus}`}>
          <div className="dot">{iconFor(step)}</div>
          <div className="step-body">
            <div className="step-title">{step.label}</div>
            <div className="step-meta">
              {!step.approval && step.uiStatus === "done" && "Completed"}
              {!step.approval && step.uiStatus === "current" && "Currently waiting here"}
              {!step.approval && step.uiStatus === "locked" && "Not reached yet"}
              {step.support && ` \u2014 Support ${step.support.count}/${step.support.required}`}
              {step.approval &&
                `${step.approval.decision} by ${step.approval.actor} on ${new Date(step.approval.at).toLocaleString()}`}
              {step.approval?.comment && ` \u2014 "${step.approval.comment}"`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
