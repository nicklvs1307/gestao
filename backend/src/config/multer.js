const multer = require('multer');
const path = require('path');

const MAX_SIZES = {
  image: 10 * 1024 * 1024,  // 10MB para imagens
  video: 20 * 1024 * 1024, // 20MB para vídeos
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    cb(null, 'public/uploads/'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype);
  const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
  
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo inválido. Apenas imagens e vídeos são permitidos.'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { 
    fileSize: MAX_SIZES.video, // Limite maior para vídeos (20MB)
  }
});

module.exports = upload;
module.exports.MAX_SIZES = MAX_SIZES;
