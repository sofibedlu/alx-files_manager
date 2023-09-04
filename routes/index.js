import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

// Create a new router instance using Express Router
const router = express.Router();

// '/status' route to handle the status request using AppController's getStatus method
router.get('/status', AppController.getStatus);

// '/stats' route to handle the stats request using AppController's getStats method
router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);

// Export the router for use in other parts of your application
export default router;
