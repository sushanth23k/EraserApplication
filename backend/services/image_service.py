import time
import uuid
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

from models import Coordinate, ImageMetadata, ProcessingRequest, ProcessingResult, Region
from services.logging_service import logging_service
from services.ai_service import ai_service
from utils.image_utils import image_utils

class ImageService:
    """Service for image processing operations using Replicate's bria/eraser model."""
    
    def __init__(self):
        self.processed_images = {}  # In-memory storage for processed images
    
    def validate_and_process_upload(self, image_data: str, user_agent: str = None, 
                                  ip_address: str = None) -> Dict[str, Any]:
        """Validate and process image upload."""
        try:
            # Decode image
            image = image_utils.decode_base64_image(image_data)
            
            # Get metadata
            metadata = image_utils.get_image_metadata(image)
            
            # Generate unique image ID
            image_id = str(uuid.uuid4())
            
            # Log the upload
            logging_service.log_image_upload(
                image_id=image_id,
                metadata={
                    "width": metadata.width,
                    "height": metadata.height,
                    "format": metadata.format,
                    "mode": metadata.mode,
                    "file_size": metadata.file_size
                },
                user_agent=user_agent,
                ip_address=ip_address
            )
            
            return {
                "success": True,
                "image_id": image_id,
                "metadata": {
                    "width": metadata.width,
                    "height": metadata.height,
                    "format": metadata.format,
                    "mode": metadata.mode
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            logging_service.log_error("Image upload validation", error_msg)
            return {
                "success": False,
                "error": error_msg
            }
    
    async def process_image_removal(self, image_data: str, coordinates_data: List[Dict], 
                                   description: str = "", user_agent: str = None, 
                                   ip_address: str = None,
                                   num_inference_steps: int = 50,
                                   guidance_scale: float = 7.5,
                                   seed: Optional[int] = None,
                                   regions_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Process image for object removal using Replicate's bria/eraser model."""
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        try:
            # Validate inputs
            if not image_data:
                raise ValueError("No image data provided")
            
            # Regions or coordinates are required
            if (not regions_data or len(regions_data) == 0) and (not coordinates_data or len(coordinates_data) < 3):
                raise ValueError("Provide regions or at least 3 coordinate points")
            
            # Convert coordinates
            coordinates = [Coordinate(x=coord['x'], y=coord['y']) for coord in coordinates_data] if coordinates_data else []
            regions: List[Region] = []
            if regions_data:
                for r in regions_data:
                    try:
                        regions.append(Region(x=int(r['x']), y=int(r['y']), width=int(r['width']), height=int(r['height'])))
                    except Exception:
                        continue
            
            # Decode image for metadata
            image = image_utils.decode_base64_image(image_data)
            
            # Create processing request
            processing_request = ProcessingRequest(
                id=request_id,
                image_data=image_data,
                coordinates=coordinates,
                description=description,
                metadata=image_utils.get_image_metadata(image)
            )
            
            logging_service.log_info(f"Starting Replicate object removal for request {request_id}")
            
            # Use Replicate AI for object removal
            ai_result = await ai_service.remove_object(
                image_data,
                coordinates=coordinates,
                description=description,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                seed=seed,
                regions=regions if len(regions) > 0 else None,
            )
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            if ai_result.get('success', False):
                # Get the processed image from the AI result
                processed_base64 = ai_result.get('processed_image', '')
                
                # Get information about the masking process
                mask_generated = ai_result.get('mask_generated', False)
                image_dimensions = ai_result.get('image_dimensions', 'unknown')
                coordinates_count = ai_result.get('coordinates_analyzed', len(coordinates))
                
                # Create detailed analysis message based on the new masking approach
                ai_analysis = f"Successfully removed object using mask-based approach"
                if mask_generated:
                    ai_analysis += f" - Generated binary mask from {coordinates_count} polygon points"
                if image_dimensions != 'unknown':
                    ai_analysis += f" - Processed image: {image_dimensions}"
                
                # Create result
                result = ProcessingResult(
                    request_id=request_id,
                    success=True,
                    processed_image=processed_base64,
                    processing_time=processing_time,
                    ai_analysis=ai_analysis
                )
                
                # Store processed image with mask information
                self.processed_images[request_id] = {
                    "original": image_data,
                    "processed": processed_base64,
                    "metadata": processing_request.metadata,
                    "ai_analysis": ai_result,
                    "mask_approach": True,
                    "coordinates_used": coordinates_count,
                    "processing_method": "mask_based_removal"
                }
                
                # Log the processing
                logging_service.log_info(f"Replicate mask-based object removal completed for request {request_id}")
                
                return {
                    "success": True,
                    "processed_image": processed_base64,
                    "message": f"Object removal completed using mask-based approach",
                    "processing_time": processing_time,
                    "request_id": request_id,
                    "ai_analysis": ai_analysis,
                    "mask_generated": mask_generated,
                    "coordinates_processed": coordinates_count
                }
            else:
                error_msg = ai_result.get('error', 'AI processing failed')
                logging_service.log_error("Replicate object removal", error_msg)
                
                return {
                    "success": False,
                    "error": f"AI object removal failed: {error_msg}",
                    "processing_time": processing_time,
                    "request_id": request_id
                }
                
        except ValueError as e:
            processing_time = time.time() - start_time
            error_msg = str(e)
            logging_service.log_error("Input validation", error_msg)
            return {
                "success": False,
                "error": error_msg,
                "processing_time": processing_time,
                "request_id": request_id
            }
        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = f"Processing failed: {str(e)}"
            logging_service.log_error("Image processing", error_msg)
            return {
                "success": False,
                "error": error_msg,
                "processing_time": processing_time,
                "request_id": request_id
            }
    
    def prepare_image_download(self, image_data: str, user_agent: str = None, 
                             ip_address: str = None) -> Tuple[Image.Image, str]:
        """Prepare image for download and log the action."""
        try:
            # Decode image
            image = image_utils.decode_base64_image(image_data)
            
            # Generate download ID
            download_id = str(uuid.uuid4())
            
            # Log download
            logging_service.log_info(f"Image prepared for download - ID: {download_id}")
            
            return image, download_id
            
        except Exception as e:
            error_msg = str(e)
            logging_service.log_error("Image download preparation", error_msg)
            raise ValueError(f"Download preparation failed: {error_msg}")
    
    def get_processed_image(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a processed image by request ID."""
        return self.processed_images.get(request_id)
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return {
            "total_processed": len(self.processed_images),
            "recent_requests": list(self.processed_images.keys())[-10:] if self.processed_images else []
        }

# Export singleton instance
image_service = ImageService() 