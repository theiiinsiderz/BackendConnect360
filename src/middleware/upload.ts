import multer from "multer";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only PNG and JPG images are allowed"));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});