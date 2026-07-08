const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoute = require("./route/authRoute");
const userRoute = require("./route/usersRoute");
const organizationRoutes = require("./route/organizationRoute");
const  teamRoutes = require("./route/teamRoute");
const dashboardRoutes = require("./route/dashboardRoute");
const sessiondRoutes = require("./route/sessionRoutes");
const activityRoutes = require("./route/activityRoutes");
const idleRoutes = require("./route/idleRoutes");
const agentRoutes = require("./route/agentRoutes");
const level1Routes = require("./route/level1Route");
const onboardingRoutes = require("./route/onboardingRoute");
const { ensureLevel1Schema } = require("./services/level1Service");
const { ensureOnboardingSchema } = require("./services/onboardingService");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/employee",userRoute);
app.use("/api/organization",organizationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/session", sessiondRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/idle", idleRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/level1", level1Routes);
app.use("/api/onboarding", onboardingRoutes);

const startServer = async () => {
  try {
    await ensureLevel1Schema();
    await ensureOnboardingSchema();
    console.log("Level 1 schema ready");
  } catch (error) {
    console.error("Level 1 schema initialization failed:", error.message);
  }

  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer();
