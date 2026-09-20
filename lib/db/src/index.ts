import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export const databaseUrl = process.env.DATABASE_URL || null;

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;

/**
 * Initialize PostgreSQL tables if pool is connected
 */
export async function initPostgresTables() {
  if (!pool) {
    console.log("[DB] No DATABASE_URL configured. Operating with in-memory resilient fallback cache.");
    return false;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          full_name TEXT NOT NULL,
          title TEXT NOT NULL,
          registration_id TEXT NOT NULL,
          hospital_name TEXT NOT NULL,
          department TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          role TEXT NOT NULL,
          status TEXT NOT NULL,
          approval_status TEXT NOT NULL DEFAULT 'APPROVED',
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_login TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS patients (
          id VARCHAR(64) PRIMARY KEY,
          patient_id TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL,
          dob TEXT,
          phone TEXT NOT NULL,
          email TEXT,
          diabetes_type TEXT NOT NULL DEFAULT 'Type 2',
          diabetes_duration TEXT NOT NULL DEFAULT 'Unknown',
          dr_history TEXT NOT NULL DEFAULT 'None',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS screenings (
          id VARCHAR(64) PRIMARY KEY,
          case_id TEXT NOT NULL UNIQUE,
          patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          patient_code TEXT NOT NULL,
          patient_name TEXT NOT NULL,
          age INTEGER NOT NULL,
          gender TEXT NOT NULL,
          phone TEXT,
          diabetes_type TEXT NOT NULL DEFAULT 'Type 2',
          diabetes_duration TEXT NOT NULL DEFAULT 'Unknown',
          dr_history TEXT NOT NULL DEFAULT 'None',
          eye TEXT NOT NULL,
          clinical_notes TEXT,
          quality_status TEXT NOT NULL,
          quality_score INTEGER NOT NULL,
          ai_grade INTEGER NOT NULL,
          ai_label TEXT NOT NULL,
          confidence REAL NOT NULL,
          referable BOOLEAN NOT NULL,
          review_status TEXT NOT NULL,
          final_grade INTEGER,
          reviewer_id VARCHAR(64),
          reviewer_name TEXT,
          reviewer_notes TEXT,
          image_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS screening_results (
          id VARCHAR(64) PRIMARY KEY,
          screening_id VARCHAR(64) NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
          case_id TEXT NOT NULL,
          probabilities JSONB NOT NULL,
          model_version TEXT NOT NULL,
          processing_time REAL NOT NULL,
          quality_metrics JSONB NOT NULL,
          evidence JSONB NOT NULL,
          lesions JSONB NOT NULL,
          vessel_metrics JSONB NOT NULL,
          optic_disc JSONB,
          fovea JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS doctor_approvals (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          registration_id TEXT NOT NULL,
          requested_role TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          reviewed_by TEXT,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          "user" TEXT NOT NULL,
          action TEXT NOT NULL,
          case_id TEXT NOT NULL,
          prev_hash TEXT NOT NULL,
          hash TEXT NOT NULL,
          integrity_status TEXT NOT NULL DEFAULT 'Verified'
        );

        CREATE INDEX IF NOT EXISTS idx_screenings_patient_id ON screenings(patient_id);
        CREATE INDEX IF NOT EXISTS idx_screenings_case_id ON screenings(case_id);
        CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
        CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
      `);
      console.log("[DB] PostgreSQL tables successfully verified/created with indexes.");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[DB] Error initializing PostgreSQL tables:", err);
    return false;
  }
}

export * from "./schema";

