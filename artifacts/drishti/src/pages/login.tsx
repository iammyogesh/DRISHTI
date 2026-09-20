import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Activity, ShieldCheck, Eye, Lock, Mail, User, Building, Award, Phone, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/shell";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Registration state
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("Consultant Ophthalmologist");
  const [registrationId, setRegistrationId] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [department, setDepartment] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [role, setRole] = useState<"Ophthalmologist" | "Screening Technician" | "Administrator">("Ophthalmologist");
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
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      login(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoIdentifier: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: demoIdentifier, password: "Password123!" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Demo login failed");
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
          fullName,
          title,
          registrationId,
          hospitalName,
          department,
          username: regUsername,
          email: regEmail,
          phone: regPhone,
          role,
          password: regPassword,
          verificationCode: (window as any)._verificationCode || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      login(data.token, data.user);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground transition-colors duration-300">
      {/* Left visual column */}
      <div className="relative flex-1 bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-8 md:p-12 overflow-hidden border-r border-slate-200 dark:border-slate-800 transition-colors duration-300">
        {/* Decorative Grid & Retina Circle */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full border border-sky-500/40 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[340px] rounded-full border stroke-dasharray-4 border-sky-400/30" />
          <div className="absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] dark:bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/20">
              <Eye size={24} strokeWidth={2.5} />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">DRISHTI</h1>
              <span className="mono text-[10px] tracking-[.25em] text-sky-600 dark:text-sky-400 font-bold uppercase">
                AI Eye Care
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Clinical Content */}
        <div className="relative z-10 my-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-600/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
            <ShieldCheck size={14} className="text-sky-600 dark:text-sky-400" />
            Hospital Screening Platform
          </div>

          <h2 className="font-serif text-3xl md:text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            Precision Retinal Screening & Tele-Ophthalmology Workflow
          </h2>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            DRISHTI empowers clinicians and screening technicians with quality-aware fundus image validation, multi-class Diabetic Retinopathy signals, and visual Grad-CAM evidence.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-3.5 backdrop-blur shadow-xs">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Quality Gate</div>
              <div className="text-slate-500 dark:text-slate-400">Automated focus, exposure & retinal field check</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-3.5 backdrop-blur shadow-xs">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Visual Evidence</div>
              <div className="text-slate-500 dark:text-slate-400">Grad-CAM heatmaps & lesion localization</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-6">
          <span>DRISHTI Clinical Workstation</span>
          <span className="mono text-[10px]">VERIFIED MEDICAL ACCESS</span>
        </div>
      </div>

      {/* Right form column */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-20 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground font-serif">
                {mode === "login" ? "Clinical Workstation Sign In" : "Register Professional Account"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "login"
                  ? "Enter your verified professional credentials to access patient screening records."
                  : "Create your authenticated medical account with registration details."}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl border border-border bg-muted/50 p-1 text-xs">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className={`flex-1 rounded-lg py-2 font-bold transition-all ${
                mode === "login"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); }}
              className={`flex-1 rounded-lg py-2 font-bold transition-all ${
                mode === "register"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register Professional
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Username or Professional Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="e.g. doctor@drishti.health or dr.sharma"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="input-field !pl-10 !py-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field !pl-10 !py-2.5 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 !text-xs font-bold justify-center mt-2"
            >
              {loading ? "Authenticating..." : "Sign In to Workstation"} <ArrowRight size={15} />
            </button>

            {/* Quick Demo Login selector */}
            <div className="mt-8 border-t border-border pt-6">
              <div className="eyebrow mb-3">Quick Demo Access</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo("doctor@drishti.health")}
                  className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary transition-all text-[11px]"
                >
                  <div className="font-bold text-foreground truncate">Ophthalmologist</div>
                  <div className="text-[10px] text-muted-foreground">Dr. Anish Sharma</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("tech@drishti.health")}
                  className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary transition-all text-[11px]"
                >
                  <div className="font-bold text-foreground truncate">Technician</div>
                  <div className="text-[10px] text-muted-foreground">Rajesh Patel</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo("admin@drishti.health")}
                  className="rounded-lg border border-border bg-card p-2.5 text-left hover:border-primary transition-all text-[11px]"
                >
                  <div className="font-bold text-foreground truncate">Admin</div>
                  <div className="text-[10px] text-muted-foreground">Priya Verma</div>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="input-field !py-2 text-xs"
                >
                  <option value="Ophthalmologist">Ophthalmologist</option>
                  <option value="Screening Technician">Screening Technician</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Professional Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vitreoretinal Consultant"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Medical/Reg ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCI-2022-84920"
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Eye Hospital"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ophthalmology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="dr.rajesh"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="rajesh@hospital.org"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field !py-2 text-xs"
                />
              </div>
            </div>

            {role === "Ophthalmologist" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Doctor Account Verification Notice
                </div>
                <div>
                  Newly registered doctor accounts undergo clinical verification. Enter demo key <code className="font-mono font-bold bg-card px-1 rounded">DRISHTI-VERIFY-2026</code> for instant verification during demonstration.
                </div>
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Enter approval key (optional)"
                    className="input-field !py-1 text-xs bg-background"
                    onChange={(e) => (window as any)._verificationCode = e.target.value}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 !text-xs font-bold justify-center mt-3"
            >
              {loading ? "Creating Account..." : "Complete Professional Registration"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
