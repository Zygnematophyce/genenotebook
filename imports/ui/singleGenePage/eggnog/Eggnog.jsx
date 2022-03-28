import React, { useEffect, useState } from 'react';
import { branch, compose } from '/imports/ui/util/uiUtil.jsx';
import { Genes } from '/imports/api/genes/geneCollection.js';
import { withTracker } from 'meteor/react-meteor-data';
import logger from '/imports/api/util/logger.js';
import './eggnog.scss';

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

function EggnogGeneralInformations({ informations }) {
  const maxChar = 70;
  const infoIsArray = Array.isArray(informations);
  const isMaxArray = informations.length > 0;
  const isMaxChar = informations.length > 70;

  const [openInfo, setOpenInfo] = useState(false);
  const [descArray, setDescArray] = useState([]);
  const [descChar, setDescChar] = useState('');

  useEffect(() => {
    if (infoIsArray) {
      if (openInfo) {
        setDescArray(informations);
      } else {
        setDescArray([informations[0]]);
      }
    } else {
      if (informations.length > maxChar) {
        if (!openInfo) {
          const descNoArray = informations
            ? `${informations.slice(0, maxChar)} ... `
            : informations;
          setDescChar(descNoArray);
        } else {
          setDescChar(informations);
        }
      } else {
        setDescChar(informations);
      }
    }
  }, [openInfo]);

  const buttonText = (() => {
    if (infoIsArray) {
      if (openInfo) {
        return 'Show less';
      }
      return `Show ${informations.length - 1} more ...`;
    } else {
      if (openInfo) {
        return 'Show less';
      }
      return 'Show more ...';
    }
  })();

  return (
    <>
      {
        infoIsArray
          ? (
            <ul>
              { descArray.map((value, index) => (
                <li key={index}>{ value }</li>
              ))}
            </ul>
          )
          : (
            <p>{ descChar }</p>
          )
      }
      { (isMaxArray && infoIsArray) || (isMaxChar && !infoIsArray)
        ? (
          <button
            type="button"
            className="is-link"
            onClick={() => setOpenInfo(!openInfo)}
          >
            <small>{ buttonText }</small>
          </button>
        ) : null }
    </>
  );
}

function eggnogDataTracker({ gene }) {
  const eggnogAnnotation = Genes.findOne({ ID: gene.ID }).eggnog;
  const eggnog = (Object.keys(eggnogAnnotation).length === 0 ? undefined : eggnogAnnotation);
  return {
    gene,
    eggnog,
  };
}

function SeedEggNOGOrtholog({ seed, evalue, score }) {
  const uniprotUrl = 'https://www.uniprot.org/uniprot/';

  // Split to get uniprot id (eg. 36080.S2K726  -> S2K726).
  const identifiant = seed.split('.')[1];

  // If found 'e' transforms into exponential.
  const eggnogEvalue = (evalue.indexOf('e') > -1
    ? (
      <span>
        {evalue.split('e')[0]}
        {'\u2091'}
        <sup>
          {evalue.split('e')[1]}
        </sup>
      </span>
    )
    : <span>evalue</span>);

  return (
    <td className="seed_eggnog_ortholog_table">
      <a href={uniprotUrl.concat(identifiant)} target="_blank" rel="noreferrer">
        { seed }
      </a>
      <p>evalue: { eggnogEvalue }</p>
      <p>score: { score }</p>
    </td>
  );
}

function EggnogOGsComponent({ values }) {
  const eggnog5Url = 'http://eggnog5.embl.de/#/app/results?target_nogs=';

  // Split values and get eggnog id. (COG0563@1|root -> COG0563).
  const eggnogOGsSplit = (Array.isArray(values)
    ? values.map((val) => val.split('|')[0].split('@')[0])
    : values.split('|')[0]
  );

  // Create array or not of <a> tag with the correct url.
  const eggOgsUrl = (Array.isArray(eggnogOGsSplit)
    ? eggnogOGsSplit.map((eggS, index) => {
      return (
        <a href={eggnog5Url.concat(eggS)} target="_blank" rel="noreferrer">
          {values[index]}
        </a>
      );
    })
    : <a href={eggnog5Url.concat(eggnogOGsSplit)} target="_blank" rel="noreferrer">{values}</a>);

  return (
    <EggnogGeneralInformations informations={eggOgsUrl} />
  );
}

function MaxAnnotLvlComponent({ annot }) {
  const ncbiUrl = 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=';

  // Split to get ncbi id (eg. 4751|Fungi -> 4751).
  const maxAnnot = annot.split('|')[0];

  return (
    <a href={ncbiUrl.concat(maxAnnot)} target="_blank" rel="noreferrer">
      { annot }
    </a>
  );
}

function GogCategoryComponent({ category }) {
  const functionalClassifications = {
    A: 'RNA processing and modification',
    B: 'Chromatin Structure and dynamics',
    C: 'Energy production and conversion',
    D: 'Cell cycle control and mitosis',
    E: 'Amino Acid metabolis and transport',
    F: 'Nucleotide metabolism and transport',
    G: 'Carbohydrate metabolism and transport',
    H: 'Coenzyme metabolis',
    I: 'Lipid metabolism',
    J: 'Tranlsation',
    K: 'Transcription',
    L: 'Replication and repair',
    M: 'Cell wall/membrane/envelop biogenesis',
    N: 'Cell motility',
    O: 'Post-translational modification, protein turnover, chaperone functions',
    P: 'Inorganic ion transport and metabolism',
    Q: 'Secondary Structure',
    T: ' Signal Transduction',
    U: 'Intracellular trafficing and secretion',
    Y: 'Nuclear structure',
    Z: 'Cytoskeleton',
    R: 'General Functional Prediction only',
    S: 'Function Unknown',
  };

  const description = functionalClassifications[`${category}`];

  return (
    <div className="gogcategory">
      <p>
        { category }
      </p>
      {
        description
          ? (
            <p>
              <span>(</span>
              { description }
              <span>)</span>
            </p>
          )
          : null
      }
    </div>
  );
}

function LinkedComponent({ values, url }) {
  const linkUrl = (url === undefined ? '' : url);

  const linkedAttribute = (Array.isArray(values)
    ? values.map((val) => {
      return (
        <a href={linkUrl.concat(val)} target="_blank" rel="noreferrer">
          {val}
        </a>
      );
    })
    : (
      <a href={linkUrl.concat(values)} target="_blank" rel="noreferrer">
        {values}
      </a>
    ));

  return (
    <EggnogGeneralInformations informations={linkedAttribute} />
  );
}

function ArrayEggnogAnnotations({ eggnog }) {
  return (
    <div>
      <table className="table-eggnog table is-hoverable is-striped ">
        <tbody>
          <tr>
            <td>Seed eggnog ortholog</td>
            <SeedEggNOGOrtholog
              seed={eggnog.seed_eggNOG_ortholog}
              evalue={eggnog.seed_ortholog_evalue}
              score={eggnog.seed_ortholog_score}
            />
          </tr>
          <tr>
            <td>eggNOG OGs</td>
            <td>
              <EggnogOGsComponent values={eggnog.eggNOG_OGs} />
            </td>
          </tr>
          <tr>
            <td>max annot lvl</td>
            <td>
              <MaxAnnotLvlComponent annot={eggnog.max_annot_lvl} />
            </td>
          </tr>
          <tr>
            <td>COG category</td>
            <td>
              <GogCategoryComponent category={eggnog.COG_category} />
            </td>
          </tr>
          <tr>
            <td>Description</td>
            <td><EggnogGeneralInformations informations={eggnog.Description} /></td>
          </tr>
          <tr>
            <td>Preferred name</td>
            <td>{eggnog.Preferred_name}</td>
          </tr>
          <tr>
            <td>GOs</td>
            <td className="scrolling-goterms">
              <LinkedComponent values={eggnog.GOs} url="http://amigo.geneontology.org/amigo/term/" />
            </td>
          </tr>
          <tr>
            <td>EC</td>
            <td>
              <LinkedComponent values={eggnog.EC} url="https://enzyme.expasy.org/EC/" />
            </td>
          </tr>
          <tr>
            <td>KEGG ko</td>
            <td>
              <LinkedComponent values={eggnog.KEGG_ko} url="https://kegg_ko.com/" />
            </td>
          </tr>
          <tr>
            <td>KEGG Pathway</td>
            <td>
              <LinkedComponent values={eggnog.KEGG_Pathway} url="https://kegg_pathway.com/" />
            </td>
          </tr>
          <tr>
            <td>KEGG Reaction</td>
            <td>
              <LinkedComponent values={eggnog.KEGG_Reaction} />
            </td>
          </tr>
          <tr>
            <td>KEGG rclass</td>
            <td>
              <EggnogGeneralInformations informations={eggnog.KEGG_rclass} />
            </td>
          </tr>
          <tr>
            <td>BRITE</td>
            <td>
              <LinkedComponent values={eggnog.BRITE} />
            </td>
          </tr>
          <tr>
            <td>KEGG TC</td>
            <td>
              <LinkedComponent values={eggnog.KEGG_TC} />
            </td>
          </tr>
          <tr>
            <td>CAZy</td>
            <td>
              <LinkedComponent values={eggnog.CAZy} />
            </td>
          </tr>
          <tr>
            <td>BiGG Reaction</td>
            <td>
              <LinkedComponent values={eggnog.Bigg_Reaction} />
            </td>
          </tr>
          <tr>
            <td>PFAMs</td>
            <td>
              <LinkedComponent values={eggnog.PFAMs} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EggNogAnnotation({ showHeader = false, eggnog }) {
  return (
    <>
      { showHeader && <Header />}
      <div>
        <ArrayEggnogAnnotations eggnog={eggnog} />
      </div>
    </>
  );
}

export default compose(
  withTracker(eggnogDataTracker),
  branch(hasNoEggnog, NoEggnog),
)(EggNogAnnotation);
