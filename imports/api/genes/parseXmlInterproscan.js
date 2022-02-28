import { InterproscanProcessor } from '/imports/api/genes/addInterproscan.js';
import logger from '/imports/api/util/logger.js';

// https://stackoverflow.com/questions/26377099/split-large-xml-file-with-node-js
// https://github.com/assistunion/xml-stream
// https://github.com/matthewmatician/xml-flow

class ParseXmlFile extends InterproscanProcessor {
  parse = (line) => {
    logger.log(line);
  };
}

export default ParseXmlFile;
