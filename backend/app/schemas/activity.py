from pydantic import BaseModel


class ActivityRead(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    entity_name: str
    action: str
    changes: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
