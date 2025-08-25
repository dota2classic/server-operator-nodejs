import * as archiver from 'archiver';
import * as stream from 'stream';

export async function zipBuffer(fileBuffer, filenameInZip) {
  const archiveStream = new stream.PassThrough();
  const chunks = [];

  // Collect data chunks from the archive stream
  archiveStream.on('data', (chunk) => chunks.push(chunk));

  // Create a Promise to wait until the archive is finalized
  const archivePromise = new Promise((resolve, reject) => {
    archiveStream.on('end', resolve);
    archiveStream.on('error', reject);
  });

  // Initialize archiver
  const archive = archiver('zip', { zlib: { level: 9 } });

  // Pipe archiver output to our stream
  archive.pipe(archiveStream);

  // Append the buffer as a file in the ZIP
  archive.append(fileBuffer, { name: filenameInZip });

  // Finalize the archive (finish compression)
  await archive.finalize();

  // Wait until all data is collected
  await archivePromise;

  // Concatenate all chunks into a single Buffer
  return Buffer.concat(chunks);
}
