import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Controller class for handling application requests
class AppController {
  /**
   * Get the status of the application including the status of Redis and MongoDB.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   */
  static async getStatus(req, res) {
    // Check the status of Redis and MongoDB clients
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.isAlive();

    // Respond with a JSON object indicating the status
    if (redisStatus && dbStatus) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('{ "redis": true, "db": true }');
    } else {
      res.end();
    }
  }

  /**
   * Get statistics about the application including the number of users and files in the database.
   * @param {Request} req - The HTTP request object.
   * @param {Response} res - The HTTP response object.
   */
  static async getStats(req, res) {
    // Retrieve the number of users and files from the database
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();

    // Respond with a JSON object containing the statistics
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`{ "users": ${users}, "files": ${files} }`);
  }
}

export default AppController;
