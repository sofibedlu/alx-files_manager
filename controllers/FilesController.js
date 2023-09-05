import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import dbclient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  postUpload: async (req, res) => {
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

      // Extract file information from the request body
      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      // Check for missing name
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      // Check for missing type or invalid type
      const acceptedTypes = ['folder', 'file', 'image'];
      if (!type || !acceptedTypes.includes(type)) {
        return res.status(400).json({ error: 'Missing or invalid type' });
      }

      // Check for missing data if type is not 'folder'
      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      // Check for a valid parent ID if parentId is set
      if (parentId !== 0) {
        const ObjectIdParentId = new ObjectId(parentId);
        const parentFile = await dbclient.client.db().collection('files')
          .findOne({ _id: ObjectIdParentId });

        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Create a local folder if it doesn't exist
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
      }

      // Create a local path with a UUID filename
      const fileName = `${uuidv4()}`;
      const localPath = path.join(FOLDER_PATH, fileName);

      // Store the file locally if it's not a folder
      if (type !== 'folder') {
        const fileData = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, fileData);
      }

      // Create a new file document in the 'files' collection
      let newFile;

      if (type !== 'folder') {
        newFile = {
          userId: new ObjectId(userId),
          name,
          type,
          isPublic,
          parentId: parentId !== 0 ? new ObjectId(parentId) : 0,
          localPath,
        };
      } else {
        newFile = {
          userId: new ObjectId(userId),
          name,
          type,
          isPublic,
          parentId: parentId !== 0 ? new ObjectId(parentId) : 0,
        };
      }

      const result = await dbclient.client.db().collection('files').insertOne(newFile);

      // Return the new file with a status code of 201
      const insertedFile = {
        id: result.ops[0]._id,
        userId: result.ops[0].userId,
        name: result.ops[0].name,
        type: result.ops[0].type,
        isPublic: result.ops[0].isPublic,
        parentId: result.ops[0].parentId,
      };
      res.status(201).json(insertedFile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },
};

export default FilesController;
