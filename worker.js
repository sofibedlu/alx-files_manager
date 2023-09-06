/* eslint-disable no-await-in-loop */

import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbclient from './utils/db';

const { ObjectId } = require('mongodb');

// Create a Bull queue instance
const fileQueue = new Bull('thumbnailQueue');

// Process the queue
fileQueue.process(async (job, done) => {
  try {
    console.log('Starting thumbnail generation...');
    const { userId, fileId } = job.data;

    if (!fileId) {
      throw new Error('Missing fileId');
    }

    if (!userId) {
      throw new Error('Missing userId');
    }
    // Check if the file document exists in the database based on fileId and userId
    const fileDocument = await dbclient.client
      .db()
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: new ObjectId(userId) });

    const { localPath } = fileDocument;

    // Read the file
    const imageData = fs.readFileSync(localPath, 'base64');

    // Generate thumbnails with widths of 500, 250, and 100 and save them
    const thumbnailSizes = [500, 250, 100];
    for (const size of thumbnailSizes) {
      // Generate a thumbnail with a specific width while keeping the aspect ratio
      const width = size;
      const thumb = await imageThumbnail(imageData, { width });

      const thumbnailPath = `${localPath}_${size}`;

      // Save the thumbnail to a file
      fs.writeFileSync(thumbnailPath, thumb);
    }

    // Indicate that the job is done
    done();
  } catch (error) {
    // Handle errors here and pass them to done() to indicate failure
    done(error);
  }
});
