import express from 'express';
import routes from './routes/index';

// Create an instance of the Express application
const app = express();

// Define the port for the server to listen on, using either the environment
// variable PORT or 5000 as the default
const port = process.env.PORT || 5000;

// Use the routes defined in 'routes/index.js' for handling incoming requests
app.use('/', routes);

// Start the Express server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Export the Express application for potential use in other parts of your application
export default app;
