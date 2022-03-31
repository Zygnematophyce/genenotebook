/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { branch, compose } from '/imports/ui/util/uiUtil.jsx';
import { Genes } from '/imports/api/genes/geneCollection.js';
import { withTracker } from 'meteor/react-meteor-data';
import './eggnog.scss';

function Header() {
  return (
    <>
      <hr />
      <h4 className="subtitle is-4">eggNOG annotations</h4>
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

  // Change into html exponential unicode.
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
    : <span>{evalue}</span>);

  return (
    <td className="seed_eggnog_ortholog_table">
      <p>
        Seed:
        <a href={uniprotUrl.concat(identifiant)} target="_blank" rel="noreferrer">
          { seed }
        </a>
      </p>
      <p>
        evalue:
        <span>
          { eggnogEvalue }
        </span>
      </p>
      <p>
        score:
        <span>
          { score }
        </span>
      </p>
    </td>
  );
}

function EggnogOGs({ values }) {
  const eggnog5Url = 'http://eggnog5.embl.de/#/app/results?target_nogs=';
  const ncbiUrl = 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=';

  // Split values and get eggnog id. (COG0563@1|root -> COG0563).
  const eggnogOGsSplit = (Array.isArray(values)
    ? values.map((val) => val.split('@')[0])
    : values.split('@')[0]);

  // Create array or not of <a> tag with the full url.
  const eggOgsUrl = (Array.isArray(eggnogOGsSplit)
    ? eggnogOGsSplit.map((eggS, index) => {
      return (
        <div>
          <a
            href={ncbiUrl.concat(values[index].split('@')[1].split('|')[0])}
            target="_blank"
            rel="noreferrer"
          >
            {values[index].split('@')[1].split('|')[1]}
          </a>
          <span>:  </span>
          <a href={eggnog5Url.concat(eggS)} target="_blank" rel="noreferrer">
            {values[index].split('@')[0]}
          </a>
        </div>
      );
    })
    : (
      <div>
        <a
          href={ncbiUrl.concat(values.split('@')[1].split('|')[0])}
          target="_blank"
          rel="noreferrer"
        >
          {values.split('@')[1].split('|')[1]}
        </a>
        <span>:  </span>
        <a href={eggnog5Url.concat(values.split('@')[0])} target="_blank" rel="noreferrer">
          {values.split('@')[0]}
        </a>
      </div>
    ));

  return (
    <EggnogGeneralInformations informations={eggOgsUrl} />
  );
}

function MaxAnnotLvl({ annot }) {
  const ncbiUrl = 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=';

  // Split to get ncbi id (eg. 4751|Fungi -> 4751).
  const splitAnnot = annot.split('|');
  const maxAnnot = splitAnnot[0];
  const maxLevel = splitAnnot[1];

  return (
    <a href={ncbiUrl.concat(maxAnnot)} target="_blank" rel="noreferrer">
      { maxLevel }
    </a>
  );
}

function GogCategory({ category }) {
  // Based on
  // https://ecoliwiki.org/colipedia/index.php/Clusters_of_Orthologous_Groups_(COGs)
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

function KeggTC({ keggtc }) {
  const keggtcUrl = 'https://tcdb.org/search/result.php?tc=';
  const keggtcFullUrl = (Array.isArray(keggtc)
    ? keggtc.map((val) => {
      return (
        <a
          href={keggtcUrl.concat(val)}
          target="_blank"
          rel="noreferrer"
        >
          { val }
        </a>
      );
    })
    : <a href={keggtc.concat(keggtc)} target="_blank" rel="noreferrer">{ keggtc }</a>);

  return (
    <EggnogGeneralInformations informations={keggtcFullUrl} />
  );
}

function Cazy({ cazy }) {
  const cazyUrl = 'http://www.cazy.org/';
  const cazyFullUrl = (Array.isArray(cazy)
    ? cazy.map((val) => {
      return (
        <a
          href={cazyUrl.concat(cazy, '.html')}
          target="_blank"
          rel="noreferrer"
        >
          { val }
        </a>
      );
    })
    : <a href={cazyUrl.concat(cazy, '.html')} target="_blank" rel="noreferrer">{ cazy }</a>);

  return (
    <EggnogGeneralInformations informations={cazyFullUrl} />
  );
}

function BiggReaction({ reaction }) {
  // Based on: http://bigg.ucsd.edu/models/****/genes/****/
  const biggModelsUrl = 'http://bigg.ucsd.edu/models/';
  const biggGenesUrl = '/genes/';

  // Split bigg reaction to get models and genes id (eg. iMM904.YER091C ->
  // model: iMM904 and gene: YER091C) and create array or not of <a> tag with
  // full url.
  const biggReactionUrl = (Array.isArray(reaction)
    ? reaction.map((val) => {
      return (
        <a
          href={biggModelsUrl.concat(val.split('.')[0], biggGenesUrl, val.split('.')[1])}
          target="_blank"
          rel="noreferrer"
        >
          { val }
        </a>
      );
    })
    : <a href={biggModelsUrl.concat(reaction.split('.')[0], biggGenesUrl, reaction.split('.')[1])} target="_blank" rel="noreferrer">{ reaction }</a>);

  return (
    <EggnogGeneralInformations informations={biggReactionUrl} />
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

function EggnogGeneralInformations({ informations }) {
  const maxChar = 70;
  const maxArrayLines = 5;
  const infoIsArray = Array.isArray(informations);
  const isMaxArray = informations.length > maxArrayLines;
  const isMaxChar = informations.length > maxChar;

  const [openInfo, setOpenInfo] = useState(false);
  const [descArray, setDescArray] = useState([]);
  const [descChar, setDescChar] = useState('');

  useEffect(() => {
    if (infoIsArray) {
      if (openInfo) {
        setDescArray(informations);
      } else {
        setDescArray(informations.slice(0, maxArrayLines));
      }
    } else {
      if (informations.length > maxChar) {
        if (openInfo === false) {
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

function ArrayEggnogAnnotations({ eggnog }) {
  return (
    <div>
      <table className="table-eggnog table">
        <tbody>
          <tr>
            <th colSpan="2" className="is-light">
              General informations
            </th>
          </tr>
          <tr>
            <td>
              Seed
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                  ,
                </span>
                <p>
                  Best protein match in eggNOG.<br />
                </p>
              </div>

              evalue
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                  ,
                </span>
                <p>
                  Best protein match (e-value).<br />
                </p>
              </div>

              score
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                </span>
                <p>
                  Best protein match (bit-score).<br />
                </p>
              </div>
            </td>
            <SeedEggNOGOrtholog
              seed={eggnog.seed_eggNOG_ortholog}
              evalue={eggnog.seed_ortholog_evalue}
              score={eggnog.seed_ortholog_score}
            />
          </tr>
        </tbody>
      </table>
      <table className="table-eggnog table">
        <tbody>
          <tr>
            <th colSpan="2" className="is-light">
              eggNOG Orthologous Groups
            </th>
          </tr>
          <tr>
            <td>
              Orthologous Groups
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                </span>
                <p>
                  List of matching eggNOG Orthologous Groups.<br />
                </p>
              </div>
            </td>
            <td>
              <EggnogOGs values={eggnog.eggNOG_OGs} />
            </td>
          </tr>
          <tr>
            <td>Maximum annotation level</td>
            <td>
              <MaxAnnotLvl annot={eggnog.max_annot_lvl} />
            </td>
          </tr>
          <tr>
            <td>
              Clusters of Orthologous Groups category
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                </span>
                <p>
                  COG functional category inferred from best matching OGs.<br />
                </p>
              </div>
            </td>
            <td>
              <GogCategory category={eggnog.COG_category} />
            </td>
          </tr>
          <tr>
            <td>Description</td>
            <td>
              <EggnogGeneralInformations informations={eggnog.Description} />
            </td>
          </tr>
          <tr>
            <td>Preferred name</td>
            <td>{eggnog.Preferred_name}</td>
          </tr>
        </tbody>
      </table>
      <table className="table-eggnog table">
        <tbody>
          <tr>
            <th colSpan="2" className="is-light">
              Functional annotations
            </th>
          </tr>
          <tr>
            <td>
              Gene Ontology
              <div className="help-tip">
                <span>
                  {'\u24d8'}
                </span>
                <p>
                  List of predicted Gene Ontology terms.<br />
                </p>
              </div>
            </td>
            <td className="scrolling-goterms">
              <LinkedComponent
                values={eggnog.GOs}
                url="http://amigo.geneontology.org/amigo/term/"
              />
            </td>
          </tr>
          <tr>
            <td>Enzyme Commission</td>
            <td>
              <LinkedComponent
                values={eggnog.EC}
                url="https://enzyme.expasy.org/EC/"
              />
            </td>
          </tr>
          <tr>
            <td>KEGG ko</td>
            <td>
              <LinkedComponent
                values={eggnog.KEGG_ko}
                url="https://www.genome.jp/entry/"
              />
            </td>
          </tr>
          <tr>
            <td>KEGG pathway</td>
            <td>
              <LinkedComponent
                values={eggnog.KEGG_Pathway}
                url="https://www.genome.jp/entry/"
              />
            </td>
          </tr>
          <tr>
            <td>KEGG reaction</td>
            <td>
              <LinkedComponent
                values={eggnog.KEGG_Reaction}
                url="https://www.genome.jp/entry/"
              />
            </td>
          </tr>
          <tr>
            <td>KEGG rclass</td>
            <td>
              <LinkedComponent
                values={eggnog.KEGG_rclass}
                url="https://www.genome.jp/entry/"
              />
            </td>
          </tr>
          <tr>
            <td>BRITE</td>
            <td>
              <LinkedComponent
                values={eggnog.BRITE}
                url="https://www.genome.jp/brite/"
              />
            </td>
          </tr>
          <tr>
            <td>KEGG tc</td>
            <td>
              <KeggTC keggtc={eggnog.KEGG_TC} />
            </td>
          </tr>
          <tr>
            <td>CAZy</td>
            <td>
              <Cazy cazy={eggnog.CAZy} />
            </td>
          </tr>
          <tr>
            <td>BiGG reaction</td>
            <td>
              <BiggReaction reaction={eggnog.BiGG_Reaction} />
            </td>
          </tr>
          <tr>
            <td>PFAMs</td>
            <td>
              <LinkedComponent
                values={eggnog.PFAMs}
                url="https://pfam.xfam.org/family/"
              />
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
