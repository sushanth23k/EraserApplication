import logging
import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

from models import ImageAction, Coordinate
from config import config

class LoggingService:
    """Service for logging all image processing actions and events."""
    
    def __init__(self):
        self.setup_logging()
        self.actions_log_file = "logs/image_actions.json"
        self.ensure_log_directory()
    
    def setup_logging(self):
        """Setup application logging configuration."""
        # Ensure logs directory exists
        log_dir = os.path.dirname(config.LOG_FILE)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=getattr(logging, config.LOG_LEVEL),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(config.LOG_FILE),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
    
    def ensure_log_directory(self):
        """Ensure the logs directory and files exist."""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Initialize actions log file if it doesn't exist
        if not os.path.exists(self.actions_log_file):
            with open(self.actions_log_file, 'w') as f:
                json.dump([], f)
    
    def log_image_upload(self, image_id: str, metadata: Dict[str, Any], 
                        user_agent: Optional[str] = None, 
                        ip_address: Optional[str] = None) -> str:
        """Log image upload action."""
        action = ImageAction(
            action_type="upload",
            image_id=image_id,
            user_agent=user_agent,
            ip_address=ip_address,
            metadata=metadata
        )
        
        self._write_action_to_file(action)
        self.logger.info(f"Image uploaded - ID: {image_id}, Size: {metadata.get('file_size', 'unknown')}")
        
        return action.id
    
    def log_image_processing(self, image_id: str, coordinates: List[Coordinate], 
                           description: str, processing_result: Dict[str, Any],
                           user_agent: Optional[str] = None, 
                           ip_address: Optional[str] = None) -> str:
        """Log image processing action."""
        action = ImageAction(
            action_type="process",
            image_id=image_id,
            coordinates=coordinates,
            description=description,
            user_agent=user_agent,
            ip_address=ip_address,
            metadata={
                "success": processing_result.get("success", False),
                "processing_time": processing_result.get("processing_time"),
                "error_message": processing_result.get("error_message"),
                "coordinates_count": len(coordinates)
            }
        )
        
        self._write_action_to_file(action)
        
        status = "successful" if processing_result.get("success") else "failed"
        self.logger.info(f"Image processing {status} - ID: {image_id}, Coordinates: {len(coordinates)}")
        
        return action.id
    
    def log_image_download(self, image_id: str, 
                          user_agent: Optional[str] = None, 
                          ip_address: Optional[str] = None) -> str:
        """Log image download action."""
        action = ImageAction(
            action_type="download",
            image_id=image_id,
            user_agent=user_agent,
            ip_address=ip_address
        )
        
        self._write_action_to_file(action)
        self.logger.info(f"Image downloaded - ID: {image_id}")
        
        return action.id
    
    def log_error(self, operation: str, error_message: str, 
                  additional_context: Optional[Dict[str, Any]] = None):
        """Log application errors."""
        context_str = f", Context: {additional_context}" if additional_context else ""
        self.logger.error(f"Error in {operation}: {error_message}{context_str}")
    
    def log_info(self, message: str, additional_data: Optional[Dict[str, Any]] = None):
        """Log informational messages."""
        data_str = f", Data: {additional_data}" if additional_data else ""
        self.logger.info(f"{message}{data_str}")
    
    def log_warning(self, message: str, additional_data: Optional[Dict[str, Any]] = None):
        """Log warning messages."""
        data_str = f", Data: {additional_data}" if additional_data else ""
        self.logger.warning(f"{message}{data_str}")
    
    def _write_action_to_file(self, action: ImageAction):
        """Write action to the JSON log file."""
        try:
            # Read existing actions
            with open(self.actions_log_file, 'r') as f:
                actions = json.load(f)
            
            # Convert action to dict for JSON serialization
            action_dict = {
                "id": action.id,
                "action_type": action.action_type,
                "image_id": action.image_id,
                "coordinates": [{"x": c.x, "y": c.y} for c in action.coordinates] if action.coordinates else None,
                "description": action.description,
                "user_agent": action.user_agent,
                "ip_address": action.ip_address,
                "timestamp": action.timestamp.isoformat(),
                "metadata": action.metadata
            }
            
            # Add new action
            actions.append(action_dict)
            
            # Keep only last 1000 actions to prevent file from growing too large
            if len(actions) > 1000:
                actions = actions[-1000:]
            
            # Write back to file
            with open(self.actions_log_file, 'w') as f:
                json.dump(actions, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to write action to file: {str(e)}")
    
    def get_image_actions(self, image_id: str) -> List[Dict[str, Any]]:
        """Get all actions for a specific image."""
        try:
            with open(self.actions_log_file, 'r') as f:
                actions = json.load(f)
            
            return [action for action in actions if action.get("image_id") == image_id]
        except Exception as e:
            self.logger.error(f"Failed to read actions for image {image_id}: {str(e)}")
            return []
    
    def get_recent_actions(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent actions."""
        try:
            with open(self.actions_log_file, 'r') as f:
                actions = json.load(f)
            
            return actions[-limit:] if len(actions) > limit else actions
        except Exception as e:
            self.logger.error(f"Failed to read recent actions: {str(e)}")
            return []

# Export singleton instance
logging_service = LoggingService() 