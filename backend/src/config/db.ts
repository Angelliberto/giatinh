import mongoose from 'mongoose';
import { env, mongoHostHint } from './env.js';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);

  const host = mongoHostHint(env.mongodbUri);
  console.log(`Connecting to MongoDB @ ${host} ...`);

  try {
    await mongoose.connect(env.mongodbUri);
    console.log('MongoDB connected');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
      console.error(`
MongoDB authentication failed for host: ${host}

Fix in Atlas:
  1. cloud.mongodb.com → Database Access
  2. Edit user → Edit Password → set a NEW password
  3. Put that exact password in MONGODB_URI in backend/.env
  4. Network Access → allow your IP (or 0.0.0.0/0 for testing)

URI shape:
  mongodb+srv://USER:PASSWORD@cluster0.aqndn.mongodb.net/giatinh?retryWrites=true&w=majority
`);
    }
    throw err;
  }
}
