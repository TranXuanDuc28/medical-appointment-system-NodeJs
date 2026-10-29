import { createClient } from "redis";

let client = null;
let isRedisConnected = false;

// Fallback in-memory cache
const memoryCache = new Map();

export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          // Stop reconnecting after 3 failed attempts
          return false;
        }
        return Math.min(retries * 100, 1000);
      }
    }
  });

  client.on("error", (err) => {
    console.warn("⚠️ Redis client error, running on in-memory fallback cache:", err.message);
    isRedisConnected = false;
  });

  try {
    await client.connect();
    isRedisConnected = true;
    console.log("✅ Connected to Redis successfully!");
  } catch (error) {
    console.warn("⚠️ Could not connect to Redis. In-memory cache fallback is active.");
    isRedisConnected = false;
  }
};

export const getCache = async (key) => {
  if (isRedisConnected && client) {
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.error("Redis get error:", e);
    }
  }
  // Memory cache fallback
  const memVal = memoryCache.get(key);
  if (memVal && memVal.expiry > Date.now()) {
    return memVal.value;
  }
  if (memVal && memVal.expiry <= Date.now()) {
    memoryCache.delete(key);
  }
  return null;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && client) {
    try {
      await client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return;
    } catch (e) {
      console.error("Redis set error:", e);
    }
  }
  // Memory cache fallback
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
};

export const deleteCache = async (key) => {
  if (isRedisConnected && client) {
    try {
      await client.del(key);
      return;
    } catch (e) {
      console.error("Redis delete error:", e);
    }
  }
  memoryCache.delete(key);
};

export const clearCachePattern = async (pattern) => {
  if (isRedisConnected && client) {
    try {
      const keys = await client.keys(pattern);
      if (keys && keys.length > 0) {
        await client.del(keys);
        console.log(`[Redis Cache] Cleared ${keys.length} keys matching pattern: ${pattern}`);
      }
      return;
    } catch (e) {
      console.error("Redis clear cache pattern error:", e);
    }
  }
  // Memory cache pattern clearance
  const cleanPattern = pattern.replace("*", "");
  let clearedCount = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(cleanPattern)) {
      memoryCache.delete(key);
      clearedCount++;
    }
  }
  if (clearedCount > 0) {
    console.log(`[Memory Cache] Cleared ${clearedCount} keys matching pattern: ${pattern}`);
  }
};

export const cacheMiddleware = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();
    
    const key = `cache:${req.originalUrl || req.url}`;
    try {
      const cachedResponse = await getCache(key);
      if (cachedResponse) {
        console.log(`[Cache Hit] Serving from cache: ${key}`);
        return res.status(200).json(cachedResponse);
      }
    } catch (err) {
      console.error("Cache middleware read error:", err);
    }

    // Capture the original res.json response to store in cache
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode === 200 && body && body.errCode === 0) {
        // Cache asynchronous set without blocking response
        setCache(key, body, ttlSeconds).catch((err) =>
          console.error("Cache middleware set error:", err)
        );
      }
      return originalJson.call(this, body);
    };
    next();
  };
};

export const invalidateCache = async (prefixes = []) => {
  try {
    for (const prefix of prefixes) {
      await clearCachePattern(`cache:${prefix}*`);
    }
    // Tự động phát tín hiệu webhook sang Chatbot Service để làm mới dữ liệu
    try {
      const fetch = require("node-fetch");
      fetch("http://localhost:5002/api/webhook/sync_data", { method: "POST", timeout: 2000 }).catch(() => {});
    } catch (_) {}
  } catch (err) {
    console.error("Error invalidating cache:", err);
  }
};
