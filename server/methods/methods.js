import { spawn } from 'child_process';
import Future from 'fibers/future';
import { Genes } from '/imports/api/genes/gene_collection.js';
import Attributes from '/imports/api/genes/attribute_collection.js';
import { reverseComplement, translate, getGeneSequences } from '/imports/api/util/util.js';

/**
 * Keep track of what blast commands should use which databases
 * @type {Object}
 */
const DB_TYPES = {	
	'blastn':'nucl',
	'tblastn':'nucl',
	'tblastx':'nucl',
	'blastp':'prot',
	'blastx':'prot'
}

/**
 * format a complete annotation track of genes into fasta format for building blast database
 * @param  {[String]} track [Track name of an annotation]
 * @return {[Object]}
 */
const makeFasta = (track) => {
	console.log('makeFasta',track)
	const genes = Genes.find({'track':track},{fields:{'ID':1,'seqid':1,'start':1,'end':1,'subfeatures':1}});
	const fastaPep = [];
	const fastaNuc = [];
	genes.forEach( (gene) => {
		let transcripts = gene.subfeatures.filter( (subfeature) => { return subfeature.type === 'mRNA' })
		transcripts.forEach( (transcript) => {
			let transcriptSeq = `>${transcript.ID}\n`;
			let transcriptPep = `>${transcript.ID}\n`;
			let cdsArray = gene.subfeatures.filter( (sub) => { 
				return sub.parents.indexOf(transcript.ID) >= 0 && sub.type === 'CDS'
			}).sort( (a,b) => {
				return a.start - b.start
			})

			let refStart = 10e99;
			//let referenceSubscription = Meteor.subscribe('references',gene.seqid)
			
			//find all reference fragments overlapping the mRNA feature
			let referenceArray = References.find({ 
				header: gene.seqid, 
				$and: [ 
					{ start: {$lte: gene.end} }, 
					{ end: {$gte: gene.start} }
				] 
			}).fetch()

			if (referenceArray.length){
				let reference = referenceArray.sort( (a,b) => {
					//sort on start coordinate
					return a.start - b.start
				}).map( (ref) => {
					//find starting position of first reference fragment
					refStart = Math.min(refStart,ref.start)
					return ref.seq
				}).join('')

				seq = cdsArray.map( (cds, index) => {
					let start = cds.start - refStart - 1;
					let end = cds.end - refStart;
					return reference.slice(start,end)
				}).join('')

				let phase;
				if (this.strand === '-'){
					seq = reverseComplement(seq)
					phase = cdsArray[cdsArray.length -1].phase
				} else {
					phase = cdsArray[0].phase
				}
		 
				if ([1,2].indexOf(phase) >= 0){
					seq = seq.slice(phase)
				}

				console.log(gene,seq)
				let pep = translate(seq.toUpperCase());

				transcriptSeq += seq;
				fastaNuc.push(transcriptSeq)
				
				transcriptPep += pep;
				fastaPep.push(transcriptPep);
				
			}
		})
	})
	const fasta = {	'prot': fastaPep.join('\n') + '\n',
									'nucl': fastaNuc.join('\n') + '\n'}
	return fasta
}


Meteor.methods({
	formatFasta (query, sequenceType){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		
		const genes = Genes.find(query).fetch();

		const geneSequences = genes.map((gene) => {
			return getGeneSequences(gene)
		})

		const transcriptSequences = [].concat.apply([],geneSequences)

		const fastaArray = transcriptSequences.map((transcript) => {
			console.log(transcript)
			let fasta = `>${transcript.transcriptId}\n`
			if (sequenceType === 'protein') {
				fasta += transcript.pep.match(/.{1,60}/g).join('\n');
			} else if (sequenceType === 'nucleotide') {
				fasta += transcript.seq.match(/.{1,60}/g).join('\n');
			}
			return fasta
		})

		const allFasta = fastaArray.join('\n')
		return allFasta
	},
	queryCount (search,query){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}
		if (search) {
			query.$or = [{ 'ID': { $regex: search , $options: 'i' } },{ 'Name': { $regex: search , $options: 'i' } }];
			if (!query.hasOwnProperty('Productname')){
				query.$or.push({ 'Productname': { $regex: search , $options: 'i' } })
			}
		}
		const count = Genes.find(query).count()
		return count
	},
	/**
	 * Spin up a child process to construct a blast database
	 * @param  {[type]}
	 * @return {[type]}
	 */
	makeBlastDb (trackName){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}
		this.unblock();
		const dbtypes = ['nucl','prot'];
		const fasta = makeFasta(trackName)

		dbtypes.forEach( (dbtype) => {
		//for (let dbtype of dbtypes) {
			const outFile = `${trackName}.${dbtype}`
			const child = spawn('makeblastdb',['-dbtype', dbtype, '-title', out, '-out', outFile]);
			const pid = child.pid;
			child.stdin.setEncoding('utf8');
			child.stdout.setEncoding('utf8');
			child.stderr.setEncoding('utf8');
			child.stdin.write(fasta[dbtype]);
			child.stdin.end();
			
			let out = ''
			child.stdout.on('data', function (data) {
			    out += data;
			});
			let err = ''
			child.stderr.on('data',function(data){
				err += data;
			})

			if (err){
				console.log(`ERROR:\n${err}`)
			}

			child.on('close',function(code){
				console.log(`makeblastdb exit code: ${code}`)
				console.log(out)
			})
			Tracks.update({'trackName': trackName },{ '$set' : {[`blastdbs.${dbtype}`] : `${trackName}.${dbtype}` } } )
		})
	},
	/**
	 * Spin up a child process to run blast
	 * @param  {[type]}
	 * @param  {[type]}
	 * @param  {[type]}
	 * @return {[type]}
	 */
	blast (blastType,query,trackNames){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}
		this.unblock();
		const fut = new Future();
		
		const dbType = DB_TYPES[blastType]
		
		const tracks = Tracks.find({'trackName':{$in:trackNames} },{fields:{'blastdbs':1}}).fetch();
		
		const dbs = tracks.map(function(track){return track.blastdbs[dbType]}).join(' ')
		
		console.log(dbs)

		const child = spawn(blastType,['-db',dbs,'-outfmt','5','-num_alignments','20'])
		
		child.stdin.setEncoding('utf8')
		child.stdout.setEncoding('utf8')
		child.stderr.setEncoding('utf8')
		
		child.stdin.write(query)
		
		let out = ''
		let err = ''
		child.stdout.on('data',function(data){
			out += data;
		})

		child.stderr.on('data',function(data){
			err += data;
		})

		if (err){
			console.log(err);
		}

		if (out){
			console.log(out);
		}

		const o = child.on('close',function(code){
			console.log('exit code: ' + code)
			json_out = xml2js.parseString(out,function(err,res){
				fut.return(res)
			});
		})

		child.stdin.end()
		return fut.wait()
	},
	/**
	 * Map/reduce on all genes and their attributes to identify attribute keys which will be able for filtering
	 * @return {[type]}
	 */
	scanFeatures (){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}

		this.unblock();
		//meteor requires async code to be run in a fiber/future
		const fut = new Future();

		//put the future that will hold the mapreduce output in the meteor environment, this will be used as callback for the mapreduce
		const mapReduceCallback = Meteor.bindEnvironment(function(err,res){
			if (err){
				fut.throw(err)
			} else {
				fut.return(res)
			}
		})

		//mapreduce to find all keys for all genes, this takes a while
		a = Genes.rawCollection().mapReduce(
			function(){
				//map function
				let gene = this;
				Object.keys(gene.attributes).forEach((key) => {
					emit(key,{ references: [ gene.reference ] })
				})
			},
			function(key,values){
				//reduce function
				let referenceSet = new Set()
				values.forEach((value) => {
					value.references.forEach((ref) => {
						referenceSet.add(ref)
					})
				})
				
				let references = Array.from(referenceSet)
				return { references: references }
			},
			{ out: { inline: 1 } }, //output options
			mapReduceCallback
		)


		//let the future wait for the mapreduce to finish
		const mapReduceResults = fut.wait();

		console.log('mapReduceResults',mapReduceResults)

		//process mapreduce output and put it in a collection
		mapReduceResults.forEach( (feature) => {
			let name = feature._id;
			let references = feature.value.references;

			Attributes.findAndModify({ 
				query: { 
					name: name 
				}, 
				update: {
					$set: {
						references: references
					}, 
					$setOnInsert: { 
						name: name,
						query: `attributes.${name}`,
						show: true, 
						canEdit: false, 
						reserved: false 
					} 
				}, 
				new: true, 
				upsert: true 
			}) 
		})
	},
	removeFromViewing (geneId){
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		Genes.update({ 'ID': geneId },{ $pull: { 'viewing': this.userId } }, (err,res) => {
			if (err) {
				throw new Meteor.Error('removeFromViewing server method error')
			}
			const gene = Genes.findOne({'ID': geneId})
			console.log(gene)
			//if ( viewing.length === 0 ){
				//Genes.update({ 'ID': geneId },{ $unset: { 'viewing': 1 } } )
			//} 
		})
		
	},
	/**
	 * Block a gene from being edited, this should happen when someone is editing a gene to prevent simultaneous edits
	 * @param  {[type]}
	 * @return {[type]}
	 */
	lockGene (geneId) {
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}
		Genes.update({ 'ID': geneId },{ $set: { editing: this.userId } }, (err,res) => {
			if (err){
				throw new Meteor.Error('Locking gene failed')
			}
			console.log(`${this.userId} is editing gene ${geneId}`)
		})
	},
	/**
	 * This unlocks a gene from being blocked during editing. 
	 * A gene should only be unlocked by the person that locked it
	 * @param  {[type]}
	 * @return {[type]}
	 */
	unlockGene (geneId) {
		if (! this.userId) {
			throw new Meteor.Error('not-authorized');
		}
		if (! Roles.userIsInRole(this.userId,'curator')){
			throw new Meteor.Error('not-authorized');
		}
		const gene = Genes.findOne({ ID: geneId })
		if (!gene){
			throw new Meteor.Error('not-authorized')
		}

		if (!gene.editing){
			throw new Meteor.Error('not-authorized')
		}

		if (!(gene.editing === this.userId)){
			throw new Meteor.Error('not-authorized')
		}

		console.log('allow unlock ===',gene.editing === this.userId)
		if (gene.editing === this.userId){
			console.log(`${this.userId} is no longer editing gene ${geneId}`)
			Genes.update({ ID: geneId}, { $set: { editing: 'Unlocking' } }, (err,res) => {
				if (err){
					throw new Meteor.Error('Unlocking failed')
				}
				Genes.update({ ID: geneId },{ $unset: { editing: 1 } })
			} )
		}
	}
})