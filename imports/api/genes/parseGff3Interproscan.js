import { InitializeGenes } from '/imports/api/genes/addInterproscan.js';
import { Meteor } from 'meteor/meteor';
import logger from '/imports/api/util/logger.js';
import {
  parseAttributeString, debugParseAttributeString, DBXREF_REGEX,
} from '/imports/api/util/util.js';

const logAttributeError = ({
  lineNumber, line, attributeString, error,
}) => {
  logger.warn(`Error line ${lineNumber}`);
  logger.warn(line.join('\t'));
  logger.warn(attributeString);
  logger.warn(debugParseAttributeString(attributeString));
  throw new Meteor.Error(error);
};

class ParseGff3File extends InitializeGenes {
  isProteinMatch = (type) => {
    if (type === 'protein_match') {
      return true;
    }
    return false;
  };

  parseAllAttributes = (attributes) => {
    if (attributes === undefined) {
      logger.warn('Undefined attributes:');
      return false;
    } else {
      let parseAttributes;
      try {
        parseAttributes = parseAttributeString(attributes);
      } catch (err) {
        throw new Meteor.Error(err);
      }
      return parseAttributes;
    }
  };

  parse = (line) => {
    // Check if the line is different of fasta sequence or others indications.
    if (!(line[0] === '#' || line.split('\t').length <= 1)) {
      const [seqId, source, type, start, end, score, , , attributeString, ] = line.split('\t');

      if (this.isProteinMatch(type)) {
        const attributes = this.parseAllAttributes(attributeString);
        if (attributes) {
          const dbUpdate = { $addToSet: {} };

          const {
            Name,
            Dbxref: _dbxref = [],
            OntologyTerm = [],
            signatureDescription = [],
          } = attributes;

          const proteinDomain = {
            start, end, source, score, name: Name[0],
          };

          // Return only expressions for Interproscan.
          const Dbxref = _dbxref
            .filter((xref) => DBXREF_REGEX.combined.test(xref));

          // Retrieve the interposcan ID (e.g: IPR001048 in InterPro:IPR001048).
          const interproIds = Dbxref
            .filter((xref) => /InterPro/.test(xref))
            .map((interproId) => {
              const [, id] = interproId.split(':');
              return id;
            });

          // Initializes the interproId and signatureDescription keys in proteinDomain.
          if (interproIds.length) {
            proteinDomain.interproId = interproIds[0];
          } else {
            proteinDomain.interproId = 'Unintegrated signature';
          }

          if (signatureDescription.length) {
            proteinDomain.signature_desc = signatureDescription[0];
          }

          // Add array of Dbxref (e.g : InterPro:IPR002376, KEGG:00670+2.1.2.9) in
          // proteinDomain and database.
          if (Dbxref.length) {
            proteinDomain.Dbxref = Dbxref;
            dbUpdate.$addToSet['attributes.Dbxref'] = { $each: Dbxref };
          }

          // e.g: GO:0009058","GO:0016742.
          if (OntologyTerm.length) {
            proteinDomain.Ontology_term = OntologyTerm;
            dbUpdate.$addToSet['attributes.Ontology_term'] = {
              $each: OntologyTerm,
            };
          }

          dbUpdate.$addToSet['subfeatures.$.protein_domains'] = proteinDomain;

          // Binds subfeatures.ID with the seqID of the .gff3 and update.
          this.bulkOp.find({ 'subfeatures.ID': seqId }).update(dbUpdate);
        }
      }
    }
  };
}

export default ParseGff3File;
