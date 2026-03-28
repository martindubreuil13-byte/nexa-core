import type { FreelancerCase } from "./getFreelancerCases";

export type SignalFrequency = {
  count: number;
  name: string;
};

export type AggregatedSignals = {
  capabilities: SignalFrequency[];
  coreCapabilities: SignalFrequency[];
  coreIndustries: SignalFrequency[];
  coreServices: SignalFrequency[];
  extensionCapabilities: SignalFrequency[];
  extensionIndustries: SignalFrequency[];
  extensionServices: SignalFrequency[];
  industries: SignalFrequency[];
  services: SignalFrequency[];
};

type SignalAlias = {
  aliases: string[];
  label: string;
};

const capabilityAliases: SignalAlias[] = [
  {
    label: "market research & analysis",
    aliases: [
      "demand analysis",
      "demographic analysis",
      "feasibility analysis",
      "gap analysis",
      "market analysis",
      "market research",
    ],
  },
  {
    label: "business modeling",
    aliases: [
      "business model",
      "business model design",
      "financial model",
      "financial modeling",
      "unit economics",
    ],
  },
];

function normalizeSignal(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalizeCapability(value: string) {
  const normalizedSignal = normalizeSignal(value);
  const signalKey = normalizedSignal.toLocaleLowerCase("en-US");

  for (const group of capabilityAliases) {
    if (group.aliases.includes(signalKey)) {
      return group.label;
    }
  }

  return normalizedSignal;
}

function buildFrequencies(
  cases: FreelancerCase[],
  selector: (freelancerCase: FreelancerCase) => string[],
  canonicalize?: (value: string) => string,
) {
  const counts = new Map<string, SignalFrequency>();

  for (const freelancerCase of cases) {
    const caseSignals = new Map<string, string>();

    for (const signal of selector(freelancerCase)) {
      const normalizedSignal = normalizeSignal(signal);

      if (!normalizedSignal) {
        continue;
      }

      const canonicalSignal = canonicalize ? canonicalize(normalizedSignal) : normalizedSignal;
      const signalKey = canonicalSignal.toLocaleLowerCase("en-US");

      if (!caseSignals.has(signalKey)) {
        caseSignals.set(signalKey, canonicalSignal);
      }
    }

    for (const [signalKey, signalName] of caseSignals.entries()) {
      const existingSignal = counts.get(signalKey);

      if (existingSignal) {
        existingSignal.count += 1;
        continue;
      }

      counts.set(signalKey, {
        count: 1,
        name: signalName,
      });
    }
  }

  return [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.name.localeCompare(right.name, "en-US", { sensitivity: "base" });
  });
}

function splitCoreAndExtensions(signals: SignalFrequency[]) {
  return {
    core: signals.filter((signal) => signal.count >= 2),
    extensions: signals.filter((signal) => signal.count === 1),
  };
}

export function aggregateSignals(cases: FreelancerCase[]): AggregatedSignals {
  const capabilities = buildFrequencies(
    cases,
    (freelancerCase) => freelancerCase.capabilities,
    canonicalizeCapability,
  );
  const industries = buildFrequencies(cases, (freelancerCase) => freelancerCase.industries);
  const services = buildFrequencies(cases, (freelancerCase) => freelancerCase.services);
  const capabilitySplit = splitCoreAndExtensions(capabilities);
  const industrySplit = splitCoreAndExtensions(industries);
  const serviceSplit = splitCoreAndExtensions(services);

  return {
    capabilities,
    coreCapabilities: capabilitySplit.core,
    extensionCapabilities: capabilitySplit.extensions,
    industries,
    coreIndustries: industrySplit.core,
    extensionIndustries: industrySplit.extensions,
    services,
    coreServices: serviceSplit.core,
    extensionServices: serviceSplit.extensions,
  };
}
