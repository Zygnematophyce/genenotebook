/*eslint dot-notation: ["error", { "allowPattern": "^[a-z]+(_[a-z]+)+$" }]*/
import { diamondCollection } from '/imports/api/genes/diamond/diamondCollection.js';
import { Genes } from '/imports/api/genes/geneCollection.js';
import logger from '/imports/api/util/logger.js';

class DiamondXmlProcessor {
  constructor() {
    this.genesDb = Genes.rawCollection();
  }

  parse = (obj) => {
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
            logger.log(`Subfeature : ${iter} is found !`);

            // Update or insert if no matching documents were found.
            const documentDiamond = diamondCollection.upsert(
              { iteration_query: iter }, // selector.
              {
                $set: // modifier.
                {
                  iteration_query: iter,
                },
              },
            );

            // Search document ID only once and update diamondId in genes database.
            let createHit = true;
            let diamondId;
            if (typeof documentDiamond.insertedId === 'undefined') {
              createHit = false;
              // Diamond already exists.
              const diamondIdentifiant = diamondCollection.findOne({ 'iteration_query': iter })._id;
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
              const hitId = hit['hit_id'];
              const hitDef = hit['hit_def'];
              const hitAccession = hit['hit_accession'];

              // Specific query details.
              const hitHspScore = hit['hit_hsps']['hsp_score'];
              const hitEvalue = hit['hit_hsps']['hsp_evalue'];
              const hitQueryFrom = hit['hit_hsps']['hsp_query-from'];
              const hitQueryTo = hit['hit_hsps']['hsp_query-to'];
              const hitLength = hit['hit_hsps']['hsp_align-len'];
              const hitIdentity = hit['hit_hsps']['hsp_identity'];
              const hitQuerySeq = hit['hit_hsps']['hsp_qseq'];
              const hitMidline = hit['hit_hsps']['hsp_midline'];
              const hitPositive = hit['hit_hsps']['hsp_positive'];

              // Organize diamont data in a dictionary.
              const iterations = {
                num: hitNumber,
                id: hitId,
                def: hitDef,
                accession: hitAccession,
                length: hitLength,
                'bit-score': hitHspScore,
                evalue: hitEvalue,
                'query-from': hitQueryFrom,
                'query-to': hitQueryTo,
                identity: hitIdentity,
                positive: hitPositive,
                'query-seq': hitQuerySeq,
                midline: hitMidline,
              };

              // Update or create if no matching documents were found.
              if (createHit) {
                diamondCollection.update(
                  { iteration_query: iter },
                  {
                    $push: {
                      iteration_hits: iterations,
                    },
                  },
                );
              } else {
                diamondCollection.update(
                  { _id: diamondId },
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

export default DiamondXmlProcessor;