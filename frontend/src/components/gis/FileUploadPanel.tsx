import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

import { useAppContext } from '../../contexts/AppContext';
import { gisAPI } from '../../services/api';
import ProgressIndicator from '../visualization/ProgressIndicator';

interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  uploadTime: Date;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  featureCount?: number;
  bounds?: [number, number, number, number];
}

const FileUploadPanel: React.FC = () => {
  const { state, actions } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [layerConfig, setLayerConfig] = useState({
    name: '',
    description: '',
    category: 'custom',
    visible: true,
  });

  // Supported file types
  const supportedTypes = [
    '.shp', '.zip', // Shapefile (with zip containing all components)
    '.geojson', '.json', // GeoJSON
    '.kml', '.kmz', // KML/KMZ
    '.gpkg', // GeoPackage
    '.tiff', '.tif', // GeoTIFF
    '.csv', // CSV with coordinates
  ];

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const fileName = file.name.toLowerCase();
    const isSupported = supportedTypes.some(type => fileName.endsWith(type));

    if (!isSupported) {
      actions.addNotification({
        type: 'error',
        message: `Unsupported file type. Supported formats: ${supportedTypes.join(', ')}`,
      });
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      actions.addNotification({
        type: 'error',
        message: 'File size must be less than 50MB',
      });
      return;
    }

    setSelectedFile(file);
    setLayerConfig({
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      category: 'custom',
      visible: true,
    });
    setConfigDialogOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setConfigDialogOpen(false);
    setUploading(true);
    setUploadProgress(0);

    const newFile: UploadedFile = {
      id: `file-${Date.now()}`,
      name: layerConfig.name,
      originalName: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      uploadTime: new Date(),
      status: 'uploading',
      progress: 0,
    };

    setUploadedFiles(prev => [newFile, ...prev]);

    try {
      const result = await gisAPI.uploadFile(
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
          setUploadedFiles(prev =>
            prev.map(file =>
              file.id === newFile.id
                ? { ...file, progress: progress, status: progress === 100 ? 'processing' : 'uploading' }
                : file
            )
          );
        }
      );

      if (result.success) {
        setUploadedFiles(prev =>
          prev.map(file =>
            file.id === newFile.id
              ? {
                  ...file,
                  status: 'completed',
                  progress: 100,
                  featureCount: result.featureCount,
                  bounds: result.bounds,
                }
              : file
          )
        );

        // Add to custom layers in global state
        actions.addCustomLayer({
          id: newFile.id,
          name: layerConfig.name,
          description: layerConfig.description,
          originalName: selectedFile.name,
          type: 'vector', // TODO: Detect actual type
          visible: layerConfig.visible,
          uploadedAt: new Date().toISOString(),
          featureCount: result.featureCount,
          bounds: result.bounds,
          data: result.data,
        });

        actions.addNotification({
          type: 'success',
          message: `${layerConfig.name} uploaded successfully`,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploadedFiles(prev =>
        prev.map(file =>
          file.id === newFile.id
            ? { ...file, status: 'error', error: errorMessage }
            : file
        )
      );

      actions.addNotification({
        type: 'error',
        message: `Upload failed: ${errorMessage}`,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    actions.removeCustomLayer(fileId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
      case 'processing':
        return <InfoIcon color="primary" />;
      default:
        return <FileIcon />;
    }
  };

  const getStatusChip = (status: string, progress: number) => {
    switch (status) {
      case 'uploading':
        return <Chip size="small" label={`Uploading ${progress}%`} color="primary" />;
      case 'processing':
        return <Chip size="small" label="Processing..." color="primary" />;
      case 'completed':
        return <Chip size="small" label="Ready" color="success" />;
      case 'error':
        return <Chip size="small" label="Error" color="error" />;
      default:
        return <Chip size="small" label="Unknown" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Upload GIS Data"
          subheader="Add shapefiles, GeoJSON, and other spatial data"
        />

        <CardContent>
          {/* Upload Area */}
          <Box
            sx={{
              border: `2px dashed ${dragActive ? 'primary.main' : 'divider'}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: dragActive ? 'action.hover' : 'background.default',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              mb: 3,
            }}
            onDragEnter={handleDragEvents}
            onDragLeave={handleDragEvents}
            onDragOver={handleDragEvents}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedTypes.join(',')}
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />

            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Supported formats: {supportedTypes.join(', ')}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Maximum file size: 50MB
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" component="span" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Select File'}
              </Button>
            </Box>
          </Box>

          {/* Upload Progress */}
          {uploading && (
            <Box sx={{ mb: 3 }}>
              <ProgressIndicator
                type="linear"
                value={uploadProgress}
                title="Uploading file..."
                showPercentage
                animated
              />
            </Box>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Uploaded Files ({uploadedFiles.length})
              </Typography>

              <List>
                {uploadedFiles.map((file, index) => (
                  <React.Fragment key={file.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(file.status)}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1">{file.name}</Typography>
                            {getStatusChip(file.status, file.progress)}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size)} • {file.uploadTime.toLocaleString()}
                            </Typography>
                            {file.featureCount && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                {file.featureCount.toLocaleString()} features
                              </Typography>
                            )}
                            {file.error && (
                              <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                {file.error}
                              </Typography>
                            )}
                          </Box>
                        }
                      />

                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={file.status === 'uploading' || file.status === 'processing'}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>

                    {file.status === 'uploading' || file.status === 'processing' ? (
                      <Box sx={{ px: 2, pb: 2 }}>
                        <LinearProgress
                          variant={file.status === 'processing' ? 'indeterminate' : 'determinate'}
                          value={file.progress}
                        />
                      </Box>
                    ) : null}

                    {index < uploadedFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>

      {/* Layer Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure Layer
          <IconButton
            onClick={() => setConfigDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Layer Name"
              fullWidth
              variant="outlined"
              value={layerConfig.name}
              onChange={(e) => setLayerConfig(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Description (optional)"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={layerConfig.description}
              onChange={(e) => setLayerConfig(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={layerConfig.category}
                label="Category"
                onChange={(e) => setLayerConfig(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="custom">Custom Data</MenuItem>
                <MenuItem value="boundaries">Boundaries</MenuItem>
                <MenuItem value="transportation">Transportation</MenuItem>
                <MenuItem value="environment">Environment</MenuItem>
                <MenuItem value="demographics">Demographics</MenuItem>
              </Select>
            </FormControl>

            {selectedFile && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>File:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!layerConfig.name.trim()}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileUploadPanel;