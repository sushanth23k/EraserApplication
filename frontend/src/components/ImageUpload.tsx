import React, { useRef, useState, useCallback } from 'react';
import { ImageUploadProps } from '../types';

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  isUploading,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      onImageUpload(files[0]);
    }
  }, [onImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  return (
    <div
      className={`upload-area ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileInputChange}
        className="file-input"
        disabled={isUploading}
      />
      
      <div className="upload-icon">📁</div>
      
      {isUploading ? (
        <div className="upload-text">
          <div className="spinner"></div>
          <span style={{ marginLeft: '10px' }}>Uploading...</span>
        </div>
      ) : (
        <>
          <div className="upload-text">
            Drag and drop your image here, or click to browse
          </div>
          <div className="upload-subtext">
            Supports JPG and PNG files up to 10MB
          </div>
        </>
      )}
      
      {error && (
        <div className="error-message" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 