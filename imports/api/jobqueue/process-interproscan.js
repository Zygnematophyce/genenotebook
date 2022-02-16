import ParseGff3File from '/imports/api/genes/parseGff3Interproscan.js';
import ParseTsvFile from '/imports/api/genes/parseTsvInterproscan.js';
import ParseXmlFile from '/imports/api/genes/parseXmlInterproscan.js'
import logger from '/imports/api/util/logger.js';
import jobQueue from './jobqueue.js';
import readline from 'readline';
import fs from 'fs';
import XmlStream from 'xml-stream';

const simpleXml = async ({ stream, tag }, callback) => {
  return new Promise((resolve, reject) => {
    const xml = new XmlStream(stream);

    xml.collect('profilescan-match');
    xml.on(`endElement: ${tag}`, async (obj) => {
      xml.pause();
      await callback(obj);
      xml.resume();
    });

    xml.on('end', () => {
      resolve();
    });

    xml.on('error', (error) => {
      reject(error);
    });
  });
};

jobQueue.processJobs(
  'addInterproscan',
  {
    concurrency: 4,
    payload: 1,
  },
  async (job, callback) => {
    const { fileName, parser } = job.data;
    logger.log(`Add ${fileName} interproscan file.`);

    // const rl = readline.createInterface({
    //   input: fs.createReadStream(fileName, 'utf8'),
    //   crlfDelay: Infinity,
    // });

    let lineProcessor;
    switch (parser) {
      case 'tsv':
        logger.log('Format : .tsv');
        lineProcessor = new ParseTsvFile();
        break;
      case 'gff3':
        logger.log('Format : .gff3');
        lineProcessor = new ParseGff3File();
        break;
      case 'xml':
        logger.log('Format : .xml');
        //lineProcessor = new ParseXmlFile();
        break;
    }

    const tag = 'protein';

    const stream = fs.createReadStream(fileName);

    await simpleXml({ stream: stream, tag: tag }, async (obj) => {
      logger.log(obj.xref.$.id);

      // Object.entries(items).map(item => {
      //   console.log(item)
      // })

      // for (const item in obj.matches) {
      //   logger.log('item :', item);
      //   // analysis (source in gff3).
      //   if (obj.matches[item].signature['signature-library-release'].$.library) {
      //     const analysis = obj.matches[item].signature['signature-library-release'].$.library;
      //     logger.log('analysis: ', analysis);
      //   }

      //   // signatureAccession or name in gff3
      //   if (obj.matches[item].signature.$.ac) {
      //     logger.log('name :', obj.matches[item].signature.$.ac);
      //   }

      //   // start and stop (end in gff3).
      //   if (obj.matches[item].locations) {
      //     const key = Object.keys(obj.matches[item].locations)[0];
      //     if (obj.matches[item].locations[key]) {
      //       logger.log('start :', obj.matches[item].locations[key].$.start);
      //       logger.log('end: ', obj.matches[item].locations[key].$.end);
      //       logger.log('score: ', obj.matches[item].locations[key].$.score);
      //     }
      //   }
      //   logger.log('-----------------------------------------');
      // }

      logger.log('-----------------------------------------');
      logger.log(obj);
    }).then(() => {
      job.done();
    });

    // let lineNbr = 0;

    // rl.on('line', async (line) => {
    //   lineNbr += 1;

    //   if (lineNbr % 10000 === 0) {
    //     logger.debug(`Processed ${lineNbr} lines`);
    //   }

    //   try {
    //     lineProcessor.parse(line);
    //   } catch (err) {
    //     logger.error(err);
    //     job.fail({ err });
    //     callback();
    //   }
    // });

    // // Occurs when all lines are read.
    // rl.on('close', async () => {
    //   try {
    //     logger.log('File reading finished');
    //     const { nMatched } = await lineProcessor.finalize();
    //     const nInserted = nMatched;
    //     logger.log(`Matched to ${nMatched} protein domain(s)`);
    //     job.done({ nInserted });
    //   } catch (err) {
    //     logger.error(err);
    //     job.fail({ err });
    //   }
    //   callback();
    // });
  },
);
