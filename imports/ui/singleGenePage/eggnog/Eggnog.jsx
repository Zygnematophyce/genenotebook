import React, { useState } from 'react';
import { branch, compose } from '/imports/ui/util/uiUtil.jsx';
import { eggnogCollection } from '/imports/api/genes/eggnog/eggnogCollection.js';
import { dbxrefCollection } from '/imports/api/genes/dbxrefCollection.js';
import { Genes } from '/imports/api/genes/geneCollection.js';
import { withTracker } from 'meteor/react-meteor-data';
import logger from '/imports/api/util/logger.js';
import { Meteor } from 'meteor/meteor';
import './eggnog.scss';

// query seed_ortholog evalue score eggNOG_OGs max_annot_lvl COG_category
// Description Preferred_name GOs EC KEGG_ko KEGG_Pathway KEGG_Module
// KEGG_Reaction KEGG_rclass BRITE KEGG_TC CAZy BiGG_Reaction PFAMs

function Header() {
  return (
    <>
      <hr />
      <h4 className="subtitle is-4">EggNog Annotations</h4>
    </>
  );
}

function hasNoEggnog({ eggnog }) {
  return typeof eggnog === 'undefined';
}

function NoEggnog({ showHeader }) {
  return (
    <>
      {showHeader && <Header />}
      <article className="message no-orthogroup" role="alert">
        <div className="message-body">
          <p className="has-text-grey">No eggnog annotations found</p>
        </div>
      </article>
    </>
  );
}

function DescriptionAttribute({ descriptionValue }) {
  const maxLength = 80;
  const [isDescription, setIsDescription] = useState(false);
  const isMaxLength = String(descriptionValue).length > maxLength;
  const showDescription = isDescription
    ? descriptionValue
    : `${descriptionValue.slice(0, maxLength)} ... `;
  const buttonText = isDescription ? 'Show less' : 'Show more ...';

  return (
    <>
      <p>{ showDescription }</p>
      {isMaxLength
       && (
         <button
           type="button"
           className="is-link"
           onClick={() => setIsDescription(!isDescription)}
         >
           <small>{ buttonText }</small>
         </button>
       )}
    </>
  );
}

function eggnogDataTracker({ gene }) {
  Meteor.subscribe('eggnog');
  logger.log('Genes.findOne :', Genes.findOne({ ID: 'MMUCEDO_006643' }));
  //logger.log('dbxrefCollection.findOne :', dbxrefCollection.findOne({ dbxrefId: 'InterPro:IPR028587' }));
  logger.log('eggnogCollection.findOne :', eggnogCollection.findOne({ EC: '2.7.4.3' }));
  return {
    gene,
  };
}

function ArrayEggnogAnnotation() {
  return (
    <div>
      <table className="table-eggnog table is-hoverable is-striped ">
        <tbody>
          <tr>
            <td>Gene ID</td>
            <td>MMUCEDO_000078-T1</td>
          </tr>
          <tr>
            <td>seed ortholog</td>
            <td>36080.S2K4B6</td>
          </tr>
          <tr>
            <td>evalue</td>
            <td>1.21e-287</td>
          </tr>
          <tr>
            <td>score</td>
            <td>794.0</td>
          </tr>
          <tr>
            <td>eggNOG OGs</td>
            <td>
              KOG2635@1 root,KOG2635@2759 Eukaryota,38CXD@33154
              Opisthokonta,3NUZ9@4751 Fungi,1GTC1@112252 Fungi incertae sedis
            </td>
          </tr>
          <tr>
            <td>max annot lvl</td>
            <td>4751 Fungi</td>
          </tr>
          <tr>
            <td>COG category</td>
            <td>U</td>
          </tr>
          <tr>
            <td>Description</td>
            <td>
              <DescriptionAttribute descriptionValue="The coatomer is a cytosolic protein complex that binds to dilysine motifs and reversibly associates with Golgi non- clathrin-coated vesicle which further mediate biosynthetic protein transport from the ER,  via the Golgi up to the trans Golgi network. Coatomer complex is required for budding from Golgi membranes, and is essential for the retrograde Golgi-to-ER transport of dilysine-tagged proteins" />
            </td>
          </tr>
          <tr>
            <td>Preferred name</td>
            <td>RET2</td>
          </tr>
          <tr>
            <td>GOs</td>
            <td>
              GO:0005575 GO:0005622 GO:0005623 GO:0005634 GO:0005737 GO:0005794
              GO:0005798 GO:0006810 GO:0006886 GO:0006888 GO:0006890 GO:0006996
              GO:0007030 GO:0008104 GO:0008150 GO:0009987 GO:0010256 GO:0012505
              GO:0012506 GO:0015031 GO:0015833 GO:0016020 GO:0016043 GO:0016192
              GO:0030117 GO:0030120 GO:0030126 GO:0030135 GO:0030137 GO:0030659
              GO:0030660 GO:0030662 GO:0030663 GO:0031090 GO:0031410 GO:0031982
              GO:0032991 GO:0033036 GO:0034613 GO:0042886 GO:0043226 GO:0043227
              GO:0043229 GO:0043231 GO:0044422 GO:0044424 GO:0044425 GO:0044431
              GO:0044433 GO:0044444 GO:0044446 GO:0044464 GO:0045184 GO:0046907
              GO:0048193 GO:0048308 GO:0048313 GO:0048475 GO:0051179 GO:0051234
              GO:0051640 GO:0051641 GO:0051645 GO:0051649 GO:0070727 GO:0071702
              GO:0071705 GO:0071840 GO:0097708 GO:0098588 GO:0098796 GO:0098805
            </td>
          </tr>
          <tr>
            <td>EC</td>
            <td>6.3.1.2</td>
          </tr>
          <tr>
            <td>KEGG ko</td>
            <td>ko:K01915</td>
          </tr>
          <tr>
            <td>KEGG Pathway</td>
            <td>
              ko00220 ko00250 ko00630 ko00910 ko01100 ko01120 ko01230 ko02020
              ko04217 ko04724 ko04727 map00220 map00250 map00630 map00910
              map01100 map01120 map01230 map02020 map04217 map04724 map04727
            </td>
          </tr>
          <tr>
            <td>KEGG Module</td>
            <td></td>
          </tr>
          <tr>
            <td>KEGG Reaction</td>
            <td>R00253</td>
          </tr>
          <tr>
            <td>KEGG rclass</td>
            <td></td>
          </tr>
          <tr>
            <td>BRITE</td>
            <td>ko00000 ko04131</td>
          </tr>
          <tr>
            <td>KEGG_TC</td>
            <td></td>
          </tr>
          <tr>
            <td>CAZy</td>
            <td></td>
          </tr>
          <tr>
            <td>BiGG Reaction</td>
            <td></td>
          </tr>
          <tr>
            <td>PFAMs</td>
            <td>Adap_comp_sub Clat_adaptor_s</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EggNogAnnotation({ showHeader = false }) {
  console.log("showHeader eggnog :", showHeader);
  return (
    <>
      { showHeader && <Header />}
      <div>
        <ArrayEggnogAnnotation />
      </div>
    </>
  );
}

export default compose(
  withTracker(eggnogDataTracker),
  branch(hasNoEggnog, NoEggnog),
)(EggNogAnnotation);
