class AppError(Exception):
    def __init__(
        self,
        detail: str,
        code: str,
        status_code: int = 400,
        payload: dict | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.payload = payload or {}


def error_payload(detail: str, code: str, **extra: object) -> dict[str, object]:
    body: dict[str, object] = {"detail": detail, "code": code}
    body.update({key: value for key, value in extra.items() if value is not None})
    return body

