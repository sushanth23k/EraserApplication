from flask import Blueprint, request, jsonify, send_file
import tempfile
import uuid
import asyncio
from typing import Optional

from core.services.image_service import image_service
from core.services.logging_service import logging_service

# Create blueprint for image routes
image_bp = Blueprint('image', __name__, url_prefix='/api')

def get_client_info():
    """Extract client information from request."""
    return {
        'user_agent': request.headers.get('User-Agent'),
        'ip_address': request.remote_addr
    }

@image_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy", 
        "message": "AI Image Editor API is running",
        "version": "2.0.0"
    })

@image_bp.route('/upload', methods=['POST'])
def upload_image():
    """Handle image upload and validation."""
    try:
        data = request.get_json()
        client_info = get_client_info()
        
        if not data or 'image' not in data:
            logging_service.log_warning("Upload attempt without image data", client_info)
            return jsonify({"error": "No image data provided"}), 400
        
        # Process upload
        result = image_service.validate_and_process_upload(
            image_data=data['image'],
            user_agent=client_info['user_agent'],
            ip_address=client_info['ip_address']
        )
        
        if result['success']:
            return jsonify({
                "success": True,
                "message": "Image uploaded successfully",
                "metadata": result['metadata'],
                "image_id": result['image_id']
            })
        else:
            return jsonify({"error": result['error']}), 400
        
    except ValueError as e:
        error_msg = str(e)
        logging_service.log_error("Image upload", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        logging_service.log_error("Image upload", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 500

@image_bp.route('/process', methods=['POST'])
def process_image():
    """Process image with AI object removal using bria/eraser."""
    try:
        data = request.get_json()
        client_info = get_client_info()
        
        # Validate required fields
        required_fields = ['image', 'coordinates']
        for field in required_fields:
            if field not in data:
                logging_service.log_warning(f"Processing attempt missing {field}", client_info)
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Extract data
        image_data = data['image']
        coordinates = data['coordinates']
        description = data.get('prompt', '') or data.get('description', '')
        num_inference_steps = int(data.get('num_inference_steps', 50))
        guidance_scale = float(data.get('guidance_scale', 7.5))
        seed = data.get('seed', None)
        try:
            seed = int(seed) if seed not in (None, "", "null") else None
        except Exception:
            seed = None
        
        # Validate coordinates
        if not coordinates or len(coordinates) < 3:
            logging_service.log_warning("Processing attempt with insufficient coordinates", {
                **client_info,
                "coordinate_count": len(coordinates) if coordinates else 0
            })
            return jsonify({"error": "At least 3 coordinate points required"}), 400
        
        # Process image using asyncio to handle the async method
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                image_service.process_image_removal(
                    image_data=image_data,
                    coordinates_data=coordinates,
                    description=description,
                    user_agent=client_info['user_agent'],
                    ip_address=client_info['ip_address'],
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    seed=seed
                )
            )
        finally:
            loop.close()
        
        if result['success']:
            response_data = {
                "success": True,
                "processed_image": result['processed_image'],
                "message": result['message'],
                "processing_time": result.get('processing_time'),
                "request_id": result.get('request_id')
            }
            
            if result.get('ai_analysis'):
                response_data['ai_analysis'] = result['ai_analysis']
            
            return jsonify(response_data)
        else:
            return jsonify({
                "error": result['error'],
                "request_id": result.get('request_id')
            }), 500
        
    except ValueError as e:
        error_msg = str(e)
        logging_service.log_error("Image processing validation", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        error_msg = f"Processing failed: {str(e)}"
        logging_service.log_error("Image processing", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 500

@image_bp.route('/download', methods=['POST'])
def download_image():
    """Generate downloadable image file."""
    try:
        data = request.get_json()
        client_info = get_client_info()
        
        if not data or 'image' not in data:
            logging_service.log_warning("Download attempt without image data", client_info)
            return jsonify({"error": "No image data provided"}), 400
        
        # Prepare image for download
        image, download_id = image_service.prepare_image_download(
            image_data=data['image'],
            user_agent=client_info['user_agent'],
            ip_address=client_info['ip_address']
        )
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        image.save(temp_file.name, format='PNG')
        temp_file.close()
        
        # Generate filename
        filename = f"edited_image_{download_id[:8]}.png"
        
        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=filename,
            mimetype='image/png'
        )
        
    except ValueError as e:
        error_msg = str(e)
        logging_service.log_error("Image download", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 400
    except Exception as e:
        error_msg = f"Download failed: {str(e)}"
        logging_service.log_error("Image download", error_msg, get_client_info())
        return jsonify({"error": error_msg}), 500

# Error handlers for the blueprint
@image_bp.errorhandler(413)
def too_large(e):
    logging_service.log_warning("File too large error", get_client_info())
    return jsonify({"error": "File too large"}), 413

@image_bp.errorhandler(400)
def bad_request(e):
    logging_service.log_warning("Bad request error", get_client_info())
    return jsonify({"error": "Bad request"}), 400

@image_bp.errorhandler(500)
def internal_error(e):
    logging_service.log_error("Internal server error", str(e), get_client_info())
    return jsonify({"error": "Internal server error"}), 500


