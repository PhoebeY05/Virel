def build_campaign_prompt(project_name: str, description: str, audience: str, goal: str, platforms: list[str], tone: str) -> str:
    platform_list = ", ".join(platforms)
    return (
        f"You are planning a three-phase launch campaign for {project_name}.\n"
        f"Project description: {description}\n"
        f"Target audience: {audience}\n"
        f"Campaign goal: {goal}\n"
        f"Platforms: {platform_list}\n"
        f"Tone: {tone}\n\n"
        "Follow the campaign timeline from the project brief: Pre-Launch, Launch, and Growth Loop.\n"
        "Return JSON with title, summary, tone, and exactly three days, where each day_number maps to one phase.\n"
        "Day 1 should be Pre-Launch, day 2 should be Launch, and day 3 should be Growth Loop.\n"
        "Each day should include theme, objective, and platform-specific posts with title, content, hashtags, call_to_action, and scheduled_at."
    )
