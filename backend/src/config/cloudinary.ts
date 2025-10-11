import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Helper to check if Cloudinary is configured
export const isCloudinaryConfigured = (): boolean => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

// Create Cloudinary storage for images
export const cloudinaryImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fundify/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    } as any,
});

// Create Cloudinary storage for videos
export const cloudinaryVideoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fundify/videos',
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'],
    } as any,
});

// Create Cloudinary storage for files/attachments
export const cloudinaryFileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fundify/files',
        resource_type: 'raw',
    } as any,
});

export default cloudinary;

