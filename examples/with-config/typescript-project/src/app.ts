// Main application entry point

import express from 'express';
import { setupRoutes } from './routes';
import { connectDatabase } from './database';

// TODO: Add proper error handling middleware
// TODO: Implement request rate limiting
// FIXME: Database connection should use connection pooling

const app = express();
const PORT = process.env.PORT || 3000;

// HACK: Temporary CORS configuration - needs proper setup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// NOTE: Consider using compression middleware for production
app.use(express.json());

// BUG: Routes must be set up after middleware
setupRoutes(app);

// OPTIMIZE: Use cluster module for multi-core systems
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // TODO: Add graceful shutdown handling
  // TODO: Implement health check endpoint
});

// Checklist for deployment:
// - [ ] Set up environment variables
// - [x] Configure logging
// - [ ] Add monitoring integration
// - [ ] Set up backup strategy