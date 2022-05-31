import { diamondCollection } from '/imports/api/genes/diamond/diamondCollection.js';
import ReactResizeDetector from 'react-resize-detector';
import { Genes } from '/imports/api/genes/geneCollection.js';
import { withTracker } from 'meteor/react-meteor-data';
import { branch, compose } from '/imports/ui/util/uiUtil.jsx';
import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import './diamond.scss';
import { scaleLinear } from 'd3';

function Header() {
  return (
    <>
      <hr />
      <h4 className="subtitle is-4">Diamond</h4>
    </>
  );
}

function hasNoDiamond({ diamond }) {
  return typeof diamond === 'undefined';
}

function NoDiamond({ showHeader }) {
  return (
    <>
      {showHeader && <Header />}
      <article className="message no-orthogroup" role="alert">
        <div className="message-body">
          <p className="has-text-grey">No Diamond informations found</p>
        </div>
      </article>
    </>
  );
}

function DiamondDataTracker({ gene }) {
  const queryGenes = Genes.findOne({ ID: gene.ID });
  const diamondId = queryGenes.diamondId;

  const diamondSub = Meteor.subscribe('diamond');
  const loading = !diamondSub.ready();
  const diamond = diamondCollection.findOne({ _id: diamondId });

  const genesStart = queryGenes.start;
  const genesEnd = queryGenes.end;
  const genesLength = (genesEnd - genesStart) + 1;

  return {
    loading,
    gene,
    diamond,
    genesLength,
  };
}

function ArrowQueryId({ hits_id }) {
  return (
    <svg width="135">
      <g>
        {
          hits_id.map((hit, index) => (
            <>
              <text x="15" y={(index * 20) + 13}>{hit}</text>
              <polygon points={
                [
                  10, (index * 20),
                  120, (index * 20),
                  130, ((index * 20) + 7),
                  120, ((index * 20) + 14),
                  10, ((index * 20) + 14),
                ]
              }
                stroke="black"
                fill="none"
              />
            </>
          ))
        }
      </g>
    </svg>
  );
}

function TopBarSequence({ length, scale }) {
  const range = scale.range();
  const [start, end] = scale.domain();

  console.log("start", start);
  console.log("end", end);
  console.log("range", range);
  return (
    <svg width={range[1] + 10}>
      <g>
        <line x1={range[0]} y1="12.5" x2={range[1]} y2="12.5" stroke="black" />
      </g>
    </svg>
  );
}

function GlobalDiamondInformation({ diamond, length, initialWidth = 200}) {
  const diamondQueryId = diamond.iteration_hits.map((hit) => hit.id);

  const [width, setWidth] = useState(initialWidth);

  const margin = {
    top: 10,
    bottom: 10,
    left: 20,
    right: 20,
  };

  const scale = scaleLinear()
    .domain([0, length])
    .range([margin.left, width - margin.right - 140]);

  return (
    <div className="card">
      <div className="diamond-body">
        <div>
          <div>
            <h2 className="title-query-sequences">Sequence</h2>
          </div>
          <div className="list-query-sequences">
            <ArrowQueryId hits_id={diamondQueryId} />
          </div>
        </div>
        <div>
          <div id="top-bar-sequence">
            <TopBarSequence length={length} scale={scale} />
          </div>
          <div>
          </div>
        </div>
        <ReactResizeDetector handleWidth onResize={(w) => setWidth(w)} />
      </div>
    </div>
  );
}

function DiamondBlast({ showHeader = false, diamond, genesLength }) {
  return (
    <>
      { showHeader && <Header />}
      <div>
        <GlobalDiamondInformation diamond={diamond} length={genesLength} />
      </div>
    </>
  );
}

export default compose(
  withTracker(DiamondDataTracker),
  branch(hasNoDiamond, NoDiamond),
)(DiamondBlast);
