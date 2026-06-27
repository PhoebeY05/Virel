def build_campaign_prompt(project_name: str, description: str, audience: str, goal: str, platforms: list[str], tone: str) -> str:
    platform_list = ", ".join(platforms)
    return (
        f"You are planning a 7-day launch campaign for {project_name}.\n"
        f"Project description: {description}\n"
        f"Target audience: {audience}\n"
        f"Campaign goal: {goal}\n"
        f"Platforms: {platform_list}\n"
        f"Tone: {tone}\n\n"
        "Return JSON with title, summary, tone, and seven days. "
        "Each day should include theme, objective, and platform-specific posts with title, content, hashtags, call_to_action, and scheduled_at."
    )

