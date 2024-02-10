import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pg from 'pg';

const app = express();
app.use(cors());
const port = 3001;

// Create an object to store database connections
const databaseConnections = {};

// Function to create database connection based on the provided database name
const createDatabaseConnection = (dbName) => {
  if (!databaseConnections[dbName]) {
    databaseConnections[dbName] = new pg.Client({
      user: 'postgres',
      host: 'localhost',
      database: dbName,
      password: '0000',
      port: 5432,
    });
    databaseConnections[dbName].connect();
  }
  return databaseConnections[dbName];
};

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Dynamic table name based on URL parameter
app.get('/:dbName/:attemptLink', async (req, res) => {
  const { dbName, attemptLink } = req.params;
  const db = createDatabaseConnection(dbName);

  try {
    const result = await db.query(`SELECT * FROM ${attemptLink}`);
    const questionsWithBase64 = result.rows.map((question) => {
      // Convert bytea data to Base64 for image fields
      for (const field in question) {
        if (question[field] instanceof Buffer) {
          question[field] = question[field].toString('base64');
        }
      }
      return question;
    });
    res.json(questionsWithBase64);
  } catch (error) {
    console.error('Error executing query:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    // Close the database connection
    if (db) {
      db.end();
      delete databaseConnections[dbName];
      // console.log(`Database connection for ${dbName} closed.`);
    }
  }
});
