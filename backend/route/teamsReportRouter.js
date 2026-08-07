const express=require("express");
const router=express.Router();

const {
getTeamReport,
getUsersSummary
}=require("../controller/teamReportController");


router.get(
"/:team_id",
getTeamReport
);



module.exports=router;