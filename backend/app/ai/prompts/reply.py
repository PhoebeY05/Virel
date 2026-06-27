def build_reply_prompt(project_description: str, post_content: str, comment: str, tone: str, platform: str) -> str:
    return (
        f"Project description: {project_description}\n"
        f"Original post: {post_content}\n"
        f"Comment: {comment}\n"
        f"Platform tone: {platform}\n"
        f"Reply tone: {tone}\n"
        "Return JSON with a concise, natural reply_text."
    )

