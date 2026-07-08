const pool = require("../db");
const { classifyActivity } = require("../services/level1Service");

const logActivity = async (req, res) => {
  try {
    const { user_id, app_name, start_time, end_time } = req.body;

    const start = new Date(start_time);
    const end = new Date(end_time);

    const duration = Math.floor((end - start) / 1000);
    const classification = classifyActivity(app_name);

    // 🔥 STEP 1: GET LAST ACTIVITY
    const last = await pool.query(
      `SELECT * FROM activity_logs
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [user_id]
    );

    // 🔥 STEP 2: MERGE CONDITION
    if (
      last.rows.length > 0 &&
      last.rows[0].app_name === app_name
    ) {
      const prev = last.rows[0];

      const prevStart = new Date(prev.start_time);
      const newEnd = end;

      const mergedDuration = Math.floor(
        (newEnd - prevStart) / 1000
      );

      await pool.query(
        `UPDATE activity_logs
         SET end_time = $1,
             duration = $2,
             activity_category = $3,
             productivity_score = $4
         WHERE id = $5`,
        [
          end_time,
          mergedDuration,
          classification.activity_category,
          classification.productivity_score,
          prev.id,
        ]
      );

      // update user status
      await pool.query(
        `UPDATE users
         SET status = 'Online', last_active = NOW()
         WHERE id = $1`,
        [user_id]
      );

      return res.json({ success: true, merged: true });
    }

    // 🔥 STEP 3: INSERT NEW IF DIFFERENT APP
    const result = await pool.query(
      `INSERT INTO activity_logs
       (
        user_id,
        app_name,
        start_time,
        end_time,
        duration,
        activity_category,
        productivity_score
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user_id,
        app_name,
        start_time,
        end_time,
        duration,
        classification.activity_category,
        classification.productivity_score,
      ]
    );

    await pool.query(
      `UPDATE users
       SET status = 'Online', last_active = NOW()
       WHERE id = $1`,
      [user_id]
    );

    res.json({ success: true, data: result.rows[0], merged: false });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET ACTIVITY
const getActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT * FROM activity_logs
       WHERE user_id = $1
       ORDER BY start_time DESC`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
   logActivity,
   getActivity
};
