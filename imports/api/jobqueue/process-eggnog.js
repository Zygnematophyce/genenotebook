import { EggnogProcessor } from '/imports/api/genes/eggnog/addEggnog.js';
import logger from '/imports/api/util/logger.js';
import jobQueue from './jobqueue.js';
import readline from 'readline';
import fs from 'fs';

jobQueue.processJobs(
  'addEggnog',
  {
    concurrency: 4,
    payload: 1,
  },
  async (job, callback) => {
    const { fileName } = job.data;
    logger.log(`Add ${fileName} eggnog file.`);

    const lineProcessor = new EggnogProcessor();

    const rl = readline.createInterface({
      input: fs.createReadStream(fileName, 'utf8'),
      crlfDelay: Infinity,
    });

    rl.on('line', async (line) => {
      try {
        lineProcessor.parse(line);
      } catch (err) {
        logger.error(err);
        job.fail({ err });
        callback();
      }
    });

    // Occurs when all lines are read.
    rl.on('close', async () => {
      try {
        logger.log('File reading finished');
        await lineProcessor.finalize();
        job.done();
      } catch (err) {
        logger.error(err);
        job.fail({ err });
      }
      callback();
    });
  },
);
