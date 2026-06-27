import { Page } from "playwright";
import { UserVerificationRequiredError } from "../utils/errors";

const verificationPatterns = [
  /captcha/i,
  /verify/i,
  /verification/i,
  /security check/i,
  /phone/i,
  /email code/i,
  /confirmation code/i,
  /unusual activity/i
];

export async function detectVerification(page: Page): Promise<string | undefined> {
  const bodyText = await page.locator("body").innerText({ timeout: 3_000 }).catch(() => "");
  const match = verificationPatterns.find((pattern) => pattern.test(bodyText));
  return match ? match.source : undefined;
}

export async function throwIfVerificationRequired(page: Page): Promise<void> {
  const reason = await detectVerification(page);
  if (reason) {
    throw new UserVerificationRequiredError(`Verification checkpoint detected (${reason}).`);
  }
}
