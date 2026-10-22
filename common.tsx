import React from "react";
import { Navigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "status-draft",
    SUBMITTED: "status-progress",
    SUPPORT_COLLECTION: "status-progress",
    UNDER_REVIEW: "status-waiting",
    HOD_REVIEW: "status-waiting",
    PRINCIPAL_REVIEW: "status-waiting",
    LIBRARIAN_VERIFICATION: "status-waiting",
    PROCUREMENT: "status-waiting",
    COMPLETED: "status-approved",
    REJECTED: "status-rejected",
    RETURNED_FOR_CORRECTION: "status-rejected",
    CANCELLED: "status-rejected",
  };
  const cls = map[status] || "status-draft";
  return <span className={`badge ${cls}`}>{status.replaceAll("_", " ")}</span>;
}

export function ProtectedRoute({ children, anyRole }: { children: React.ReactElement; anyRole?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (anyRole && !anyRole.some((r) => user.roles.includes(r))) {
    return (
      <div className="content">
        <div className="alert alert-error">You don't have permission to view this page.</div>
      </div>
    );
  }
  return children;
}

const NAV_ITEMS: { to: string; label: string; roles?: string[] }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/requests", label: "Book Requests" },
  { to: "/requests/new", label: "New Request" },
  { to: "/admin", label: "Admin", roles: ["SYSTEM_ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          P. R. Pote Patil COEM
          <small>Library Recommendation &amp; Procurement</small>
        </div>
        <nav>
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r))).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && <div className="role-tag">{user.roles.join(", ")}</div>}
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="user-info">{user ? `Signed in as ${user.fullName}` : ""}</div>
          <button className="link" onClick={logout}>Log out</button>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
