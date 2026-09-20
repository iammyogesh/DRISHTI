import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, pool, usersTable, doctorApprovalsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const authRouter: IRouter = Router();

export type UserRecord = {
  id: string;
  fullName: string;
  title: string;
  registrationId: string;
  hospitalName: string;
  department: string;
  username: string;
  email: string;
  phone: string;
  role: "Ophthalmologist" | "Screening Technician" | "Administrator";
  status: "Active" | "Inactive" | "Pending Verification";
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED";
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string | null;
};

// Rate limiting in-memory map (IP/endpoint -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxAttempts = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

// In-memory token storage (token -> userId)
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Initial seed users with strong salt/hash
const seedSalt = "drishti-secure-salt-2026-v2";

const seedUsers: UserRecord[] = [
  {
    id: "usr-doc-01",
    fullName: "Dr. Anish Sharma",
    title: "Senior Consultant Ophthalmologist",
    registrationId: "MCI-2020-04921",
    hospitalName: "Apex Eye Hospital & Retina Care",
    department: "Vitreoretinal Services",
    username: "dr.sharma",
    email: "doctor@drishti.health",
    phone: "9876543210",
    role: "Ophthalmologist",
    status: "Active",
    approvalStatus: "APPROVED",
    salt: seedSalt,
    passwordHash: hashPassword("Password123!", seedSalt),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: "usr-tech-01",
    fullName: "Rajesh Patel",
    title: "Senior Ophthalmic Screening Specialist",
    registrationId: "TECH-2021-0982",
    hospitalName: "Apex Eye Hospital & Retina Care",
    department: "Community Screening Unit",
    username: "tech.patel",
    email: "tech@drishti.health",
    phone: "9876512345",
    role: "Screening Technician",
    status: "Active",
    approvalStatus: "APPROVED",
    salt: seedSalt,
    passwordHash: hashPassword("Password123!", seedSalt),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    lastLogin: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "usr-admin-01",
    fullName: "Priya Verma",
    title: "Clinical Systems Administrator",
    registrationId: "ADM-2023-0012",
    hospitalName: "Apex Eye Hospital & Retina Care",
    department: "Health Informatics & Security",
    username: "admin.drishti",
    email: "admin@drishti.health",
    phone: "9876599887",
    role: "Administrator",
    status: "Active",
    approvalStatus: "APPROVED",
    salt: seedSalt,
    passwordHash: hashPassword("Password123!", seedSalt),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    lastLogin: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

// Memory store initialized with seeds
const memoryUsers: UserRecord[] = [...seedUsers];

// Seed PostgreSQL if connected
async function syncSeedToPostgres() {
  if (!db) return;
  try {
    for (const u of seedUsers) {
      const existing = await db.select().from(usersTable).where(eq(usersTable.id, u.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(usersTable).values({
          id: u.id,
          fullName: u.fullName,
          title: u.title,
          registrationId: u.registrationId,
          hospitalName: u.hospitalName,
          department: u.department,
          username: u.username,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.status,
          approvalStatus: u.approvalStatus,
          passwordHash: u.passwordHash,
          salt: u.salt,
          createdAt: new Date(u.createdAt),
          lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        });
      }
    }
  } catch (err) {
    console.error("[AUTH] Error seeding PostgreSQL users:", err);
  }
}
syncSeedToPostgres();

export async function getUserFromTokenAsync(token: string | undefined): Promise<UserRecord | null> {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  if (db) {
    try {
      const rows = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
      if (rows.length > 0) {
        const u = rows[0];
        return {
          id: u.id,
          fullName: u.fullName,
          title: u.title,
          registrationId: u.registrationId,
          hospitalName: u.hospitalName,
          department: u.department,
          username: u.username,
          email: u.email,
          phone: u.phone || "",
          role: u.role as any,
          status: u.status as any,
          approvalStatus: u.approvalStatus as any,
          passwordHash: u.passwordHash,
          salt: u.salt,
          createdAt: u.createdAt.toISOString(),
          lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
        };
      }
    } catch (err) {
      console.error("[AUTH] DB query failed, falling back to memory:", err);
    }
  }

  return memoryUsers.find((u) => u.id === session.userId) || null;
}

// Synchronous wrapper for backwards compatibility
export function getUserFromToken(token: string | undefined): UserRecord | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session || Date.now() > session.expiresAt) return null;
  return memoryUsers.find((u) => u.id === session.userId) || null;
}

function sanitizeUser(user: UserRecord) {
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

// Validation helpers
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateIndianPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-\+\(\)]/g, "");
  // Accept 10 digits starting with 6-9, or +91 prefix followed by 10 digits
  return /^(?:(?:\+91|91|0)?[6-9]\d{9})$/.test(clean);
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one numerical digit (0-9)." };
  }
  return { valid: true };
}

// POST /api/auth/register
authRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const ipKey = `register-${req.ip || "local"}`;
    if (!checkRateLimit(ipKey, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many registration attempts. Please try again in 15 minutes." });
    }

    const {
      fullName,
      title,
      registrationId,
      hospitalName,
      department,
      username,
      email,
      phone,
      password,
      role,
      verificationCode,
    } = req.body;

    // Required fields check
    if (!fullName || !username || !email || !password || !role) {
      return res.status(400).json({ error: "Required registration fields are missing." });
    }

    const cleanFullName = String(fullName).trim();
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : "";

    // Input validations
    if (cleanFullName.length < 2 || /[<>{}\\\/]/.test(cleanFullName)) {
      return res.status(400).json({ error: "Please enter a valid full name." });
    }

    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    if (!/^[a-z0-9_.\-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, dots, and hyphens." });
    }

    if (cleanPhone && !validateIndianPhone(cleanPhone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
    }

    const pwdCheck = validatePassword(String(password));
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.reason });
    }

    // Check duplicate email / username in memory & DB
    let isDuplicate = memoryUsers.some(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
    );

    if (!isDuplicate && db) {
      const existingDb = await db
        .select()
        .from(usersTable)
        .where(or(eq(usersTable.email, cleanEmail), eq(usersTable.username, cleanUsername)))
        .limit(1);
      if (existingDb.length > 0) isDuplicate = true;
    }

    if (isDuplicate) {
      return res.status(400).json({ error: "An account with this email or username already exists." });
    }

    const userRole: UserRecord["role"] =
      role === "Administrator" ? "Administrator" : role === "Screening Technician" ? "Screening Technician" : "Ophthalmologist";

    // Doctor Verification Workflow:
    // Newly registered Doctors default to "Pending Verification" & approvalStatus "PENDING"
    // Unless valid developer approval key 'DRISHTI-VERIFY-2026' is provided or role is non-doctor
    const isApprovedByCode = String(verificationCode || "").trim() === "DRISHTI-VERIFY-2026";
    const needsApproval = userRole === "Ophthalmologist" && !isApprovedByCode;

    const status: UserRecord["status"] = needsApproval ? "Pending Verification" : "Active";
    const approvalStatus: UserRecord["approvalStatus"] = needsApproval ? "PENDING" : "APPROVED";

    const salt = generateSalt();
    const passwordHash = hashPassword(String(password), salt);
    const userId = `usr-${Date.now()}`;
    const createdAtIso = new Date().toISOString();

    const newUser: UserRecord = {
      id: userId,
      fullName: cleanFullName,
      title: title ? String(title).trim() : userRole === "Ophthalmologist" ? "Consultant Ophthalmologist" : "Ophthalmic Professional",
      registrationId: registrationId ? String(registrationId).trim() : `MCI-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      hospitalName: hospitalName ? String(hospitalName).trim() : "Apex Eye Hospital & Retina Care",
      department: department ? String(department).trim() : "Ophthalmology & Retina",
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      role: userRole,
      status,
      approvalStatus,
      salt,
      passwordHash,
      createdAt: createdAtIso,
      lastLogin: createdAtIso,
    };

    memoryUsers.push(newUser);

    if (db) {
      try {
        await db.insert(usersTable).values({
          id: newUser.id,
          fullName: newUser.fullName,
          title: newUser.title,
          registrationId: newUser.registrationId,
          hospitalName: newUser.hospitalName,
          department: newUser.department,
          username: newUser.username,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          approvalStatus: newUser.approvalStatus,
          passwordHash: newUser.passwordHash,
          salt: newUser.salt,
          createdAt: new Date(),
          lastLogin: new Date(),
        });

        if (needsApproval) {
          await db.insert(doctorApprovalsTable).values({
            id: `appr-${Date.now()}`,
            userId: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            registrationId: newUser.registrationId,
            requestedRole: newUser.role,
            status: "PENDING",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        console.error("[AUTH] Error inserting user into PostgreSQL:", err);
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    activeSessions.set(token, { userId: newUser.id, expiresAt });

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      requiresApproval: needsApproval,
      message: needsApproval
        ? "Account registered successfully! Your doctor credentials are under clinical verification by an Administrator."
        : "Account registered successfully!",
    });
  } catch (err: any) {
    console.error("[AUTH] Registration error:", err);
    return res.status(500).json({ error: "Unable to process registration at this time. Please try again." });
  }
});

// POST /api/auth/login
authRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const ipKey = `login-${req.ip || "local"}`;
    if (!checkRateLimit(ipKey, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes before trying again." });
    }

    const identifier = req.body.identifier || req.body.username || req.body.email;
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Please enter your username/email and password." });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    let user: UserRecord | undefined = memoryUsers.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user && db) {
      try {
        const rows = await db
          .select()
          .from(usersTable)
          .where(or(eq(usersTable.email, cleanId), eq(usersTable.username, cleanId)))
          .limit(1);
        if (rows.length > 0) {
          const u = rows[0];
          user = {
            id: u.id,
            fullName: u.fullName,
            title: u.title,
            registrationId: u.registrationId,
            hospitalName: u.hospitalName,
            department: u.department,
            username: u.username,
            email: u.email,
            phone: u.phone || "",
            role: u.role as any,
            status: u.status as any,
            approvalStatus: u.approvalStatus as any,
            passwordHash: u.passwordHash,
            salt: u.salt,
            createdAt: u.createdAt.toISOString(),
            lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
          };
          if (!memoryUsers.some((m) => m.id === user!.id)) {
            memoryUsers.push(user);
          }
        }
      } catch (err) {
        console.error("[AUTH] Login DB lookup error:", err);
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials. Please check your username/email." });
    }

    const hash = hashPassword(String(password), user.salt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials. Please check your password." });
    }

    user.lastLogin = new Date().toISOString();

    if (db) {
      try {
        await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
      } catch (err) {
        console.error("[AUTH] Failed updating last login in DB:", err);
      }
    }

    const token = generateToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    activeSessions.set(token, { userId: user.id, expiresAt });

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    return res.status(500).json({ error: "Unable to complete sign-in. Please try again." });
  }
});

// GET /api/auth/me
authRouter.get("/auth/me", async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || (req.query.token as string);
  const user = await getUserFromTokenAsync(token);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized or session expired. Please sign in again." });
  }

  return res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/logout
authRouter.post("/auth/logout", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({ message: "Successfully logged out" });
});

// GET /api/auth/users (Admin & Doctor overview)
authRouter.get("/auth/users", async (req: Request, res: Response) => {
  if (db) {
    try {
      const rows = await db.select().from(usersTable);
      if (rows.length > 0) {
        return res.json(
          rows.map((u) =>
            sanitizeUser({
              id: u.id,
              fullName: u.fullName,
              title: u.title,
              registrationId: u.registrationId,
              hospitalName: u.hospitalName,
              department: u.department,
              username: u.username,
              email: u.email,
              phone: u.phone || "",
              role: u.role as any,
              status: u.status as any,
              approvalStatus: u.approvalStatus as any,
              passwordHash: u.passwordHash,
              salt: u.salt,
              createdAt: u.createdAt.toISOString(),
              lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
            })
          )
        );
      }
    } catch (err) {
      console.error("[AUTH] Error listing DB users:", err);
    }
  }
  return res.json(memoryUsers.map(sanitizeUser));
});

// POST /api/auth/approve-doctor (Administrator action to approve doctor account)
authRouter.post("/auth/approve-doctor", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const currentUser = await getUserFromTokenAsync(token);

    if (!currentUser || currentUser.role !== "Administrator") {
      return res.status(403).json({ error: "Access denied. Only Administrators can verify and approve doctor accounts." });
    }

    const { userId, action = "APPROVE" } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Target Doctor User ID is required." });
    }

    const user = memoryUsers.find((u) => u.id === userId);
    if (user) {
      if (action === "APPROVE") {
        user.approvalStatus = "APPROVED";
        user.status = "Active";
      } else {
        user.approvalStatus = "REJECTED";
        user.status = "Inactive";
      }
    }

    if (db) {
      try {
        await db
          .update(usersTable)
          .set({
            approvalStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
            status: action === "APPROVE" ? "Active" : "Inactive",
          })
          .where(eq(usersTable.id, userId));
      } catch (err) {
        console.error("[AUTH] DB update failed for doctor approval:", err);
      }
    }

    return res.json({
      message: action === "APPROVE" ? "Doctor account approved and activated." : "Doctor account application rejected.",
      user: user ? sanitizeUser(user) : null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to process doctor approval action." });
  }
});

// POST /api/auth/change-password
authRouter.post("/auth/change-password", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "") || (req.body.token as string);
    const user = await getUserFromTokenAsync(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized or session expired. Please sign in again." });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current password and new password are required." });
    }

    // Verify current password
    const currentHash = hashPassword(String(currentPassword), user.salt);
    if (currentHash !== user.passwordHash) {
      return res.status(400).json({ error: "Incorrect current password. Please enter your valid current password." });
    }

    // Validate new password strength
    const pwdCheck = validatePassword(String(newPassword));
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.reason });
    }

    // Generate new salt and hash
    const newSalt = generateSalt();
    const newHash = hashPassword(String(newPassword), newSalt);

    user.salt = newSalt;
    user.passwordHash = newHash;

    const memoryUser = memoryUsers.find((u) => u.id === user.id);
    if (memoryUser) {
      memoryUser.salt = newSalt;
      memoryUser.passwordHash = newHash;
    }

    if (db) {
      try {
        await db
          .update(usersTable)
          .set({ salt: newSalt, passwordHash: newHash })
          .where(eq(usersTable.id, user.id));
      } catch (err) {
        console.error("[AUTH] Failed updating password in DB:", err);
      }
    }

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("[AUTH] Password update error:", err);
    return res.status(500).json({ error: "Failed to update password. Please try again." });
  }
});

// POST /api/auth/update-profile
authRouter.post("/auth/update-profile", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "") || (req.body.token as string);
    const user = await getUserFromTokenAsync(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized or session expired." });
    }

    const { fullName, title, registrationId, hospitalName, department, phone } = req.body;

    if (fullName) user.fullName = String(fullName).trim();
    if (title) user.title = String(title).trim();
    if (registrationId) user.registrationId = String(registrationId).trim();
    if (hospitalName) user.hospitalName = String(hospitalName).trim();
    if (department) user.department = String(department).trim();
    if (phone !== undefined) user.phone = String(phone).trim();

    const memoryUser = memoryUsers.find((u) => u.id === user.id);
    if (memoryUser) {
      Object.assign(memoryUser, {
        fullName: user.fullName,
        title: user.title,
        registrationId: user.registrationId,
        hospitalName: user.hospitalName,
        department: user.department,
        phone: user.phone,
      });
    }

    if (db) {
      try {
        await db
          .update(usersTable)
          .set({
            fullName: user.fullName,
            title: user.title,
            registrationId: user.registrationId,
            hospitalName: user.hospitalName,
            department: user.department,
            phone: user.phone,
          })
          .where(eq(usersTable.id, user.id));
      } catch (err) {
        console.error("[AUTH] DB update failed for user profile:", err);
      }
    }

    return res.json({ message: "Profile updated successfully.", user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

export default authRouter;
