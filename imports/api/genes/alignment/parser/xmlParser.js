/*eslint dot-notation: ["error", { "allowPattern": "^[a-z]+(_[a-z]+)+$" }]*/
import { similarSequencesCollection } from '/imports/api/genes/alignment/similarSequenceCollection.js';
import { Genes } from '/imports/api/genes/geneCollection.js';
import logger from '/imports/api/util/logger.js';

/**
 * Read the xml stream from a BLAST or Diamond file.
 * @class
 * @constructor
 * @public
 * @param {string} program - The program used (BLAST or Diamond).
 * @param {string} algorithm - The algorithm used (blastx, blastp ...).
 * @param {string} matrix - The substitution matrix used for alignment (BLOSUM).
 * @param {string} database - The reference database (Non-redundant protein sequences (nr)).
 */
class XmlProcessor {
  constructor(program, algorithm, matrix, database) {
    this.genesDb = Genes.rawCollection();
    this.program = program;
    this.algorithm = algorithm;
    this.matrix = matrix;
    this.database = database;
  }

  /**
   * Filter the prefix matches the bank (gb, emb ...).
   * e.g: gb|KAG0740174.1| becomes KAG0740174.1.
   * @function
   * @param {string} str - The string.
   */
  filterPrefixBank = (str) => {
    const filter = (
      /\|/.test(str)
        ? str.split('|')[1]
        : str
    );
    return filter;
  };

  /**
   * Parse the XML file and collect the information.
   * @function
   * @param {stream} obj - The stream object of an XML file.
   */
  parse = (obj) => {
    if (this.algorithm === undefined) {
      if (obj['blastoutput_program'] !== undefined) {
        this.algorithm = obj['blastoutput_program'];
      } else {
        this.algorithm = undefined;
      }
    }

    if (this.matrix === undefined) {
      if (obj['blastoutput_param']['parameters_matrix'] !== undefined) {
        this.matrix = obj['blastoutput_param']['parameters_matrix'];
      } else {
        this.matrix = undefined;
      }
    }

    if (this.database === undefined) {
      if (obj['blastoutput_db'] !== undefined) {
        this.database = obj['blastoutput_db'];
      } else {
        this.database = undefined;
      }
    }

    if (obj['blastoutput_iterations'] !== undefined) {
      for (let i = 0; i < obj['blastoutput_iterations'].length; i += 1) {
        // Get iteration query e.g: 'MMUCEDO_000001-T1 MMUCEDO_000001'.
        const iterationQuery = obj['blastoutput_iterations'][i]['iteration_query-def'];

        // Split 'MMUCEDO_000001-T1 MMUCEDO_000001'.
        const splitIterationQuery = iterationQuery.split(' ');

        // Next, check if any of the queries exist in the genes collection.
        splitIterationQuery.forEach(async (iter) => {
          //
          const subfeatureIsFound = await this.genesDb.findOne(
            { 'subfeatures.ID': iter },
          );

          if (typeof subfeatureIsFound !== 'undefined' && subfeatureIsFound !== null) {
            // Get the total query sequence length.
            const queryLen = obj['blastoutput_iterations'][i]['iteration_query-len'];

            // Update or insert if no matching documents were found.
            const documentDiamond = similarSequencesCollection.upsert(
              { iteration_query: iter }, // selector.
              {
                $set: // modifier.
                {
                  program_ref: this.program,
                  algorithm_ref: this.algorithm,
                  matrix_ref: this.matrix,
                  database_ref: this.database,
                  iteration_query: iter,
                  query_len: queryLen,
                },
              },
            );

            // Search document ID only once and update diamondId in genes collection..
            let createHit = true;
            let diamondIdentifiant;
            if (typeof documentDiamond.insertedId === 'undefined') {
              createHit = false;
              // Diamond already exists.
              diamondIdentifiant = similarSequencesCollection.findOne({ 'iteration_query': iter })._id;
              this.genesDb.update(
                { 'subfeatures.ID': iter },
                { $set: { diamondId: diamondIdentifiant } },
              );
            } else {
              // Diamond _id is created.
              this.genesDb.update(
                { 'subfeatures.ID': iter },
                { $set: { diamondId: documentDiamond.insertedId } },
              );
            }

            // Here, get all diamond output informations.
            const iterationHits = obj['blastoutput_iterations'][i]['iteration_hits'];

            iterationHits.forEach((hit) => {
              // Global query details.
              const hitNumber = hit['hit_num'];

              const hitId = this.filterPrefixBank(hit['hit_id']);

              // Get the first description if there are identical proteins.
              const hitDef = (
                hit['hit_def'].split('>').length > 1
                  ? hit['hit_def'].split('>')[0]
                  : hit['hit_def']
              );

              // Check identical proteins.
              const identicalProteins = (
                hit['hit_def'].split('>').length > 1
                  ? hit['hit_def'].split('>').slice(1).map((ips) => (
                    {
                      def: ips,
                      id: this.filterPrefixBank(ips.split(' ')[0]),
                    }
                  ))
                  : undefined
              );

              const hitAccession = hit['hit_accession'];
              const hitLengthAccession = hit['hit_len'];

              // Specific query/hits details.
              const hitHspBitScore = hit['hit_hsps']['hsp_bit-score'];
              const hitHspScore = hit['hit_hsps']['hsp_score'];
              const hitEvalue = hit['hit_hsps']['hsp_evalue'];
              const QueryFrom = hit['hit_hsps']['hsp_query-from'];
              const QueryTo = hit['hit_hsps']['hsp_query-to'];
              const hitFrom = hit['hit_hsps']['hsp_hit-from'];
              const hitTo = hit['hit_hsps']['hsp_hit-to'];
              const hitLength = hit['hit_hsps']['hsp_align-len'];
              const hitIdentity = hit['hit_hsps']['hsp_identity'];
              const hitPositive = hit['hit_hsps']['hsp_positive'];
              const hitGaps = hit['hit_hsps']['hsp_gaps'];
              const querySeq = hit['hit_hsps']['hsp_qseq'];
              const hitMidline = hit['hit_hsps']['hsp_midline'];
              const hitSeq = hit['hit_hsps']['hsp_hseq'];

              // Organize diamont data in a dictionary.
              const iterations = {
                num: hitNumber,
                id: hitId,
                def: hitDef,
                identical_proteins: identicalProteins,
                accession: hitAccession,
                accession_len: hitLengthAccession,
                length: hitLength,
                'bit-score': hitHspBitScore,
                score: hitHspScore,
                evalue: hitEvalue,
                'query-from': QueryFrom,
                'query-to': QueryTo,
                'hit-from': hitFrom,
                'hit-to': hitTo,
                identity: hitIdentity,
                positive: hitPositive,
                gaps: hitGaps,
                'query-seq': querySeq,
                midline: hitMidline,
                'hit-seq': hitSeq,
              };

              // Update or create if no matching documents were found.
              if (createHit) {
                similarSequencesCollection.update(
                  { iteration_query: iter },
                  {
                    $push: {
                      iteration_hits: iterations,
                    },
                  },
                );
              } else {
                similarSequencesCollection.update(
                  { _id: diamondIdentifiant },
                  {
                    $addToSet: {
                      iteration_hits: iterations,
                    },
                  },
                );
              }
            });
          } else {
            logger.warn(`Warning ! No sub-feature was found for ${iter}.`);
          }
        });
      }
    }
  };
}

export default XmlProcessor;
