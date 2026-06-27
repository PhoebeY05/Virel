import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function waitForUserConfirmation(message: string): Promise<void> {
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(`${message}\nPress Enter when ready to continue... `);
  } finally {
    rl.close();
  }
}
