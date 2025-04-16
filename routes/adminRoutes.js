const express = require('express');
const router = express.Router();
const { getConnection , pool } = require('../config/db');


router.post('/add-student', async (req, res) => {
  const { userNumber, name, email, password, projectId } = req.body;
  
 
  // Validate required fields
  if (!userNumber || !name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
 
  const pool = await getConnection(); // Using the pool directly
  
  try {
    // Start transaction
    await pool.query('BEGIN');
   
    // First insert into Users table
    const userResult = await pool.query(
      `INSERT INTO Users (user_number, name, email, password, role)
       VALUES ($1, $2, $3, $4, 1) RETURNING user_id`,
      [userNumber, name, email, password]
    );
   
    const userId = userResult.rows[0].user_id;
   
    // Then insert into Students table
    await pool.query(
      `INSERT INTO Students (user_id, project_id)
       VALUES ($1, $2)`,
      [userId, projectId || null] // Use null if projectId is not provided
    );
   
    // Commit transaction
    await pool.query('COMMIT');
   
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: { userId }
    });
  } catch (err) {
    await pool.query('ROLLBACK'); // Rollback on error
   
    // Handle specific database errors
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'A user with that email or user number already exists'
      });
    }
   
    console.error('Error adding student:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});





router.post('/add-professor', async (req, res) => {
  const { userNumber, name, email, password } = req.body;
  
  // Validate required fields
  if (!userNumber || !name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }
  
  let client;
  try {
    client = await getConnection();
    
    
    
    // Start transaction
    await client.query('BEGIN');
    
    // With inheritance model, you directly insert into the Professors table
    // which will automatically insert into the parent Users table
    const professorResult = await client.query(
      `INSERT INTO Professors (user_number, name, email, password, role)
       VALUES ($1, $2, $3, $4, 2) RETURNING user_id`,
      [userNumber, name, email, password]
    );
    
    const userId = professorResult.rows[0].user_id;
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: 'Professor added successfully',
      data: { userId }
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK'); // Rollback on error
    
    // Handle specific database errors
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ 
        success: false, 
        message: 'A user with that email or user number already exists' 
      });
    }
    
    console.error('Error adding professor:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  } finally {
    if (client) client.release(); // Release the connection back to the pool
  }
});

router.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, user_number, name, email, role FROM Users");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/projects", async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
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
    `;

    const result = await pool.query(query);

    const projects = result.rows.map((project) => ({
      project_id: project.project_id,
      title: project.title,
      description: project.description,
      supervisor: {
        user_id: project.supervisor_id,
        name: project.supervisor_name,
        user_number: project.supervisor_user_number,
        email: project.supervisor_email,
      },
    }));

    res.json(projects);
  } catch (err) {
    console.error("Error fetching all projects:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/projects/available", async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
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
      WHERE NOT EXISTS (
        SELECT 1 FROM defenses d WHERE d.project_id = p.project_id
      )
    `;

    const result = await pool.query(query);

    const availableProjects = result.rows.map((project) => ({
      project_id: project.project_id,
      title: project.title,
      description: project.description,
      supervisor: {
        user_id: project.supervisor_id,
        name: project.supervisor_name,
        user_number: project.supervisor_user_number,
        email: project.supervisor_email,
      },
    }));

    res.json(availableProjects);
  } catch (err) {
    console.error("Error fetching available projects:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.post("/assign-supervisor", async (req, res) => {
  try {
    const { project_id, supervisor_id } = req.body;

    // Ensure that both project_id and supervisor_id are provided
    if (!project_id || !supervisor_id) {
      return res.status(400).json({ error: "Project ID and Supervisor ID are required" });
    }

    // Step 1: Check if the project exists
    const checkProjectQuery = `
      SELECT 1 FROM projects WHERE project_id = $1
    `;
    const checkProjectResult = await pool.query(checkProjectQuery, [project_id]);

    if (checkProjectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Step 2: Update the project with the new supervisor_id
    const updateProjectQuery = `
      UPDATE projects 
      SET supervisor_id = $1 
      WHERE project_id = $2
      RETURNING project_id, supervisor_id
    `;
    const updateResult = await pool.query(updateProjectQuery, [supervisor_id, project_id]);

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: "Failed to assign supervisor" });
    }

    res.status(200).json({
      message: "Supervisor assigned successfully",
      project_id: updateResult.rows[0].project_id,
      supervisor_id: updateResult.rows[0].supervisor_id,
    });
    
  } catch (err) {
    console.error("Error assigning supervisor:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.post("/add-defense", async (req, res) => {
  const { project_id, defense_date, location, professor_ids } = req.body;

  if (!project_id || !defense_date || !location || !Array.isArray(professor_ids)) {
    return res.status(400).json({ error: "Missing or invalid input data." });
  }

  if (professor_ids.length < 1 || professor_ids.length > 3) {
    return res.status(400).json({ error: "Jury must contain 1 to 3 professors." });
  }

  const client = await getConnection();

  try {
    await client.query("BEGIN");

    // Step 1: Create Jury
    const juryResult = await client.query(
      `INSERT INTO juries DEFAULT VALUES RETURNING jury_id`
    );
    const jury_id = juryResult.rows[0].jury_id;

    // Step 2: Link professors to jury
    const juryProfessorValues = professor_ids
      .map((profId) => `(${jury_id}, ${profId})`)
      .join(", ");

    await client.query(
      `INSERT INTO jury_professor (jury_id, professor_id) VALUES ${juryProfessorValues}`
    );

    // ✅ Step 3: Create Defense with jury_id
    await client.query(
      `
      INSERT INTO defenses (project_id, defense_date, location, jury_id)
      VALUES ($1, $2, $3, $4)
    `,
      [project_id, defense_date, location, jury_id]
    );

    await client.query("COMMIT");

    res.status(201).json({ message: "Defense and jury created successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating defense and jury:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/defenses", async (req, res) => {
  const client = await getConnection();

  try {
    const result = await client.query(`
      SELECT
        d.defense_id,
        d.defense_date,
        d.location,
        d.project_id,
        p.title AS project_title,
        p.description AS project_description,
        j.jury_id,
        profs.user_id AS professor_id,
        profs.name AS professor_name,
        profs.email AS professor_email
      FROM defenses d
      JOIN projects p ON d.project_id = p.project_id
      LEFT JOIN juries j ON d.jury_id = j.jury_id
      LEFT JOIN jury_professor jp ON j.jury_id = jp.jury_id
      LEFT JOIN professors profs ON jp.professor_id = profs.user_id
      ORDER BY d.defense_date DESC;
    `);

    // Group the rows by defense_id to avoid duplication due to multiple professors
    const grouped = {};

    result.rows.forEach((row) => {
      const defId = row.defense_id;

      if (!grouped[defId]) {
        grouped[defId] = {
          defense_id: defId,
          defense_date: row.defense_date,
          location: row.location,
          project: {
            project_id: row.project_id,
            title: row.project_title,
            description: row.project_description,
          },
          jury_id: row.jury_id,
          professors: [],
        };
      }

      if (row.professor_id) {
        grouped[defId].professors.push({
          professor_id: row.professor_id,
          name: row.professor_name,
          email: row.professor_email,
        });
      }
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error("Error fetching defenses:", err);
    res.status(500).json({ error: "Failed to fetch defenses." });
  }
});





module.exports = router;
