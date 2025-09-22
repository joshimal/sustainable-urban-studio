const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (store in ./uploads which is mapped to host ./data via docker-compose)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.shp', '.geojson', '.json', '.tiff', '.tif', '.gpkg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .shp, .geojson, .tiff, .gpkg'));
    }
  }
});

// Create uploads directory
const createUploadsDir = async () => {
  try {
    await fs.mkdir('./uploads', { recursive: true });
  } catch (error) {
    console.log('Uploads directory already exists');
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Urban Studio Backend',
    timestamp: new Date().toISOString()
  });
});

// Upload GIS files
app.post('/api/upload', upload.single('gisFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadTime: new Date().toISOString()
    };

    // Note: Remove broken call to non-existent QGIS endpoint (/process-file)
    // If needed, implement multipart forward to http://qgis-server:5000/upload-shapefile for ZIP shapefiles
    fileInfo.qgisProcessing = { note: 'No auto-processing performed' };

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get uploaded files list
app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir('./uploads');
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const stats = await fs.stat(`./uploads/${filename}`);
        return {
          filename,
          size: stats.size,
          uploadTime: stats.ctime
        };
      })
    );

    res.json({
      success: true,
      files: fileList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Proxy requests to QGIS server
app.post('/api/qgis/*', async (req, res) => {
  try {
    const qgisPath = req.params[0];
    const qgisResponse = await axios.post(
      `http://qgis-server:5000/${qgisPath}`,
      req.body
    );
    res.json(qgisResponse.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'QGIS server unavailable'
    });
  }
});

// Support GET proxy to QGIS (e.g., /health and /nassau/get-data)
app.get('/api/qgis/*', async (req, res) => {
  try {
    const qgisPath = req.params[0];
    const qgisUrl = `http://qgis-server:5000/${qgisPath}`;
    const qgisResponse = await axios.get(qgisUrl, { params: req.query });
    res.json(qgisResponse.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'QGIS server unavailable'
    });
  }
});

// Start server
const startServer = async () => {
  await createUploadsDir();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
  });
};

startServer();