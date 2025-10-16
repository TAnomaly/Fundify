import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  cloudinaryImageStorage,
  cloudinaryVideoStorage,
  cloudinaryFileStorage,
  isCloudinaryConfigured,
} from '../config/cloudinary';

// Determine which storage to use
const useCloudStorage = isCloudinaryConfigured();

// Fallback: Local disk storage for development or Railway Volumes
// On Railway, use /app/uploads (mounted volume)
// On local dev, use ./uploads
const uploadsDir = process.env.RAILWAY_ENVIRONMENT 
  ? '/app/uploads'
  : path.join(__dirname, '../../uploads');

if (!useCloudStorage && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('✅ Using Railway Volume for persistent storage at', uploadsDir);
  } else {
    console.warn('⚠️  Using local storage. Use Railway Volumes or Cloudinary for production!');
  }
}

const localDiskStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = 'uploads/';

    // Organize by file type
    if (file.mimetype.startsWith('image/')) {
      folder = path.join(uploadsDir, 'images');
    } else if (file.mimetype.startsWith('video/')) {
      folder = path.join(uploadsDir, 'videos');
    } else {
      folder = path.join(uploadsDir, 'files');
    }

    // Create folder if it doesn't exist
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// Helper to get appropriate storage based on file type
const getStorage = (fileType: 'image' | 'video' | 'file' = 'file') => {
  if (useCloudStorage) {
    if (fileType === 'image') return cloudinaryImageStorage;
    if (fileType === 'video') return cloudinaryVideoStorage;
    return cloudinaryFileStorage;
  }
  return localDiskStorage;
};

// File filter for security
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed mime types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'application/octet-stream', // Sometimes browsers send this for videos
  ];
  const allowedFileTypes = ['application/pdf', 'application/zip', 'text/plain'];

  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Check by MIME type or extension
  const isImage = allowedImageTypes.includes(file.mimetype) || imageExtensions.includes(ext);
  const isVideo = allowedVideoTypes.includes(file.mimetype) || videoExtensions.includes(ext);
  const isFile = allowedFileTypes.includes(file.mimetype);

  if (isImage || isVideo || isFile) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Extension: ${ext}`));
  }
};

// Create multer instances for different file types
const createUploadInstance = (fileType: 'image' | 'video' | 'file' = 'file') => {
  return multer({
    storage: getStorage(fileType),
    fileFilter,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB max file size
      files: 10, // Max 10 files per upload
    },
  });
};

// Middleware for single file upload
export const uploadSingle = (fieldName: string, fileType: 'image' | 'video' | 'file' = 'file') => {
  return createUploadInstance(fileType).single(fieldName);
};

// Middleware for multiple files upload
export const uploadMultiple = (
  fieldName: string,
  maxCount: number = 10,
  fileType: 'image' | 'video' | 'file' = 'file'
) => {
  return createUploadInstance(fileType).array(fieldName, maxCount);
};

// Middleware for mixed upload (multiple fields)
export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
  // For mixed uploads, use generic storage
  return createUploadInstance('file').fields(fields);
};

// Default upload instance for general use
export const upload = createUploadInstance('file');

// Export flag to check if using cloud storage
export { useCloudStorage };
