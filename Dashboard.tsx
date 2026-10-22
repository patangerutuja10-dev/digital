import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/common";

interface RequestSummary {
  id: string;
  displayId: string;
  status: string;
  createdAt: string;
  requestedBy: { id: string; fullName: string };
  items: { title: string }[];
  _count: { supports: number };
}

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const ACTIONABLE_STAGES: Record<string, string> = {
  SUBJECT_INCHARGE: "UNDER_REVIEW",
  HOD: "HOD_REVIEW",
  PRINCIPAL: "PRINCIPAL_REVIEW",
  LIBRARIAN: "LIBRARIAN_VERIFICATION",
  PROCUREMENT_ADMIN: "PROCUREMENT",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestSummary[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);

  useEffect(() => {
    api.get<{ results: RequestSummary[] }>("/book-requests").then((r) => setRequests(r.results));
    api.get<{ notifications: NotificationItem[] }>("/notifications").then((r) => setNotifications(r.notifications));
  }, []);

  if (!user || !requests) return <div>Loading...</div>;

  const myRequests = requests.filter((r) => r.requestedBy.id === user.id);

  const actionableStage = user.roles.map((r) => ACTIONABLE_STAGES[r]).find(Boolean);
  const pendingForMe = actionableStage ? requests.filter((r) => r.status === actionableStage) : [];

  const recentlyDecided = requests.filter((r) => ["APPROVED", "REJECTED", "COMPLETED"].includes(r.status)).slice(0, 5);

  const isApproverRole = user.roles.some((r) => Object.keys(ACTIONABLE_STAGES).includes(r));
  const isAdmin = user.roles.includes("SYSTEM_ADMIN");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Welcome back, {user.fullName}.</p>
        </div>
        {(user.roles.includes("STUDENT") || user.roles.includes("FACULTY")) && (
          <Link className="btn btn-primary" to="/requests/new">+ New Request</Link>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          {isApproverRole && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Requests Awaiting Your Action</h3>
              {pendingForMe.length === 0 ? (
                <div className="empty-state">Nothing pending right now.</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Request</th><th>Title(s)</th><th>Requested By</th><th>Support</th><th></th></tr></thead>
                  <tbody>
                    {pendingForMe.map((r) => (
                      <tr key={r.id}>
                        <td>{r.displayId}</td>
                        <td>{r.items.map((i) => i.title).join(", ")}</td>
                        <td>{r.requestedBy.fullName}</td>
                        <td>{r._count.supports}</td>
                        <td><Link className="btn btn-secondary btn-sm" to={`/requests/${r.id}`}>Review</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>My Requests</h3>
            {myRequests.length === 0 ? (
              <div className="empty-state">
                You haven't created any book requests yet. <Link to="/requests/new">Create one</Link>.
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Request</th><th>Title(s)</th><th>Status</th><th>Support</th></tr></thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id} className="clickable">
                      <td><Link to={`/requests/${r.id}`}>{r.displayId}</Link></td>
                      <td>{r.items.map((i) => i.title).join(", ")}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{r._count.supports}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {isAdmin && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>System Overview</h3>
              <p className="subtitle">{requests.length} total requests in the system.</p>
              <Link className="btn btn-secondary" to="/admin">Open Admin Panel</Link>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Notifications</h3>
            {notifications === null ? (
              "Loading..."
            ) : notifications.length === 0 ? (
              <div className="empty-state">No notifications yet.</div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div key={n.id} className="audit-row">
                  <span className="audit-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                  <span>{n.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
            {recentlyDecided.length === 0 ? (
              <div className="empty-state">No completed/decided requests yet.</div>
            ) : (
              recentlyDecided.map((r) => (
                <div key={r.id} className="audit-row">
                  <span>{r.displayId}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
