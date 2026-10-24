import type { CompanyState, GameEvent } from "./engine";

export type AuditSeverity = "low" | "medium" | "high" | "critical";

export type AuditFinding = {
  id: string;
  title: string;
  description: string;
  severity: AuditSeverity;
  evidence: string;
  recommendation: string;
  metric: number;
};

export type AuditReport = {
  round: number;
  overallRisk: number;
  summary: string;
  findings: AuditFinding[];
  eventCount: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getSeverity(
  value: number,
  medium: number,
  high: number,
  critical: number,
): AuditSeverity {
  if (value >= critical) return "critical";
  if (value >= high) return "high";
  if (value >= medium) return "medium";
  return "low";
}

export function calculateAuditRisk(company: CompanyState): number {
  const maintenanceRisk = company.maintenanceBacklog * 0.35;
  const supplierRisk = (100 - company.supplierTrust) * 0.25;
  const moraleRisk = (100 - company.employeeMorale) * 0.15;
  const operationalRisk = company.operationalRisk * 0.25;

  return Math.round(
    clamp(
      maintenanceRisk +
        supplierRisk +
        moraleRisk +
        operationalRisk,
    ),
  );
}

export function runAudit(
  company: CompanyState,
  events: GameEvent[] = [],
): AuditReport {
  const findings: AuditFinding[] = [];

  // 1. Maintenance and reliability
  if (company.maintenanceBacklog >= 25) {
    findings.push({
      id: "maintenance-backlog",
      title: "Deferred maintenance exposure",
      description:
        "Maintenance deferrals are accumulating. Current expense reductions may be masking future repair costs and business interruption.",
      severity: getSeverity(
        company.maintenanceBacklog,
        25,
        40,
        60,
      ),
      evidence:
        `Maintenance backlog is ${company.maintenanceBacklog}/100.`,
      recommendation:
        "Review deferred maintenance, estimate overdue repair costs, and restore critical maintenance spending.",
      metric: company.maintenanceBacklog,
    });
  }

  // 2. Supplier payment and relationship risk
  const supplierRisk = 100 - company.supplierTrust;

  if (supplierRisk >= 25) {
    findings.push({
      id: "supplier-trust",
      title: "Supplier relationship deterioration",
      description:
        "Reduced supplier trust can lead to stricter payment terms, delayed deliveries, or disrupted operations.",
      severity: getSeverity(supplierRisk, 25, 45, 70),
      evidence:
        `Supplier trust is ${company.supplierTrust}/100.`,
      recommendation:
        "Review payment schedules, resolve overdue obligations, and assess dependency on critical suppliers.",
      metric: supplierRisk,
    });
  }

  // 3. Workforce resilience
  const moraleRisk = 100 - company.employeeMorale;

  if (moraleRisk >= 25) {
    findings.push({
      id: "employee-morale",
      title: "Workforce resilience concern",
      description:
        "Declining employee morale may indicate pressure on productivity, retention, and execution quality.",
      severity: getSeverity(moraleRisk, 25, 45, 70),
      evidence:
        `Employee morale is ${company.employeeMorale}/100.`,
      recommendation:
        "Review workforce pressure, retention risks, and whether cost reductions are undermining execution.",
      metric: moraleRisk,
    });
  }

  // 4. Operational risk
  if (company.operationalRisk >= 30) {
    findings.push({
      id: "operational-risk",
      title: "Elevated operational exposure",
      description:
        "Operational vulnerabilities may threaten business continuity even when current reported profit appears healthy.",
      severity: getSeverity(
        company.operationalRisk,
        30,
        45,
        70,
      ),
      evidence:
        `Operational risk is ${company.operationalRisk}/100.`,
      recommendation:
        "Identify the main sources of operational risk and prioritize controls that prevent service interruptions.",
      metric: company.operationalRisk,
    });
  }

  // 5. Debt and liquidity
  const debtToCash =
    company.cash > 0
      ? company.debt / company.cash
      : company.debt > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  if (company.cash <= 2_000_000 || debtToCash >= 5) {
    findings.push({
      id: "liquidity-and-debt",
      title: "Liquidity and debt pressure",
      description:
        "Low cash reserves or debt that is large relative to available cash can limit the company's ability to absorb shocks.",
      severity:
        company.cash <= 0 || debtToCash >= 10
          ? "critical"
          : company.cash <= 1_000_000 || debtToCash >= 7
            ? "high"
            : "medium",
      evidence:
        `Cash: ₹${company.cash.toLocaleString("en-IN")}; debt: ₹${company.debt.toLocaleString("en-IN")}.`,
      recommendation:
        "Forecast near-term cash requirements, review debt repayment obligations, and preserve adequate liquidity.",
      metric: company.cash <= 0
        ? 100
        : clamp((debtToCash / 10) * 100),
    });
  }

  // 6. Event-based evidence
  const maintenanceEvents = events.filter((event) =>
    `${event.title} ${event.description}`
      .toLowerCase()
      .includes("maintenance"),
  );

  if (
    maintenanceEvents.length > 0 &&
    company.maintenanceBacklog >= 25
  ) {
    findings.push({
      id: "maintenance-decision-history",
      title: "Evidence of repeated maintenance decisions",
      description:
        "Recorded maintenance-related events coincide with an elevated backlog. Review whether short-term savings are creating longer-term liabilities.",
      severity: getSeverity(
        company.maintenanceBacklog,
        25,
        40,
        60,
      ),
      evidence:
        `${maintenanceEvents.length} maintenance-related event(s) recorded.`,
      recommendation:
        "Compare cumulative maintenance savings against the cost and probability of future disruptions.",
      metric: company.maintenanceBacklog,
    });
  }

  const overallRisk = calculateAuditRisk(company);

  findings.sort((a, b) => {
    const severityOrder: Record<AuditSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;

  const highCount = findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  let summary = "No major warning signals detected by the current audit rules.";

  if (criticalCount > 0) {
    summary =
      `${criticalCount} critical finding(s) require immediate investigation.`;
  } else if (highCount > 0) {
    summary =
      `${highCount} high-severity finding(s) require further investigation.`;
  } else if (findings.length > 0) {
    summary =
      `${findings.length} finding(s) identified for monitoring and review.`;
  }

  return {
    round: company.round,
    overallRisk,
    summary,
    findings,
    eventCount: events.length,
  };
}