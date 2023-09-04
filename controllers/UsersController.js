import crypto from 'crypto';
import dbclient from '../utils/db';

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
};

export default UsersController;
