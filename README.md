# IWF (Info Workforce)

IWF is a workforce-management and activity-monitoring system with three parts:

- a React/Vite administration dashboard;
- a Node.js/Express API backed by PostgreSQL; and
- a self-contained employee agent for Windows and macOS.

The current `kevin_mac` branch combines the latest dashboard, reporting,
heartbeat, offline-detection, idle-alert, and website-tracking features from
`main` with native macOS window and idle-time monitoring.

## Requirements

- Node.js 20.19 or newer (Node.js 22 or 24 is recommended)
- npm
- PostgreSQL 17
- .NET 10 SDK only when building the desktop agent from source

Employees using a published agent do not need the .NET SDK.

## Local Configuration

Create `backend/.env` with the environment-specific values required by the
API. Do not commit real passwords, email credentials, agent tokens, or JWT
secrets.

```dotenv
PORT=5001
DB_USER=YOUR_POSTGRES_USER
DB_HOST=localhost
DB_NAME=IWF_DB
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_PORT=5432
JWT_SECRET=REPLACE_WITH_A_STRONG_SECRET
API_BASE_URL=http://localhost:5001
EMAIL_USER=YOUR_EMAIL_ACCOUNT
EMAIL_PASS=YOUR_EMAIL_APP_PASSWORD
```

The database must already contain the application schema, including the
`users`, `organizations`, `teams`, `sessions`, `activity_logs`, `idle_logs`,
`restricted_items`, `restricted_alerts`, `alerts`, and `tracked_websites`
tables. This repository does not currently include a migration runner.

## Admin Setup

### 1. Start PostgreSQL

**macOS**
```bash
brew services start postgresql@17
```

**Windows**
Start PostgreSQL from Services or pgAdmin.

### 2. Start Backend

```bash
cd backend
npm install
npm start
```

The API listens on the `PORT` configured in `backend/.env`. Port `5001` is
recommended on macOS because Control Center/AirPlay may reserve port `5000`.

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Ensure `frontend/config.js` points to the same backend URL. The Vite development
server normally starts at `http://localhost:5173`.

### 4. Login as Admin

Open:

```
http://localhost:5173
```

Login using admin credentials.

### 5. Create Organization

Organizations → Add Organization

### 6. Create Team

Teams → Add Team

### 7. Create Employee

Users → Add User

System will:

- Create Employee
- Generate Activation Code

Send the following to the employee:

- `IWF-Agent.zip` (or the macOS build — see below)
- Activation Code

---

## Employee Guide — Install and Use the Desktop Agent

The agent runs on Windows and macOS. It records the foreground application,
window title, active/idle time, sessions, and restricted-app/site events for
the signed-in employee. It is intended for company-managed devices only.

### Before you begin

Your administrator must create your employee account and provide either:

- an agent download link or package; and
- an activation code, if the package was not pre-configured.

The agent needs a reachable backend URL. For an on-premise installation, use
the server's LAN address (for example, `http://192.168.1.10:5001`), not
`localhost`, unless the backend is running on the same computer.

### Windows installation

1. Download `IWF-Agent.zip` from the employee download page and extract it.
2. Keep `IWF-Agent.exe` and `config.json` together in the extracted folder.
3. Double-click `IWF-Agent.exe`.
4. On the first launch, enter the backend URL and your activation code when
   prompted. The agent saves these values in its adjacent `config.json` file.
5. Keep the agent running while you work. After activation, it registers to
   start automatically when you sign in to Windows.

If Windows SmartScreen shows a warning for an unsigned internal build, contact
your administrator to confirm the package source before continuing.

### macOS installation

The downloadable macOS package is self-contained: employees do **not** need a
.NET SDK. Choose the package that matches the Mac:

- Apple Silicon (M1/M2/M3/M4): `IWF-Agent-mac-arm64.zip`
- Intel Mac: `IWF-Agent-mac-x64.zip`

1. Open the employee download page and select the package matching the Mac,
   then extract the ZIP.
2. Move `IWF-Agent` and its `config.json` to a permanent folder, such as
   `~/Applications/IWF-Agent`. Keep both files in the same folder.
3. In Terminal, make the binary executable and launch it:

   ```bash
   cd ~/Applications/IWF-Agent
   chmod +x IWF-Agent
   ./IWF-Agent
   ```

4. If macOS blocks the unsigned internal app, open **System Settings → Privacy
   & Security** and choose **Open Anyway** for IWF-Agent, then launch it again.
5. Grant Accessibility permission in **System Settings → Privacy & Security →
   Accessibility**. Add the IWF-Agent binary; when developing from Terminal,
   add Terminal instead.
6. Enter the backend URL and activation code when prompted, unless your
   downloaded package already contains them in `config.json`.

Once activated, the agent checks Accessibility permission before collecting any
activity. It registers a macOS LaunchAgent and starts automatically at your
next login. The current launch continues running; a second copy is not started.

### Build the macOS agents

From `IWF-Agent/IWF-Agent`, publish a self-contained package for each supported
Mac architecture:

```bash
dotnet publish IWF-Agent.csproj -c Release -r osx-arm64 \
  --self-contained true -o publish/mac-arm64

dotnet publish IWF-Agent.csproj -c Release -r osx-x64 \
  --self-contained true -o publish/mac-x64
```

Each download ZIP must contain these paths so the backend can inject the
employee's activation configuration:

```text
mac/IWF-Agent
mac/config.json
```

Store the finished packages as:

```text
backend/files/IWF-Agent-mac-arm64.zip
backend/files/IWF-Agent-mac-x64.zip
```

The employee download page requests `/api/agent/download-mac/:token` with an
`arch=arm64` or `arch=x64` query parameter and downloads the matching package.

### Configuration and activation

The agent stores its setup beside the executable in `config.json`:

```json
{
  "agent_token": "",
  "api_base_url": "http://YOUR_SERVER_IP:5001"
}
```

Do not share `agent_token` or the activation code. If a token is missing or no
longer valid, the agent asks for activation again. To point the agent to a new
server, stop it, update `api_base_url`, and launch it again.

### Normal operation and support

- The agent checks activity every 5 seconds and sends active periods in
  30-second chunks.
- It sends a heartbeat every 10 seconds so disconnected agents can be marked
  offline and their open sessions can be closed.
- It records an idle period after 5 seconds without input.
- After 60 continuous idle minutes, it submits an idle alert to the backend.
- It loads the tracked-website list from the backend and uses matching browser
  window titles in activity reports.
- It does not start or continue monitoring on Saturday or Sunday.
- On macOS, activity cannot be collected until Accessibility permission is
  granted.
- To stop the agent, close its terminal window or press `Ctrl+C` while it is
  running. Contact your administrator before removing its startup entry or
  deleting `config.json`.

If activation fails, verify the backend URL, network/VPN access, and activation
code with your administrator.

---

## How Monitoring Works

| What is tracked | Method | Frequency |
|---|---|---|
| Active application | AppleScript / Win32 API | Every 5 sec |
| Active window title | AppleScript / Win32 API | Every 5 sec |
| Idle detection | macOS IOKit `ioreg` / Windows `GetLastInputInfo` | Every 5 sec |
| App switch logging | POST `/api/activity/log` | On each switch |
| Continuous activity | POST `/api/activity/log` | Every 30 sec |
| Idle periods | POST `/api/idle/log` | On idle start/end |
| Extended-idle alert | POST `/api/alerts/idle` | After 60 continuous idle minutes |
| Online/Idle/Offline status | POST `/api/employee/status` | On state change |
| Agent heartbeat | POST `/api/heartbeat` | Every 10 sec |
| Session start/end | POST `/api/session/start` and `/api/session/end` | On agent launch/quit |
| Restricted app/site alert | Email to manager after 12 sec of continuous use | Per violation |

The backend checks for stale heartbeats every 10 seconds. An employee with no
heartbeat for more than 30 seconds is marked offline, and any open session is
closed automatically.
