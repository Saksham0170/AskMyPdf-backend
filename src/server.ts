import { app } from "./app";
import dotenv from "dotenv";

dotenv.config();

import "./workers/file.worker"; // Start the worker AFTER loading env vars

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

