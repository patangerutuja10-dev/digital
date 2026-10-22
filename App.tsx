import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppShell, ProtectedRoute } from "./components/common";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RequestList from "./pages/RequestList";
import RequestDetail from "./pages/RequestDetail";
import CreateRequest from "./pages/CreateRequest";
import AdminConfig from "./pages/AdminConfig";

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/requests" element={<RequestList />} />
                <Route
                  path="/requests/new"
                  element={
                    // Anyone signed in — student, faculty, subject in-charge, HOD,
                    // principal, or librarian — can put in a book recommendation.
                    <ProtectedRoute>
                      <CreateRequest />
                    </ProtectedRoute>
                  }
                />
                <Route path="/requests/:id" element={<RequestDetail />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute anyRole={["SYSTEM_ADMIN"]}>
                      <AdminConfig />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
