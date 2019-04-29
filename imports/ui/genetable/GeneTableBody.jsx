import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';

import React, { useEffect } from 'react';
import { compose } from 'recompose';
import dot from 'dot-object';
import { find } from 'lodash';

import { Genes } from '/imports/api/genes/gene_collection.js';

import { withEither } from '/imports/ui/util/uiUtil.jsx';

import Genemodel from '/imports/ui/singleGenePage/Genemodel.jsx';
import ProteinDomains from '/imports/ui/singleGenePage/ProteinDomains.jsx';
import GeneExpression from '/imports/ui/singleGenePage/geneExpression/GeneExpression.jsx';

import AttributeValue from '/imports/ui/genetable/columns/AttributeValue.jsx';
import GeneLink from '/imports/ui/genetable/columns/GeneLink.jsx';
import GenomeName from '/imports/ui/genetable/columns/GenomeName.jsx';

import './geneTableBody.scss';

const VISUALIZATIONS = {
  'Gene model': Genemodel,
  'Protein domains': ProteinDomains,
  'Gene expression': GeneExpression,
};

/**
 * Reactive Meteor tracker for GeneTable component
 * @param  {Object} options.query           [description]
 * @param  {Number} options.scrollLimit     [description]
 * @param  {Set} options.selectedGenes   [description]
 * @param  {Function} options.updateSelection [description]
 * @param  {Boolean} options.selectedAll     [description]
 * @return {Object}                         [description]
 */
function dataTracker({
  query = {},
  sort = { _id: -1 },
  limit = 40,
  selectedGenes,
  updateSelection,
  selectedAll,
}) {
  const geneSub = Meteor.subscribe('genes', { query, sort, limit });
  const loading = !geneSub.ready();
  const genes = Genes.find(query, { limit, sort }).fetch();

  return {
    genes,
    loading,
    selectedGenes,
    updateSelection,
    selectedAll,
  };
}

/**
 * [description]
 * @param  {[type]} props [description]
 * @return {[type]}       [description]
 */
function hasNoResults({ genes }) {
  return typeof genes === 'undefined' || genes.length === 0;
}

/**
 * [description]
 * @param  {[type]} props [description]
 * @return {[type]}       [description]
 */
function NoResults({ selectedColumns, ...props }) {
  const colSpan = selectedColumns.size + 3;
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan}>
          <div className="alert alert-danger" role="alert">
            Your query returned no results
          </div>
        </td>
      </tr>
    </tbody>
  );
}

/**
 * [description]
 * @param  {[type]} options.genes   [description]
 * @param  {[type]} options.loading [description]
 * @return {[type]}                 [description]
 */
function isLoading({ genes, loading }) {
  return loading && genes.length === 0;
}

/**
 * [description]
 * @param  {[type]}    options.selectedColumns [description]
 * @param  {...[type]} options.props           [description]
 * @return {[type]}                            [description]
 */
function Loading({ selectedColumns, ...props }) {
  const colSpan = selectedColumns.size + 3;
  return (
    <tbody>
      {Array(10)
        .fill()
        .map((_, i) => (
          <tr key={i}>
            <td colSpan={colSpan}>
              <div className="alert alert-light" role="alert">
                Loading...
              </div>
            </td>
          </tr>
        ))}
    </tbody>
  );
}

/**
 * [withConditionalRendering description]
 * @type {[type]}
 */
const withConditionalRendering = compose(
  withTracker(dataTracker),
  withEither(isLoading, Loading),
  withEither(hasNoResults, NoResults),
);

function AttributeColumn({ attributeName, attributeValue, geneId }) {
  switch (attributeName) {
    case 'Gene ID':
      return <GeneLink geneId={geneId} />;
    case 'Genome':
      return <GenomeName genomeId={attributeValue} />;
    default:
      return <AttributeValue attributeValue={attributeValue} />;
  }
}

/**
 * [description]
 * @param  {[type]} options.gene             [description]
 * @param  {[type]} options.selectedColumns  [description]
 * @param  {[type]} options.selectedAllGenes [description]
 * @param  {[type]} options.selectedGenes    [description]
 * @param  {[type]} options.updateSelection  [description]
 * @return {[type]}                          [description]
 */
function GeneTableRow({
  gene,
  selectedColumns,
  selectedAllGenes,
  selectedGenes,
  updateSelection,
  attributes,
  selectedVisualization,
}) {
  const selected = selectedAllGenes || selectedGenes.has(gene.ID);
  const color = selected ? 'black' : 'white';

  const DataVisualization = VISUALIZATIONS[selectedVisualization];

  return (
    <tr>
      {[...selectedColumns]
        .sort((a, b) => {
          if (a === 'Gene ID') return -1;
          if (b === 'Gene ID') return 1;
          return (`${a}`).localeCompare(b);
        })
        .map((attributeName) => {
          const attribute = find(attributes, { name: attributeName });
          const attributeValue = dot.pick(attribute.query, gene);
          return (
            <td key={attributeName} data-label={attributeName}>
              <AttributeColumn
                {...{ attributeName, attributeValue, geneId: gene.ID }}
              />
            </td>
          );
        })}
      <td data-label={selectedVisualization} style={{ width: '20rem' }}>
        <DataVisualization gene={gene} resizable height={100} />
      </td>
      <td>
        <button
          type="button"
          className="btn btn-sm btn-outline-dark pull-right px-1 py-0"
          id={gene.ID}
          onClick={updateSelection.bind(this)}
        >
          <span
            id={gene.ID}
            className="icon-check"
            aria-hidden="true"
            style={{ color }}
          />
        </button>
      </td>
    </tr>
  );
}

function GeneTableBody({
  genes, updateScrollLimit, limit, ...props
}) {
  useEffect(() => {
    function onScroll() {
      if (
        window.innerHeight + window.scrollY
        >= document.body.offsetHeight - 500
      ) {
        updateScrollLimit(limit + 10);
      }
    }
    window.addEventListener('scroll', onScroll, false);
    function cleanup() {
      window.removeEventListener('scroll', onScroll, false);
    }
    return cleanup;
  });

  return (
    <tbody className="genetable-body">
      {genes.map(gene => (
        <GeneTableRow key={gene.ID} gene={gene} {...props} />
      ))}
    </tbody>
  );
}

export default withConditionalRendering(GeneTableBody);
