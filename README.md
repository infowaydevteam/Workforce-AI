# IWF (Info Workforce)

## Admin Setup

### 1. Start Backend

```bash
cd backend
npm install
npm start
```

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

After the first installation, employees do not need to uninstall and reinstall for future agent releases.

When a new agent version is released:

* Backend update manifest is updated with the latest version
* Agent checks the manifest automatically
* Agent downloads the correct Windows or macOS package
* Agent verifies the package checksum
* Agent stages and applies the update, then restarts when safe

---

