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
              { descArray.map((value) => (
                <li key={value}>{ value }</li>
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

function EggnogOGsComponent({ values }) {
  const eggnog5Url = "http://eggnog5.embl.de/#/app/results?target_nogs=";
}

function ArrayEggnogAnnotations({ eggnog }) {
  const attributes = Object.entries(eggnog).map(([key, value], index) => (
    <tr key={index}>
      <td key={key}>{key.replace(/_/g, ' ')}</td>
      <td key={value}>
        <EggnogGeneralInformations informations={value} />
      </td>
    </tr>
  ));
  return (
    <div>
      <table className="table-eggnog table is-hoverable is-striped ">
        <tbody>
          <tr>
            <td>Test :</td>
            <td>{ eggnog.query_name }</td>
          </tr>
          <tr>
            <td>eggNOG OGs Tableau :</td>
            <td>{ eggnog.eggNOG_OGs }</td>
          </tr>
          {attributes}
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
