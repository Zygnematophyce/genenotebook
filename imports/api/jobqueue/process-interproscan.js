import ParseGff3File from '/imports/api/genes/parseGff3Interproscan.js';
import ParseTsvFile from '/imports/api/genes/parseTsvInterproscan.js';
import ParseXmlFile from '/imports/api/genes/parseXmlInterproscan.js'
import logger from '/imports/api/util/logger.js';
import jobQueue from './jobqueue.js';
import readline from 'readline';
import fs from 'fs';
import XmlFlow from 'xml-flow';

const parseXml = async ({ stream, tag }, callback) => {
  return new Promise((resolve, reject) => {
    const xml = new XmlFlow(stream);

    xml.on(`tag:${tag}`, async (obj) => {
      await callback(obj);
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
        lineProcessor = new ParseXmlFile();
        break;
    }

    const stream = fs.createReadStream(fileName);
    const tag = 'protein';

    await parseXml({ stream, tag }, async (obj) => {
      const seqId = obj.xref.id;

      for (const item in obj.matches) {
        logger.log('item :', item);

        const proteinDomain = {};

        if (obj.matches[item].length) {
          for (const i in obj.matches[item]) {
            //logger.log(obj.matches[item][i].signature);

            // analysis (source in gff3).
            if (obj.matches[item][i].signature['signature-library-release']) {
              const analysis = obj.matches[item][i].signature['signature-library-release'].library;
              proteinDomain.source = analysis;
            }

            // signatureAccession (or name in gff3) and signatureDescription.
            if (obj.matches[item][i].signature.$attrs) {
              if (obj.matches[item][i].signature.$attrs.ac) {
                const signatureAccession = obj.matches[item][i].signature.$attrs.ac;
                proteinDomain.name = signatureAccession;
              }
              if (obj.matches[item][i].signature.$attrs.desc) {
                const signatureDescription = obj.matches[item][i].signature.$attrs.desc;
                proteinDomain.signature_desc = signatureDescription;
              }
            }

            // // start, stop (end in gff3) and score.
            // if (obj.matches[item][i].locations) {
            //   proteinDomain.start = obj.matches[item][i].locations.$attrs.start;
            //   proteinDomain.end = obj.matches[item][i].locations.$attrs.end;
            //   proteinDomain.score = obj.matches[item][i].locations.$attrs.score;
            //   // const key = Object.keys(obj.matches[item][i].locations)[0];
            //   // if (obj.matches[item][i].locations[key]) {
            //   //   // logger.log('key :', key);
            //   //   // logger.log("score ? : ", obj.matches[item][i].locations);

            //   // }
            // }

            // goAnnotation + pathwaysAnnotations.
            if (obj.matches[item][i].signature.entry) {
              // goAnnotation or (ontologyTerm in gff3).
              if (obj.matches[item][i].signature.entry['go-xref']) {
                const goXref = obj.matches[item][i].signature.entry['go-xref'];
                const ontologyTerm = (Array.isArray(goXref) ? goXref.map((el) => el.id) : [goXref.id]);
                // logger.log('ontologyTerm :', ontologyTerm);
              }

              // pathway-xref or pathwaysAnnotations.
              if (obj.matches[item][i].signature.entry['pathway-xref']) {
                const pathwayXref = obj.matches[item][i].signature.entry['pathway-xref'];
                const Dbxref = (Array.isArray(pathwayXref) ? pathwayXref.map((el) => `${el.db}:${el.id}`) : [`${pathwayXref.db}:${pathwayXref.id}`]);
                // logger.log('Dbxref :', Dbxref);
              }
            }

            // score
            logger.log("putain de putain")
            logger.log('if obj.matches[item]',obj.matches[item])
            logger.log('if obj.matches[item].$attrs', obj.matches[item].$attrs)
            logger.log('if array obj.matches[item]', Array.isArray(obj.matches[item]  ));


            if (obj.matches[item].$attrs) {
              if (!Array.isArray[item].$attrs) {
                logger.log('coucou1')
                if (obj.matches[item].$attrs.evalue) {
                  logger.log("jen ai marre")
                  proteinDomain.score = obj.matches[item].$attrs.evalue;
                }
              } else {
                logger.log("ca commence a devenir lourd")
                if (Array.isArray(obj.matches[item].locations)) {
                  for (const y in obj.matches[item].locations) {
                    if (obj.matches[item].locations[y].$attrs[y].evalue) {
                      proteinDomain.score = obj.matches[item].locations[y].$attrs[y].evalue;
                    }
                  }
                } else {
                  logger.log("azerar")
                  if (obj.matches[item].locations.$attrs.evalue) {
                    proteinDomain.score = obj.matches[item].locations.$attrs.evalue;
                  }
                }
              }
            } else if (Array.isArray(obj.matches[item])) {
              //logger.log('coucou2')

              if (obj.matches[item][i]) {
                //logger.log('coucou3aé')
                //logger.log(obj.matches[item][z])
                if (obj.matches[item][i].$attrs) {
                  if (obj.matches[item][i].$attrs.evalue) {
                    proteinDomain.score = obj.matches[item][i].$attrs.evalue;
                  }
                }
              }
              // if (obj.matches[item].$attrs) {
              //   logger.log('coucou2a')
              //   for (const y in obj.matches[item].$attrs) {
              //     if (obj.matches[item].$attrs[y].evalue) {
              //       proteinDomain.score = obj.matches[item].$attrs[y].evalue;
              //     }
              //   }
              // }
            }

            if (Array.isArray(obj.matches[item][i].locations)) {
              logger.log("a");
              for (const y in obj.matches[item][i].locations) {
                proteinDomain.start = obj.matches[item][i].locations[y].$attrs.start;
                proteinDomain.end = obj.matches[item][i].locations[y].$attrs.end;
                // if (obj.matches[item][i].$attrs[y].evalue) {
                //   proteinDomain.score = obj.matches[item][i].locations[y].$attrs[y].evalue;
                // }
                logger.log('proteinDomain :', proteinDomain);
              }
            } else {
              logger.log("b1");
              // logger.log('locations', obj.matches[item][i].locations);
              // logger.log('locations', obj.matches[item][i].locations.$attrs);
              proteinDomain.start = obj.matches[item][i].locations.$attrs.start;
              proteinDomain.end = obj.matches[item][i].locations.$attrs.end;
              // if (obj.matches[item][i].locations.$attrs.evalue) {
              //   proteinDomain.score = obj.matches[item][i].locations.$attrs.evalue;
              // }
              logger.log('proteinDomain :', proteinDomain);
            }
          }
        } else {
          if (obj.matches[item].signature['signature-library-release']) {
            const analysis = obj.matches[item].signature['signature-library-release'].library;
            proteinDomain.source = analysis;
          }
          if (obj.matches[item].signature.$attrs.ac) {
            const nameAc = obj.matches[item].signature.$attrs.ac;
            proteinDomain.name = nameAc;
          }
          // if (obj.matches[item].locations) {
          //   logger.log("? : ", obj.matches[item].locations);
          //   proteinDomain.start = obj.matches[item].locations.$attrs.start;
          //   proteinDomain.end = obj.matches[item].locations.$attrs.end;
          //   proteinDomain.score = obj.matches[item].locations.$attrs.score;
          //   // const key = Object.keys(obj.matches[item].locations)[0];
          //   // if (obj.matches[item].locations[key]) {
          //   //   proteinDomain.start = obj.matches[item].locations[key].start;
          //   //   proteinDomain.end = obj.matches[item].locations[key].end;
          //   //   proteinDomain.score = obj.matches[item].locations[key].score;
          //   // }
          // }

          // goAnnotation + pathwaysAnnotations.
          if (obj.matches[item].signature.entry) {
            // logger.log(obj.matches[item][i].signature.entry);

            // goAnnotation or (ontologyTerm in gff3).
            if (obj.matches[item].signature.entry['go-xref']) {
              const goXref = obj.matches[item].signature.entry['go-xref'];
              const ontologyTerm = (Array.isArray(goXref) ? goXref.map((el) => el.id) : [goXref.id]);
              // logger.log('ontologyTerm :', ontologyTerm);
            }

            // pathway-xref or pathwaysAnnotations.
            if (obj.matches[item].signature.entry['pathway-xref']) {
              const pathwayXref = obj.matches[item].signature.entry['pathway-xref'];
              const Dbxref = (Array.isArray(pathwayXref) ? pathwayXref.map((el) => `${el.db}:${el.id}`) : [`${pathwayXref.db}:${pathwayXref.id}`]);
              // logger.log('Dbxref :', Dbxref);
            }
          }


          // score
          if (obj.matches[item].$attrs) {
            if (obj.matches[item].$attrs.evalue) {
              proteinDomain.score = obj.matches[item].$attrs.evalue;
            } else {
              if (Array.isArray(obj.matches[item].locations)) {
                for (const y in obj.matches[item].locations) {
                  if (obj.matches[item].locations[y].$attrs[y].evalue) {
                    proteinDomain.score = obj.matches[item].locations[y].$attrs.evalue;
                  }
                }
              } else {
                if (obj.matches[item].locations.$attrs.evalue) {
                  proteinDomain.score = obj.matches[item].locations.$attrs.evalue;
                }
              }
            }
          }

          if (Array.isArray(obj.matches[item].locations)) {
            logger.log("c");
            logger.log("array locations :", obj.matches[item])
            for (const y in obj.matches[item].locations) {
              proteinDomain.start = obj.matches[item].locations[y].$attrs.start;
              proteinDomain.end = obj.matches[item].locations[y].$attrs.end;
              // logger.log("locations :", obj.matches[item].locations[y].$attrs);
              // if (obj.matches[item].locations[y].$attrs[y].evalue) {
              //   proteinDomain.score = obj.matches[item].locations[y].$attrs.evalue;
              // }
            
              logger.log('proteinDomain :', proteinDomain);
            }
          } else {
            logger.log("d");
            proteinDomain.start = obj.matches[item].locations.$attrs.start;
            proteinDomain.end = obj.matches[item].locations.$attrs.end;
            //proteinDomain.score = obj.matches[item].$attrs.evalue;
            // if (obj.matches[item].locations.$attrs.evalue) {
            //   proteinDomain.score = obj.matches[item].locations.$attrs.evalue;
            // }

            logger.log('proteinDomain :', proteinDomain);
          }

        }
        logger.log('-----------------------------------------');
      }
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
