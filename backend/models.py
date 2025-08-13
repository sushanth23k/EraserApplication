from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

@dataclass
class Coordinate:
    """Represents a coordinate point."""
    x: float
    y: float

@dataclass
class Region:
    """Axis-aligned rectangular region specified by top-left x,y and width,height."""
    x: int
    y: int
    width: int
    height: int

@dataclass
class ImageMetadata:
    """Represents image metadata."""
    width: int
    height: int
    format: str
    mode: str
    file_size: Optional[int] = None
    upload_time: datetime = field(default_factory=datetime.now)

@dataclass
class ProcessingRequest:
    """Represents an image processing request."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    image_data: str = ""
    coordinates: List[Coordinate] = field(default_factory=list)
    description: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[ImageMetadata] = None

@dataclass
class ProcessingResult:
    """Represents the result of image processing."""
    request_id: str
    success: bool
    processed_image: Optional[str] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    ai_analysis: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class ImageAction:
    """Represents an action performed on an image."""
    action_type: str  # 'upload', 'process', 'download'
    image_id: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    coordinates: Optional[List[Coordinate]] = None
    description: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

class ProcessingStatus:
    """Constants for processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed" 