import dbclient from '../utils/db';
import redisClient from '../utils/redis';

const AppController = {
  /**
   * Get the status of Redis and the database.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  getStatus: async (req, res) => {
    try {
      const redisStatus = redisClient.isAlive();
      const dbStatus = dbclient.isAlive();

      res.status(200).json({ redis: redisStatus, db: dbStatus });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  /**
   * Get statistics about users and files in the database.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  getStats: async (req, res) => {
    try {
      // Use the provided methods from db.js to count users and files
      const userCount = await dbclient.nbUsers();
      const fileCount = await dbclient.nbFiles();

      res.status(200).json({ users: userCount, files: fileCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default AppController;
