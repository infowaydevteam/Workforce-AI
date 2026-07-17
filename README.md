# IWF (Info Workforce)

---

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

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

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

- Apple Silicon (M1/M2/M3/M4): `osx-arm64`
- Intel Mac: `osx-x64`

1. Download and open `IWF-Agent-mac.dmg` (or extract `IWF-Agent-mac.zip`).
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
- It records an idle period after 5 seconds without input.
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
| Online/Idle/Offline status | POST `/api/employee/status` | On state change |
| Session start/end | POST `/api/session/start` and `/api/session/end` | On agent launch/quit |
| Restricted app/site alert | Email to manager after 12 sec of continuous use | Per violation |
