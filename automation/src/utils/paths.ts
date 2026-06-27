import path from "node:path";

export const automationRoot = path.resolve(__dirname, "..", "..");

export function fromAutomationRoot(...parts: string[]): string {
  return path.resolve(automationRoot, ...parts);
}
