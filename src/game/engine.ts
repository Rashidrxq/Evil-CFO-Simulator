export type CompanyState = {
  round: number;
  revenue: number;
  operatingExpenses: number;
  cash: number;
  debt: number;
  maintenanceBacklog: number;
  supplierTrust: number;
  employeeMorale: number;
  operationalRisk: number;
};

export type CFOAction =
  | "cut_maintenance"
  | "delay_suppliers"
  | "borrow_money"
  | "invest_efficiency";

export type GameEvent = {
  title: string;
  description: string;
  category?: string;
  round?: number;
};

export const initialCompany: CompanyState = {
  round: 1,
  revenue: 10_000_000,
  operatingExpenses: 8_000_000,
  cash: 5_000_000,
  debt: 20_000_000,
  maintenanceBacklog: 10,
  supplierTrust: 80,
  employeeMorale: 75,
  operationalRisk: 20,
};

export const actionDetails: Record<
  CFOAction,
  { title: string; description: string }
> = {
  cut_maintenance: {
    title: "Cut maintenance",
    description: "Reduce expenses now but increase maintenance risk.",
  },
  delay_suppliers: {
    title: "Delay supplier payments",
    description: "Preserve cash while reducing supplier trust.",
  },
  borrow_money: {
    title: "Borrow more money",
    description: "Increase cash and outstanding debt.",
  },
  invest_efficiency: {
    title: "Invest in efficiency",
    description: "Spend cash to reduce expenses and improve resilience.",
  },
};

export function calculateOperatingProfit(
  company: CompanyState,
): number {
  return company.revenue - company.operatingExpenses;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function applyCFOAction(
  company: CompanyState,
  action: CFOAction,
): { company: CompanyState; events: GameEvent[] } {
  const next: CompanyState = {
    ...company,
    round: company.round + 1,
  };

  const events: GameEvent[] = [];

  switch (action) {
    case "cut_maintenance":
      next.operatingExpenses = Math.max(
        0,
        next.operatingExpenses - 1_000_000,
      );
      next.cash += 1_000_000;
      next.maintenanceBacklog = clamp(
        next.maintenanceBacklog + 15,
      );
      next.operationalRisk = clamp(next.operationalRisk + 12);

      events.push({
        title: "Maintenance budget reduced",
        description:
          "Expenses decreased by ₹1M, but maintenance backlog and operational risk increased.",
        category: "risk",
        round: next.round,
      });
      break;

    case "delay_suppliers":
      next.cash += 2_000_000;
      next.supplierTrust = clamp(next.supplierTrust - 15);
      next.operationalRisk = clamp(next.operationalRisk + 5);

      events.push({
        title: "Supplier payments delayed",
        description:
          "Cash increased by ₹2M, but supplier trust declined.",
        category: "supplier",
        round: next.round,
      });
      break;

    case "borrow_money":
      next.cash += 10_000_000;
      next.debt += 10_000_000;

      events.push({
        title: "Additional borrowing secured",
        description:
          "Cash and outstanding debt both increased by ₹10M.",
        category: "finance",
        round: next.round,
      });
      break;

    case "invest_efficiency":
      if (next.cash < 5_000_000) {
        return {
          company,
          events: [
            {
              title: "Investment rejected",
              description:
                "Insufficient cash to fund the ₹5M efficiency investment.",
              category: "warning",
              round: company.round,
            },
          ],
        };
      }

      next.cash -= 5_000_000;
      next.operatingExpenses = Math.max(
        0,
        next.operatingExpenses - 500_000,
      );
      next.employeeMorale = clamp(next.employeeMorale + 5);
      next.operationalRisk = clamp(next.operationalRisk - 5);

      events.push({
        title: "Efficiency investment completed",
        description:
          "Cash decreased by ₹5M, expenses fell by ₹0.5M, and operational resilience improved.",
        category: "investment",
        round: next.round,
      });
      break;
  }

  if (next.maintenanceBacklog >= 40) {
    next.revenue = Math.max(0, next.revenue - 2_000_000);
    next.operatingExpenses += 500_000;
    next.operationalRisk = clamp(next.operationalRisk + 5);

    events.push({
      title: "Deferred maintenance consequences",
      description:
        "Accumulated maintenance issues reduced revenue by ₹2M and increased expenses by ₹0.5M.",
      category: "risk",
      round: next.round,
    });
  }

  return { company: next, events };
}