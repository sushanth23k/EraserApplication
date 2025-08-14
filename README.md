# AI Eraser

A full-stack web application for AI-powered image editing that allows users to remove objects from images by marking them with custom shapes and get high-quality edited results.

## Features

- **Drag & Drop Image Upload**: Support for JPG/PNG files up to 10MB
- **Interactive Drawing Tools**: 
  - Freehand drawing for irregular shapes
  - Rectangle selector with drag/resize capabilities
  - Ellipse selector with drag/resize capabilities
- **AI-Powered Object Removal**: Uses Replicate API with bria/eraser model for intelligent object removal
- **Real-time Preview**: Zoomable/pannable viewport maintaining original resolution
- **Side-by-Side Comparison**: Original vs. edited image comparison view
- **High-Quality Downloads**: Preserve original image format and quality
- **Responsive Design**: Modern UI with 3-column desktop layout, mobile-friendly

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Backend**: Flask + Python
- **AI Integration**: Replicate API (bria/eraser)
- **Styling**: Modern CSS with custom design system
- **Image Processing**: PIL (Pillow) + NumPy + SciPy

## Model Information

The AI Eraser utilizes the bria/eraser model for object removal tasks. This model is hosted on Replicate, a platform for running machine learning models in the cloud. You can find more information about the model and its capabilities at the following URL:

[Bria/Eraser Model on Replicate](https://replicate.com/bria/eraser)


## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Replicate API key

### 1. Clone Repository

```bash
git clone <repository-url>
cd EraserApplication
```

### 2. Setup (one-time)

```bash
# From project root
./setup.sh
```

What it does:
- Creates `.env` with defaults (edit `REPLICATE_API_KEY` later)
- Installs backend Python packages into `backend/venv`
- Installs frontend packages in `frontend`

### 3. Start (every time)

```bash
# From project root
./start.sh
```

Frontend will be available at `http://localhost:3000` and backend at `http://localhost:5001`.

## API Endpoints

### Backend API (`http://localhost:5001`)

- `GET /api/health` - Health check
- `POST /api/upload` - Validate and process image upload
- `POST /api/process` - Process image with AI object removal
- `POST /api/download` - Generate downloadable processed image

## Usage Workflow

1. **Upload Image**: Drag and drop or browse for JPG/PNG image (max 10MB)
2. **Select Tool**: Choose from freehand, rectangle, or ellipse drawing tools
3. **Mark Object**: Draw around the object you want to remove
4. **Add Description** (Optional): Describe what to remove for better AI results
5. **Process**: Click "Remove Object" to start AI processing
6. **Review Results**: Compare original vs. edited in side-by-side view
7. **Download**: Save the edited image in original quality

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Replicate API Configuration
REPLICATE_API_KEY=your_replicate_api_key_here

# Backend Configuration
FLASK_ENV=development
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
FLASK_DEBUG=true

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5001

# Log Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### Replicate API Setup

1. Sign up at [Replicate Console](https://console.groq.com/)
2. Create an API key
3. Add the key to your `.env` file

## Project Structure

```
EraserApplication/
├── backend/
│   ├── app.py              # Flask application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   ├── styles/         # CSS styles
│   │   ├── types/          # TypeScript interfaces
│   │   ├── App.tsx         # Main app component
│   │   └── index.tsx       # React entry point
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── package.json        # Frontend dependencies
│   └── tsconfig.json       # TypeScript configuration
└── README.md               # This file
```

## Development

### Running in Development Mode

1. Start backend: `cd backend && source venv/bin/activate && python app.py` (runs on port 5001)
2. Start frontend: `cd frontend && npm start`
3. Or run both with `./start.sh`

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# The backend can serve the built frontend files
# Copy build files to backend/static/ if needed
```

## Design Specifications

### Color Palette
- Primary: `#f0f4f8` (light blue-gray)
- Secondary: `#e3f2fd` (pale blue)  
- Accent: `#ff5252` (selection red)
- Text: `#2d3748` (dark gray)

### Layout
- **Desktop**: 3-column layout (Toolbar | Canvas | Config Panel | Result Section)
- **Mobile**: Vertical stacking
- **Typography**: System fonts (San Francisco, Segoe UI, Roboto)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend is running on port 5001
2. **Replicate API Errors**: Check API key and quota limits
3. **Upload Issues**: Verify file size (max 10MB) and format (JPG/PNG)
4. **Processing Failures**: Check backend logs for detailed error messages

### Backend Issues

```bash
# Check backend health
curl http://localhost:5001/api/health

# View backend logs
cd backend
python app.py
```

### Frontend Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is for educational/demo purposes. Please check individual service terms for production use.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Replicate API status and limits
4. Open an issue with detailed error logs

## Delete the extra files
find . -name "._*" -type f -delete

# Git commit and push command
git add . && git commit -a -m "commit" && git push