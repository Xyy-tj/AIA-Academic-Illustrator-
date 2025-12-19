from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List, Dict
import base64
import json
import io
import os
import httpx
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import datetime, timedelta
import google.generativeai as genai
from openai import OpenAI, AsyncOpenAI
from sqlmodel import Session, select

from database import create_db_and_tables, get_session, engine
from models import User, UserCreate, UserRead, UserUpdate, Token, SystemSettings, GenerationHistory, EmailVerification, PaymentOrder, ReferenceImage, SchemaTemplate
from auth import (
    authenticate_user, 
    create_access_token, 
    get_current_active_user, 
    get_current_admin_user, 
    get_password_hash, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# PDF to Image conversion
try:
    import fitz  # PyMuPDF
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("Warning: PyMuPDF not installed. PDF conversion disabled.")

from prompts_config import (
    ARCHITECT_PROMPT_TEMPLATE,
    RENDERER_PROMPT_TEMPLATE,
    RENDERER_WITH_REFERENCES_TEMPLATE
)

app = FastAPI(title="Academic Illustrator Agent API")

def init_admin_user():
    try:
        with Session(engine) as session:
            user = session.exec(select(User).where(User.username == "admin")).first()
            if not user:
                print("Creating default admin user...")
                hashed_password = get_password_hash("123456")
                user = User(
                    username="admin",
                    hashed_password=hashed_password,
                    email="admin@example.com",
                    email_verified=True,
                    is_admin=True,
                    quota=999
                )
                session.add(user)
                session.commit()
                print("Default admin user created.")
    except Exception as e:
        print(f"Error creating default admin user: {e}")

# Initialize Database on Startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    init_admin_user()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", 
    "http://127.0.0.1:3000", 
    "http://localhost:3001", 
    "http://127.0.0.1:3001", 
    "http://124.223.167.54:3000", 
    "http://124.223.167.54:3001", 
    "http://aia.zyfan.zone", 
    "https://aia.zyfan.zone"],
    allow_origin_regex=r"https://.*\.zyfan\.zone",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated files from logs directory
_logs_dir = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(_logs_dir, exist_ok=True)
app.mount("/logs", StaticFiles(directory=_logs_dir), name="logs")

# --- Auth Routes ---

class SendEmailCodeRequest(BaseModel):
    email: str


@app.post("/auth/send-email-code")
def send_email_code(payload: SendEmailCodeRequest, session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    if not (settings.smtp_host and settings.smtp_port and settings.smtp_user and settings.smtp_password):
        raise HTTPException(status_code=500, detail="SMTP settings are not configured")

    import random
    code = f"{random.randint(100000, 999999)}"
    expires = datetime.utcnow() + timedelta(minutes=10)

    ver = EmailVerification(email=payload.email, code=code, expires_at=expires)
    session.add(ver)
    session.commit()

    msg = MIMEText(f"您的验证码是：{code}，10分钟内有效。\nIf you did not request this, please ignore.", "plain", "utf-8")
    sender = settings.smtp_from or settings.smtp_user
    msg["From"] = formataddr(("AIA", sender))
    msg["To"] = payload.email
    msg["Subject"] = "邮箱验证验证码"

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(sender, [payload.email], msg.as_string())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"detail": "Verification code sent"}


@app.post("/auth/register", response_model=UserRead)
def register(user: UserCreate, session: Session = Depends(get_session)):
    if not user.email or not user.code:
        raise HTTPException(status_code=400, detail="Email and code are required")

    # Check existing username/email
    if session.exec(select(User).where(User.username == user.username)).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if session.exec(select(User).where(User.email == user.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Verify code
    ver = session.exec(
        select(EmailVerification)
        .where(EmailVerification.email == user.email)
        .order_by(EmailVerification.id.desc())
    ).first()
    if not ver or ver.code != user.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if ver.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code expired")

    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password, email=user.email, email_verified=True)
    session.add(db_user)
    # Clean up verification record
    try:
        session.delete(ver)
    except Exception:
        pass
    session.commit()
    session.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

# --- Admin Routes ---

@app.get("/admin/users", response_model=List[UserRead])
async def read_users(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    users = session.exec(select(User).offset(skip).limit(limit)).all()
    return users

@app.put("/admin/users/{user_id}/quota", response_model=UserRead)
async def update_user_quota(
    user_id: int, 
    quota: int, 
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.quota = quota
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def convert_pdf_to_images(pdf_base64: str, dpi: int = 150) -> List[str]:
    """
    Convert PDF pages to PNG images (base64 encoded).
    Returns a list of base64 data URLs for each page.
    """
    if not PDF_SUPPORT:
        print("PDF conversion not available - PyMuPDF not installed")
        return []
    
    try:
        # Remove data URL prefix if present
        if "," in pdf_base64:
            pdf_base64 = pdf_base64.split(",")[1]
        
        # Decode base64 to bytes
        pdf_bytes = base64.b64decode(pdf_base64)
        
        # Open PDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            # Render page to image
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PNG bytes
            img_bytes = pix.tobytes("png")
            
            # Encode to base64
            img_base64 = base64.b64encode(img_bytes).decode("utf-8")
            images.append(f"data:image/png;base64,{img_base64}")
            
            print(f"Converted PDF page {page_num + 1}/{len(doc)} to PNG")
        
        doc.close()
        return images
    
    except Exception as e:
        print(f"Error converting PDF: {str(e)}")
        return []


class GenerateSchemaRequest(BaseModel):
    paper_content: str
    input_images: Optional[List[str]] = None  # Base64 encoded PDF pages or images
    session_id: Optional[str] = None
    chart_language: Optional[str] = None  # 'zh' or 'en'


class RenderImageRequest(BaseModel):
    visual_schema: str
    reference_images: Optional[List[str]] = None  # Base64 encoded images
    session_id: Optional[str] = None
    chart_language: Optional[str] = None  # 'zh' or 'en'


def is_gemini_endpoint(url: str) -> bool:
    """Check if the URL is a Google/Gemini endpoint"""
    return "googleapis" in url or "generativelanguage" in url or "google" in url


def create_openai_client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_url if base_url else None)


def create_async_openai_client(base_url: str, api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key, base_url=base_url if base_url else None)


def get_or_create_settings(session: Session) -> SystemSettings:
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings()
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings



@app.post("/api/generate-schema")
async def generate_schema(
    request: GenerateSchemaRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """
    Step 1: The Architect
    Generates a Visual Schema from paper content using a logic model.
    Supports text input, PDF pages, or images.
    Consumes 1 quota unit.
    """
    # Check quota
    if current_user.quota <= 0:
        raise HTTPException(
            status_code=402,
            detail="Insufficient quota. Please contact administrator to top up."
        )

    try:
        settings = get_or_create_settings(session)
        if not settings.logic_api_key or not settings.logic_model_name or not settings.logic_base_url:
            raise HTTPException(status_code=500, detail="System settings for logic model are not configured")
        
        # session id
        from uuid import uuid4
        session_id = request.session_id or str(uuid4())
        # chart language mapping
        lang_code = (request.chart_language or 'zh').lower()
        lang_cn = '中文' if lang_code == 'zh' else '英文'
        lang_en = 'Chinese' if lang_code == 'zh' else 'English'
        prompt = ARCHITECT_PROMPT_TEMPLATE.format(
            paper_content=request.paper_content,
            language_name_cn=lang_cn
        )
        
        if is_gemini_endpoint(settings.logic_base_url):
            # Use Gemini SDK with multimodal support
            genai.configure(api_key=settings.logic_api_key)
            model = genai.GenerativeModel(settings.logic_model_name)
            
            # Build content parts for multimodal input
            content_parts = []
            
            # Add input images/PDFs if provided
            if request.input_images:
                for img_base64 in request.input_images:
                    # Remove data URL prefix if present
                    if "," in img_base64:
                        mime_type = "image/png"
                        if "pdf" in img_base64.split(",")[0]:
                            mime_type = "application/pdf"
                        elif "jpeg" in img_base64.split(",")[0] or "jpg" in img_base64.split(",")[0]:
                            mime_type = "image/jpeg"
                        img_base64 = img_base64.split(",")[1]
                    else:
                        mime_type = "image/png"
                    
                    content_parts.append({
                        "mime_type": mime_type,
                        "data": img_base64
                    })
            
            content_parts.append(prompt)
            
            response = await model.generate_content_async(content_parts)
            schema = response.text
        else:
            client = create_async_openai_client(settings.logic_base_url, settings.logic_api_key)
            
            # Build messages based on whether images are provided
            if request.input_images and len(request.input_images) > 0:
                # Multimodal format with images (OpenAI Vision API format)
                content = []
                for idx, img_base64 in enumerate(request.input_images):
                    # Parse the data URL to get MIME type
                    if img_base64.startswith("data:"):
                        # Extract MIME type from data URL
                        mime_part = img_base64.split(";")[0]  # e.g., "data:image/png"
                        mime_type = mime_part.replace("data:", "")
                        print(f"Image {idx + 1} MIME type: {mime_type}")
                        
                        # Handle PDF: convert to images
                        if "pdf" in mime_type.lower():
                            print(f"Converting PDF {idx + 1} to images...")
                            pdf_images = convert_pdf_to_images(img_base64)
                            for page_idx, page_img in enumerate(pdf_images):
                                content.append({
                                    "type": "image_url",
                                    "image_url": {"url": page_img}
                                })
                                print(f"Added PDF page {page_idx + 1} as image")
                            continue
                        
                        image_url = img_base64
                    else:
                        # Add default prefix (assume PNG)
                        image_url = f"data:image/png;base64,{img_base64}"
                        print(f"Image {idx + 1}: No MIME type, defaulting to image/png")
                    
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": image_url}
                    })
                
                # If all images were filtered out (e.g., all PDFs), use text-only mode
                if len(content) == 0:
                    print("No valid images after filtering, using text-only mode")
                    messages = [{"role": "user", "content": prompt}]
                else:
                    # Add text prompt after images
                    content.append({
                        "type": "text",
                        "text": prompt
                    })
                    messages = [{"role": "user", "content": content}]
            else:
                # Simple text format (for text-only models)
                messages = [{"role": "user", "content": prompt}]
            
            print(f"Calling OpenAI-compatible API: {settings.logic_base_url}")
            print(f"Model: {settings.logic_model_name}")
            print(f"Has images: {bool(request.input_images)}")
            
            response = await client.chat.completions.create(
                model=settings.logic_model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=4096
            )
            schema = response.choices[0].message.content

        # Deduct quota on success
        current_user.quota -= 1
        session.add(current_user)
        session.commit()
        
        # Save history
        try:
            history = GenerationHistory(
                user_id=current_user.id,
                session_id=session_id,
                step="schema",
                input_summary=(request.paper_content[:500] if request.paper_content else None),
                schema_text=schema,
            )
            session.add(history)
            session.commit()
        except Exception as e:
            print(f"Failed to save schema history: {str(e)}")

        return {"schema": schema, "session_id": session_id}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in generate_schema: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Schema generation failed: {str(e)}")


@app.post("/api/render-image")
async def render_image(
    request: RenderImageRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
    req: Request = None,
):
    """
    Step 3: The Renderer
    Renders an academic diagram from the Visual Schema using OpenAI-compatible API.
    
    Logs the response content and saves the generated image to 'backend/logs'.
    Consumes 1 quota unit.
    """
    import traceback
    
    print(f"[{datetime.now()}] [render_image] Request received from user: {current_user.username} (ID: {current_user.id})")
    print(f"[{datetime.now()}] [render_image] Session ID: {request.session_id}")
    
    # Check quota
    if current_user.quota <= 0:
        print(f"[{datetime.now()}] [render_image] Insufficient quota for user {current_user.username}")
        raise HTTPException(
            status_code=402,
            detail="Insufficient quota. Please contact administrator to top up."
        )

    try:
        settings = get_or_create_settings(session)
        if not settings.vision_api_key or not settings.vision_model_name or not settings.vision_base_url:
            print(f"[{datetime.now()}] [render_image] Missing vision API settings")
            raise HTTPException(status_code=500, detail="System settings for vision model are not configured")
        
        print(f"[{datetime.now()}] [render_image] Settings loaded. Model: {settings.vision_model_name}, URL: {settings.vision_base_url}")
        
        from uuid import uuid4
        session_id = request.session_id or str(uuid4())
        
        # Validate schema format
        if "---BEGIN PROMPT---" not in request.visual_schema or "---END PROMPT---" not in request.visual_schema:
            print(f"[{datetime.now()}] [render_image] Invalid schema format provided")
            raise HTTPException(
                status_code=400, 
                detail="Invalid Schema Format: Please preserve the BEGIN/END tags."
            )
        
        # Choose template based on whether reference images are provided
        if request.reference_images and len(request.reference_images) > 0:
            print(f"[{datetime.now()}] [render_image] Using RENDERER_WITH_REFERENCES_TEMPLATE. Ref images count: {len(request.reference_images)}")
            prompt = RENDERER_WITH_REFERENCES_TEMPLATE.format(
                visual_schema_content=request.visual_schema,
                language_name_en=('Chinese' if (request.chart_language or 'zh').lower() == 'zh' else 'English')
            )
        else:
            print(f"[{datetime.now()}] [render_image] Using RENDERER_PROMPT_TEMPLATE")
            prompt = RENDERER_PROMPT_TEMPLATE.format(
                visual_schema_content=request.visual_schema,
                language_name_en=('Chinese' if (request.chart_language or 'zh').lower() == 'zh' else 'English')
            )
        
        client = create_async_openai_client(settings.vision_base_url, settings.vision_api_key)
        
        # Build messages
        content = []
        
        # Add reference images if provided
        if request.reference_images and len(request.reference_images) > 0:
            for idx, img_base64 in enumerate(request.reference_images):
                if img_base64.startswith("data:"):
                    image_url = img_base64
                else:
                    image_url = f"data:image/png;base64,{img_base64}"
                content.append({
                    "type": "image_url",
                    "image_url": {"url": image_url}
                })
                print(f"[{datetime.now()}] [render_image] Added reference image {idx + 1}")
        
        # Add text prompt
        content.append({
            "type": "text",
            "text": prompt
        })
        
        messages = [{"role": "user", "content": content}]
        
        print(f"[{datetime.now()}] [render_image] Calling Vision API...")
        
        try:
            response = await client.chat.completions.create(
                model=settings.vision_model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=4096
            )
            print(f"[{datetime.now()}] [render_image] Vision API call successful")
        except Exception as api_err:
            print(f"[{datetime.now()}] [render_image] Vision API call failed: {str(api_err)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Vision API Error: {str(api_err)}")
        
        # Parse response - check for image in response
        result_content = response.choices[0].message.content
        print(f"[{datetime.now()}] [render_image] Response content length: {len(result_content) if result_content else 0}")
        
        # Save log and image
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = os.path.join(os.path.dirname(__file__), "logs")
            os.makedirs(log_dir, exist_ok=True)
            
            # Save raw content
            log_file = os.path.join(log_dir, f"render_{timestamp}.txt")
            with open(log_file, "w", encoding="utf-8") as f:
                f.write(result_content if result_content else "")
            print(f"[{datetime.now()}] [render_image] Saved render log to {log_file}")
        except Exception as e:
            print(f"[{datetime.now()}] [render_image] Failed to save render log: {str(e)}")
        
        # Try to extract image from response (if model returns base64 image or URL)
        image_url = None
        if result_content:
            # Check if response contains base64 image data
            import re
            # Look for base64 image pattern
            base64_pattern = r'data:image/[^;]+;base64,[A-Za-z0-9+/=]+'
            matches = re.findall(base64_pattern, result_content)
            
            if matches:
                image_url = matches[0]
                print(f"[{datetime.now()}] [render_image] Found base64 image in response")
            
            # Check for raw base64 (without data URL prefix)
            elif len(result_content) > 1000 and result_content.replace('\n', '').replace(' ', '').isalnum():
                # Likely raw base64 image
                image_url = f"data:image/png;base64,{result_content.strip()}"
                print(f"[{datetime.now()}] [render_image] Found raw base64 content")
            
            # Check for Markdown image links or HTTPS URLs
            if not image_url:
                # Markdown image pattern: ![alt](url)
                markdown_pattern = r'!\[.*?\]\((https?://.*?)\)'
                md_matches = re.findall(markdown_pattern, result_content)
                if md_matches:
                    image_url = md_matches[0]
                    print(f"[{datetime.now()}] [render_image] Found Markdown image URL: {image_url}")
                else:
                    # Check for standalone URLs ending with image extensions
                    url_pattern = r'(https?://[^\s)]+\.(?:png|jpg|jpeg|webp|gif))'
                    url_matches = re.findall(url_pattern, result_content)
                    if url_matches:
                        image_url = url_matches[0]
                        print(f"[{datetime.now()}] [render_image] Found standalone image URL: {image_url}")
                
            if image_url:
                # Save image to log
                try:
                    # Ensure log directory and timestamp exist (in case previous logging failed)
                    if 'log_dir' not in locals():
                        log_dir = os.path.join(os.path.dirname(__file__), "logs")
                    if 'timestamp' not in locals():
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        
                    if not os.path.exists(log_dir):
                        os.makedirs(log_dir, exist_ok=True)
                        
                    img_file = os.path.join(log_dir, f"render_{timestamp}.png")
                    
                    if image_url.startswith("data:"):
                        # Handle Base64
                        img_data = image_url.split(",")[1]
                        img_bytes = base64.b64decode(img_data)
                        with open(img_file, "wb") as f:
                            f.write(img_bytes)
                        print(f"[{datetime.now()}] [render_image] Saved render image to {img_file}")
                    elif image_url.startswith("http"):
                        # Handle URL - Download it
                        print(f"[{datetime.now()}] [render_image] Downloading image from {image_url}...")
                        async with httpx.AsyncClient() as client:
                             resp = await client.get(image_url, timeout=30.0)
                             if resp.status_code == 200:
                                 with open(img_file, "wb") as f:
                                     f.write(resp.content)
                                 print(f"[{datetime.now()}] [render_image] Saved render image to {img_file}")
                             else:
                                 print(f"[{datetime.now()}] [render_image] Failed to download image. Status: {resp.status_code}")
                    # Replace external/base64 URL with backend-served file URL
                    try:
                        image_url = f"/logs/{os.path.basename(img_file)}"
                    except Exception:
                        image_url = f"/logs/{os.path.basename(img_file)}"
                except Exception as e:
                    print(f"[{datetime.now()}] [render_image] Failed to save render image: {str(e)}")
        else:
            print(f"[{datetime.now()}] [render_image] Warning: Empty response content")

        # Deduct quota on success
        current_user.quota -= 1
        session.add(current_user)
        session.commit()
        print(f"[{datetime.now()}] [render_image] Quota deducted. Remaining: {current_user.quota}")
        
        # Save/Update history
        try:
            if session_id:
                hist = session.exec(select(GenerationHistory).where(GenerationHistory.session_id == session_id)).first()
            else:
                hist = None
            if hist:
                hist.image_url = image_url
                hist.updated_at = datetime.utcnow()
                hist.step = "image"
                session.add(hist)
                session.commit()
            else:
                history = GenerationHistory(
                    user_id=current_user.id,
                    session_id=session_id or "",
                    step="image",
                    input_summary=(request.visual_schema[:500] if request.visual_schema else None),
                    schema_text=None,
                    image_url=image_url,
                )
                session.add(history)
                session.commit()
            print(f"[{datetime.now()}] [render_image] History saved/updated")
        except Exception as e:
            print(f"[{datetime.now()}] [render_image] Failed to save image history: {str(e)}")
        
        # If no image found, return text response
        return {"imageUrl": image_url, "text": result_content}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[{datetime.now()}] [render_image] CRITICAL ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Image rendering failed: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Academic Illustrator Agent"}


# --- Admin: System Settings & History ---

class SettingsUpdate(BaseModel):
    logic_base_url: Optional[str] = None
    logic_api_key: Optional[str] = None
    logic_model_name: Optional[str] = None
    vision_base_url: Optional[str] = None
    vision_api_key: Optional[str] = None
    vision_model_name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_tls: Optional[bool] = None
    smtp_from: Optional[str] = None
    epay_api_url: Optional[str] = None
    epay_pid: Optional[str] = None
    epay_key: Optional[str] = None
    epay_return_url: Optional[str] = None
    epay_notify_url: Optional[str] = None
    pay_provider: Optional[str] = None
    hupi_appid: Optional[str] = None
    hupi_appsecret: Optional[str] = None
    hupi_return_url: Optional[str] = None
    hupi_notify_url: Optional[str] = None
    hupi_callback_url: Optional[str] = None
    recharge_ratio: Optional[int] = None
    site_logo: Optional[str] = None
    site_favicon: Optional[str] = None
    footer_text: Optional[str] = None
    announcement_enabled: Optional[bool] = None
    announcement_title: Optional[str] = None
    announcement_body: Optional[str] = None
    announcement_last_updated: Optional[datetime] = None


@app.get("/admin/settings")
async def get_settings(current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    return settings


@app.put("/admin/settings")
async def update_settings(payload: SettingsUpdate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    settings.updated_at = datetime.utcnow()
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings

# Public subset of settings for frontend consumption without auth
@app.get("/api/public/settings")
async def get_public_settings(session: Session = Depends(get_session)):
    s = get_or_create_settings(session)
    return {
        "site_logo": s.site_logo,
        "site_favicon": s.site_favicon,
        "footer_text": s.footer_text,
        "announcement_enabled": s.announcement_enabled,
        "announcement_title": s.announcement_title,
        "announcement_body": s.announcement_body,
        "announcement_last_updated": s.announcement_last_updated,
        "updated_at": s.updated_at,
    }


class AdminUserCreate(BaseModel):
    username: str
    email: Optional[str] = None


@app.post("/admin/users", response_model=UserRead)
def admin_create_user(payload: AdminUserCreate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    # Check if username exists
    if session.exec(select(User).where(User.username == payload.username)).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists (only if provided)
    if payload.email and session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="Email already exists")
        
    hashed_password = get_password_hash("123456")
    db_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed_password,
        email_verified=True, # Admin created users are verified
        quota=2 # Default quota
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


# --- Library: Reference Images & Templates ---

class ReferenceImageCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_data: str
    tags: Optional[List[str]] = None
    order: Optional[int] = 0

class ReferenceImageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_data: Optional[str] = None
    tags: Optional[List[str]] = None
    order: Optional[int] = None

class SchemaTemplateCreate(BaseModel):
    title: str
    layout: Optional[str] = None
    content: str
    order: Optional[int] = 0

class SchemaTemplateUpdate(BaseModel):
    title: Optional[str] = None
    layout: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None


@app.get("/api/library/references")
async def list_references(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    items = session.exec(select(ReferenceImage).order_by(ReferenceImage.order, ReferenceImage.id)).all()
    def parse_tags(s: Optional[str]) -> Optional[List[str]]:
        if not s:
            return None
        try:
            return json.loads(s)
        except:
            return [t.strip() for t in s.split(",") if t.strip()]
    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_data": item.image_data,
            "tags": parse_tags(item.tags),
            "order": item.order,
        }
        for item in items
    ]

@app.get("/api/library/templates")
async def list_templates(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    items = session.exec(select(SchemaTemplate).order_by(SchemaTemplate.order, SchemaTemplate.id)).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "layout": item.layout,
            "content": item.content,
            "order": item.order,
        }
        for item in items
    ]

# Admin CRUD
@app.post("/admin/library/references")
async def create_reference(payload: ReferenceImageCreate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    item = ReferenceImage(
        title=payload.title,
        description=payload.description,
        image_data=payload.image_data,
        tags=json.dumps(payload.tags) if payload.tags else None,
        order=payload.order or 0,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.put("/admin/library/references/{item_id}")
async def update_reference(item_id: int, payload: ReferenceImageUpdate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    item = session.get(ReferenceImage, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reference not found")
    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    if payload.image_data is not None:
        item.image_data = payload.image_data
    if payload.tags is not None:
        item.tags = json.dumps(payload.tags) if payload.tags else None
    if payload.order is not None:
        item.order = payload.order
    session.add(item)
    session.commit()
    session.refresh(item)
    return item

@app.delete("/admin/library/references/{item_id}")
async def delete_reference(item_id: int, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    item = session.get(ReferenceImage, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reference not found")
    session.delete(item)
    session.commit()
    return {"ok": True}

@app.post("/admin/library/templates")
async def create_template(payload: SchemaTemplateCreate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    tpl = SchemaTemplate(
        title=payload.title,
        layout=payload.layout,
        content=payload.content,
        order=payload.order or 0,
    )
    session.add(tpl)
    session.commit()
    session.refresh(tpl)
    return tpl

@app.put("/admin/library/templates/{tpl_id}")
async def update_template(tpl_id: int, payload: SchemaTemplateUpdate, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    tpl = session.get(SchemaTemplate, tpl_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.title is not None:
        tpl.title = payload.title
    if payload.layout is not None:
        tpl.layout = payload.layout
    if payload.content is not None:
        tpl.content = payload.content
    if payload.order is not None:
        tpl.order = payload.order
    session.add(tpl)
    session.commit()
    session.refresh(tpl)
    return tpl

@app.delete("/admin/library/templates/{tpl_id}")
async def delete_template(tpl_id: int, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    tpl = session.get(SchemaTemplate, tpl_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    session.delete(tpl)
    session.commit()
    return {"ok": True}


class HistoryFlow(BaseModel):
    session_id: str
    user_id: int
    username: str
    created_at: datetime
    updated_at: datetime
    input_summary: Optional[str] = None
    schema_text: Optional[str] = None
    image_url: Optional[str] = None


@app.get("/admin/history", response_model=List[HistoryFlow])
async def get_history(skip: int = 0, limit: int = 100, user_id: Optional[int] = None, current_user: User = Depends(get_current_admin_user), session: Session = Depends(get_session)):
    statement = select(GenerationHistory)
    if user_id:
        statement = statement.where(GenerationHistory.user_id == user_id)
    # Fetch all then aggregate by session
    rows = session.exec(statement).all()
    flows: dict[str, HistoryFlow] = {}
    for r in rows:
        # Fetch username
        u = session.get(User, r.user_id)
        username = u.username if u else str(r.user_id)
        if not r.session_id:
            # Treat as standalone flow keyed by id
            key = f"legacy-{r.id}"
        else:
            key = r.session_id
        if key not in flows:
            flows[key] = HistoryFlow(
                session_id=r.session_id or key,
                user_id=r.user_id,
                username=username,
                created_at=r.created_at,
                updated_at=r.updated_at or r.created_at,
                input_summary=r.input_summary,
                schema_text=r.schema_text,
                image_url=r.image_url,
            )
        else:
            f = flows[key]
            # earliest created_at, latest updated_at
            if r.created_at < f.created_at:
                f.created_at = r.created_at
            if (r.updated_at or r.created_at) > f.updated_at:
                f.updated_at = r.updated_at or r.created_at
            # prefer non-empty fields
            if not f.input_summary and r.input_summary:
                f.input_summary = r.input_summary
            if not f.schema_text and r.schema_text:
                f.schema_text = r.schema_text
            if not f.image_url and r.image_url:
                f.image_url = r.image_url
    # order by updated_at desc and apply skip/limit
    ordered = sorted(flows.values(), key=lambda x: x.updated_at, reverse=True)
    return ordered[skip: skip + limit]


@app.get("/api/history/me", response_model=List[HistoryFlow])
async def get_my_history(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    rows = session.exec(select(GenerationHistory).where(GenerationHistory.user_id == current_user.id)).all()
    flows: dict[str, HistoryFlow] = {}
    for r in rows:
        username = current_user.username
        key = r.session_id if r.session_id else f"legacy-{r.id}"
        if key not in flows:
            flows[key] = HistoryFlow(
                session_id=r.session_id or key,
                user_id=r.user_id,
                username=username,
                created_at=r.created_at,
                updated_at=r.updated_at or r.created_at,
                input_summary=r.input_summary,
                schema_text=r.schema_text,
                image_url=r.image_url,
            )
        else:
            f = flows[key]
            if r.created_at < f.created_at:
                f.created_at = r.created_at
            if (r.updated_at or r.created_at) > f.updated_at:
                f.updated_at = r.updated_at or r.created_at
            if not f.input_summary and r.input_summary:
                f.input_summary = r.input_summary
            if not f.schema_text and r.schema_text:
                f.schema_text = r.schema_text
            if not f.image_url and r.image_url:
                f.image_url = r.image_url
    ordered = sorted(flows.values(), key=lambda x: x.updated_at, reverse=True)
    return ordered[skip: skip + limit]


# --- Recharge (Payment) ---

class CreateRechargeRequest(BaseModel):
    amount: float
    pay_type: str = "alipay"  # or "wxpay"


def _md5_sign(params: Dict[str, str], key: str) -> str:
    items = sorted((k, v) for k, v in params.items() if v is not None and v != "" and k not in {"sign", "sign_type"})
    query = "&".join([f"{k}={v}" for k, v in items])
    import hashlib
    return hashlib.md5((query + key).encode("utf-8")).hexdigest()


def _hupi_sign(params: Dict[str, str], appsecret: str) -> str:
    items = sorted((k, v) for k, v in params.items())
    from urllib.parse import urlencode, unquote_plus
    base = unquote_plus(urlencode(items)) + appsecret
    import hashlib
    return hashlib.md5(base.encode("utf-8")).hexdigest()


@app.post("/api/pay/create")
async def create_recharge(payload: CreateRechargeRequest, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    settings = get_or_create_settings(session)
    out_trade_no = f"R{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{current_user.id}"
    order = PaymentOrder(out_trade_no=out_trade_no, user_id=current_user.id, amount=payload.amount, pay_type=payload.pay_type)
    session.add(order)
    session.commit()

    provider = (settings.pay_provider or "epay").lower()
    if provider == "hupi":
        # Validate Hupi settings
        if not (settings.hupi_appid and settings.hupi_appsecret and settings.hupi_notify_url and settings.hupi_return_url):
            raise HTTPException(status_code=500, detail="Hupi settings are not configured")
        # Map front-end pay types to Hupi payment identifiers
        payment_map = {"wxpay": "wechat", "alipay": "alipay"}
        payment = payment_map.get(payload.pay_type, "alipay")
        data: Dict[str, str] = {
            "version": "1.1",
            "lang": "zh-cn",
            "plugins": "AIA",
            "appid": settings.hupi_appid,
            "trade_order_id": out_trade_no,
            "payment": payment,
            "is_app": "Y",
            "total_fee": f"{payload.amount:.2f}",
            "title": "账户额度充值",
            "description": "",
            "time": str(int(datetime.utcnow().timestamp())),
            "notify_url": settings.hupi_notify_url,
            "return_url": settings.hupi_return_url,
            "callback_url": settings.hupi_callback_url or settings.hupi_return_url,
            "nonce_str": str(int(datetime.utcnow().timestamp())),
        }
        data["hash"] = _hupi_sign(data, settings.hupi_appsecret)
        import requests  # using requests for server-to-server call
        headers = {"Referer": settings.hupi_callback_url or settings.hupi_return_url or "http://localhost:8000"}
        r = requests.post("https://api.xunhupay.com/payment/do.html", data=data, headers=headers)
        try:
            resp = r.json()
        except Exception:
            raise HTTPException(status_code=500, detail=f"Hupi create failed: {r.text[:200]}")
        pay_url = resp.get("url") or resp.get("url_qrcode")
        if not pay_url:
            err = resp.get("errmsg") or "unknown error"
            raise HTTPException(status_code=500, detail=f"Hupi error: {err}")
        return {"pay_url": pay_url, "out_trade_no": out_trade_no}
    else:
        # Default to EPay
        if not (settings.epay_api_url and settings.epay_pid and settings.epay_key and settings.epay_notify_url and settings.epay_return_url):
            raise HTTPException(status_code=500, detail="支付信息尚未完成配置，请尝试联系管理员增加额度")
        params = {
            "pid": settings.epay_pid,
            "type": payload.pay_type,
            "out_trade_no": out_trade_no,
            "notify_url": settings.epay_notify_url,
            "return_url": settings.epay_return_url,
            "name": "账户额度充值",
            "money": f"{payload.amount:.2f}",
            "sitename": "AIA",
            "sign_type": "MD5",
        }
        params["sign"] = _md5_sign(params, settings.epay_key)
        from urllib.parse import urlencode
        query = urlencode(params)
        pay_url = settings.epay_api_url.rstrip("/") + "/submit.php?" + query
        return {"pay_url": pay_url, "out_trade_no": out_trade_no}


@app.api_route("/api/pay/notify", methods=["GET", "POST"])
async def epay_notify(request: Request, session: Session = Depends(get_session)):
    # Parse params from GET or POST
    params: Dict[str, str] = {}
    if request.method == "POST":
        form = await request.form()
        params = {k: str(v) for k, v in form.items()}
    else:
        qs = dict(request.query_params)
        params = {k: str(v) for k, v in qs.items()}

    sign = params.get("sign", "")
    sign_type = params.get("sign_type", "MD5")
    out_trade_no = params.get("out_trade_no")
    trade_status = params.get("trade_status")
    trade_no = params.get("trade_no")

    settings = session.get(SystemSettings, 1) or SystemSettings()
    if not settings.epay_key:
        return "fail"
    calc = _md5_sign(params, settings.epay_key)
    if sign_type != "MD5" or calc != sign or not out_trade_no:
        return "fail"

    order = session.exec(select(PaymentOrder).where(PaymentOrder.out_trade_no == out_trade_no)).first()
    if not order:
        return "fail"
    if trade_status and trade_status.upper() in {"TRADE_SUCCESS", "SUCCESS"}:
        if order.status != "paid":
            order.status = "paid"
            order.paid_at = datetime.utcnow()
            user = session.get(User, order.user_id)
            if user:
                # Increase quota based on ratio
                inc = int(round(order.amount * (settings.recharge_ratio or 1)))
                user.quota += inc
                session.add(user)
            session.add(order)
            session.commit()
        return "success"
    return "fail"


@app.api_route("/api/pay/hupi/notify", methods=["GET", "POST"])
async def hupi_notify(request: Request, session: Session = Depends(get_session)):
    params: Dict[str, str] = {}
    if request.method == "POST":
        form = await request.form()
        params = {k: str(v) for k, v in form.items()}
    else:
        qs = dict(request.query_params)
        params = {k: str(v) for k, v in qs.items()}

    provided_hash = params.get("hash", "")
    appid = params.get("appid")
    trade_order_id = params.get("trade_order_id")
    status = params.get("status")

    settings = session.get(SystemSettings, 1) or SystemSettings()
    if not (settings.hupi_appsecret and settings.hupi_appid and appid == settings.hupi_appid):
        return "fail"
    # Compute sign excluding 'hash'
    verify_params = {k: v for k, v in params.items() if k != "hash"}
    calc = _hupi_sign(verify_params, settings.hupi_appsecret)
    if calc != provided_hash or not trade_order_id:
        return "fail"

    order = session.exec(select(PaymentOrder).where(PaymentOrder.out_trade_no == trade_order_id)).first()
    if not order:
        return "fail"
    if status and status.upper() == "OD":
        if order.status != "paid":
            order.status = "paid"
            order.paid_at = datetime.utcnow()
            user = session.get(User, order.user_id)
            if user:
                inc = int(round(order.amount * (settings.recharge_ratio or 1)))
                user.quota += inc
                session.add(user)
            session.add(order)
            session.commit()
        return "success"
    return "fail"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
