import base64
import io
from typing import Tuple, List
from PIL import Image, ImageDraw

from config import config
from models import Coordinate, ImageMetadata
from services.logging_service import logging_service

class ImageUtils:
    """Simplified utility functions for image processing without OpenCV dependencies."""
    
    @staticmethod
    def allowed_file(filename: str) -> bool:
        """Check if file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS
    
    @staticmethod
    def validate_image_size(image_data: bytes) -> bool:
        """Validate image size doesn't exceed maximum."""
        return len(image_data) <= config.MAX_FILE_SIZE
    
    @staticmethod
    def decode_base64_image(base64_string: str) -> Image.Image:
        """Decode base64 image string to PIL Image."""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_data = base64.b64decode(base64_string)
            if not ImageUtils.validate_image_size(image_data):
                raise ValueError("Image size exceeds maximum limit")
            
            image = Image.open(io.BytesIO(image_data))
            return image.convert('RGB')
            
        except Exception as e:
            logging_service.log_error("Image decoding", str(e))
            raise ValueError(f"Failed to decode image: {str(e)}")
    
    @staticmethod
    def encode_image_to_base64(image: Image.Image) -> str:
        """Encode PIL Image to base64 string."""
        try:
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            buffer.seek(0)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception as e:
            logging_service.log_error("Image encoding", str(e))
            raise ValueError(f"Failed to encode image: {str(e)}")
    
    @staticmethod
    def get_image_metadata(image: Image.Image, file_size: int = None) -> ImageMetadata:
        """Extract basic metadata from PIL Image."""
        try:
            return ImageMetadata(
                width=image.width,
                height=image.height,
                format=image.format or 'Unknown',
                mode=image.mode,
                file_size=file_size or 0
            )
        except Exception as e:
            logging_service.log_error("Image metadata extraction", str(e))
            raise ValueError(f"Failed to extract metadata: {str(e)}")
    
    @staticmethod
    def create_mask_from_coordinates(image_size: Tuple[int, int], coordinates: List[Coordinate]) -> Image.Image:
        """Create a binary mask from polygon coordinates for object removal.
        
        Creates a mask image where:
        - White (RGB: 255, 255, 255) represents areas to be removed
        - Black (RGB: 0, 0, 0) represents areas to keep
        """
        try:
            width, height = image_size
            # Create RGB mask (required for Replicate API)
            mask = Image.new('RGB', (width, height), (0, 0, 0))  # Black background
            draw = ImageDraw.Draw(mask)
            
            # Convert coordinates to tuples
            coord_points = [(coord.x, coord.y) for coord in coordinates]
            
            if len(coord_points) >= 3:
                # Draw filled polygon in white (area to remove)
                draw.polygon(coord_points, fill=(255, 255, 255))
            
            return mask
            
        except Exception as e:
            logging_service.log_error("Mask creation", str(e))
            # Return black mask on error (nothing will be removed)
            return Image.new('RGB', image_size, (0, 0, 0))

    @staticmethod
    def create_mask_base64_from_coordinates(image_size: Tuple[int, int], coordinates: List[Coordinate]) -> str:
        """Create a binary mask from coordinates and return as base64 string."""
        try:
            mask = ImageUtils.create_mask_from_coordinates(image_size, coordinates)
            return ImageUtils.encode_image_to_base64(mask)
        except Exception as e:
            logging_service.log_error("Mask base64 creation", str(e))
            raise ValueError(f"Failed to create mask: {str(e)}")

# Export singleton instance
image_utils = ImageUtils() 