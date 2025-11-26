import express from "express";
import { uploadPdf} from "../controllers/uploadControllers";
import { uploadMiddleware, handleMulterError } from "../middlewares/uploadMiddleware";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.route("/")
    .post(requireAuth(), uploadMiddleware, handleMulterError, uploadPdf)

export default router;
