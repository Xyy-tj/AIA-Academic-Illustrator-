import os
import uuid
from datetime import datetime
from typing import Optional
import aiofiles
import httpx
import logging
import sys
from models import SystemSettings

# Initialize logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self, settings: SystemSettings):
        self.settings = settings
        self.storage_type = settings.storage_type or "local"
        self._logs_dir = os.path.join(os.path.dirname(__file__), "logs")
        os.makedirs(self._logs_dir, exist_ok=True)

    def _get_cos_client(self):
        try:
            from qcloud_cos import CosConfig
            from qcloud_cos import CosS3Client
        except ImportError:
            raise ImportError("cos-python-sdk-v5 is not installed")

        if not all([self.settings.cos_secret_id, self.settings.cos_secret_key, self.settings.cos_region, self.settings.cos_bucket]):
             raise ValueError("COS settings are incomplete")
        
        config = CosConfig(
            Region=self.settings.cos_region, 
            SecretId=self.settings.cos_secret_id, 
            SecretKey=self.settings.cos_secret_key
        )
        return CosS3Client(config)

    def _generate_filename(self, ext: str = ".png", prefix: str = "upload") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}_{uuid.uuid4()}{ext}"

    def _get_cos_key(self, filename: str) -> str:
        prefix = self.settings.cos_path_prefix or ""
        # Normalize prefix
        prefix = prefix.strip("/")
        if prefix:
            return f"{prefix}/{filename}"
        return filename

    async def save_bytes(self, content: bytes, filename: Optional[str] = None, ext: str = ".png", prefix: str = "upload") -> str:
        """Saves bytes and returns URL"""
        if not filename:
            filename = self._generate_filename(ext, prefix)
        
        if self.storage_type == "cos":
            try:
                # COS SDK is synchronous, might block event loop. 
                # For high concurrency, consider running in executor.
                # For now, keeping it simple.
                client = self._get_cos_client()
                key = self._get_cos_key(filename)
                
                logger.info(f"Uploading to COS: {key}")
                client.put_object(
                    Bucket=self.settings.cos_bucket,
                    Body=content,
                    Key=key,
                    EnableMD5=False
                )
                
                # Return HTTPS URL
                url = f"https://{self.settings.cos_bucket}.cos.{self.settings.cos_region}.myqcloud.com/{key}"
                return url
            except Exception as e:
                logger.error(f"Failed to upload to COS: {e}")
                raise e
        else:
            # Local storage
            filepath = os.path.join(self._logs_dir, filename)
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(content)
            return f"/logs/{filename}"

    async def save_from_url(self, url: str, prefix: str = "download") -> str:
        """Downloads from URL and saves to storage"""
        
        # If it's already a local URL (starts with /logs/), just return it or re-upload if switching to COS?
        if url.startswith("/logs/") and self.storage_type == "local":
            return url

        import asyncio
        import mimetypes

        max_retries = 3
        last_exception = None

        for attempt in range(max_retries):
            try:
                # Increased timeout to 60s and added follow_redirects, added User-Agent
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                async with httpx.AsyncClient(follow_redirects=True, timeout=60.0, headers=headers) as client:
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        raise Exception(f"Failed to download image from {url}, status: {resp.status_code}")
                    
                    # Try to guess extension
                    content_type = resp.headers.get("content-type")
                    ext = mimetypes.guess_extension(content_type) or ".png"
                    
                    # Read content explicitly to ensure full download
                    content = resp.content
                    
                    return await self.save_bytes(content, ext=ext, prefix=prefix)
            
            except Exception as e:
                logger.warning(f"Attempt {attempt+1}/{max_retries} failed for {url}: {e}")
                last_exception = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))

        logger.error(f"Failed to save from URL {url} after {max_retries} attempts: {last_exception}")
        raise last_exception
