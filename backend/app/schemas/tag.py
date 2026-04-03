import re

from pydantic import BaseModel, Field, field_validator

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex_color(v: str) -> str:
    if not _HEX_COLOR_RE.match(v):
        raise ValueError("Color must be a valid hex color (e.g. #6b7280)")
    return v


class TagCreate(BaseModel):
    name: str = Field(..., max_length=100)
    color: str = Field(default="#6b7280", max_length=7)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        return _validate_hex_color(v)


class TagUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    color: str | None = Field(None, max_length=7)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is not None:
            return _validate_hex_color(v)
        return v


class TagRead(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}
