const express            = require('express');
const path               = require('path');
const createFileUploader = require('../../controllers/fileUpload.controller');

const router = express.Router();

// point at your real on-disk folder:
const baseDir    = path.join(process.cwd(), 'Uploads', 'DearBasket');
// the “~”-prefix returned to clients:
const virtualBase = '~/Uploads/DearBasket';

const { upload, handler } = createFileUploader({ baseDir, virtualBase });

// POST /dearbasket/upload
// • form-data key “path”: optional subfolder under DearBasket (text)
// • form-data key “file”: the binary file
router.post('/', upload, handler);

module.exports = router;
