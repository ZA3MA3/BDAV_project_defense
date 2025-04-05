const express = require('express');
const router = express.Router();
const { getConnection , pool } = require('../config/db');

// router.post("/add-project", async (req, res) => {
//     try {
//       const { title, description, supervisor_id } = req.body;
  
//       if (!title || !supervisor_id) {
//         return res.status(400).json({ error: "Title and Supervisor ID are required" });
//       }
  
//       const query = `
//         INSERT INTO projects (title, description, supervisor_id) 
//         VALUES ($1, $2, $3) RETURNING *;
//       `;
//       const values = [title, description || null, supervisor_id];
  
//       const result = await pool.query(query, values);
//       res.status(201).json({ message: "Project added successfully", project: result.rows[0] });
//     } catch (err) {
//       console.error("Error adding project:", err);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });

// router.post("/add-project", async (req, res) => {
//     try {
//       const { title, description, supervisor_id, student_id } = req.body;
  
//       if (!title || !supervisor_id || !student_id) {
//         return res.status(400).json({ error: "Title, Supervisor ID, and Student ID are required" });
//       }
  
//       // Step 1: Insert into projects
//       const insertQuery = `
//         INSERT INTO projects (title, description, supervisor_id) 
//         VALUES ($1, $2, $3) 
//         RETURNING project_id
//       `;
//       const values = [title, description || null, supervisor_id];
//       const insertResult = await pool.query(insertQuery, values);
//       const newProjectId = insertResult.rows[0].project_id;
  
//       // Step 2: Update student to attach the project_id
//       const updateQuery = `
//         UPDATE students 
//         SET project_id = $1 
//         WHERE student_id = $2
//       `;
//       await pool.query(updateQuery, [newProjectId, student_id]);
  
//       res.status(201).json({ message: "Project added and assigned to student", project_id: newProjectId });
//     } catch (err) {
//       console.error("Error adding project:", err);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });
  

// router.post("/add-project", async (req, res) => {
//     try {
//       const { title, description, supervisor_id, student_id, teammate_id } = req.body;
  
//       if (!title || !supervisor_id || !student_id) {
//         return res.status(400).json({ error: "Title, Supervisor ID, and Student ID are required" });
//       }
  
//       // Step 1: Insert the project
//       const insertQuery = `
//         INSERT INTO projects (title, description, supervisor_id) 
//         VALUES ($1, $2, $3) 
//         RETURNING project_id
//       `;
//       const values = [title, description || null, supervisor_id];
//       const insertResult = await pool.query(insertQuery, values);
//       const newProjectId = insertResult.rows[0].project_id;
  
//       // Step 2: Assign to main student
//       const updateStudentQuery = `
//         UPDATE students 
//         SET project_id = $1 
//         WHERE student_id = $2
//       `;
//       await pool.query(updateStudentQuery, [newProjectId, student_id]);
  
//       // Step 3: Assign to teammate if provided
//       if (teammate_id) {
//         await pool.query(updateStudentQuery, [newProjectId, teammate_id]);
//       }
  
//       res.status(201).json({ message: "Project added and assigned", project_id: newProjectId });
  
//     } catch (err) {
//       console.error("Error adding project:", err);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });
  

router.post("/add-project", async (req, res) => {
    try {
      const { title, description, supervisor_id, student_id, teammate_id } = req.body;
  
      // Check if title and student_id are provided (supervisor_id is optional)
      if (!title || !student_id) {
        return res.status(400).json({ error: "Title and Student ID are required" });
      }
  
      // Step 1: Insert the project with supervisor_id being optional (null if not provided)
      const insertQuery = `
        INSERT INTO projects (title, description, supervisor_id) 
        VALUES ($1, $2, $3) 
        RETURNING project_id
      `;
      const values = [title, description || null, supervisor_id || null];  // Use null if supervisor_id is not provided
      const insertResult = await pool.query(insertQuery, values);
      const newProjectId = insertResult.rows[0].project_id;
  
      // Step 2: Assign to main student
      const updateStudentQuery = `
        UPDATE students 
        SET project_id = $1 
        WHERE student_id = $2
      `;
      await pool.query(updateStudentQuery, [newProjectId, student_id]);
  
      // Step 3: Assign to teammate if provided
      if (teammate_id) {
        await pool.query(updateStudentQuery, [newProjectId, teammate_id]);
      }
  
      res.status(201).json({ message: "Project added and assigned", project_id: newProjectId });
  
    } catch (err) {
      console.error("Error adding project:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  
  router.get("/professors", async (req, res) => {
    try {
      const query = `SELECT user_id, user_number, name, email FROM professors WHERE role = 2;`;
      const result = await pool.query(query);
      
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("Error fetching professors:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  router.get("/no-project", async (req, res) => {
    try {
      const query = `
        SELECT 
          students.student_id,
          users.user_id,
          users.user_number,
          users.name,
          users.email
        FROM students
        INNER JOIN users ON students.user_id = users.user_id
        WHERE students.project_id IS NULL and role=1
      `;
  
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("Error fetching students without project:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  


  




// router.get("/project/:id", async (req, res) => {
//     const projectId = req.params.id;
  
//     // Validate projectId
//     if (!projectId || isNaN(Number(projectId))) {
//       console.warn("Invalid or missing project ID:", projectId);
//       return res.status(400).json({ error: "Invalid or missing project ID" });
//     }
  
//     try {
//       const pool = await getConnection();
  
//       const query = `
//         SELECT 
//           p.project_id, 
//           p.title, 
//           p.description, 
//           p.supervisor_id,
//           pr.name AS supervisor_name,
//           pr.user_number AS supervisor_user_number,
//           pr.email AS supervisor_email
//         FROM projects p
//         LEFT JOIN professors pr ON p.supervisor_id = pr.user_id
//         WHERE p.project_id = $1
//       `;
  
//       const result = await pool.query(query, [projectId]);
  
//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: "Project not found" });
//       }
  
//       const project = result.rows[0];
  
//       return res.json({
//         project_id: project.project_id,
//         title: project.title,
//         description: project.description,
//         supervisor: {
//           user_id: project.supervisor_id,
//           name: project.supervisor_name,
//           user_number: project.supervisor_user_number,
//           email: project.supervisor_email,
//         },
//       });
//     } catch (err) {
//       console.error("Error fetching project:", err);
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   });
  

router.get("/project/:id", async (req, res) => {
    const projectId = req.params.id;
  
    // Validate projectId
    if (!projectId || isNaN(Number(projectId))) {
      console.warn("Invalid or missing project ID:", projectId);
      return res.status(400).json({ error: "Invalid or missing project ID" });
    }
  
    try {
      const pool = await getConnection();
  
      // Query to fetch project details
      const projectQuery = `
        SELECT 
          p.project_id, 
          p.title, 
          p.description, 
          p.supervisor_id,
          pr.name AS supervisor_name,
          pr.user_number AS supervisor_user_number,
          pr.email AS supervisor_email
        FROM projects p
        LEFT JOIN professors pr ON p.supervisor_id = pr.user_id
        WHERE p.project_id = $1
      `;
  
      const projectResult = await pool.query(projectQuery, [projectId]);
  
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }
  
      const project = projectResult.rows[0];
  
      // Query to fetch defense details related to the project
      const defenseQuery = `
        SELECT 
          d.defense_id,
          d.location,
          d.defense_date
        FROM defenses d
        WHERE d.project_id = $1
      `;
  
      const defenseResult = await pool.query(defenseQuery, [projectId]);
      const defense = defenseResult.rows[0] || null;
  
      return res.json({
        project_id: project.project_id,
        title: project.title,
        description: project.description,
        supervisor: {
          user_id: project.supervisor_id,
          name: project.supervisor_name,
          user_number: project.supervisor_user_number,
          email: project.supervisor_email,
        },
        defense: defense
          ? {
              defense_id: defense.defense_id,
              location: defense.location,
              defense_date: defense.defense_date,
            }
          : null,
      });
    } catch (err) {
      console.error("Error fetching project with defense:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });



  
  router.get('/grades/:studentId', async (req, res) => {
    const { studentId } = req.params;
  
    try {
      // Query to get all grades for a student across all defenses
      const gradesQuery = `
        SELECT 
          g.grade_id,
          g.student_id,
          g.professor_id,
          g.defense_id,
          g.score,
          g.comment,
          d.defense_date,
          d.location AS defense_location,
          p.project_id,
          p.title AS project_title,
          p.description AS project_description,
          u_prof.name AS professor_name,
          u_prof.email AS professor_email,
          u_stud.name AS student_name,
          u_stud.email AS student_email
        FROM grades g
        JOIN students s ON g.student_id = s.student_id
        JOIN defenses d ON g.defense_id = d.defense_id
        JOIN projects p ON d.project_id = p.project_id
        JOIN users u_prof ON g.professor_id = u_prof.user_id
        JOIN users u_stud ON s.user_id = u_stud.user_id
        WHERE g.student_id = $1
        ORDER BY d.defense_date DESC
      `;
  
      const gradesResult = await pool.query(gradesQuery, [studentId]);
      
      if (gradesResult.rows.length === 0) {
        // Check if the student exists
        const studentQuery = `
          SELECT s.student_id, u.name, u.email 
          FROM students s
          JOIN users u ON s.user_id = u.user_id
          WHERE s.student_id = $1
        `;
        
        const studentResult = await pool.query(studentQuery, [studentId]);
        
        if (studentResult.rows.length === 0) {
          return res.status(404).json({ message: 'Student not found' });
        }
        
        return res.status(200).json({ 
          student: studentResult.rows[0],
          grades: [],
          message: 'No grades found for this student' 
        });
      }
  
      // Group data by defense for better organization
      const defenseMap = {};
      
      gradesResult.rows.forEach(row => {
        const defenseId = row.defense_id;
        
        if (!defenseMap[defenseId]) {
          defenseMap[defenseId] = {
            defense_id: defenseId,
            defense_date: row.defense_date,
            defense_location: row.defense_location,
            project: {
              project_id: row.project_id,
              title: row.project_title,
              description: row.project_description
            },
            student: {
              student_id: row.student_id,
              name: row.student_name,
              email: row.student_email
            },
            grades: []
          };
        }
        
        defenseMap[defenseId].grades.push({
          grade_id: row.grade_id,
          professor: {
            professor_id: row.professor_id,
            name: row.professor_name,
            email: row.professor_email
          },
          score: row.score,
          comment: row.comment
        });
      });
  
      // Convert map to array
      const defenses = Object.values(defenseMap);
      
      // Calculate average score for each defense
      defenses.forEach(defense => {
        const totalScore = defense.grades.reduce((sum, grade) => sum + parseFloat(grade.score), 0);
        defense.average_score = parseFloat((totalScore / defense.grades.length).toFixed(2));
      });
  
      res.status(200).json(defenses);
    } catch (err) {
      console.error('Error fetching student grades:', err);
      res.status(500).json({ message: 'Server error while fetching grades' });
    }
  });
  
  

  module.exports = router;
