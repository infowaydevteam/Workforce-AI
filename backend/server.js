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
const tenantRoute = require("./route/tenantRoute");
const departmentRoute = require("./route/departmentRoute");
const invitationRoute = require("./route/invitationRoute");
const classificationRoute = require("./route/classificationRoute");
const productivityRoute = require("./route/productivityRoute");

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
app.use("/api/tenant", tenantRoute);
app.use("/api/departments", departmentRoute);
app.use("/api/invitations", invitationRoute);
app.use("/api/classifications", classificationRoute);
app.use("/api/productivity", productivityRoute);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
