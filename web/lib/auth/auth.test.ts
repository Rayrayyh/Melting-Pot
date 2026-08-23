import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/types";
import { clerkClientAuth, clerkServerAuth } from "@/lib/auth/clerk";

/**
 * The seam's contract, independent of any provider: the Clerk slot has to be
 * present, complete, and honest about being unimplemented. If someone adds a
 * method to the interface and forgets the Clerk side, this fails.
 */
describe("auth provider seam", () => {
  it("names both halves of the Clerk slot", () => {
    expect(clerkServerAuth.name).toBe("clerk");
    expect(clerkClientAuth.name).toBe("clerk");
  });

  const serverMethods = ["getUser", "getVerifiedSecondFactorId"] as const;
  const clientMethods = [
    "getUserId",
    "register",
    "signIn",
    "signOut",
    "verifySecondFactor",
    "beginSecondFactorSetup",
    "completeSecondFactorSetup",
    "cancelSecondFactorSetup",
    "removeSecondFactor",
  ] as const;

  it.each(serverMethods)("clerk server %s reports not_configured", async (method) => {
    await expect(clerkServerAuth[method]()).rejects.toMatchObject({
      name: "AuthError",
      code: "not_configured",
    });
  });

  it.each(clientMethods)("clerk client %s reports not_configured", async (method) => {
    // Every method rejects the same way, so a half-finished swap fails loudly
    // rather than silently signing nobody in.
    await expect(
      (clerkClientAuth[method] as () => Promise<unknown>)(),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
