import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './components/auth/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import Users from './components/pages/admin/Users';
import Organizations from './components/pages/admin/Organizations';
import Teams from './components/pages/admin/Teams';
import Reports from './components/pages/admin/Reports';
import EmployeeDetail from './components/pages/admin/EmployeeDetail';
import AdminPolicies from './components/pages/admin/AdminPolicies';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

        {/* Admin */}

        <Route
          element={
            <ProtectedRoute allowedRoles={["superadmin","admin","hr"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employee"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employee/:id"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <EmployeeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organizations"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <Organizations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/Teams"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <Teams />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/Reports" element={<Reports />} />
          <Route
            path="/admin/teams"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <Teams />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/reports" element={<Reports />} />
          <Route
            path="/admin/policies"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <AdminPolicies />
              </ProtectedRoute>
            }
          />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;
