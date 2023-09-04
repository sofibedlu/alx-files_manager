import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import dbclient from '../utils/db';
import redisClient from '../utils/redis';

const UsersController = {
  postNew: async (req, res) => {
    try {
      // Extract email and password from the request body
      const { email, password } = req.body;

      // Check if email and password are provided
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if the email already exists in the database
      const existingUser = await dbclient.client.db().collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password using SHA1
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Create a new user object
      const newUser = {
        email,
        password: hashedPassword,
      };

      // Insert the new user into the 'users' collection
      const result = await dbclient.insertUser(newUser);

      // Return the newly created user with only the email and id
      const createdUser = {
        id: result.insertedId,
        email,
      };

      res.status(201).json(createdUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  getMe: async (req, res) => {
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

      // Create an ObjectId from the userId string
      const objectIdUserId = new ObjectId(userId);

      // Find the user in the database by ID
      const user = await dbclient.client.db().collection('users').findOne({ _id: objectIdUserId });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Return the user object with email and id only
      const { email, _id } = user;
      res.status(200).json({ id: _id, email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },
};

export default UsersController;
