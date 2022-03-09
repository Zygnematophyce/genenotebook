import jobQueue, { Job } from '/imports/api/jobqueue/jobqueue.js';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { eggnogCollection } from './eggnogCollection.js';
import logger from '/imports/api/util/logger.js';
import { Roles } from 'meteor/alanning:roles';
import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';

class EggnogProcessor {
  constructor() {
    this.bulkOp = eggnogCollection.rawCollection().initializeUnorderedBulkOp();
    logger.log('Eggnog Collection');
  }

  parse = (line) => {
    const fields = line.split('\t');
    logger.log('fields : ', fields);
  }

  finalize = () => this.bulkOp.execute();
}

const addEggnog = new ValidatedMethod({
  name: 'addEggnog',
  validate: new SimpleSchema({
    fileName: { type: String },
  }).validator(),
  applyOptions: {
    noRetry: true,
  },
  run({ fileName }) {
    if (!this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    if (!Roles.userIsInRole(this.userId, 'admin')) {
      throw new Meteor.Error('not-authorized');
    }

    console.log("file :", { fileName });
    const job = new Job(jobQueue, 'addEggnog', { fileName });
    const jobId = job.priority('high').save();

    let { status } = job.doc;
    logger.debug(`Job status: ${status}`);
    while (status !== 'completed') {
      const { doc } = job.refresh();
      status = doc.status;
    }

    return { result: job.doc.result };
  },
});

export default addEggnog;
export { EggnogProcessor };
