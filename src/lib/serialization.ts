function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function serializeForDisplay(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Uint8Array) {
    return bytesToHex(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForDisplay(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [
        key,
        serializeForDisplay(innerValue),
      ]),
    );
  }

  return value;
}
