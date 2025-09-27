import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class MongodbService {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  private cached = (global as any).mongoose;

  constructor() {
    if (!this.cached) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (this.cached.conn) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return this.cached.conn;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!this.cached.promise) {
      const opts = {
        bufferCommands: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.cached.promise = mongoose
        .connect(MONGODB_URI, opts)
        .then((mongoose) => {
          return mongoose;
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.cached.conn = await this.cached.promise;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return this.cached.conn;
  }
}
