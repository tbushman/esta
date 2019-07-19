var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		Content = require('mongoose-geojson-schema'),
		Diffs = require('./diffs.js');
		// ,
		// Media = require('./media.js');
var Layer = new Schema({
	lid: String,
	buckets: Number,
	colors: [String],
	key: String,
	low: Number,
	high: Number,
	log: Boolean
})

var schema = new Schema({
	type: String,
	index: Number,
	properties: {
		credit: String,
		keys: [String],
		title: {
			ind: Number,
			str: String 
		},
		chapter: {
			ind: Number,
			str: String 
		},
		section: {
			ind: Number,
			str: String 
		},
		label: String,
		published: Boolean,
		gid: {
			fileId: String,
			revisionId: String
		},
		place: String,
		description: String,
		current: Boolean,
		xmlurl: String,
		media: [
			{
				index: Number,
				name: String,
				image: String,
				image_abs: String,
				thumb: String,
				thumb_abs: String,
				caption: String,
				postscript: String,
				url: String,
				orientation: String,
				layers: [String]
			}
		],
		layers: [Layer],
		diffs: [Diffs],
		footnotes: [ ]
	},
	geometry: Schema.Types.GeoJSON
}, 
//{pluralize: false}
{collection: 'esta'}
);

schema.index({ geometry: '2dsphere' });
module.exports = mongoose.model('Content', schema);
/*function(dbc){ 
	
	return mongoose.model(dbc.collection, Content, dbc.collection);
}*/