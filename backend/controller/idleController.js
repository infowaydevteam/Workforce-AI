const pool = require("../db");


const logIdle = async (req, res) => {
  try {
    const {
      user_id,
      app_name,
      start_time,
      end_time
    } = req.body;

    const duration = Math.floor(
      (new Date(end_time) - new Date(start_time)) / 1000
    );

    const result = await pool.query(
      `
      INSERT INTO idle_logs
      (
        user_id,
        app_name,
        start_time,
        end_time,
        duration
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *
      `,
      [
        user_id,
        app_name,
        start_time,
        end_time,
        duration
      ]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = {
  logIdle
};