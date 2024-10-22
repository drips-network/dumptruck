import { Storage } from '@google-cloud/storage';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const DUMP_FILE = `${
  process.env.DUMP_FILE_PREFIX
}${new Date().toISOString()}.tar`;

const execAsync = promisify(exec);

async function createDatabaseDump() {
  try {
    console.log('Creating database dump...');

    const dumpCommand = `pg_dump --dbname=${process.env.BACKUP_DATABASE_URL} -f ${DUMP_FILE}  -F t`;
    await execAsync(dumpCommand);

    console.log('Database dump created successfully.');
  } catch (error) {
    console.error('Error creating database dump:', error);

    throw error;
  }
}

async function uploadToGcs() {
  const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: { ...JSON.parse(process.env.GCP_CREDENTIALS!) },
  });

  const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

  try {
    console.log('Uploading file to Google Cloud Storage...');

    await bucket.upload(DUMP_FILE, {
      destination: path.basename(DUMP_FILE),
    });

    console.log('File uploaded to Google Cloud Storage.');
  } catch (error) {
    console.error('Error uploading file to GCS:', error);

    throw error;
  }
}

async function main() {
  try {
    await createDatabaseDump();
    await uploadToGcs();
    fs.unlinkSync(DUMP_FILE);

    console.log('Backup completed successfully (local file removed).');
  } catch (error) {
    console.error('Error:', error);
  }
}

(async () => {
  await main();
})();
