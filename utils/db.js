import mongodb from 'mongodb';

// DBClient class for MongoDB operation
class DBClient {
  /**
   * Constructor for the DBClient class.
   * Initializes a connection to the MongoDB server based on environment variable.
   */
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}/${database}`;

    // Create a MongoDB client with unified topology
    this.client = new mongodb.MongoClient(uri, { useUnifiedTopology: true });

    // Connect to the MongoDB server
    this.client.connect((err) => {
      if (err) {
        console.error('Error connecting to MongoDB:', err);
        throw err;
      }
    });
  }

  /**
   * Checks if the connection to MongoDB is alive.
   * @returns {boolean} True if connected, false otherwise.
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Retrieves the number of documents in the 'users' collection.
   * @returns {Promise<number>} Number of documents in 'users' collection.
   */
  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  /**
   * Retrieves the number of documents in the 'files' collection.
   * @returns {Promise<number>} Number of documents in 'files' collection.
   */
  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

  /**
   * Insert a new user into the 'users' collection.
   * @param {Object} user - The user object to insert.
   * @returns {Promise} A Promise that resolves when the user is successfully inserted.
   */
  async insertUser(user) {
    return this.client.db().collection('users').insertOne(user);
  }
}

// Create and export an instance of DBClient
const dbclient = new DBClient();

export default dbclient;
