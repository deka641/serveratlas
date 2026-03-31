import ipaddress
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


def _validate_webhook_url(url: str) -> str:
    """Validate webhook URL to prevent SSRF attacks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must have a valid hostname")
    blocked_hosts = {"localhost", "0.0.0.0", "[::1]", "metadata.google.internal"}
    if hostname.lower() in blocked_hosts:
        raise ValueError("URL points to a blocked host")
    try:
        addr = ipaddress.ip_address(hostname.strip("[]"))
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            raise ValueError("URL must not point to a private or reserved IP address")
    except ValueError as e:
        if "private" in str(e) or "must not" in str(e) or "blocked" in str(e):
            raise
        # hostname is not an IP — that's fine
    return url


class WebhookBase(BaseModel):
    name: str = Field(..., max_length=255)
    url: str = Field(..., max_length=2048)
    events: str = Field(..., max_length=500)
    is_active: bool = True
    secret: str | None = Field(None, max_length=255)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return _validate_webhook_url(v)


class WebhookCreate(WebhookBase):
    pass


class WebhookUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    url: str | None = Field(None, max_length=2048)
    events: str | None = Field(None, max_length=500)
    is_active: bool | None = None
    secret: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_webhook_url(v)
        return v


class WebhookRead(WebhookBase):
    id: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
