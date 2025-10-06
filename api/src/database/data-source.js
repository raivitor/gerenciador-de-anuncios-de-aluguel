import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV === 'development';

export const AppDataSource = new DataSource(
  isDevelopment
    ? {
        type: 'sqlite',
        database: path.join(__dirname, '../dev.sqlite'),
        entities: [path.join(__dirname, '../entity/*.js')],
        synchronize: true,
        logging: false,
      }
    : {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [path.join(__dirname, '../entity/*.js')],
        synchronize: false,
        logging: false,
      }
);
