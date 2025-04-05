const express = require('express');
const router = express.Router();
const { getConnection , pool } = require('../config/db');




// router.get("/defenses/:professorId", async (req, res) => {
//     const professorId = req.params.professorId;
  
//     // Validate professorId
//     if (!professorId || isNaN(Number(professorId))) {
//       console.warn("Invalid or missing professor ID:", professorId);
//       return res.status(400).json({ error: "Invalid or missing professor ID" });
//     }
  
//     try {
//       const pool = await getConnection();
  
//       const query = `
//         SELECT 
//           d.defense_id, 
//           d.project_id, 
//           d.defense_date, 
//           d.location, 
//           p.name AS supervisor_name,
//           p.email AS supervisor_email,
//           jp.professor_id
//         FROM defenses d
//         JOIN juries j ON d.jury_id = j.jury_id
//         JOIN jury_professor jp ON j.jury_id = jp.jury_id
//         JOIN professors p ON jp.professor_id = p.user_id
//         WHERE jp.professor_id = $1;
//       `;
  
//       const result = await pool.query(query, [professorId]);
  
//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: "No defenses found for this professor" });
//       }
  
//       const defenses = result.rows.map((defense) => ({
//         defense_id: defense.defense_id,
//         project_id: defense.project_id,
//         defense_date: defense.defense_date,
//         location: defense.location,
//         supervisor: {
//           name: defense.supervisor_name,
//           email: defense.supervisor_email,
//         },
//       }));
  
//       res.json(defenses);
//     } catch (err) {
//       console.error("Error fetching defenses for professor:", err);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });



router.get("/defenses/:professorId", async (req, res) => {
    const professorId = req.params.professorId;
  
    if (!professorId || isNaN(Number(professorId))) {
      console.warn("Invalid or missing professor ID:", professorId);
      return res.status(400).json({ error: "Invalid or missing professor ID" });
    }
  
    try {
      const pool = await getConnection();
  
      const query = `
        SELECT 
          d.defense_id, 
          d.defense_date, 
          d.location,
  
          proj.project_id,
          proj.title AS project_title,
          proj.description AS project_description,
  
          sup.user_id AS supervisor_id,
          sup.name AS supervisor_name,
          sup.email AS supervisor_email,
  
          stu.student_id,
          stu_user.user_id AS student_user_id,
          stu_user.name AS student_name,
          stu_user.email AS student_email
  
        FROM defenses d
        JOIN projects proj ON d.project_id = proj.project_id
        JOIN juries j ON d.jury_id = j.jury_id
        JOIN jury_professor jp ON j.jury_id = jp.jury_id
        JOIN professors sup ON proj.supervisor_id = sup.user_id
  
        LEFT JOIN students stu ON stu.project_id = proj.project_id
        LEFT JOIN users stu_user ON stu.user_id = stu_user.user_id AND stu_user.role = 1
  
        WHERE jp.professor_id = $1
        ORDER BY d.defense_date ASC;
      `;
  
      const result = await pool.query(query, [professorId]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No defenses found for this professor" });
      }
  
      // Group rows by defense_id (since students are multiple per defense)
      const defenseMap = new Map();
  
      result.rows.forEach(row => {
        if (!defenseMap.has(row.defense_id)) {
          defenseMap.set(row.defense_id, {
            defense_id: row.defense_id,
            defense_date: row.defense_date,
            location: row.location,
            project: {
              project_id: row.project_id,
              title: row.project_title,
              description: row.project_description,
              supervisor: {
                user_id: row.supervisor_id,
                name: row.supervisor_name,
                email: row.supervisor_email,
              },
              students: [],
            }
          });
        }
  
        // Add student if present
        if (row.student_id) {
          defenseMap.get(row.defense_id).project.students.push({
            student_id: row.student_id,
            user_id: row.student_user_id,
            name: row.student_name,
            email: row.student_email,
          });
        }
      });
  
      res.json(Array.from(defenseMap.values()));
    } catch (err) {
      console.error("Error fetching defenses for professor:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  router.post('/grades', async (req, res) => {
    const { student_id, professor_id, defense_id, score, comment } = req.body;
  
    // Basic validation
    if (
      !student_id ||
      !professor_id ||
      !defense_id ||
      typeof score !== 'number' ||
      score < 0 ||
      score > 20
    ) {
      return res.status(400).json({ error: 'Missing or invalid input data' });
    }
  
    try {
      const pool = await getConnection();
  
      const insertQuery = `
        INSERT INTO grades (student_id, professor_id, defense_id, score, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
  
      const values = [student_id, professor_id, defense_id, score, comment || null];
  
      const result = await pool.query(insertQuery, values);
      res.status(201).json({ message: 'Grade inserted successfully', grade: result.rows[0] });
  
    } catch (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        res.status(409).json({ error: 'Grade already exists for this student, professor, and defense' });
      } else {
        console.error('Error inserting grade:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });
  
  
  module.exports = router;