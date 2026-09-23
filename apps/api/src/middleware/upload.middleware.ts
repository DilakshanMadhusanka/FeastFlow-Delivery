import multer from 'multer';
import { BadRequestError } from '../utils/errors';
import { ErrorCode } from '../constants';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Invalid image format. Allowed formats: JPEG, PNG, WEBP, GIF',
        ErrorCode.BAD_REQUEST
      )
    );
  }
};

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
}).single('image');
