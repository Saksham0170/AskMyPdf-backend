import express from "express";
import { uploadPdf} from "../controllers/uploadControllers";
import { uploadMiddleware, handleMulterError } from "../middlewares/uploadMiddleware";

const router = express.Router();

router.route("/")
    .post(uploadMiddleware, handleMulterError, uploadPdf)

export default router;
