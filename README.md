# IWF (Info Workforce)

## Admin Setup

### 1. Start Backend

```bash
cd backend
npm install
npm start
```

Apply the migrations in `backend/migrations` in numerical order:

```bash
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

They cover the admin workflow tables, encrypted screenshot storage, the idle
alert tables, and a conversion of the screenshot timestamps to `timestamptz`.
Screenshot capture also needs the `SCREENSHOT_*` settings described in
`backend/.env.example`.

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Login as Admin

Open:

```text
http://localhost:5173
```

Login using admin credentials.

## Roles and Permissions

IWF uses three user roles. The values in the table are what is stored in
`users.role`; the names beside them are what the interface shows.

| Stored value | Shown as | Purpose |
|---|---|---|
| `superadmin` | Super Admin | Platform-level administrator. Manages organizations, teams, employees, policies, reports and screenshots across every organization. |
| `admin` | Team Admin | Organization-level administrator. Manages employees, teams, policies, reports and screenshots within their own organization, and receives restricted website and app alerts for employees in their team. |
| `employee` | Employee | Monitored employee. Runs the desktop agent, which reports status, activity, idle time and screenshots. |

Who can assign what:

* A Super Admin can assign any of the three roles, including promoting another
  account to Super Admin.
* Everyone else can only create and assign Employees. The server rejects a Team
  Admin who tries to assign a higher role, even by calling the API directly.
* The last Super Admin cannot be demoted, so there is always one account able to
  restore the others.
* Super Admins are listed in Users only for other Super Admins.

Earlier builds also had `hr`, `manager` and `executive`. No account ever held
them and they have been removed; what `manager` was meant to do is now the Team
Admin's job.

### 4. Create Organization

Organizations → Add Organization

### 5. Create Team

Teams → Add Team

### 6. Create Employee

Users → Add User

System will:

* Create Employee
* Generate an employee-specific Agent Token
* Generate an employee-specific Agent Download Link

Send the following to the employee:

* Agent Download Link

---

# Employee Setup

### 1. Open Agent Download Link

Open the employee-specific link sent by Admin:

```text
/api/agent/download-agent/<employee-agent-token>
```

The download page lets the employee choose the correct installer:

* Windows package
* macOS package

### 2. Install Agent

Windows:

* Download the Windows agent package from the employee download page.
* Install or extract the package.
* Run the installer script or packaged installer.
* The agent writes local config and starts in the background.

macOS:

* Download the macOS `.pkg` from the employee download page.
* Run the installer.
* Grant required macOS permissions when prompted, such as Accessibility or Screen Recording.
* The installer writes local config and registers a LaunchAgent for background startup.

### 3. Start Monitoring

After successful installation:

* Agent starts automatically
* Agent verifies the employee token with backend
* Status appears as Online, Idle, or Offline
* Activity and idle tracking begin according to company policy

No further action is required.

### 4. Automatic Updates

After the first installation, employees do not need to uninstall and reinstall
for future agent releases.

When a new agent version is published:

* The agent asks `/api/agent/updates` for the current manifest, at startup and
  every six hours after that.
* If a newer version is listed, it downloads the package and checks its SHA-256
  against the manifest. A package that does not match is discarded.
* It stages the package, applies it, and exits so the LaunchAgent (macOS) or the
  relaunch script (Windows) starts the new build.
* If the update is applied while the employee is being monitored, the agent ends
  the session and marks them Offline first, so nobody is left showing Online.

If applying an update fails, the agent restarts the version it already has
rather than leaving the machine unmonitored, and records what happened:

* macOS writes `~/Library/Application Support/IWF-Agent/updates/<version>/`.
* Windows writes `apply-update.log` in
  `%LOCALAPPDATA%\IWF-Agent\updates\<version>\`, saying whether the copy
  succeeded or whether it had to restart the old build.

Windows retries the copy up to five times, since the running executable has to
be released before it can be overwritten. After three failed attempts at the
same version it stops trying, to avoid re-downloading the package on every
restart. Publishing a newer version starts a fresh set of attempts; to make it
retry the same version, delete `update-state.json` in
`%LOCALAPPDATA%\IWF-Agent\updates\`.

The macOS update path has been exercised end to end, from an agent on an older
version through to the new build running. The Windows path is verified as far as
the download and checksum; applying it has not been run on a Windows machine.

See `backend/agent-updates/README.md` for how to publish a release.
