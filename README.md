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

## Employee Setup — Windows

### 1. Install Agent

Extract `IWF-Agent.zip` and run:

```
Agent.exe
```

### 2. Activate Agent

Enter the Activation Code received from Admin.

```
8f64f883-9ba1-4fff-8512-77a55182a722
```

### 3. Start Monitoring

After successful activation:

- Agent starts automatically
- Activity tracking begins
- Idle tracking begins

No further action required.

---

## Employee Setup — macOS

### Prerequisites

1. **Install .NET 10 SDK**
   Download from [dot.net](https://dot.net) or via Homebrew:

   ```bash
   brew install dotnet@10
   ```

2. **Grant Accessibility Permission**
   The agent uses AppleScript to detect the active app and window title.
   macOS requires explicit permission for this.

   Go to:
   ```
   System Settings → Privacy & Security → Accessibility
   ```
   Add and enable your Terminal app (or the built IWF-Agent binary).

### 1. Build the Agent for macOS

Clone the repo and build from the `kevin_mac` branch:

```bash
git clone https://github.com/infowaydevteam/Workforce-AI.git
cd Workforce-AI
git checkout kevin_mac
cd "IWF-Agent/IWF-Agent"
```

**Apple Silicon (M1/M2/M3):**
```bash
dotnet publish -r osx-arm64 -c Release -o ./publish/mac
```

**Intel Mac:**
```bash
dotnet publish -r osx-x64 -c Release -o ./publish/mac
```

The binary will be at:
```
./publish/mac/IWF-Agent
```

### 2. Add Your config.json

Copy `config.json` into the publish folder and set your backend URL:

```json
{
  "api_base_url": "http://YOUR_SERVER_IP:5001",
  "token": ""
}
```

### 3. Run the Agent

```bash
chmod +x ./publish/mac/IWF-Agent
./publish/mac/IWF-Agent
```

### 4. Activate Agent

Enter the Activation Code received from Admin when prompted:

```
8f64f883-9ba1-4fff-8512-77a55182a722
```

### 5. Start Monitoring

After successful activation:

- Agent starts automatically
- App and window activity is tracked via AppleScript
- Idle time is detected via macOS IOKit (`ioreg`)
- Restricted app/site alerts are sent to the manager by email

No further action required. The agent runs silently in the background.

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
