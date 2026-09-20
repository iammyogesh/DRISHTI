import { pgTable, text, serial, integer, real, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// 1. Users / Doctors Table
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fullName: text("full_name").notNull(),
  title: text("title").notNull(),
  registrationId: text("registration_id").notNull(),
  hospitalName: text("hospital_name").notNull(),
  department: text("department").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull(), // 'Ophthalmologist' | 'Screening Technician' | 'Administrator'
  status: text("status").notNull(), // 'Active' | 'Inactive' | 'Pending Verification'
  approvalStatus: text("approval_status").notNull().default("APPROVED"), // 'APPROVED' | 'PENDING' | 'REJECTED'
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

// 2. Patients Table
export const patientsTable = pgTable("patients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  patientId: text("patient_id").notNull().unique(), // e.g. PAT-88402
  fullName: text("full_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // 'Male' | 'Female' | 'Other'
  dob: text("dob"),
  phone: text("phone").notNull(),
  email: text("email"),
  diabetesType: text("diabetes_type").notNull().default("Type 2"),
  diabetesDuration: text("diabetes_duration").notNull().default("Unknown"),
  drHistory: text("dr_history").notNull().default("None"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable);
export const selectPatientSchema = createSelectSchema(patientsTable);
export type Patient = typeof patientsTable.$inferSelect;
export type NewPatient = typeof patientsTable.$inferInsert;

// 3. Screenings / Cases Table
export const screeningsTable = pgTable("screenings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  caseId: text("case_id").notNull().unique(), // e.g. DR-2026-0142
  patientId: varchar("patient_id", { length: 64 }).references(() => patientsTable.id).notNull(),
  patientCode: text("patient_code").notNull(), // PAT-88402
  patientName: text("patient_name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone"),
  diabetesType: text("diabetes_type").notNull().default("Type 2"),
  diabetesDuration: text("diabetes_duration").notNull().default("Unknown"),
  drHistory: text("dr_history").notNull().default("None"),
  eye: text("eye").notNull(), // 'Right' | 'Left' | 'Both'
  clinicalNotes: text("clinical_notes"),
  qualityStatus: text("quality_status").notNull(), // 'GOOD' | 'BORDERLINE' | 'UNGRADABLE'
  qualityScore: integer("quality_score").notNull(),
  aiGrade: integer("ai_grade").notNull(), // 0..4
  aiLabel: text("ai_label").notNull(),
  confidence: real("confidence").notNull(),
  referable: boolean("referable").notNull(),
  reviewStatus: text("review_status").notNull(), // 'AWAITING_REVIEW' | 'REVIEWED' | 'UNGRADABLE'
  finalGrade: integer("final_grade"),
  reviewerId: varchar("reviewer_id", { length: 64 }),
  reviewerName: text("reviewer_name"),
  reviewerNotes: text("reviewer_notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScreeningSchema = createInsertSchema(screeningsTable);
export const selectScreeningSchema = createSelectSchema(screeningsTable);
export type Screening = typeof screeningsTable.$inferSelect;
export type NewScreening = typeof screeningsTable.$inferInsert;

// 4. Screening AI Detailed Results Table
export const screeningResultsTable = pgTable("screening_results", {
  id: varchar("id", { length: 64 }).primaryKey(),
  screeningId: varchar("screening_id", { length: 64 }).references(() => screeningsTable.id).notNull(),
  caseId: text("case_id").notNull(),
  probabilities: jsonb("probabilities").notNull(),
  modelVersion: text("model_version").notNull(),
  processingTime: real("processing_time").notNull(),
  qualityMetrics: jsonb("quality_metrics").notNull(),
  evidence: jsonb("evidence").notNull(),
  lesions: jsonb("lesions").notNull(),
  vesselMetrics: jsonb("vessel_metrics").notNull(),
  opticDisc: jsonb("optic_disc"),
  fovea: jsonb("fovea"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScreeningResult = typeof screeningResultsTable.$inferSelect;

// 5. Doctor Approval Requests Table
export const doctorApprovalsTable = pgTable("doctor_approvals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).references(() => usersTable.id).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  registrationId: text("registration_id").notNull(),
  requestedRole: text("requested_role").notNull(),
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: text("reviewed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DoctorApproval = typeof doctorApprovalsTable.$inferSelect;

// 6. Audit Logs Table
export const auditLogsTable = pgTable("audit_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  user: text("user").notNull(),
  action: text("action").notNull(),
  caseId: text("case_id").notNull(),
  prevHash: text("prev_hash").notNull(),
  hash: text("hash").notNull(),
  integrityStatus: text("integrity_status").notNull().default("Verified"),
});

export type AuditLogEntry = typeof auditLogsTable.$inferSelect;