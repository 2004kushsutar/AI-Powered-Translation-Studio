import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

import translateRouter from "./routes/translateRoutes.js";

const app = express();
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));


app.use(morgan("dev"));

const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = ["http://localhost:5173"];

    const isLocalNetwork =
      /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(origin);

    if (!origin || whitelist.indexOf(origin) !== -1 || isLocalNetwork) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/v1", translateRouter);

app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

export default app;