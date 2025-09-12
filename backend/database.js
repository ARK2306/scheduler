const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.usePostgres = !!process.env.DATABASE_URL;
    this.pool = null;
    
    if (this.usePostgres) {
      console.log('Using PostgreSQL for data persistence');
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      this.initializeTables();
    } else {
      console.log('Using file-based storage for data persistence');
      this.initializeFiles();
    }
  }

  async initializeTables() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS schedule_templates (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS employee_responses (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS admin_config (
          id VARCHAR(50) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      console.log('PostgreSQL tables initialized successfully');
    } catch (error) {
      console.error('Error initializing PostgreSQL tables:', error);
      throw error;
    }
  }

  initializeFiles() {
    const DATA_DIR = path.join(__dirname, 'data');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
    this.RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');
    this.CONFIG_FILE = path.join(DATA_DIR, 'config.json');
  }

  // Schedule Templates
  async saveScheduleTemplates(schedulesMap) {
    const schedulesObject = Object.fromEntries(schedulesMap);
    
    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM schedule_templates');
        
        for (const [id, data] of schedulesMap) {
          await client.query(
            'INSERT INTO schedule_templates (id, data) VALUES ($1, $2)',
            [id, data]
          );
        }
        await client.query('COMMIT');
        console.log('Schedule templates saved to PostgreSQL');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      fs.writeFileSync(this.SCHEDULES_FILE, JSON.stringify(schedulesObject, null, 2));
      console.log('Schedule templates saved to file');
    }
  }

  async loadScheduleTemplates() {
    if (this.usePostgres) {
      try {
        const result = await this.pool.query('SELECT id, data FROM schedule_templates');
        const schedulesMap = new Map();
        result.rows.forEach(row => {
          schedulesMap.set(row.id, row.data);
        });
        console.log(`Loaded ${schedulesMap.size} schedule templates from PostgreSQL`);
        return schedulesMap;
      } catch (error) {
        console.error('Error loading from PostgreSQL:', error);
        return new Map();
      }
    } else {
      try {
        if (fs.existsSync(this.SCHEDULES_FILE)) {
          const schedulesData = JSON.parse(fs.readFileSync(this.SCHEDULES_FILE, 'utf8'));
          const schedulesMap = new Map(Object.entries(schedulesData));
          console.log(`Loaded ${schedulesMap.size} schedule templates from file`);
          return schedulesMap;
        }
      } catch (error) {
        console.error('Error loading from file:', error);
      }
      return new Map();
    }
  }

  // Employee Responses
  async saveEmployeeResponses(responsesMap) {
    const responsesObject = Object.fromEntries(responsesMap);
    
    if (this.usePostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM employee_responses');
        
        for (const [id, data] of responsesMap) {
          await client.query(
            'INSERT INTO employee_responses (id, data) VALUES ($1, $2)',
            [id, data]
          );
        }
        await client.query('COMMIT');
        console.log('Employee responses saved to PostgreSQL');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      fs.writeFileSync(this.RESPONSES_FILE, JSON.stringify(responsesObject, null, 2));
      console.log('Employee responses saved to file');
    }
  }

  async loadEmployeeResponses() {
    if (this.usePostgres) {
      try {
        const result = await this.pool.query('SELECT id, data FROM employee_responses');
        const responsesMap = new Map();
        result.rows.forEach(row => {
          responsesMap.set(row.id, row.data);
        });
        console.log(`Loaded ${responsesMap.size} employee responses from PostgreSQL`);
        return responsesMap;
      } catch (error) {
        console.error('Error loading employee responses from PostgreSQL:', error);
        return new Map();
      }
    } else {
      try {
        if (fs.existsSync(this.RESPONSES_FILE)) {
          const responsesData = JSON.parse(fs.readFileSync(this.RESPONSES_FILE, 'utf8'));
          const responsesMap = new Map(Object.entries(responsesData));
          console.log(`Loaded ${responsesMap.size} employee responses from file`);
          return responsesMap;
        }
      } catch (error) {
        console.error('Error loading employee responses from file:', error);
      }
      return new Map();
    }
  }

  // Admin Config
  async saveAdminConfig(config) {
    if (this.usePostgres) {
      try {
        await this.pool.query(
          'INSERT INTO admin_config (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
          ['default', config]
        );
        console.log('Admin config saved to PostgreSQL');
      } catch (error) {
        console.error('Error saving admin config to PostgreSQL:', error);
        throw error;
      }
    } else {
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log('Admin config saved to file');
    }
  }

  async loadAdminConfig() {
    if (this.usePostgres) {
      try {
        const result = await this.pool.query('SELECT data FROM admin_config WHERE id = $1', ['default']);
        if (result.rows.length > 0) {
          console.log('Loaded admin config from PostgreSQL');
          return result.rows[0].data;
        }
      } catch (error) {
        console.error('Error loading admin config from PostgreSQL:', error);
      }
      return {
        currentScheduleId: null,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    } else {
      try {
        if (fs.existsSync(this.CONFIG_FILE)) {
          const config = JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf8'));
          console.log('Loaded admin config from file');
          return config;
        }
      } catch (error) {
        console.error('Error loading admin config from file:', error);
      }
      return {
        currentScheduleId: null,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async saveAll(schedulesMap, responsesMap, adminConfig) {
    try {
      await Promise.all([
        this.saveScheduleTemplates(schedulesMap),
        this.saveEmployeeResponses(responsesMap),
        this.saveAdminConfig(adminConfig)
      ]);
      console.log('All data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = DatabaseManager;