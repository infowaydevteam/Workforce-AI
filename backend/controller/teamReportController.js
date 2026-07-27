const {
    getTeamReport
} = require("../services/teamReportService");


const getTeamReportController = async (req, res) => {

    try {

        const {
            team_id
        } = req.params;


        const {
            from,
            to
        } = req.query;



        const data = await getTeamReport(
            team_id,
            from,
            to
        );



        res.json({

            success: true,

            data

        });


    }
    catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            message:err.message

        });

    }

};



module.exports = {

    getTeamReport:getTeamReportController

};