type PositioningInput = {
  coreCapabilities: string[];
  extensionCapabilities?: string[];
  industries: string[];
  services: string[];
};

function normalizeSignal(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatContexts(industries: string[]) {
  const contexts = dedupe(industries).slice(0, 2);

  if (contexts.length === 0) {
    return "multiple contexts";
  }

  if (contexts.length === 1) {
    return contexts[0];
  }

  return `${contexts[0]} and ${contexts[1]}`;
}

function inferBuildTarget(
  capabilities: string[],
  industries: string[],
  extensionCapability?: string,
) {
  const primaryIndustry = industries[0];

  if (primaryIndustry) {
    if (primaryIndustry.toLocaleLowerCase("en-US").includes("real estate")) {
      return "real estate ventures";
    }

    return `${primaryIndustry} initiatives`;
  }

  if (extensionCapability) {
    return `${extensionCapability} work`;
  }

  const primaryCapability = normalizeSignal(capabilities[0] ?? "");

  if (primaryCapability.includes("research")) {
    return "market-ready decisions";
  }

  if (primaryCapability.includes("model")) {
    return "commercial systems";
  }

  return "high-value work";
}

function pickMechanisms(coreCapabilities: string[], extensionCapabilities: string[], services: string[]) {
  const orderedSignals = dedupe([
    ...coreCapabilities,
    ...extensionCapabilities,
    ...services,
  ]).filter(Boolean);

  const firstMechanism = orderedSignals[0] ?? "";
  const secondMechanism = orderedSignals[1] ?? extensionCapabilities[0] ?? services[0] ?? "";

  if (!firstMechanism && !secondMechanism) {
    return {
      primary: "",
      secondary: "",
    };
  }

  if (!secondMechanism || secondMechanism === firstMechanism) {
    return {
      primary: firstMechanism,
      secondary: "",
    };
  }

  return {
    primary: firstMechanism,
    secondary: secondMechanism,
  };
}

function generatePositioningFromText(rawText: string) {
  const normalizedText = normalizeWhitespace(rawText);

  if (!normalizedText) {
    return "";
  }

  const firstSentence = normalizedText.match(/^(.+?[.!?])(?:\s|$)/u)?.[1];

  return normalizeWhitespace(firstSentence ?? normalizedText);
}

export function generatePositioning(input: PositioningInput | string) {
  if (typeof input === "string") {
    return generatePositioningFromText(input);
  }

  const {
    coreCapabilities,
    extensionCapabilities = [],
    industries,
    services,
  } = input;
  const normalizedCoreCapabilities = dedupe(coreCapabilities).slice(0, 2);
  const normalizedExtensionCapabilities = dedupe(extensionCapabilities).slice(0, 1);
  const normalizedIndustries = dedupe(industries).slice(0, 2);
  const normalizedServices = dedupe(services).slice(0, 2);

  if (normalizedCoreCapabilities.length === 0) {
    return "";
  }

  const buildTarget = inferBuildTarget(
    normalizedCoreCapabilities,
    normalizedIndustries,
    normalizedExtensionCapabilities[0],
  );
  const contexts = formatContexts(normalizedIndustries);
  const mechanisms = pickMechanisms(
    normalizedCoreCapabilities,
    normalizedExtensionCapabilities,
    normalizedServices,
  );

  if (!mechanisms.primary) {
    return "";
  }

  if (mechanisms.secondary) {
    return `Designs and builds ${buildTarget} by combining ${mechanisms.primary} and ${mechanisms.secondary} across ${contexts}.`;
  }

  return `Designs and builds ${buildTarget} through ${mechanisms.primary} across ${contexts}.`;
}
