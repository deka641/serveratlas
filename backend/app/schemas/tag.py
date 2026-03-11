from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(..., max_length=100)
    color: str = Field(default="#6b7280", max_length=7)


class TagRead(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}
