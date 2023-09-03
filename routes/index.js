import express from 'express';
import AppController from '../controllers/AppController';

// Create a new router instance using Express Router
const router = express.Router();

// Define two GET routes:
// 1. '/status' route to handle the status request using AppController's getStatus method
router.get('/status', AppController.getStatus);

// 2. '/stats' route to handle the stats request using AppController's getStats method
router.get('/stats', AppController.getStats);

// Export the router for use in other parts of your application
export default router;
