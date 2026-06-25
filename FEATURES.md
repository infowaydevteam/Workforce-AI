# Workforce AI — Feature Documentation

## Current Features (Main Branch)

These features are fully implemented and available in the current codebase.

---

### Authentication
- **User Login** — JWT-based authentication with bcrypt password hashing
- **Role-based Access Control** — Admin and Employee roles with protected routes
- **Token Expiry** — JWT tokens expire after 24 hours

---

### Admin Dashboard
- **Dashboard Stats** — Total employees, active sessions, organizations, and teams at a glance
- **Live Users** — Real-time view of currently active/online employees
- **Recent Activities** — Feed of latest employee activity events
- **Top Applications Today** — Most used applications across all employees for the current day
- **Organization Summary** — Breakdown of employees per organization

---

### Employee Management
- **Employee List** — Paginated list of all employees with search and status indicators
- **Employee Detail View** — Per-employee profile with full activity breakdown
- **Login History** — Record of when each employee logged in and out
- **App Usage** — Applications used by an employee with time spent per app
- **Activity Summary** — High-level summary of productive vs idle time
- **Activity Logs** — Granular timestamped log of all employee activity events
- **Delete Employee** — Admin can remove an employee from the system
- **Status Management** — Admin can activate or deactivate employee accounts

---

### Organization Management
- **List Organizations** — View all organizations in the system
- **Add Organization** — Create a new organization
- **Delete Organization** — Remove an organization

---

### Team Management
- **List Teams** — View all teams across the organization
- **Add Team** — Create a new team
- **Delete Team** — Remove a team

---

### Activity & Session Tracking
- **Session Start / End** — Desktop agent records when an employee begins and ends a work session
- **Activity Logging** — Desktop agent posts activity events (app usage, window focus) to the backend
- **Idle Logging** — Desktop agent detects and logs idle periods
- **Agent Token Verification** — Each desktop agent authenticates using a unique per-user token
- **Agent Download** — Admin can download a pre-configured desktop agent (IWF-Agent.zip) per employee

---

### Reports
- **Attendance Report** — Employee attendance records over a date range
- **Productivity Ranking** — Ranked list of employees by productivity score
- **App Usage Report** — Aggregated application usage across employees
- **Full Employee Report** — Combined report per employee (sessions, apps, productivity)

---

---

## Features In Development — Level 1 Roadmap

The following is the planned end-to-end workflow for Level 1 of the platform.

```
Company Signup → Tenant Creation → Organization Setup → Departments Creation →
Teams Creation → Managers Assigned → Employees Invited → Desktop Agent Installed →
User Login → Activity Collection → Data Sync → Activity Classification →
Productivity Calculation → Reports Generation → Manager Review → HR Review →
Executive Analytics
```

---

### 1. Company Signup
- Self-service signup flow for new companies
- Company profile creation (name, size, industry, country)
- Admin account creation tied to the company

### 2. Tenant Creation
- Multi-tenant architecture — each company gets an isolated tenant
- Tenant-level database separation or row-level isolation
- Subdomain or tenant ID routing (e.g. `company.iwf.app`)

### 3. Organization Setup
- Tenant admin configures the organization structure
- Set working hours, timezone, and productivity policies
- Logo and branding customization

### 4. Departments Creation
- Create departments within an organization (Engineering, HR, Sales, etc.)
- Assign department heads
- Department-level reporting and policies

### 5. Teams Creation
- Create teams within departments
- Assign team names, descriptions, and member limits
- *(Partial — team creation exists; department linkage and policies are upcoming)*

### 6. Managers Assigned
- Assign manager roles to specific employees
- Managers get access to their team's data only
- Manager dashboard with team-level analytics

### 7. Employees Invited
- Admin sends email invitations to employees
- Invite link with pre-filled organization and team assignment
- Employee self-registration via invite link

### 8. Desktop Agent Installed
- Employee downloads the desktop agent after login
- Agent auto-configures using the employee's unique token
- *(Partial — agent download endpoint exists; auto-configuration packaging is in progress)*
- Support for Windows (IWF-Agent.exe / IWF-Agent.zip)
- Mac and Linux agent support planned

### 9. User Login
- Employee logs into the desktop agent
- Agent authenticates with the backend and starts a session
- *(Partial — session start/end API exists)*

### 10. Activity Collection
- Desktop agent captures foreground application and window title
- Captures URL for browser activity
- Records mouse/keyboard activity to detect idle vs active state
- *(Partial — activity log and idle log APIs exist)*

### 11. Data Sync
- Agent syncs collected data to backend at regular intervals
- Offline buffering — data saved locally if network is unavailable, synced on reconnect
- Configurable sync interval per organization policy

### 12. Activity Classification
- Classify applications and URLs as Productive, Neutral, or Unproductive
- Admin-configurable classification rules per organization
- AI-assisted classification for unknown applications

### 13. Productivity Calculation
- Calculate productivity score per employee per day
- Formula based on productive time / total active time
- Team and department level productivity aggregation

### 14. Reports Generation
- Automated daily, weekly, and monthly report generation
- Export to PDF and CSV
- Scheduled report delivery via email
- *(Partial — manual report views exist; automation and export are upcoming)*

### 15. Manager Review
- Manager dashboard to review team productivity and activity
- Ability to flag anomalies or add notes on employee reports
- Team comparison views

### 16. HR Review
- HR-specific dashboard for attendance, leave correlation, and compliance
- Alerts for employees consistently below productivity thresholds
- Bulk export for payroll or HR systems

### 17. Executive Analytics
- Executive-level dashboard with organization-wide KPIs
- Trend analysis over weeks and months
- Heatmaps of productivity by department, team, and time of day
- Benchmarking across teams and departments

---

## Legend

| Status | Meaning |
|---|---|
| Fully implemented | Available and working in main branch |
| Partial | API or backend exists; UI or full flow incomplete |
| Upcoming | Planned for Level 1, not yet started |
