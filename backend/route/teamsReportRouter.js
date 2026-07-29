const express=require("express");
const router=express.Router();

const {
getTeamReport
}=require("../controller/teamReportController");


router.get(
"/:team_id",
getTeamReport
);


module.exports=router;