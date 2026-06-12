import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import Productivity from "../admin/Productivity";

// Manager uses same Productivity component but hits /my-team endpoint
// We reuse the Productivity page but with a manager-scoped view
const ManagerTeamProductivity = () => {
  return <Productivity />;
};

export default ManagerTeamProductivity;
