import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/common";

interface RequestSummary {
  id: string;
  displayId: string;
  status: string;
  createdAt: string;
  requestedBy: { fullName: string };
  items: { title: string; author: string }[];
  _count: { supports: number };
}

export default function RequestList() {
  const [requests, setRequests] = useState<RequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<{ results: RequestSummary[] }>("/book-requests")
      .then((r) => setRequests(r.results))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Book Requests</h1>
          <p className="subtitle">Requests you created, or that need your action right now.</p>
        </div>
        <Link className="btn btn-primary" to="/requests/new">+ New Request</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {requests === null ? (
          <p>Loading...</p>
        ) : requests.length === 0 ? (
          <div className="empty-state">No requests yet. Create your first book recommendation.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Title(s)</th>
                <th>Requested By</th>
                <th>Support</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => navigate(`/requests/${r.id}`)}>
                  <td><Link to={`/requests/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.displayId}</Link></td>
                  <td>{r.items.map((i) => i.title).join(", ")}</td>
                  <td>{r.requestedBy.fullName}</td>
                  <td>{r._count.supports}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
