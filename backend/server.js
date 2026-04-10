import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import app from "./app.js";

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV === "development") {
  app.listen(port, () => {
    console.log(`App running on  http://127.0.0.1:${port}/`);
  });
}