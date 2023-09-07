import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbclient from '../utils/db';
import isValidbase64 from '../utils/auth';

const AuthController = {
  getConnect: async (req, res) => {
    try {
      // Extract the Authorization header (Basic Auth)
      const authHeader = req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Extract and decode the base64 credentials
      const base64Credentials = authHeader.split(' ')[1];
      if (!isValidbase64(base64Credentials)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [email, password] = credentials.split(':');

      // Hash the password using SHA1
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Find the user in the database
      const user = await dbclient.client.db().collection('users')
        .findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a random token using uuidv4
      const token = uuidv4();

      // Create a Redis key for the user's token
      const redisKey = `auth_${token}`;

      // Store the user's ID in Redis with a 24-hour expiration
      await redisClient.set(redisKey, user._id.toString(), 24 * 60 * 60);

      // Return the generated token
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  getDisconnect: async (req, res) => {
    try {
      // Extract the X-Token header
      const authToken = req.header('X-Token');

      if (!authToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Retrieve the user's ID from Redis using the token
      const redisKey = `auth_${authToken}`;
      const userId = await redisClient.get(redisKey);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete the token from Redis
      await redisClient.del(redisKey);

      // Return a successful response with status code 204 (no content)
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },
};

export default AuthController;
