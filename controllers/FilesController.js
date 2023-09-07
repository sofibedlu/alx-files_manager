import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Bull from 'bull';
import dbclient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('thumbnailQueue');

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
        return res.status(400).json({ error: 'Missing type' });
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

      // Add a job to the queue for generating thumbnails if the file is an image
      if (type === 'image') {
        const fileId = result.ops[0]._id;
        fileQueue.add({ userId, fileId });
      }

      res.status(201).json(insertedFile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  getShow: async (req, res) => {
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

      // Extract the file ID from the route parameter
      const fileId = req.params.id;

      // Retrieve the file document based on the user's ID and the file ID
      const ObjectFileId = new ObjectId(fileId);
      const ObjectIdUserId = new ObjectId(userId);
      const file = await dbclient.client.db().collection('files')
        .findOne({ _id: ObjectFileId, userId: ObjectIdUserId });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Convert the document the 'file' to the desired format
      const formattedFile = {
        id: file._id, // Rename _id to id
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };

      // Return the file document
      res.status(200).json(formattedFile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  getIndex: async (req, res) => {
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

      // Extract query parameters for pagination
      const { parentId = 0, page = 0 } = req.query;
      const itemsPerPage = 20;
      const skip = parseInt(page, 10) * itemsPerPage;

      // Retrieve the list of file documents based on the user's ID and parentId with pagination
      const ObjectIdParentId = parentId !== 0 ? new ObjectId(parentId) : 0;
      const ObjectIdUserId = new ObjectId(userId);

      // Create the aggregation pipeline
      const pipeline = [
        { $match: { userId: ObjectIdUserId } }, // Match documents by userId

        // Conditionally include the $match stage for parentId when it's not equal to 0
        parentId !== 0
          ? { $match: { parentId: ObjectIdParentId } }
          : { $match: {} },

        { $skip: skip }, // Skip documents for pagination
        { $limit: itemsPerPage }, // Limit the number of documents per page
      ];

      // Perform the aggregation
      const files = await dbclient.client
        .db()
        .collection('files')
        .aggregate(pipeline)
        .toArray();

      // Convert the documents in the 'files' array to the desired format
      const formattedFiles = files.map((file) => ({
        id: file._id, // Rename _id to id
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));

      // Return the list of file documents
      res.status(200).json(formattedFiles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  putPublish: async (req, res) => {
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
      // Extract the file ID from the route parameter
      const fileId = req.params.id;

      // Retrieve the file document based on the user's ID and the file ID and update the value
      const ObjectIdFileId = new ObjectId(fileId);
      const ObjectIdUserId = new ObjectId(userId);
      const updatedFile = await dbclient.client.db().collection('files')
        .findOneAndUpdate(
          { _id: ObjectIdFileId, userId: ObjectIdUserId },
          { $set: { isPublic: true } },
          { returnOriginal: false }, // Return the updated document
        );

      if (!updatedFile.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Rename the _id field to id in the response with formatted..
      const formattedFile = {
        id: updatedFile.value._id,
        userId: updatedFile.value.userId,
        name: updatedFile.value.name,
        type: updatedFile.value.type,
        isPublic: updatedFile.value.isPublic,
        parentId: updatedFile.value.parentId,
      };

      // Return the updated file document with the desired format
      res.status(200).json(formattedFile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  putUnpublish: async (req, res) => {
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

      // Extract the file ID from the route parameter
      const fileId = req.params.id;

      // Retrieve the file document based on the user's ID and the file ID and update it
      const ObjectIdFileId = new ObjectId(fileId);
      const ObjectIdUserId = new ObjectId(userId);

      const updatedFile = await dbclient.client.db().collection('files')
        .findOneAndUpdate(
          { _id: ObjectIdFileId, userId: ObjectIdUserId },
          { $set: { isPublic: false } },
          { returnOriginal: false }, // Return the updated document
        );

      if (!updatedFile.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Rename the _id field to id in the response reformat the return
      const formattedFile = {
        id: updatedFile.value._id,
        userId: updatedFile.value.userId,
        name: updatedFile.value.name,
        type: updatedFile.value.type,
        isPublic: updatedFile.value.isPublic,
        parentId: updatedFile.value.parentId,
      };

      // Return the updated file document with the desired format
      res.status(200).json(formattedFile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },

  getFile: async (req, res) => {
    // Extract the file ID from the route parameter
    const fileId = req.params.id;
    const { size } = req.query;

    try {
      // Check if a file document exists with the given ID
      const file = await dbclient.client.db().collection('files').findOne({
        _id: ObjectId(fileId),
      });

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Extract the X-Token header
      const authToken = req.header('X-Token');
      // Retrieve the user's ID from Redis using the token
      const redisKey = `auth_${authToken}`;
      const userId = await redisClient.get(redisKey);

      // Check if the file is public or the user is the owner
      const isUserAuthorized = file.isPublic || (userId && file.userId.toString()
                === userId.toString());

      if (!isUserAuthorized) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if the file is not a folder
      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      // Get the local path of the file
      let { localPath } = file;

      // Update localPath if size is provided and valid
      if (size && ['500', '250', '100'].includes(size)) {
        localPath = `${localPath}_${size}`;
      }

      // Check if the file is locally present
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Determine the file's MIME type based on its name
      const mimeType = mime.lookup(file.name);

      // Read the file and send it as a response with the appropriate MIME type
      const fileStream = fs.createReadStream(localPath);
      res.setHeader('Content-Type', mimeType);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    // Add a default return statement here to satisfy ESLint
    return null;
  },
};

export default FilesController;
