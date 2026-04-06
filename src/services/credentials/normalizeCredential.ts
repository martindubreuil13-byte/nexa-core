export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          );
        }
      } catch {}
    }

    return [trimmed];
  }

  return [];
}
