import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Download,
  Filter,
  Plus,
  Search,
  History,
  ArrowRight,
  ClipboardList,
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
      const matchesTerm = `${item.caseId} ${item.patientId || ""} ${patientNameStr} ${item.aiLabel || ""} ${item.diabetesType || ""}`
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

  // Group cases by Patient ID
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
      "CaseId,PatientName,PatientId,Age,Gender,DiabetesType,Eye,QualityStatus,AIGrade,AILabel,Confidence,Referable,ReviewStatus,FinalGrade,ReviewerName",
      ...cases.map(
        (i: any) =>
          `${i.caseId},"${i.patientName || "Patient"}",${i.patientId || "PAT-00"},${i.age},${i.gender || "Female"},"${i.diabetesType || "Type 2"}",${i.eye},${i.qualityStatus},${i.aiGrade},"${i.aiLabel}",${i.confidence},${i.referable},${i.reviewStatus},${i.finalGrade ?? "NA"},"${i.reviewerName || "NA"}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "drishti-screening-cases.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical Register"
        title="Cases & Patient History"
        description="Review active screening queue, examine patient longitudinal screening records, and access clinical reports."
        action={
          <div className="flex flex-wrap gap-2.5">
            <Link href="/screening/new" className="btn-primary" data-testid="link-new-screening-case">
              <Plus size={14} /> New Screening
            </Link>
            <button className="btn-quiet" onClick={exportCases} data-testid="button-export-cases">
              <Download size={14} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border/70 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`pb-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "queue"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ClipboardList size={14} /> Screening Queue ({raw.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History size={14} /> Patient History ({patientGroups.length} Patients)
        </button>
      </div>

      {activeTab === "queue" ? (
        query.isLoading && !query.data ? (
          <LoadingState label="Loading case registry…" />
        ) : (
          <>
            {query.isError && (
              <div className="mb-4">
                <ErrorState retry={() => query.refetch()} />
              </div>
            )}

            <div className="panel overflow-hidden">
              {/* Filter Bar */}
              <div className="flex flex-col gap-3 border-b border-border/70 p-3.5 md:flex-row md:items-center md:justify-between bg-muted/20">
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
                  <input
                    className="input-field !pl-8 !py-1.5 text-xs"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search by case ID, patient name, ID…"
                    aria-label="Search cases"
                    data-testid="input-search-cases"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter size={13} className="text-muted-foreground" />

                  <select
                    className="input-field !w-auto !py-1 text-xs"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    aria-label="Filter by grade"
                  >
                    <option value="ALL">All Grades (0–4)</option>
                    <option value="0">Grade 0 (No DR)</option>
                    <option value="1">Grade 1 (Mild NPDR)</option>
                    <option value="2">Grade 2 (Moderate NPDR)</option>
                    <option value="3">Grade 3 (Severe NPDR)</option>
                    <option value="4">Grade 4 (Proliferative DR)</option>
                  </select>

                  <select
                    className="input-field !w-auto !py-1 text-xs"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter cases"
                    data-testid="select-case-filter"
                  >
                    <option value="All cases">All Statuses ({raw.length})</option>
                    <option value="Awaiting review">Awaiting Review</option>
                    <option value="Referable only">Referable (Grade 2+)</option>
                    <option value="Reviewed">Signed & Validated</option>
                    <option value="GOOD">Quality: Good</option>
                    <option value="BORDERLINE">Quality: Borderline</option>
                    <option value="UNGRADABLE">Quality: Ungradable</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase font-semibold text-muted-foreground border-b border-border/70">
                    <tr>
                      <th className="px-4 py-3">Case</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-3 py-3">Eye</th>
                      <th className="px-3 py-3">Quality</th>
                      <th className="px-3 py-3">AI Result</th>
                      <th className="px-3 py-3">Review Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item: any) => (
                      <tr
                        key={item.caseId}
                        className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                        data-testid={`row-case-${item.caseId}`}
                      >
                        <td className="px-4 py-3 font-semibold">
                          <Link
                            href={`/analysis/${item.caseId}`}
                            className="text-primary hover:underline"
                          >
                            {item.caseId}
                          </Link>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {formatDate(item.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{item.patientName || "Patient"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.patientId || "PAT-000"} · {item.age}y {item.gender ? `· ${item.gender}` : ""}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-muted-foreground font-medium">
                          {item.eye} Eye
                        </td>

                        <td className="px-3 py-3">
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

                        <td className="px-3 py-3">
                          <div className="font-semibold text-foreground">
                            Grade {item.aiGrade} · {Math.round(item.confidence * 100)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.aiLabel}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <StatusChip tone={item.reviewStatus === "REVIEWED" ? "good" : "warn"}>
                            {item.reviewStatus === "REVIEWED" ? "Signed" : "Awaiting review"}
                          </StatusChip>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/analysis/${item.caseId}`}
                              className="btn-quiet !py-1 !px-2 text-[11px]"
                            >
                              Workstation
                            </Link>
                            <Link
                              href={`/cases/${item.caseId}`}
                              className="btn-quiet !py-1 !px-2 text-[11px]"
                            >
                              Case Record
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
        /* Patient History View */
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          {/* Patient Directory */}
          <div className="panel p-3.5 space-y-3">
            <span className="eyebrow text-[10px]">Patient Directory</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={13} />
              <input
                className="input-field !pl-7 !py-1 text-xs"
                placeholder="Search patient…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredPatients.map((p) => (
                <button
                  key={p.patientId}
                  type="button"
                  onClick={() => setSelectedPatientId(p.patientId)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs ${
                    selectedPatientId === p.patientId
                      ? "border-primary bg-primary/10 font-bold"
                      : "border-border/70 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">{p.patientName}</span>
                    <span className="mono text-[10px] text-muted-foreground">{p.patientId}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {p.age}y · {p.gender} · {p.cases.length} episodes
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Patient History */}
          {activePatient && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="panel p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <span className="eyebrow text-[10px]">Patient Record · {activePatient.patientId}</span>
                    <h2 className="text-lg font-bold text-foreground mt-0.5">
                      {activePatient.patientName}
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded">
                    {activePatient.cases.length} Screening Sessions
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Age / Sex</span>
                    <strong className="text-foreground">{activePatient.age}y · {activePatient.gender}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Contact Phone</span>
                    <strong className="text-foreground">{activePatient.phone || "9845012345"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Diabetes</span>
                    <strong className="text-foreground">{activePatient.diabetesType || "Type 2"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Latest DR Result</span>
                    <strong className="text-foreground">
                      Grade {activePatient.cases[0]?.aiGrade ?? 0} ({activePatient.cases[0]?.aiLabel ?? "No DR"})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Longitudinal Episodes */}
              <div className="panel p-5 space-y-4">
                <span className="eyebrow text-[10px]">Screening History & Timeline</span>
                <div className="space-y-3">
                  {activePatient.cases.map((c: any) => (
                    <div key={c.caseId} className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                            {c.caseId}
                          </span>
                          <span className="font-semibold text-foreground">
                            {c.eye} Eye · {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <StatusChip tone={c.referable ? "danger" : "good"}>
                          Grade {c.aiGrade}: {c.aiLabel}
                        </StatusChip>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1">
                        <div>Quality: <strong className="text-foreground">{c.qualityStatus} ({c.qualityScore ?? 92}/100)</strong></div>
                        <div>Model confidence: <strong className="text-foreground">{Math.round(c.confidence * 100)}%</strong></div>
                        <div>Review status: <strong className="text-foreground">{c.reviewStatus === "REVIEWED" ? "Signed" : "Awaiting review"}</strong></div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <Link href={`/analysis/${c.caseId}`} className="btn-quiet !py-1 !px-2.5 text-[11px]">
                          Workstation
                        </Link>
                        <Link href={`/cases/${c.caseId}`} className="btn-quiet !py-1 !px-2.5 text-[11px]">
                          Case Record
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