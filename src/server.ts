import dotenv from "dotenv";
dotenv.config();
import { app } from "./app";

import { worker } from "./workers/file.worker";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Worker initialized:", !!worker);
});

