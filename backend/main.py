from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List
import base64
import json
import io
import os
import httpx
from datetime import datetime, timedelta
import google.generativeai as genai
from openai import OpenAI
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import User, UserCreate, UserRead, UserUpdate, Token, SystemSettings, GenerationHistory
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

# Initialize Database on Startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Routes ---

@app.post("/auth/register", response_model=UserRead)
def register(user: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where(User.username == user.username)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    session.add(db_user)
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


class RenderImageRequest(BaseModel):
    visual_schema: str
    reference_images: Optional[List[str]] = None  # Base64 encoded images
    session_id: Optional[str] = None


def is_gemini_endpoint(url: str) -> bool:
    """Check if the URL is a Google/Gemini endpoint"""
    return "googleapis" in url or "generativelanguage" in url or "google" in url


def create_openai_client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_url if base_url else None)


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
        
        prompt = ARCHITECT_PROMPT_TEMPLATE.format(paper_content=request.paper_content)
        
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
            
            response = model.generate_content(content_parts)
            schema = response.text
        else:
            client = create_openai_client(settings.logic_base_url, settings.logic_api_key)
            
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
            
            response = client.chat.completions.create(
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
    session: Session = Depends(get_session)
):
    """
    Step 3: The Renderer
    Renders an academic diagram from the Visual Schema using OpenAI-compatible API.
    
    Logs the response content and saves the generated image to 'backend/logs'.
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
        if not settings.vision_api_key or not settings.vision_model_name or not settings.vision_base_url:
            raise HTTPException(status_code=500, detail="System settings for vision model are not configured")
        
        session_id = request.session_id
        
        # Validate schema format
        if "---BEGIN PROMPT---" not in request.visual_schema or "---END PROMPT---" not in request.visual_schema:
            raise HTTPException(
                status_code=400, 
                detail="Invalid Schema Format: Please preserve the BEGIN/END tags."
            )
        
        # Choose template based on whether reference images are provided
        if request.reference_images and len(request.reference_images) > 0:
            prompt = RENDERER_WITH_REFERENCES_TEMPLATE.format(
                visual_schema_content=request.visual_schema
            )
        else:
            prompt = RENDERER_PROMPT_TEMPLATE.format(
                visual_schema_content=request.visual_schema
            )
        
        client = create_openai_client(settings.vision_base_url, settings.vision_api_key)
        
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
                print(f"Added reference image {idx + 1}")
        
        # Add text prompt
        content.append({
            "type": "text",
            "text": prompt
        })
        
        messages = [{"role": "user", "content": content}]
        
        print(f"Calling Vision API: {settings.vision_base_url}")
        print(f"Model: {settings.vision_model_name}")
        print(f"Has reference images: {bool(request.reference_images)}")
        
        response = client.chat.completions.create(
            model=settings.vision_model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=4096
        )
        
        # Parse response - check for image in response
        result_content = response.choices[0].message.content
        
        # Save log and image
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dir = os.path.join(os.path.dirname(__file__), "logs")
            os.makedirs(log_dir, exist_ok=True)
            
            # Save raw content
            log_file = os.path.join(log_dir, f"render_{timestamp}.txt")
            with open(log_file, "w", encoding="utf-8") as f:
                f.write(result_content if result_content else "")
            print(f"Saved render log to {log_file}")
        except Exception as e:
            print(f"Failed to save render log: {str(e)}")
        
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
            
            # Check for raw base64 (without data URL prefix)
            elif len(result_content) > 1000 and result_content.replace('\n', '').replace(' ', '').isalnum():
                # Likely raw base64 image
                image_url = f"data:image/png;base64,{result_content.strip()}"
            
            # Check for Markdown image links or HTTPS URLs
            if not image_url:
                # Markdown image pattern: ![alt](url)
                markdown_pattern = r'!\[.*?\]\((https?://.*?)\)'
                md_matches = re.findall(markdown_pattern, result_content)
                if md_matches:
                    image_url = md_matches[0]
                else:
                    # Check for standalone URLs ending with image extensions
                    url_pattern = r'(https?://[^\s)]+\.(?:png|jpg|jpeg|webp|gif))'
                    url_matches = re.findall(url_pattern, result_content)
                    if url_matches:
                        image_url = url_matches[0]
                
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
                        print(f"Saved render image to {img_file}")
                    elif image_url.startswith("http"):
                        # Handle URL - Download it
                        print(f"Downloading image from {image_url}...")
                        async with httpx.AsyncClient() as client:
                             resp = await client.get(image_url, timeout=30.0)
                             if resp.status_code == 200:
                                 with open(img_file, "wb") as f:
                                     f.write(resp.content)
                                 print(f"Saved render image to {img_file}")
                             else:
                                 print(f"Failed to download image. Status: {resp.status_code}")
                except Exception as e:
                    print(f"Failed to save render image: {str(e)}")
        
        # Deduct quota on success
        current_user.quota -= 1
        session.add(current_user)
        session.commit()
        
        # Save/Update history
        try:
            if session_id:
                hist = session.exec(select(GenerationHistory).where(GenerationHistory.session_id == session_id)).first()
            else:
                hist = None
            if hist:
                hist.image_url = image_url
                hist.updated_at = datetime.utcnow()
                session.add(hist)
                session.commit()
            else:
                history = GenerationHistory(
                    user_id=current_user.id,
                    session_id=session_id or "",
                    input_summary=(request.visual_schema[:500] if request.visual_schema else None),
                    schema_text=None,
                    image_url=image_url,
                )
                session.add(history)
                session.commit()
        except Exception as e:
            print(f"Failed to save image history: {str(e)}")
        
        # If no image found, return text response
        return {"imageUrl": image_url, "text": result_content}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in render_image: {str(e)}")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
