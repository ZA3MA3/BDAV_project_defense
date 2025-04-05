/*const express = require('express');
const router = express.Router();
const { getConnection, oracledb } = require('../config/db');

router.post('/signin', async (req, res) => {
  const { userNumber, password } = req.body;
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT COUNT(*) AS user_count, MAX(role) AS role 
       FROM Users 
       WHERE user_number = :userNumber AND password = :password`,
      { userNumber, password },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const userData = result.rows[0];

    if (userData.USER_COUNT > 0) {
      res.json({ success: true, user_count: userData.USER_COUNT, role: userData.ROLE });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
});

module.exports = router;
*/

const express = require('express');
const router = express.Router();
const { getConnection } = require('../config/db');

router.post('/signin', async (req, res) => {
  const { userNumber, password } = req.body;

  try {
    const pool = await getConnection(); // Use connection pool
    const result = await pool.query(
      `SELECT COUNT(*) AS user_count, MAX(role) AS role
       FROM "users"
       WHERE user_number = $1 AND password = $2`,
      [userNumber, password]  // Body parameters passed as query parameters
    );

    const userData = result.rows[0];  // PostgreSQL query results in `rows` array

    if (userData.user_count > 0) {
      res.json({ success: true, user_count: userData.user_count, role: userData.role });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


router.post("/identify", async (req, res) => {
  const { userNumber, password } = req.body;

  if (!userNumber || !password) {
    return res.status(400).json({ error: "User number and password are required" });
  }

  try {
    const pool = await getConnection();
    // Step 1: Find the user
    const userQuery = `
      SELECT user_id, role 
      FROM users 
      WHERE user_number = $1 AND password = $2
    `;
    const userResult = await pool.query(userQuery, [userNumber, password]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { user_id, role } = userResult.rows[0];

    // Step 2: If student, get student_id
    if (role === 1) {
      const studentQuery = `
        SELECT student_id, project_id   
        FROM students 
        WHERE user_id = $1
      `;
      const studentResult = await pool.query(studentQuery, [user_id]);

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      const { student_id, project_id } = studentResult.rows[0];

      return res.json({
        role: "student",
        student_id,
        project_id, 
      });
    }

    // Step 3: For professor or admin, return user_id
    const roleName = role === 2 ? "professor" : "admin";
    return res.json({ role: roleName, user_id });

  } catch (err) {
    console.error("Error during identification:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
