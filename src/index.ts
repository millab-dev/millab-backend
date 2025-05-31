import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { apiRoutes } from "./routes";
// Import Firebase Admin SDK
import './config/firebase';
import { authMiddleware } from "./middlewares/auth.middleware";

// Load environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;


// Parsing origins from environment variable separated by commas
const corsOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',') : 
  ["http://localhost:3000"];

const app = new Elysia()
  // Global middleware
  .use(cors({
    origin: corsOrigins, // Use origins from environment variable
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposeHeaders: ['Set-Cookie'], // Expose Set-Cookie header
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true // Allow credentials (cookies)
  }))
  .use(authMiddleware)
  // Mount all API routes
  .use(apiRoutes)
  
  // Start the server
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
