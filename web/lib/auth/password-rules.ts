/**
 * The five signup password rules, in the order the checklist shows them.
 * The server enforces exactly this list in register_student (migrations
 * 0041 and 0042), so a password that ticks every box here cannot bounce
 * there. Change one side and the other has to move with it.
 */
export type PasswordRule = {
  id: "length" | "upper" | "lower" | "digit" | "symbol";
  label: string;
  met: boolean;
};

export function passwordRules(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: "At least 8 characters",
      // Counted in code points to match Postgres char_length, so a password
      // full of emoji is measured the same on both sides.
      met: [...password].length >= 8,
    },
    { id: "upper", label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { id: "lower", label: "One lowercase letter", met: /[a-z]/.test(password) },
    { id: "digit", label: "One number", met: /[0-9]/.test(password) },
    {
      id: "symbol",
      label: "One symbol",
      // Anything that is not a letter, digit or whitespace. The Postgres
      // side says [^a-zA-Z0-9[:space:]], which is this class exactly.
      met: /[^a-zA-Z0-9\s]/.test(password),
    },
  ];
}

export function passwordMeetsRules(password: string): boolean {
  return passwordRules(password).every((rule) => rule.met);
}
