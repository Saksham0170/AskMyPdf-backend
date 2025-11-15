import express from "express";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
// import routes from "./routes";

export const app = express();

app.use(cors({
  origin: "*", // Update with client URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

app.use(express.json());
app.use(errorHandler);
// All routes
// app.use("/api", routes);
