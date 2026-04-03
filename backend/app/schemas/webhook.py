import ipaddress
import socket
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


def _is_blocked_ip(addr: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address is private, loopback, link-local, or reserved."""
    return addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved


def _validate_webhook_url(url: str) -> str:
    """Validate webhook URL to prevent SSRF attacks including DNS rebinding."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only http and https URLs are allowed")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must have a valid hostname")
    blocked_hosts = {
        "localhost", "0.0.0.0", "[::1]",
        "metadata.google.internal",
        "169.254.169.254",   # AWS/GCP metadata
        "100.100.100.200",   # Alibaba Cloud metadata
    }
    if hostname.lower() in blocked_hosts:
        raise ValueError("URL points to a blocked host")
    # Check if hostname is a literal IP
    try:
        addr = ipaddress.ip_address(hostname.strip("[]"))
        if _is_blocked_ip(addr):
            raise ValueError("URL must not point to a private or reserved IP address")
    except ValueError as e:
        if "private" in str(e) or "must not" in str(e) or "blocked" in str(e):
            raise
        # hostname is not an IP — resolve via DNS and check resolved addresses
        try:
            addrinfo = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            for family, _, _, _, sockaddr in addrinfo:
                resolved_ip = ipaddress.ip_address(sockaddr[0])
                if _is_blocked_ip(resolved_ip):
                    raise ValueError(
                        f"URL hostname resolves to a blocked IP address ({sockaddr[0]})"
                    )
        except socket.gaierror:
            pass  # DNS resolution failed — allow; dispatch will fail at runtime
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
