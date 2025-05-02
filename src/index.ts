import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { apiRoutes } from "./routes";
// Import Firebase Admin SDK
import './config/firebase';

// Load environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = new Elysia()
  // Global middleware
  .use(cors({
    origin: CORS_ORIGIN,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true
  }))
  // Mount all API routes
  .use(apiRoutes)
  
  // Start the server
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
