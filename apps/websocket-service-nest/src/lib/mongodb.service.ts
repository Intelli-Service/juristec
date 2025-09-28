import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class MongodbService {
  private cached = (global as any).mongoose;

  constructor() {
    if (!this.cached) {
      this.cached = (global as any).mongoose = { conn: null, promise: null };
    }
  }

  async connect() {
    const MONGODB_URI = process.env.MONGODB_URI!;

    if (!MONGODB_URI) {
      throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local',
      );
    }

    if (this.cached.conn) {
      return this.cached.conn;
    }

    if (!this.cached.promise) {
      const opts = {
        bufferCommands: false,
      };

      this.cached.promise = mongoose
        .connect(MONGODB_URI, opts)
        .then((mongoose) => {
          return mongoose;
        });
    }

    this.cached.conn = await this.cached.promise;

    return this.cached.conn;
  }
}
