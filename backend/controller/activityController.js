const pool = require("../db");

const getProductivityCategory = async (userId, appName, fallbackCategory) => {
  if (["productive", "unproductive", "neutral"].includes(fallbackCategory)) {
    return fallbackCategory;
  }

  const result = await pool.query(
    `SELECT pr.category
     FROM users u
     JOIN productivity_rules pr ON pr.organization_id = u.organization_id
     WHERE u.id = $1
       AND LOWER($2) LIKE '%' || LOWER(pr.pattern) || '%'
     ORDER BY pr.id ASC
     LIMIT 1`,
    [userId, appName || ""]
  );

  return result.rows[0]?.category || "neutral";
};

const logActivity = async (req, res) => {
  try {
    const {
      user_id,
      app_name,
      start_time,
      end_time,
      productivity_category,
    } = req.body;

    const start = new Date(start_time);
    const end = new Date(end_time);

    const duration = Math.max(0, Math.floor((end - start) / 1000));
    const category = await getProductivityCategory(
      user_id,
      app_name,
      productivity_category
    );

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

      const mergedDuration = Math.max(
        0,
        Math.floor((newEnd - prevStart) / 1000)
      );

      await pool.query(
        `UPDATE activity_logs
         SET end_time = $1,
             duration = $2,
             productivity_category = $3
         WHERE id = $4`,
        [end_time, mergedDuration, category, prev.id]
      );

      // update user status
      await pool.query(
        `UPDATE users
         SET status = 'online', last_active = NOW()
         WHERE id = $1`,
        [user_id]
      );

      return res.json({ success: true, merged: true });
    }

    // 🔥 STEP 3: INSERT NEW IF DIFFERENT APP
    const result = await pool.query(
      `INSERT INTO activity_logs
       (user_id, app_name, start_time, end_time, duration, productivity_category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, app_name, start_time, end_time, duration, category]
    );

    await pool.query(
      `UPDATE users
       SET status = 'online', last_active = NOW()
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
