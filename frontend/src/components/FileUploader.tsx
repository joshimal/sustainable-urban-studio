import React, { useState, useRef } from 'react';

interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  uploadTime: string;
  qgisProcessing?: any;
}

const FileUploader: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const allowedTypes = ['.shp', '.geojson', '.json', '.tiff', '.tif', '.gpkg'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.some(type => fileName.endsWith(type));

    if (!isValidType) {
      setUploadResult({
        success: false,
        error: 'Invalid file type. Please upload .shp, .geojson, .tiff, or .gpkg files'
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('gisFile', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setUploadResult(result);

      if (result.success) {
        // Refresh file list
        loadFileList();
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: 'Failed to upload file. Make sure the backend server is running.'
      });
    }
    
    setUploading(false);
  };

  const loadFileList = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/files');
      const result = await response.json();
      if (result.success) {
        setUploadedFiles(result.files);
      }
    } catch (error) {
      console.error('Failed to load file list:', error);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadShapefile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
  
      const response = await fetch('http://localhost:8081/upload-shapefile', {
        method: 'POST',
        body: formData
      });
  
      const result = await response.json();
      
      if (result.success) {
        // Store the GeoJSON data for map display
        setUploadResult({
          ...result,
          message: `Shapefile processed: ${result.layer_info.feature_count} features`
        });
        
        // You could emit this data to the map component
        if (onShapefileUploaded) {
          onShapefileUploaded(result.geojson);
        }
      } else {
        setUploadResult(result);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: 'Failed to process shapefile'
      });
    }
    setUploading(false);
  };

  // Load file list on component mount
  React.useEffect(() => {
    loadFileList();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.2)',
      marginTop: '2rem'
    }}>
      <h3 style={{ color: 'white', marginBottom: '1rem' }}>
        📁 GIS Data Upload
      </h3>

      {/* Upload Area */}
      <div
        style={{
          border: `2px dashed ${dragActive ? '#22c55e' : 'rgba(255,255,255,0.3)'}`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          background: dragActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          marginBottom: '1.5rem'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {uploading ? '⏳' : dragActive ? '📥' : '📁'}
        </div>
        
        {uploading ? (
          <p style={{ color: 'white', margin: 0 }}>Uploading and processing...</p>
        ) : (
          <>
            <p style={{ color: 'white', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
              {dragActive ? 'Drop your GIS file here!' : 'Drop GIS files here or click to upload'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.9rem' }}>
              Supports: .shp, .geojson, .tiff, .gpkg files
            </p>
          </>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".shp,.geojson,.json,.tiff,.tif,.gpkg,.zip"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          background: uploadResult.success 
            ? 'rgba(34, 197, 94, 0.2)' 
            : 'rgba(239, 68, 68, 0.2)',
          border: `1px solid ${uploadResult.success ? '#22c55e' : '#ef4444'}`
        }}>
          <div style={{ 
            color: uploadResult.success ? '#22c55e' : '#ef4444',
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            {uploadResult.success ? '✅ Upload Successful' : '❌ Upload Failed'}
          </div>
          
          {uploadResult.success ? (
            <div style={{ color: 'white', fontSize: '0.9rem' }}>
              <p>File: {uploadResult.file?.originalName}</p>
              <p>Size: {formatFileSize(uploadResult.file?.size || 0)}</p>
              {uploadResult.file?.qgisProcessing && (
                <p>QGIS Status: {uploadResult.file.qgisProcessing.error ? 'Processing Error' : 'Ready for Analysis'}</p>
              )}
            </div>
          ) : (
            <p style={{ color: 'white', fontSize: '0.9rem', margin: 0 }}>
              {uploadResult.error}
            </p>
          )}
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div>
          <h4 style={{ color: 'white', marginBottom: '1rem' }}>
            📋 Uploaded Files ({uploadedFiles.length})
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {uploadedFiles.map((file, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ color: 'white', fontWeight: '500' }}>
                    {file.filename}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    {formatFileSize(file.size)} • {new Date(file.uploadTime).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ 
                  background: '#22c55e',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  Ready
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;