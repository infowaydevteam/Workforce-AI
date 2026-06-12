import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import InviteAccept from './components/auth/InviteAccept';
import ProtectedRoute from './components/ProtectedRoute';

// Admin
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './components/pages/admin/AdminDashboard';
import Users from './components/pages/admin/Users';
import Organizations from './components/pages/admin/Organizations';
import Teams from './components/pages/admin/Teams';
import Reports from './components/pages/admin/Reports';
import EmployeeDetail from './components/pages/admin/EmployeeDetail';
import Departments from './components/pages/admin/Departments';
import Invitations from './components/pages/admin/Invitations';
import Classification from './components/pages/admin/Classification';
import Productivity from './components/pages/admin/Productivity';

// Manager
import ManagerLayout from './layouts/ManagerLayout';
import ManagerDashboard from './components/pages/manager/ManagerDashboard';

// HR
import HrLayout from './layouts/HrLayout';
import HrDashboard from './components/pages/hr/HrDashboard';

// Executive
import ExecutiveLayout from './layouts/ExecutiveLayout';
import ExecutiveAnalytics from './components/pages/executive/ExecutiveAnalytics';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:token" element={<InviteAccept />} />

        {/* Admin */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/employee" element={<Users />} />
          <Route path="/admin/employee/:id" element={<EmployeeDetail />} />
          <Route path="/admin/organizations" element={<Organizations />} />
          <Route path="/admin/Teams" element={<Teams />} />
          <Route path="/admin/teams" element={<Teams />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/invitations" element={<Invitations />} />
          <Route path="/admin/classification" element={<Classification />} />
          <Route path="/admin/productivity" element={<Productivity />} />
          <Route path="/admin/Reports" element={<Reports />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>

        {/* Manager */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/productivity" element={<Productivity />} />
          <Route path="/manager/reports" element={<Reports />} />
        </Route>

        {/* HR */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "hr"]}>
              <HrLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/hr" element={<HrDashboard />} />
          <Route path="/hr/invitations" element={<Invitations />} />
          <Route path="/hr/employees" element={<Users />} />
          <Route path="/hr/departments" element={<Departments />} />
        </Route>

        {/* Executive */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "executive"]}>
              <ExecutiveLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/executive" element={<ExecutiveAnalytics />} />
          <Route path="/executive/productivity" element={<Productivity />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
