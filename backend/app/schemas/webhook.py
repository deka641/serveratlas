from pydantic import BaseModel, Field


class WebhookBase(BaseModel):
    name: str = Field(..., max_length=255)
    url: str = Field(..., max_length=2048)
    events: str = Field(..., max_length=500)
    is_active: bool = True
    secret: str | None = Field(None, max_length=255)


class WebhookCreate(WebhookBase):
    pass


class WebhookUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    url: str | None = Field(None, max_length=2048)
    events: str | None = Field(None, max_length=500)
    is_active: bool | None = None
    secret: str | None = None


class WebhookRead(WebhookBase):
    id: int
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
