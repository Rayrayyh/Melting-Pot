// Class-code helpers shared by server and client code.

export const CLASS_CODE_LENGTH = 6;

export function normalizeClassCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CLASS_CODE_LENGTH);
}
