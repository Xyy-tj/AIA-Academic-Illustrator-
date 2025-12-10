from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    is_admin: bool = False
    quota: int = 2

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Use Pydantic BaseModel for non-table models if SQLModel version has issues or keep SQLModel
# SQLModel inherits from Pydantic BaseModel, so this is fine.
class UserCreate(SQLModel):
    username: str
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime

class UserUpdate(SQLModel):
    quota: Optional[int] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    username: Optional[str] = None


class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=1, primary_key=True)
    logic_base_url: str = ""
    logic_api_key: str = ""
    logic_model_name: str = ""
    vision_base_url: str = ""
    vision_api_key: str = ""
    vision_model_name: str = ""
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GenerationHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    session_id: str = Field(index=True)
    step: str  # 'schema' | 'image'
    input_summary: Optional[str] = None
    schema_text: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
