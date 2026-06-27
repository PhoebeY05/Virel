from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class PlatformInfo:
    name: str
    slug: str
    writing_style: str
    requires_human_verification: bool
    phone_required: str
    automation_level: str
    notes: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


SUPPORTED_PLATFORMS: list[PlatformInfo] = [
    PlatformInfo(
        name="Instagram",
        slug="instagram",
        writing_style="Visual, punchy, social-first, and brand-forward.",
        requires_human_verification=True,
        phone_required="optional",
        automation_level="assisted",
        notes="Assisted form filling only; keep verification manual.",
    ),
    PlatformInfo(
        name="LinkedIn",
        slug="linkedin",
        writing_style="Professional, value-driven, and founder-friendly.",
        requires_human_verification=True,
        phone_required="often",
        automation_level="guidance-only",
        notes="Best used for guidance and draft preparation.",
    ),
    PlatformInfo(
        name="X",
        slug="x",
        writing_style="Concise, high-signal, and conversation-oriented.",
        requires_human_verification=True,
        phone_required="often",
        automation_level="assisted",
        notes="Assisted only; keep anti-bot and CAPTCHA steps manual.",
    ),
    PlatformInfo(
        name="Reddit",
        slug="reddit",
        writing_style="Helpful, authentic, community-first, and non-promotional.",
        requires_human_verification=True,
        phone_required="rare",
        automation_level="partially-assisted",
        notes="Optimise for authenticity rather than marketing speak.",
    ),
    PlatformInfo(
        name="TikTok",
        slug="tiktok",
        writing_style="Short-form, energetic, trend-aware, and creator-like.",
        requires_human_verification=True,
        phone_required="frequent",
        automation_level="assisted",
        notes="Use for content drafting and setup guidance only.",
    ),
    PlatformInfo(
        name="Facebook",
        slug="facebook",
        writing_style="Clear, community-oriented, and accessible.",
        requires_human_verification=True,
        phone_required="optional",
        automation_level="assisted",
        notes="Assisted setup only.",
    ),
    PlatformInfo(
        name="Xiaohongshu",
        slug="xiaohongshu",
        writing_style="Lifestyle-driven, descriptive, and polished.",
        requires_human_verification=True,
        phone_required="required",
        automation_level="guidance-only",
        notes="Regional verification limits automation.",
    ),
    PlatformInfo(
        name="Product Hunt",
        slug="product_hunt",
        writing_style="Launch-focused, concise, and benefit-led.",
        requires_human_verification=False,
        phone_required="rare",
        automation_level="assisted",
        notes="Useful for launch-day messaging and product framing.",
    ),
    PlatformInfo(
        name="Hacker News",
        slug="hacker_news",
        writing_style="Technical, honest, and discussion-friendly.",
        requires_human_verification=False,
        phone_required="rare",
        automation_level="guidance-only",
        notes="Prioritise transparency and signal over promotion.",
    ),
    PlatformInfo(
        name="Discord",
        slug="discord",
        writing_style="Friendly, conversational, and community-building.",
        requires_human_verification=False,
        phone_required="rare",
        automation_level="assisted",
        notes="Useful for community ops and private launch coordination.",
    ),
]


SUPPORTED_PLATFORM_MAP = {platform.slug: platform for platform in SUPPORTED_PLATFORMS}


def platform_names() -> list[str]:
    return [platform.slug for platform in SUPPORTED_PLATFORMS]

