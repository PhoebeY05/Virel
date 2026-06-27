export class AutomationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "AutomationError";
  }
}

export class UserVerificationRequiredError extends AutomationError {
  constructor(message = "User verification is required before automation can continue.") {
    super(message, "USER_VERIFICATION_REQUIRED");
    this.name = "UserVerificationRequiredError";
  }
}

export class SessionExpiredError extends AutomationError {
  constructor(message = "Saved session is missing or expired.") {
    super(message, "SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}
