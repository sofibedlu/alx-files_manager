import redis from 'redis';
import util from 'util';

class RedisClient {
  constructor() {
    // Create a Redis client and handle any errors
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.log('Redis Client Error:', error);
    });
  }

  // Check if the Redis connection is alive
  isAlive() {
    return this.client.connected;
  }

  /**
   * Asynchronously retrieve a value from Redis by key.
   * @param {string} key - The key to retrieve the value for.
   * @returns {Promise<string>} A Promise that resolves to the value
   * associated with the key, or rejects on error.
   */
  async get(key) {
    return util.promisify(this.client.get).bind(this.client)(key);
  }

  /**
   * Asynchronously set a value in Redis with an expiration time.
   * @param {string} key - The key to set.
   * @param {string} value - The value to store.
   * @param {number} exp - The expiration time in seconds.
   * @returns {Promise<void>} A Promise that resolves when the value is
   * successfully set, or rejects on error.
   */
  async set(key, value, exp) {
    await util.promisify(this.client.setex)
      .bind(this.client)(key, exp, value);
  }

  /**
   * Asynchronously delete a value from Redis by key.
   * @param {string} key - The key to delete.
   * @returns {Promise<number>} A Promise that resolves to the number of keys
   * deleted (0 or 1), or rejects on error.
   */
  async del(key) {
    await util.promisify(this.client.del).bind(this.client)(key);
  }
}

// Create an instance of RedisClient
const redisClient = new RedisClient();

// Export the instance
export default redisClient;
