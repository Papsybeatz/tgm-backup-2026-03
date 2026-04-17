// dotenv integration for Node.js backend
// At the top of your backend entry file (e.g., server.js)
import dotenv from "dotenv";
dotenv.config({
  path: process.env.NODE_ENV === "production" ? "./.env.production" : "./.env"
});

// Now process.env.OPENAI_API_KEY and other variables are available
