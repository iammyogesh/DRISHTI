import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, Lock, Mail, AlertCircle, ArrowRight, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/shell";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign-in state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Registration state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"Ophthalmologist" | "Screening Technician" | "Administrator">("Ophthalmologist");
  const [title, setTitle] = useState("Consultant Ophthalmologist");
  const [registrationId, setRegistrationId] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [department, setDepartment] = useState("Ophthalmology");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid username or password.");
      }

      login(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          title: title.trim(),
          registrationId: registrationId.trim(),
          hospitalName: hospitalName.trim(),
          department: department.trim(),
          username: regUsername.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          role,
          password: regPassword,
          verificationCode: "DRISHTI-VERIFY-2026", // transparent default
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      login(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground justify-between">
      {/* Minimal Top Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b border-border/70 bg-card/60">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground font-bold shadow-2xs">
            <Eye size={16} />
          </span>
          <span className="font-bold text-sm tracking-tight">DRISHTI</span>
          <span className="text-muted-foreground/40 text-xs">|</span>
          <span className="text-xs text-muted-foreground">Retinal Screening Workstation</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Sign-In Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[480px]">
          <div className="panel p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div>
              <div className="eyebrow text-primary mb-1">Clinical Workspace Access</div>
              <h1 className="text-xl font-bold text-foreground">
                {mode === "login" ? "Sign in to your clinical workspace" : "Register Professional Account"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "login"
                  ? "Enter your professional credentials to access patient screening records."
                  : "Complete your medical registration details for authenticated workstation access."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {mode === "login" ? (
              /* Sign-In Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Username / Professional Email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. doctor@hospital.org"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="input-field !pl-9 text-xs"
                      data-testid="input-username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field !pl-9 text-xs"
                      data-testid="input-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-2.5 text-xs font-semibold justify-center mt-2"
                  data-testid="button-submit-login"
                >
                  {loading ? "Authenticating…" : "Sign In"}
                </button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/50">
                  <span>Need an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Register professional account
                  </button>
                </div>
              </form>
            ) : (
              /* Professional Registration Form */
              <form onSubmit={handleRegister} className="space-y-4">
                {/* 1. Professional Information */}
                <div className="space-y-3">
                  <div className="eyebrow border-b border-border/50 pb-1 text-[10px]">
                    1. Professional Information
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Rajesh Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="input-field text-xs"
                      >
                        <option value="Ophthalmologist">Ophthalmologist</option>
                        <option value="Screening Technician">Screening Technician</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Designation</label>
                      <input
                        type="text"
                        required
                        placeholder="Vitreoretinal Consultant"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Medical Registration No.</label>
                      <input
                        type="text"
                        required
                        placeholder="MCI-2022-84920"
                        value={registrationId}
                        onChange={(e) => setRegistrationId(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Workplace */}
                <div className="space-y-3">
                  <div className="eyebrow border-b border-border/50 pb-1 text-[10px]">
                    2. Workplace
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Hospital / Clinic</label>
                      <input
                        type="text"
                        required
                        placeholder="Apex Eye Hospital"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Department</label>
                      <input
                        type="text"
                        required
                        placeholder="Ophthalmology"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="doctor@hospital.org"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Phone</label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Account */}
                <div className="space-y-3">
                  <div className="eyebrow border-b border-border/50 pb-1 text-[10px]">
                    3. Account Credentials
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="dr.sharma"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="input-field text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground mb-1">Confirm Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-2.5 text-xs font-semibold justify-center mt-2"
                >
                  {loading ? "Creating Account…" : "Register Account"}
                </button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/50">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="h-10 flex items-center justify-between px-6 border-t border-border/60 text-[11px] text-muted-foreground bg-card/40">
        <span>DRISHTI · Retinal Screening Workstation</span>
        <span>Clinical Decision Support System</span>
      </footer>
    </div>
  );
}
