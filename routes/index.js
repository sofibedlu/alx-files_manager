import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

// Create a new router instance using Express Router
const router = express.Router();

// '/status' route to handle the status request using AppController's getStatus method
router.get('/status', AppController.getStatus);

// '/stats' route to handle the stats request using AppController's getStats method
router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);

router.get('/connect', AuthController.getConnect);

router.get('/disconnect', AuthController.getDisconnect);

router.get('/users/me', UsersController.getMe);

// Export the router for use in other parts of your application
export default router;
