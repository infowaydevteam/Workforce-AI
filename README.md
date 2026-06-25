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
* Generate Activation Code

Send the following to the employee:

* IWF-Agent.zip
* Activation Code

---

# Employee Setup

### 1. Install Agent

Extract:

```text
IWF-Agent.zip
```

Run:

```text
Agent.exe
```

### 2. Activate Agent

Enter the Activation Code received from Admin.

Example:

```text
8f64f883-9ba1-4fff-8512-77a55182a722
```

### 3. Start Monitoring

After successful activation:

* Agent starts automatically
* Activity tracking begins
* Idle tracking begins

No further action is required.

---


