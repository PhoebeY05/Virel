import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import {
  Account,
  AccountSchema,
  AutomationSession,
  AutomationSessionSchema,
  Campaign,
  CampaignPost,
  CampaignPostSchema,
  CampaignSchema,
  Project,
  ProjectSchema,
  UserSettings,
  UserSettingsSchema
} from "../types/backend";
import { AutomationStatus } from "../types/platform";

export class BackendClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: env.BACKEND_BASE_URL,
      timeout: 15_000,
      headers: env.AUTOMATION_API_KEY
        ? { Authorization: `Bearer ${env.AUTOMATION_API_KEY}` }
        : undefined
    });
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await this.http.get(`/projects/${projectId}`);
    return ProjectSchema.parse(response.data);
  }

  async getProjectAccounts(projectId: string): Promise<Account[]> {
    const response = await this.http.get(`/projects/${projectId}/accounts`);
    return AccountSchema.array().parse(response.data);
  }

  async getUserSettings(): Promise<UserSettings> {
    const response = await this.http.get("/settings");
    return UserSettingsSchema.parse(response.data);
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await this.http.get(`/campaigns/${campaignId}`);
    return CampaignSchema.parse(response.data);
  }

  async getCampaignPosts(campaignId: string): Promise<CampaignPost[]> {
    const response = await this.http.get(`/campaigns/${campaignId}/posts`);
    return CampaignPostSchema.array().parse(response.data);
  }

  async createAutomationSession(input: {
    platform: string;
    accountId?: string;
    status: AutomationStatus;
    message?: string;
  }): Promise<AutomationSession> {
    const response = await this.http.post("/automation/sessions", input);
    return AutomationSessionSchema.parse(response.data);
  }

  async updateAutomationSession(
    sessionId: string,
    input: { status: AutomationStatus; message?: string; screenshotPath?: string }
  ): Promise<void> {
    await this.http.patch(`/automation/sessions/${sessionId}`, input);
  }

  async updateAccount(accountId: string, input: { status?: string; sessionPath?: string; message?: string }): Promise<void> {
    await this.http.patch(`/accounts/${accountId}`, input);
  }
}
