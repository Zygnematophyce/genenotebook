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

function DescriptionAttribute({ descriptionValue }) {
  const maxLength = 70;
  const [isDescription, setIsDescription] = useState(false);
  const isMaxLength = String(descriptionValue).length > maxLength;

  useEffect(() => {
    if (isMaxLength) {
      setIsDescription(true);
    }
  }, []);

  const showDescription = isDescription
    ? `${descriptionValue.slice(0, maxLength)} ... `
    : descriptionValue;
  const buttonText = isDescription ? 'Show more ...' : 'Show less';

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
  const eggnogAnnotation = Genes.findOne({ ID: gene.ID }).eggnog;
  const eggnog = (Object.keys(eggnogAnnotation).length === 0 ? undefined : eggnogAnnotation);
  return {
    gene,
    eggnog,
  };
}

function ArrayEggnogAnnotations({ eggnog }) {
  const attributes = Object.entries(eggnog).map(([key, value], index) => (
    <tr key={index}>
      <td key={key}>{key}</td>
      <td key={value}>
        <DescriptionAttribute descriptionValue={value} />
      </td>
    </tr>
  ));
  return (
    <div>
      <table className="table-eggnog table is-hoverable is-striped ">
        <tbody>
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
