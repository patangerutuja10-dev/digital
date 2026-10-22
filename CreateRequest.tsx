import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../api/client";

interface ItemRow {
  author: string;
  title: string;
  publication: string;
  copiesRequired: number;
  approxCost: string;
  remark: string;
  neededWithinDays: string;
  photocopyAcceptable: boolean;
}

interface CatalogueMatch {
  id: string;
  title: string;
  author: string;
  copiesOwned: number;
}

const emptyRow = (): ItemRow => ({
  author: "",
  title: "",
  publication: "",
  copiesRequired: 1,
  approxCost: "",
  remark: "",
  neededWithinDays: "",
  photocopyAcceptable: false,
});

export default function CreateRequest() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()]);
  const [availability, setAvailability] = useState<Record<number, CatalogueMatch[] | "checking" | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(idx: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setAvailability((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  // Debounced-ish check: fires on blur of the Title field, and shows how
  // many copies (if any) the library already has, per the guide's request
  // that students see availability before their request goes anywhere.
  async function checkAvailability(idx: number, title: string) {
    if (!title.trim()) {
      setAvailability((prev) => ({ ...prev, [idx]: null }));
      return;
    }
    setAvailability((prev) => ({ ...prev, [idx]: "checking" }));
    try {
      const res = await api.get<{ results: CatalogueMatch[] }>(`/catalogue/search?q=${encodeURIComponent(title)}`);
      setAvailability((prev) => ({ ...prev, [idx]: res.results }));
    } catch {
      setAvailability((prev) => ({ ...prev, [idx]: null }));
    }
  }

  async function handleSubmit(e: React.FormEvent, submitNow: boolean) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        items: rows.map((r) => ({
          author: r.author,
          title: r.title,
          publication: r.publication || undefined,
          copiesRequired: Number(r.copiesRequired) || 1,
          approxCost: r.approxCost ? Number(r.approxCost) : undefined,
          remark: r.remark || undefined,
          neededWithinDays: r.neededWithinDays ? Number(r.neededWithinDays) : undefined,
          photocopyAcceptable: r.photocopyAcceptable,
        })),
      };
      const res = await api.post<{ request: { id: string } }>("/book-requests", payload);
      if (submitNow) {
        await api.post(`/book-requests/${res.request.id}/submit`);
      }
      navigate(`/requests/${res.request.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Library Book Recommendation</h1>
          <p className="subtitle">
            Fields mirror the paper "Library Book Recommendation Form" (Author, Title, Publication,
            No. of Copies Required, Approx. Cost, Remark, Needed Within, Photocopy OK).
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form>
        {rows.map((row, idx) => {
          const av = availability[idx];
          return (
            <div className="card" key={idx}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Author</label>
                  <input value={row.author} onChange={(e) => updateRow(idx, { author: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Title</label>
                  <input
                    value={row.title}
                    onChange={(e) => updateRow(idx, { title: e.target.value })}
                    onBlur={(e) => checkAvailability(idx, e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Publication</label>
                  <input value={row.publication} onChange={(e) => updateRow(idx, { publication: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>No. of Copies Required</label>
                  <input
                    type="number"
                    min={1}
                    value={row.copiesRequired}
                    onChange={(e) => updateRow(idx, { copiesRequired: Number(e.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <label>Approx. Cost per copy (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={row.approxCost}
                    onChange={(e) => updateRow(idx, { approxCost: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Needed within (days)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 7"
                    value={row.neededWithinDays}
                    onChange={(e) => updateRow(idx, { neededWithinDays: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Remark</label>
                  <input value={row.remark} onChange={(e) => updateRow(idx, { remark: e.target.value })} />
                </div>
                <div className="form-field" style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                  <input
                    type="checkbox"
                    id={`xerox-${idx}`}
                    checked={row.photocopyAcceptable}
                    onChange={(e) => updateRow(idx, { photocopyAcceptable: e.target.checked })}
                    style={{ width: "auto" }}
                  />
                  <label htmlFor={`xerox-${idx}`} style={{ margin: 0 }}>
                    A photocopy (Xerox) is okay for now if the book isn't available
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 4 }}>
                {av === "checking" && <p className="subtitle">Checking library availability…</p>}
                {av && av !== "checking" && av.length > 0 && (
                  <div className="alert" style={{ background: "#e4f3ea", border: "1px solid #bfe1cc", color: "#24563d" }}>
                    Already in the library: {av.map((m) => `${m.title} (${m.copiesOwned} ${m.copiesOwned === 1 ? "copy" : "copies"})`).join(", ")}
                  </div>
                )}
                {av && av !== "checking" && av.length === 0 && (
                  <p className="subtitle">Not currently found in the library catalogue.</p>
                )}
              </div>

              {rows.length > 1 && (
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(idx)}>
                    Remove this book
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button type="button" className="btn btn-secondary" onClick={addRow} style={{ marginBottom: 16 }}>
          + Add another book
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={(e) => handleSubmit(e, false)} disabled={submitting}>
            Save as Draft
          </button>
          <button className="btn btn-primary" onClick={(e) => handleSubmit(e, true)} disabled={submitting}>
            Submit for Support / Review
          </button>
        </div>
      </form>
    </div>
  );
}
