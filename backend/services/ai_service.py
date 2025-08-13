import replicate
import time
import base64
import os
from typing import List, Optional, Dict, Any, Tuple
from PIL import Image

from config import config
from models import Coordinate, Region
from services.logging_service import logging_service
from utils.image_utils import image_utils

from dotenv import load_dotenv
load_dotenv()


class AIService:
    """Service for AI-powered object removal using Replicate's bria/eraser model."""
   
    def __init__(self):
        self.api_key = os.getenv('REPLICATE_API_KEY')
        self.model = config.REPLICATE_MODEL
        # Set the API token directly on the environment
        if self.api_key:
            os.environ["REPLICATE_API_TOKEN"] = self.api_key

    def _prepare_image_for_api(self, image_base64: str) -> str:
        """Prepare image data for Replicate API - convert to data URI if needed."""
        try:
            if not image_base64.startswith(('http://', 'https://', 'data:')):
                # Convert base64 to data URI
                return f"data:image/png;base64,{image_base64}"
            return image_base64
        except Exception as e:
            logging_service.log_error("Image preparation", str(e))
            raise ValueError(f"Failed to prepare image for API: {str(e)}")

    def _create_mask_from_coordinates(self, image_size: Tuple[int, int], coordinates: List[Coordinate]) -> str:
        """Create a mask image from polygon coordinates and return as base64 data URI."""
        try:
            # Create binary mask using image utils
            mask_base64 = image_utils.create_mask_base64_from_coordinates(image_size, coordinates)
            
            # Convert to data URI for Replicate API
            return f"data:image/png;base64,{mask_base64}"
            
        except Exception as e:
            logging_service.log_error("Mask creation", str(e))
            raise ValueError(f"Failed to create mask: {str(e)}")

    def _create_mask_from_regions(self, image_size: Tuple[int, int], regions: List[Region]) -> str:
        """Create a mask image from rectangular regions and return as base64 data URI."""
        try:
            mask_base64 = image_utils.create_mask_base64_from_regions(image_size, regions)
            return f"data:image/png;base64,{mask_base64}"
        except Exception as e:
            logging_service.log_error("Mask creation from regions", str(e))
            raise ValueError(f"Failed to create mask from regions: {str(e)}")

    async def remove_object(self, image_base64: str, coordinates: Optional[List[Coordinate]] = None,
                          description: str = "",
                          num_inference_steps: int = 50,
                          guidance_scale: float = 7.5,
                          seed: Optional[int] = None,
                          regions: Optional[List[Region]] = None) -> Dict[str, Any]:
        """
        Use Replicate's zylim0702/remove-object model to remove objects from the image.
        
        Args:
            image_base64: Base64 encoded original image
            coordinates: List of polygon coordinates defining the area to remove
            description: Optional description (not used by this model but kept for compatibility)
            
        Returns:
            Dictionary with success status, processed image, and metadata
        """
        start_time = time.time()
        
        try:
            if not self.api_key:
                logging_service.log_error("Object removal", "Replicate API key not configured")
                return {
                    "success": False,
                    "error": "AI service not configured. Please set REPLICATE_API_KEY.",
                    "processing_time": 0
                }
            
            # Decode original image to get dimensions
            original_image = image_utils.decode_base64_image(image_base64)
            image_size = (original_image.width, original_image.height)
            
            # Prepare original image for API
            input_image = self._prepare_image_for_api(image_base64)
            
            # Create mask: prefer regions if provided, else coordinates
            if regions and len(regions) > 0:
                mask_image = self._create_mask_from_regions(image_size, regions)
                mask_source = f"{len(regions)} regions"
            else:
                if not coordinates or len(coordinates) < 3:
                    return {
                        "success": False,
                        "error": "Insufficient coordinates to create mask",
                        "processing_time": 0
                    }
                mask_image = self._create_mask_from_coordinates(image_size, coordinates)
                mask_source = f"{len(coordinates)} coordinate points"
            
            # Prepare input for Replicate API (bria/eraser)
            input_data = {
                "image": input_image,
                "mask": mask_image,
                "prompt": description or None,
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "seed": seed,
            }
            
            logging_service.log_info(f"Starting Replicate object removal with mask-based approach using {mask_source}")
            
            # Create a new Replicate client with the API token
            client = replicate.Client(api_token=self.api_key)
            
            # Run the object removal model
            output = client.run(self.model, input=input_data)
            
            processing_time = time.time() - start_time
            
            if not output:
                return {
                    "success": False,
                    "error": "No output received from Replicate API",
                    "processing_time": processing_time
                }
            
            # Handle different output formats
            processed_image_url = None
            if isinstance(output, str):
                processed_image_url = output
            elif isinstance(output, list) and len(output) > 0:
                processed_image_url = output[0]
            elif isinstance(output, dict):
                # Try common keys for output image
                processed_image_url = output.get("output") or output.get("image") or output.get("result")
            
            if not processed_image_url:
                return {
                    "success": False,
                    "error": "Invalid output format from Replicate API",
                    "processing_time": processing_time
                }
            
            # Convert URL to base64 if needed
            try:
                if processed_image_url.startswith(('http://', 'https://')):
                    import requests
                    response = requests.get(processed_image_url)
                    response.raise_for_status()
                    processed_image_base64 = base64.b64encode(response.content).decode('utf-8')
                else:
                    # Already base64 or data URI
                    if processed_image_url.startswith('data:'):
                        processed_image_base64 = processed_image_url.split(',')[1]
                    else:
                        processed_image_base64 = processed_image_url
                        
            except Exception as e:
                logging_service.log_error("Image download", str(e))
                return {
                    "success": False,
                    "error": f"Failed to download processed image: {str(e)}",
                    "processing_time": processing_time
                }
            
            # Return successful result
            processed_image_data_uri = f"data:image/png;base64,{processed_image_base64}"
            return {
                "success": True,
                "processed_image": processed_image_data_uri,
                "processing_time": processing_time,
                "model_used": self.model,
                "coordinates_analyzed": len(coordinates) if coordinates else 0,
                "mask_generated": True,
                "image_dimensions": f"{image_size[0]}x{image_size[1]}"
            }
            
        except replicate.exceptions.ReplicateError as e:
            processing_time = time.time() - start_time
            error_msg = f"Replicate API error: {str(e)}"
            logging_service.log_error("AI object removal", error_msg)
            return {
                "success": False,
                "error": error_msg,
                "processing_time": processing_time
            }
        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = f"AI object removal failed: {str(e)}"
            logging_service.log_error("AI object removal", error_msg)
            return {
                "success": False,
                "error": error_msg,
                "processing_time": processing_time
            }

    # Legacy methods removed in favor of a single unified API

# Export singleton instance
ai_service = AIService() 