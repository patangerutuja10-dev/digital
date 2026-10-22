import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, ApiClientError } from "../api/client";
import { StatusBadge } from "../components/common";
import { Timeline, TimelineStep } from "../components/Timeline";
import { useAuth } from "../context/AuthContext";

interface RequestDetailData {
  id: string;
  displayId: string;
  status: string;
  requestedBy: { id: string; fullName: string; email: string };
  items: {
    id: string;
    author: string;
    title: string;
    publication?: string;
    copiesRequired: number;
    approxCost?: number;
    remark?: string;
    neededWithinDays?: number;
    photocopyAcceptable?: boolean;
  }[];
  procurement?: any;
  supports: { id: string; user: { id: string; fullName: string }; comment?: string }[];
  _count: { supports: number };
  cancelReason?: string | null;
}

interface CatalogueMatch { id: string; title: string; author: string; copiesOwned: number }

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  user?: { fullName: string } | null;
  roleKeyAtTime?: string | null;
  metadata?: string | null;
}

interface SimilarMatch { id: string; title: string; author: string; similarity: number }

const REVIEW_STAGES = ["UNDER_REVIEW", "HOD_REVIEW", "PRINCIPAL_REVIEW"];

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<RequestDetailData | null>(null);
  const [timeline, setTimeline] = useState<TimelineStep[] | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [similar, setSimilar] = useState<SimilarMatch[] | null>(null);
  const [availability, setAvailability] = useState<Record<string, CatalogueMatch[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [procForm, setProcForm] = useState({ orderSentTo: "", orderNumber: "", orderDate: "", totalBudget: "", orderAmount: "" });
  const [billForm, setBillForm] = useState({ billNumber: "", billDate: "", billAmount: "" });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [reqRes, timelineRes, auditRes] = await Promise.all([
        api.get<{ request: RequestDetailData }>(`/book-requests/${id}`),
        api.get<{ timeline: TimelineStep[] }>(`/book-requests/${id}/timeline`),
        api.get<{ logs: AuditEntry[] }>(`/book-requests/${id}/audit`),
      ]);
      setData(reqRes.request);
      setTimeline(timelineRes.timeline);
      setAudit(auditRes.logs);
      if (reqRes.request.procurement) {
        const p = reqRes.request.procurement;
        setProcForm({
          orderSentTo: p.orderSentTo || "",
          orderNumber: p.orderNumber || "",
          orderDate: p.orderDate ? p.orderDate.slice(0, 10) : "",
          totalBudget: p.totalBudget ?? "",
          orderAmount: p.orderAmount ?? "",
        });
      }
      api
        .get<{ matches: SimilarMatch[] }>(`/book-requests/${id}/similar`)
        .then((r) => setSimilar(r.matches))
        .catch(() => setSimilar([]));

      // Show live library availability + quantity for every book on this
      // request, to everyone viewing it (student, HOD, principal, librarian).
      reqRes.request.items.forEach((item) => {
        api
          .get<{ results: CatalogueMatch[] }>(`/catalogue/search?q=${encodeURIComponent(item.title)}`)
          .then((r) => setAvailability((prev) => ({ ...prev, [item.id]: r.results })))
          .catch(() => {});
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load request.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(fn: () => Promise<any>, successMsg: string) {
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(successMsg);
      setComment("");
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed.");
    }
  }

  if (!data) {
    return <div>{error ? <div className="alert alert-error">{error}</div> : "Loading..."}</div>;
  }

  const isOwner = user?.id === data.requestedBy.id;
  const alreadySupported = data.supports.some((s: any) => s.user?.id === user?.id) || false;
  const canSupport = data.status === "SUPPORT_COLLECTION" && !isOwner && user?.roles.some((r) => ["STUDENT", "FACULTY"].includes(r));

  const stageRoleMap: Record<string, string> = {
    UNDER_REVIEW: "SUBJECT_INCHARGE",
    HOD_REVIEW: "HOD",
    PRINCIPAL_REVIEW: "PRINCIPAL",
  };
  const canDecide = REVIEW_STAGES.includes(data.status) && user?.roles.includes(stageRoleMap[data.status]);
  const canLibrarianVerify = data.status === "LIBRARIAN_VERIFICATION" && user?.roles.includes("LIBRARIAN");
  const canProcure = data.status === "PROCUREMENT" && user?.roles.some((r) => ["PROCUREMENT_ADMIN", "SYSTEM_ADMIN"].includes(r));
  const canSubmit = ["DRAFT", "RETURNED_FOR_CORRECTION"].includes(data.status) && isOwner;
  const TERMINAL = ["COMPLETED", "REJECTED", "CANCELLED"];
  const canCancel = isOwner && !TERMINAL.includes(data.status);
  const canArchive =
    TERMINAL.includes(data.status) &&
    (isOwner || user?.roles.some((r) => ["SYSTEM_ADMIN", "LIBRARIAN"].includes(r)));
  const totalCost = data.items.reduce((sum, i) => sum + (i.approxCost ?? 0) * (i.copiesRequired || 1), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{data.displayId} <StatusBadge status={data.status} /></h1>
          <p className="subtitle">Requested by {data.requestedBy.fullName} ({data.requestedBy.email})</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: 16, alignItems: "start" }}>
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Workflow Timeline</h3>
            {timeline ? <Timeline steps={timeline} /> : "Loading..."}
          </div>

          {canSubmit && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Submit This Request</h3>
              <p className="subtitle">Move it out of draft into support collection / review.</p>
              <button className="btn btn-primary" onClick={() => runAction(() => api.post(`/book-requests/${id}/submit`), "Request submitted.")}>
                Submit Request
              </button>
            </div>
          )}

          {data.status === "CANCELLED" && data.cancelReason && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Cancelled by Requester</h3>
              <p className="subtitle">Reason: {data.cancelReason}</p>
            </div>
          )}

          {canCancel && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Cancel This Request</h3>
              {!showCancelBox ? (
                <button className="btn btn-danger btn-sm" onClick={() => setShowCancelBox(true)}>
                  Cancel Request
                </button>
              ) : (
                <>
                  <p className="subtitle">
                    Please give a reason — reviewers may already have spent time on this request.
                  </p>
                  <div className="form-field" style={{ marginBottom: 10 }}>
                    <label>Reason (required)</label>
                    <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why are you cancelling?" />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-danger"
                      disabled={cancelReason.trim().length < 5}
                      onClick={() =>
                        runAction(
                          () => api.post(`/book-requests/${id}/cancel`, { reason: cancelReason }),
                          "Request cancelled."
                        ).then(() => setShowCancelBox(false))
                      }
                    >
                      Confirm Cancel
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowCancelBox(false)}>
                      Never mind
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {canArchive && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>History</h3>
              <p className="subtitle">This request is finished. Clear it from the active panel (nothing is deleted — the audit trail stays).</p>
              <button className="btn btn-secondary btn-sm" onClick={() => runAction(() => api.post(`/book-requests/${id}/archive`), "Cleared from active list.")}>
                Clear from Active List
              </button>
            </div>
          )}

          {canSupport && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Support This Request</h3>
              <p className="subtitle">{data._count.supports} student(s) currently support this request.</p>
              {alreadySupported ? (
                <button className="btn btn-secondary" onClick={() => runAction(() => api.delete(`/book-requests/${id}/support`), "Support withdrawn.")}>
                  Withdraw My Support
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => runAction(() => api.post(`/book-requests/${id}/support`, {}), "You supported this request.")}>
                  I need this book too
                </button>
              )}
            </div>
          )}

          {canDecide && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Your Decision</h3>
              <div className="form-field" style={{ marginBottom: 10 }}>
                <label>Comment</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional remark" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => runAction(() => api.post(`/book-requests/${id}/decision`, { decision: "APPROVE", comment }), "Approved.")}>
                  Approve
                </button>
                <button className="btn btn-secondary" onClick={() => runAction(() => api.post(`/book-requests/${id}/decision`, { decision: "RETURN", comment }), "Returned for correction.")}>
                  Return for Correction
                </button>
                <button className="btn btn-danger" onClick={() => runAction(() => api.post(`/book-requests/${id}/decision`, { decision: "REJECT", comment }), "Rejected.")}>
                  Reject
                </button>
              </div>
              <p className="tag-note">DIGITALLY APPROVED = authenticated role + correct stage + timestamp + audit record (not a legal e-signature)</p>
            </div>
          )}

          {canLibrarianVerify && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Librarian Verification</h3>
              <p className="subtitle">Check whether the book is already available before sending to procurement.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => runAction(() => api.post(`/book-requests/${id}/librarian-verify`, { availableInLibrary: true }), "Marked available — request completed.")}>
                  Already Available
                </button>
                <button className="btn btn-secondary" onClick={() => runAction(() => api.post(`/book-requests/${id}/librarian-verify`, { availableInLibrary: false }), "Sent to procurement.")}>
                  Not Available — Send to Procurement
                </button>
              </div>
            </div>
          )}

          {canProcure && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Procurement Details</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Order Sent To</label>
                  <input value={procForm.orderSentTo} onChange={(e) => setProcForm({ ...procForm, orderSentTo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Order No.</label>
                  <input value={procForm.orderNumber} onChange={(e) => setProcForm({ ...procForm, orderNumber: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Order Date</label>
                  <input type="date" value={procForm.orderDate} onChange={(e) => setProcForm({ ...procForm, orderDate: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Total Budget Available (₹)</label>
                  <input type="number" value={procForm.totalBudget} onChange={(e) => setProcForm({ ...procForm, totalBudget: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Order Amount (₹)</label>
                  <input type="number" value={procForm.orderAmount} onChange={(e) => setProcForm({ ...procForm, orderAmount: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Balance Available (₹) — computed</label>
                  <input
                    disabled
                    value={
                      procForm.totalBudget && procForm.orderAmount
                        ? (Number(procForm.totalBudget) - Number(procForm.orderAmount)).toFixed(2)
                        : data.procurement?.balanceAvailable ?? ""
                    }
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                onClick={() =>
                  runAction(
                    () =>
                      api.post(`/procurement/${id}`, {
                        orderSentTo: procForm.orderSentTo || undefined,
                        orderNumber: procForm.orderNumber || undefined,
                        orderDate: procForm.orderDate ? new Date(procForm.orderDate).toISOString() : undefined,
                        totalBudget: procForm.totalBudget ? Number(procForm.totalBudget) : undefined,
                        orderAmount: procForm.orderAmount ? Number(procForm.orderAmount) : undefined,
                      }),
                    "Order recorded."
                  )
                }
              >
                Save Order Details
              </button>

              <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--border)" }} />

              <div className="form-grid">
                <div className="form-field">
                  <label>Bill No.</label>
                  <input value={billForm.billNumber} onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Bill Date</label>
                  <input type="date" value={billForm.billDate} onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Bill Amount (₹)</label>
                  <input type="number" value={billForm.billAmount} onChange={(e) => setBillForm({ ...billForm, billAmount: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    runAction(
                      () =>
                        api.patch(`/procurement/${id}`, {
                          billNumber: billForm.billNumber || undefined,
                          billDate: billForm.billDate ? new Date(billForm.billDate).toISOString() : undefined,
                          billAmount: billForm.billAmount ? Number(billForm.billAmount) : undefined,
                        }),
                      "Bill recorded."
                    )
                  }
                >
                  Record Bill
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => runAction(() => api.patch(`/procurement/${id}`, { markAccessioned: true }), "Book accessioned — request completed.")}
                >
                  Mark Books Accessioned (Complete)
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Book Details</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Author</th><th>Title</th><th>Publication</th><th>Copies</th><th>Approx. Cost</th>
                  <th>Needed In</th><th>Xerox OK</th><th>Library Has</th><th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const av = availability[item.id];
                  return (
                    <tr key={item.id}>
                      <td>{item.author}</td>
                      <td>{item.title}</td>
                      <td>{item.publication || "—"}</td>
                      <td>{item.copiesRequired}</td>
                      <td>{item.approxCost ?? "—"}</td>
                      <td>{item.neededWithinDays ? `${item.neededWithinDays} day(s)` : "—"}</td>
                      <td>{item.photocopyAcceptable ? "Yes" : "No"}</td>
                      <td>
                        {av === undefined
                          ? "…"
                          : av.length === 0
                          ? "Not in library"
                          : av.map((m) => `${m.copiesOwned} copy(ies)`).join(", ")}
                      </td>
                      <td>{item.remark || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalCost > 0 && (
              <p className="subtitle" style={{ marginTop: 10, fontWeight: 600, color: "var(--text)" }}>
                Total Estimated Cost: ₹{totalCost.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>AI Duplicate / Similarity Check</h3>
            <p className="subtitle">TF‑IDF + cosine similarity against the catalogue — a real, simple, explainable check, not a large embedding model.</p>
            {similar === null ? (
              "Checking..."
            ) : similar.length === 0 ? (
              <div className="empty-state">No meaningfully similar books found in the catalogue.</div>
            ) : (
              similar.map((m) => (
                <div className="similarity-row" key={m.id}>
                  <span>{m.title} — {m.author}</span>
                  <span className="similarity-score">{m.similarity}%</span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Audit Log</h3>
            <p className="subtitle">Append-only — cannot be edited or deleted by any user.</p>
            {audit === null ? (
              "Loading..."
            ) : (
              audit.map((a) => (
                <div className="audit-row" key={a.id}>
                  <span className="audit-time">{new Date(a.createdAt).toLocaleString()}</span>
                  <span>
                    <strong>{a.action.replaceAll("_", " ")}</strong>
                    {a.user ? ` by ${a.user.fullName}` : ""} {a.roleKeyAtTime ? `(${a.roleKeyAtTime})` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
