function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getDisplayPositioning(positioning: string | null | undefined) {
  if (typeof positioning !== "string") {
    return "";
  }

  const sanitizedPositioning = normalizeWhitespace(positioning)
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .trim();

  return sanitizedPositioning;
}
