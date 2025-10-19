import { FileTypeValidator, FileValidator } from '@nestjs/common';

export const UPLOAD_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string', format: 'binary' },
    uploaderId: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['file', 'uploaderId'],
};

class DynamicFileSizeValidator extends FileValidator<{ maxImageSize: number; maxVideoSize: number }> {
  buildErrorMessage(): string {
    return 'File size exceeds the allowed limit';
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;

    const { maxImageSize, maxVideoSize } = this.validationOptions;
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (isImage && file.size > maxImageSize) return false;
    if (isVideo && file.size > maxVideoSize) return false;

    return true;
  }
}

export const FILE_VALIDATORS = [
  new DynamicFileSizeValidator({
    maxImageSize: 1024 * 1024 * 10, // 10MB for images
    maxVideoSize: 1024 * 1024 * 50, // 50MB for videos
  }),
  new FileTypeValidator({ fileType: '(image|video)/(jpeg|png|gif|mp4|avi|mov)' }),
];
