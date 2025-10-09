import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
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

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
    files: 10, // Max 10 files per upload
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Middleware for multiple files upload
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
  upload.array(fieldName, maxCount);

// Middleware for mixed upload (multiple fields)
export const uploadFields = (fields: { name: string; maxCount: number }[]) =>
  upload.fields(fields);
