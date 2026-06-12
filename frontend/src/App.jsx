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

const App = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />

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
          <Route path="/admin/Reports" element={<Reports />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;
