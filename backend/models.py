from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime
from sqlalchemy import TEXT

class UserBase(SQLModel):
    username: str = Field(index=True, unique=True)
    is_admin: bool = False
    quota: int = 2
    email: Optional[str] = Field(default=None, index=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Use Pydantic BaseModel for non-table models if SQLModel version has issues or keep SQLModel
# SQLModel inherits from Pydantic BaseModel, so this is fine.
class UserCreate(SQLModel):
    username: str
    password: str
    email: str
    code: str

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
    # SMTP settings
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_tls: bool = True
    smtp_from: Optional[str] = None
    # EPay settings
    epay_api_url: Optional[str] = None
    epay_pid: Optional[str] = None
    epay_key: Optional[str] = None
    epay_return_url: Optional[str] = None
    epay_notify_url: Optional[str] = None
    # Active payment provider: 'epay' or 'hupi'
    pay_provider: str = "epay"
    # Hupi (XunhuPay) settings
    hupi_appid: Optional[str] = None
    hupi_appsecret: Optional[str] = None
    hupi_return_url: Optional[str] = None
    hupi_notify_url: Optional[str] = None
    hupi_callback_url: Optional[str] = None
    recharge_ratio: int = 1  # quota units per 1 currency unit
    site_logo: Optional[str] = None
    site_favicon: Optional[str] = None
    site_name: str = "Academic Illustrator"
    # Site footer declaration
    footer_text: Optional[str] = None
    # Site announcement
    announcement_enabled: bool = False
    announcement_title: Optional[str] = None
    announcement_body: Optional[str] = None
    announcement_image_url: Optional[str] = None
    announcement_last_updated: Optional[datetime] = None
    # Aliyun Image Enhancement
    aliyun_access_key_id: Optional[str] = None
    aliyun_access_key_secret: Optional[str] = None
    aliyun_endpoint: str = "imageenhan.cn-shanghai.aliyuncs.com"
    # Storage settings
    storage_type: str = Field(default="local")  # 'local' or 'cos'
    cos_secret_id: Optional[str] = None
    cos_secret_key: Optional[str] = None
    cos_region: Optional[str] = None
    cos_bucket: Optional[str] = None
    cos_path_prefix: str = ""
    # Quota Costs
    cost_schema_generation: int = 1
    cost_image_rendering: int = 1
    cost_extraction: int = 1
    cost_translation: int = 1
    cost_super_resolution: int = 1
    cost_ppt_generation: int = 2
    initial_quota: int = 2
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RedemptionCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    type: str  # 'once' or 'repeat'
    quota: int
    max_uses: int = 1
    used_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RedemptionLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    code_id: int = Field(index=True)
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)


class GenerationHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    session_id: str = Field(index=True)
    step: str  # 'schema' | 'image'
    input_summary: Optional[str] = Field(default=None, sa_type=TEXT)
    schema_text: Optional[str] = Field(default=None, sa_type=TEXT)
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EmailVerification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    code: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentOrder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    out_trade_no: str = Field(index=True)
    user_id: int
    amount: float
    pay_type: str
    name: str = "充值额度"
    status: str = "pending"  # pending, paid, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None


class ReferenceImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    image_data: str = Field(sa_type=TEXT) # data URL or base64
    tags: Optional[str] = None  # comma-separated or JSON
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SchemaTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    layout: Optional[str] = None
    content: str
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PromptConfig(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str = Field(sa_type=TEXT)
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PPTStyle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    prompt_suffix: str = Field(sa_type=TEXT)  # The style-specific prompt part
    preview_image_url: Optional[str] = None
    is_active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HelpGuide(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)  # e.g., 'ppt_export', 'architect_export'
    title: str
    images: str = Field(sa_type=TEXT, default="[]")  # JSON list of image URLs
    updated_at: datetime = Field(default_factory=datetime.utcnow)
