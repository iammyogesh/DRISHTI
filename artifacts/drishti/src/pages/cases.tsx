import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Download,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Activity,
  History,
  User,
  Calendar,
  Eye,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useListCases } from "@workspace/api-client-react";
import { demoCases, formatDate } from "@/lib/demo-data";
import { ErrorState, LoadingState, PageHeader, StatusChip } from "@/components/shell";
import { useAuth } from "@/lib/auth";

export default function Cases() {
  const { user } = useAuth();
  const query = useListCases();
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");

  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("All cases");
  const [gradeFilter, setGradeFilter] = useState("ALL");

  // Selected Patient for Patient History view
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>("PAT-88402");
  const [patientSearch, setPatientSearch] = useState("");

  const raw = (query.data as typeof demoCases | undefined) ?? demoCases;

  const cases = useMemo(() => {
    return raw.filter((item: any) => {
      const patientNameStr = item.patientName || "";
      const matchesTerm = `${item.caseId} ${item.patientId || ""} ${patientNameStr} ${item.aiLabel} ${item.diabetesType || ""}`
        .toLowerCase()
        .includes(term.toLowerCase());

      if (!matchesTerm) return false;

      if (gradeFilter !== "ALL" && Number(gradeFilter) !== item.aiGrade) {
        return false;
      }

      if (filter === "All cases") return true;
      if (filter === "Awaiting review") return item.reviewStatus === "AWAITING_REVIEW";
      if (filter === "Reviewed") return item.reviewStatus === "REVIEWED";
      if (filter === "Referable only") return item.referable;
      if (filter === "GOOD") return item.qualityStatus === "GOOD";
      if (filter === "BORDERLINE") return item.qualityStatus === "BORDERLINE";
      if (filter === "UNGRADABLE") return item.qualityStatus === "UNGRADABLE";

      return true;
    });
  }, [raw, term, filter, gradeFilter]);

  // Group cases by Patient ID to construct Patient Profiles & Screening Timelines
  const patientGroups = useMemo(() => {
    const map = new Map<string, { patientId: string; patientName: string; age: number; gender: string; phone?: string; diabetesType?: string; cases: any[] }>();

    raw.forEach((c: any) => {
      const pId = c.patientId || "PAT-88402";
      if (!map.has(pId)) {
        map.set(pId, {
          patientId: pId,
          patientName: c.patientName || "Ramachandran K.",
          age: c.age || 56,
          gender: c.gender || "Male",
          phone: c.phone || "9845012345",
          diabetesType: c.diabetesType || "Type 2",
          cases: [],
        });
      }
      map.get(pId)!.cases.push(c);
    });

    return Array.from(map.values());
  }, [raw]);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patientGroups;
    const queryStr = patientSearch.toLowerCase();
    return patientGroups.filter(
      (p) =>
        p.patientName.toLowerCase().includes(queryStr) ||
        p.patientId.toLowerCase().includes(queryStr) ||
        (p.phone && p.phone.includes(queryStr))
    );
  }, [patientGroups, patientSearch]);

  const activePatient = useMemo(() => {
    return patientGroups.find((p) => p.patientId === selectedPatientId) || patientGroups[0];
  }, [patientGroups, selectedPatientId]);

  const exportCases = () => {
    const csv = [
      "caseId,patientName,patientId,age,gender,diabetesType,eye,qualityStatus,aiGrade,aiLabel,confidence,referable,reviewStatus,finalGrade,reviewerName",
      ...cases.map(
        (i: any) =>
          `${i.caseId},"${i.patientName || "Patient"}",${i.patientId || "PAT-00"},${i.age},${i.gender || "Female"},"${i.diabetesType || "Type 2"}",${i.eye},${i.qualityStatus},${i.aiGrade},"${i.aiLabel}",${i.confidence},${i.referable},${i.reviewStatus},${i.finalGrade ?? "NA"},"${i.reviewerName || "NA"}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drishti-clinical-cases-register.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        eyebrow="Clinical Registry & Patient History"
        title="Patient Screening Cases & Longitudinal History"
        description="Search patient records, view multi-screening timelines, compare historical DR severity grades, and access diagnostic reports."
        action={
          <div className="flex flex-wrap gap-2.5">
            {user?.role !== "Ophthalmologist" && (
              <Link href="/screening/new" className="btn-primary" data-testid="link-new-screening-case">
                <Plus size={15} /> New Screening Episode
              </Link>
            )}
            <button className="btn-quiet" onClick={exportCases} data-testid="button-export-cases">
              <Download size={15} /> Export Register (CSV)
            </button>
          </div>
        }
      />

      {/* Tab Selector */}
      <div className="flex border-b border-border/70 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Screening Cases & Queue ({raw.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History size={14} /> Patient History & Progression ({patientGroups.length} Patients)
        </button>
      </div>

      {activeTab === "queue" ? (
        query.isLoading && !query.data ? (
          <LoadingState label="Retrieving clinical case register…" />
        ) : (
          <>
            {query.isError && (
              <div className="mb-5">
                <ErrorState retry={() => query.refetch()} />
              </div>
            )}

            <div className="panel overflow-hidden">
              {/* Filter Bar */}
              <div className="flex flex-col gap-3 border-b border-border/70 p-4 md:flex-row md:items-center md:justify-between bg-muted/20">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-2.5 text-muted-foreground" size={15} />
                  <input
                    className="input-field !pl-9 !py-2 text-xs"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search by Case ID, Patient Name, or Patient ID..."
                    aria-label="Search cases"
                    data-testid="input-search-cases"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter size={14} className="text-muted-foreground" />
                  
                  <select
                    className="input-field !w-auto !py-1.5 text-xs font-semibold"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    aria-label="Filter by grade"
                  >
                    <option value="ALL">All DR Grades (0–4)</option>
                    <option value="0">Grade 0 (No DR)</option>
                    <option value="1">Grade 1 (Mild NPDR)</option>
                    <option value="2">Grade 2 (Moderate NPDR)</option>
                    <option value="3">Grade 3 (Severe NPDR)</option>
                    <option value="4">Grade 4 (Proliferative DR)</option>
                  </select>

                  <select
                    className="input-field !w-auto !py-1.5 text-xs font-semibold"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter cases"
                    data-testid="select-case-filter"
                  >
                    <option value="All cases">All Statuses ({raw.length})</option>
                    <option value="Awaiting review">Awaiting Doctor Review</option>
                    <option value="Referable only">Referable DR (Grade 2+)</option>
                    <option value="Reviewed">Validated & Signed</option>
                    <option value="GOOD">Quality: GOOD</option>
                    <option value="BORDERLINE">Quality: BORDERLINE</option>
                    <option value="UNGRADABLE">Quality: UNGRADABLE</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-[.12em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-bold">Case ID & Patient</th>
                      <th className="px-3 py-3 font-bold">Demographics</th>
                      <th className="px-3 py-3 font-bold">Quality</th>
                      <th className="px-3 py-3 font-bold">AI Grade & Confidence</th>
                      <th className="px-3 py-3 font-bold">Referable</th>
                      <th className="px-3 py-3 font-bold">Reviewer & Status</th>
                      <th className="px-5 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item: any) => (
                      <tr
                        className="border-t border-border/60 transition-colors hover:bg-muted/20"
                        key={item.caseId}
                        data-testid={`row-register-${item.caseId}`}
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/analysis/${item.caseId}`}
                            className="font-bold text-primary hover:underline"
                            data-testid={`link-register-${item.caseId}`}
                          >
                            {item.caseId}
                          </Link>
                          <div className="font-semibold text-xs text-foreground mt-0.5">
                            {item.patientName || "Anonymous Patient"} ({item.patientId || "PAT-000"})
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-xs">
                          <div className="font-semibold text-foreground">{item.eye} Eye</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.age} yrs · {item.diabetesType || "Type 2"}
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <StatusChip
                            tone={
                              item.qualityStatus === "GOOD"
                                ? "good"
                                : item.qualityStatus === "BORDERLINE"
                                ? "warn"
                                : "danger"
                            }
                          >
                            {item.qualityStatus}
                          </StatusChip>
                        </td>

                        <td className="px-3 py-3.5 text-xs font-semibold">
                          <div>Grade {item.aiGrade}: {item.aiLabel}</div>
                          <div className="text-[11px] text-muted-foreground font-normal">
                            {Math.round(item.confidence * 100)}% Confidence
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <StatusChip tone={item.referable ? "danger" : "good"}>
                            {item.referable ? "Referable" : "Non-Referable"}
                          </StatusChip>
                        </td>

                        <td className="px-3 py-3.5 text-xs">
                          <div className="font-semibold text-foreground">
                            {item.reviewerName || "Awaiting Review"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.reviewStatus === "REVIEWED" ? "Signed & Validated" : "Pending MD Sign-off"}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/analysis/${item.caseId}`}
                              className="btn-quiet !py-1.5 !px-2.5 text-xs"
                            >
                              Workstation
                            </Link>
                            <Link
                              href={`/cases/${item.caseId}`}
                              className="btn-quiet !py-1.5 !px-2.5 text-xs"
                            >
                              History
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      ) : (
        /* PATIENT HISTORY & MULTI-SCREENING COMPARISON VIEW */
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Patient Directory List */}
          <div className="panel p-4 space-y-3">
            <div className="eyebrow">Patient Records Directory</div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
              <input
                className="input-field !pl-9 !py-1.5 text-xs"
                placeholder="Search patient name, ID, phone..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pt-1">
              {filteredPatients.map((p) => (
                <button
                  key={p.patientId}
                  onClick={() => setSelectedPatientId(p.patientId)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    selectedPatientId === p.patientId
                      ? "border-primary bg-primary/10 font-bold shadow-xs"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>{p.patientName}</span>
                    <span className="mono text-[10px] text-muted-foreground">{p.patientId}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {p.age} yrs · {p.gender} · {p.cases.length} Screening Sessions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Patient Profile & Longitudinal History Timeline */}
          {activePatient && (
            <div className="space-y-6">
              {/* Patient Demographic Card */}
              <div className="panel p-6 bg-card border border-border">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
                  <div>
                    <span className="eyebrow">Patient Profile · {activePatient.patientId}</span>
                    <h2 className="font-serif text-2xl font-bold text-foreground mt-0.5">
                      {activePatient.patientName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono rounded bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {activePatient.cases.length} Screening Sessions Recorded
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Age & Gender</span>
                    <strong className="text-foreground">{activePatient.age} years · {activePatient.gender}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Mobile Phone</span>
                    <strong className="text-foreground">{activePatient.phone || "9845012345"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Diabetes History</span>
                    <strong className="text-foreground">{activePatient.diabetesType || "Type 2"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Latest DR Grade</span>
                    <StatusChip tone={activePatient.cases[0]?.referable ? "danger" : "good"}>
                      Grade {activePatient.cases[0]?.aiGrade ?? 0}: {activePatient.cases[0]?.aiLabel ?? "No DR"}
                    </StatusChip>
                  </div>
                </div>
              </div>

              {/* Longitudinal Screening Episodes Timeline */}
              <div className="panel p-6 space-y-5">
                <div className="eyebrow">Screening History & DR Progression Timeline</div>

                <div className="space-y-4">
                  {activePatient.cases.map((c: any, index: number) => (
                    <div key={c.caseId} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="mono font-bold text-xs bg-card border border-border px-2.5 py-1 rounded-lg">
                            {c.caseId}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {c.eye} Eye Screening · {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <StatusChip tone={c.referable ? "danger" : "good"}>
                          Grade {c.aiGrade}: {c.aiLabel}
                        </StatusChip>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase font-bold block">Quality Status</span>
                          <span className="font-semibold">{c.qualityStatus} ({c.qualityScore}/100)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase font-bold block">AI Confidence</span>
                          <span className="font-semibold">{Math.round(c.confidence * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase font-bold block">Ophthalmologist Sign-off</span>
                          <span className="font-semibold">{c.reviewerName || "Awaiting MD Review"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Link href={`/analysis/${c.caseId}`} className="btn-quiet !py-1 !px-2.5 text-xs">
                          Open Workstation
                        </Link>
                        <Link href={`/cases/${c.caseId}`} className="btn-quiet !py-1 !px-2.5 text-xs">
                          Clinical Report
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}