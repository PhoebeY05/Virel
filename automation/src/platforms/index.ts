import { BrowserManager } from "../browser/browserManager";
import { AccountSetup, PlatformAdapter } from "../types/platform";
import { FacebookAdapter } from "./facebook";
import { InstagramAdapter } from "./instagram";
import { LinkedinAdapter } from "./linkedin";
import { ProductHuntAdapter } from "./producthunt";
import { RedditAdapter } from "./reddit";
import { TelegramAdapter } from "./telegram";
import { TikTokAdapter } from "./tiktok";
import { XAdapter } from "./x";
import { XiaohongshuAdapter } from "./xiaohongshu";

export function createPlatformAdapter(setup: AccountSetup, browserManager: BrowserManager): PlatformAdapter {
  switch (setup.platform) {
    case "instagram":
      return new InstagramAdapter(setup, browserManager);
    case "facebook":
      return new FacebookAdapter(setup, browserManager);
    case "x":
      return new XAdapter(setup, browserManager);
    case "reddit":
      return new RedditAdapter(setup, browserManager);
    case "telegram":
      return new TelegramAdapter(setup, browserManager);
    case "linkedin":
      return new LinkedinAdapter(setup, browserManager);
    case "tiktok":
      return new TikTokAdapter(setup, browserManager);
    case "xiaohongshu":
      return new XiaohongshuAdapter(setup, browserManager);
    case "producthunt":
      return new ProductHuntAdapter(setup, browserManager);
  }
}
