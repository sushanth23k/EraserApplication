from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

# Import configuration and services
from config import config
from core.services.logging_service import logging_service
from core.services.image_service import image_service
from core.routes.image_routes import image_bp

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(image_bp)
    
    # Configure Flask app
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE
    
    return app

# Create app instance
app = create_app()

# Global error handlers
@app.errorhandler(413)
def too_large(e):
    logging_service.log_warning("Global file too large error")
    return {"error": "File too large"}, 413

@app.errorhandler(404)
def not_found(e):
    logging_service.log_warning("Endpoint not found", {"path": str(e)})
    return {"error": "Endpoint not found"}, 404

@app.errorhandler(500)
def internal_error(e):
    logging_service.log_error("Global internal error", str(e))
    return {"error": "Internal server error"}, 500

if __name__ == '__main__':
    # Check for required environment variables
    REPLICATE_API_KEY = os.getenv('REPLICATE_API_KEY')
    if not REPLICATE_API_KEY:
        logging_service.log_warning("REPLICATE_API_KEY not found in environment variables - AI features will use fallback mode")
    
    logging_service.log_info(f"Starting AI Image Editor API v2.0.0")
    logging_service.log_info(f"Configuration: Debug={config.DEBUG}, Host={config.HOST}, Port={config.PORT}")
    
    app.run(
        debug=config.DEBUG, 
        host=config.HOST, 
        port=config.PORT
    ) 