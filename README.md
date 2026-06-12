# Workforce-AI (IWF - InfoWorkforce)

An internal workforce intelligence platform for managing employees, tracking productivity, and generating analytics across organizations, departments, and teams.

---

## Tech Stack

**Backend:** Node.js · Express.js · PostgreSQL · JWT · bcrypt  
**Frontend:** React 19 · React Router v7 · Tailwind CSS · Recharts · Vite

---

## Level 1 Changes — Complete Platform Flow

This branch (`kevin_level1`) implements the full end-to-end Level 1 platform flow:

> Company Signup → Tenant Creation → Organization Setup → Departments Creation → Teams Creation → Managers Assigned → Employees Invited → Desktop Agent Installed → User Login → Activity Collection → Data Sync → Activity Classification → Productivity Calculation → Reports Generation → Manager Review → HR Review → Executive Analytics

---

### 1. Company Signup & Tenant Creation

**New:** `POST /api/auth/company-signup`  
**New:** `frontend/src/components/auth/Signup.jsx`  
**New:** `migration_level1.sql` — `tenants` table

Companies can now self-register through a dedicated signup page. This creates a **tenant** record (company root) and the first **admin** user in a single transaction. Previously there was no onboarding flow — users had to be manually inserted into the database.

---

### 2. Departments Creation

**New:** `backend/controller/departmentController.js`  
**New:** `backend/route/departmentRoute.js`  
**New:** `frontend/src/components/pages/admin/Departments.jsx`  
**New:** `departments` table (migration_level1.sql)

The platform previously only had Organizations and Teams. Departments have been added as an intermediate layer (Organization → Department → Team). Each department can have a designated manager. Admins and HR can create, edit, and delete departments from the UI.

---

### 3. Manager Assignment

**Updated:** `departmentController.js` — when a user is assigned as department manager, their role is automatically upgraded to `manager`  
**New:** `frontend/src/layouts/ManagerLayout.jsx`  
**New:** `frontend/src/components/pages/manager/ManagerDashboard.jsx`

Managers now have their own portal at `/manager`. The dashboard shows only the employees in their assigned departments, with live status, productivity scores, and active time — no access to other teams' data.

---

### 4. Employee Invitations

**New:** `backend/controller/invitationController.js`  
**New:** `backend/route/invitationRoute.js`  
**New:** `frontend/src/components/pages/admin/Invitations.jsx`  
**New:** `frontend/src/components/auth/InviteAccept.jsx`  
**New:** `invitations` table (migration_level1.sql)

Previously employees could only be registered directly via the API. Now admins and HR can invite employees by email. The system generates a unique invite link (valid 7 days) that the employee uses to self-register. The invite pre-fills their role, organization, team, and department. Once accepted, the invitation is marked as used.

---

### 5. Activity Classification

**New:** `backend/controller/classificationController.js`  
**New:** `backend/route/classificationRoute.js`  
**New:** `frontend/src/components/pages/admin/Classification.jsx`  
**New:** `app_categories` table (migration_level1.sql)

Apps tracked by the desktop agent can now be classified as **Productive** or **Unproductive** with a category label (Development, Office, Communication, Entertainment, etc.). An **Auto-Classify** button scans all activity logs and creates entries for any unclassified apps. 15 common apps are pre-seeded in the migration. This classification data feeds directly into productivity scoring.

---

### 6. Productivity Calculation

**New:** `backend/controller/productivityController.js`  
**New:** `backend/route/productivityRoute.js`  
**New:** `frontend/src/components/pages/admin/Productivity.jsx`

Productivity scores are calculated as:

```
Score = (Productive App Time / Total Active Time) × 100
```

Four endpoints are available:

| Endpoint | Access | Description |
|---|---|---|
| `GET /api/productivity/user/:id` | All roles | Individual user score + app breakdown |
| `GET /api/productivity/team` | Admin, HR, Executive | Full company ranking |
| `GET /api/productivity/my-team` | Manager | Scoped to manager's departments only |
| `GET /api/productivity/executive` | Admin, Executive | Org-level aggregates |

The Productivity page shows a color-coded bar chart (green ≥70%, amber ≥40%, red <40%) and a ranked table with active time, productive time, and unproductive time per employee.

---

### 7. Manager Review Portal

**New:** `/manager` route with `ManagerLayout`  
**New:** `ManagerDashboard.jsx`

Managers log in and land on their own dashboard showing:
- Team size, online count, average productivity score
- Per-member status, department, productivity score, and active time
- Auto-refreshes every 30 seconds

---

### 8. HR Review Portal

**New:** `/hr` route with `HrLayout`  
**New:** `frontend/src/components/pages/hr/HrDashboard.jsx`

HR staff have a dedicated portal with:
- Headline stats (total employees, online now, pending invites, departments)
- Quick access to send invitations, manage departments, view all employees
- Pending invitations panel with expiry tracking

---

### 9. Executive Analytics

**New:** `/executive` route with `ExecutiveLayout`  
**New:** `frontend/src/components/pages/executive/ExecutiveAnalytics.jsx`  
**New:** `GET /api/productivity/executive`

Executives see a company-wide analytics view:
- Headline: total employees, online now, total managers
- Productivity score and headcount broken down by organization (bar chart + pie chart)
- Top productive and unproductive apps across the company
- Date range filtering

---

### 10. Role-Based Login Redirects

**Updated:** `frontend/src/components/auth/Login.jsx`

Users are now redirected to the correct portal after login based on their role:

| Role | Redirects to |
|---|---|
| `admin` | `/admin` |
| `manager` | `/manager` |
| `hr` | `/hr` |
| `executive` | `/executive` |

---

### 11. Bug Fixes

**Fixed:** `backend/route/usersRoute.js` — removed broken imports (`getReportsSummary`, `getAttendanceReport`, `getProductivityRanking`, `getReportsAppUsage`) that were imported but never existed in the controller, causing potential crashes.

**Updated:** `frontend/src/layouts/AdminLayout.jsx` — sidebar now includes links to Departments, Invitations, Classification, and Productivity pages.

**Updated:** `frontend/src/App.jsx` — all new routes wired for admin, manager, HR, and executive portals.

---

## Database Migration

Run `migration_level1.sql` against your PostgreSQL `IWF` database before starting the server:

```bash
psql -U postgres -d IWF -f migration_level1.sql
```

This adds:
- `tenants` table
- `departments` table
- `invitations` table
- `app_categories` table (with 15 pre-seeded app classifications)
- `tenant_id` and `department_id` columns on `users`
- `tenant_id` column on `organizations`

---

## Setup

### Backend
```bash
cd backend
npm install
# Configure .env (see Environment Variables below)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables (backend/.env)
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=IWF
DB_PASSWORD=yourpassword
DB_PORT=5432
JWT_SECRET=your_jwt_secret
PORT=5000
FRONTEND_URL=http://localhost:5173
```

---

## API Overview

| Prefix | Description |
|---|---|
| `/api/auth` | Login, register, company signup |
| `/api/employee` | Employee CRUD, activity, reports |
| `/api/organization` | Organization management |
| `/api/departments` | Department management |
| `/api/teams` | Team management |
| `/api/invitations` | Employee invitation flow |
| `/api/dashboard` | Dashboard stats and live data |
| `/api/session` | Session start/end tracking |
| `/api/activity` | App activity logging |
| `/api/idle` | Idle time logging |
| `/api/agent` | Desktop agent token verification |
| `/api/classifications` | App productivity classification |
| `/api/productivity` | Productivity scores and analytics |
| `/api/tenant` | Company/tenant info |
