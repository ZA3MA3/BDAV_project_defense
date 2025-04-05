/*require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors()); 

// Oracle DB connection configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING
};

// Sign-in endpoint
app.post('/signin', async (req, res) => {
    const { userNumber,password } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT COUNT(*) AS user_count, MAX(role) AS role 
         FROM Users 
         WHERE user_number = :userNumber AND password = :password` ,
            { userNumber,password },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const userData = result.rows[0];
        

        if (userData.USER_COUNT > 0) {
            res.json({ success: true,  user_count: userData.USER_COUNT, role: userData.ROLE });
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


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

/*`SELECT c.user_number, c.birthdate, r.role_name 
             FROM credentials c 
             JOIN roles r ON c.role_id = r.role_id 
             WHERE c.user_number = :userNumber AND c.birthdate = :birthdate`*/

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const professorRoutes = require('./routes/professorRoutes');


// Use routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/professor', professorRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
