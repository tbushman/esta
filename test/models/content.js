var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		Content = require('mongoose-geojson-schema'),
		Diffs = require('../../models/diffs.js');
		// ,
		// Media = require('./media.js');

var schema = new Schema({
	type: String,
	index: Number,
	properties: {
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
		layers: [String],
		diffs: [Diffs],
		footnotes: [ ]
	},
	// features: [Schema.Types.GeoJSON],
  // // [
	// 	{
	// 		type: String,
	// 		properties: {},
	// 		geometry: Schema.Types.GoJSON
	// 	}
	// ],
	geometry: Schema.Types.GeoJSON
}, 
//{pluralize: false}
{collection: 'estatest'}
);

schema.index({ geometry: '2dsphere' });
module.exports = mongoose.model('ContentTest', schema);
/*function(dbc){ 
	
	return mongoose.model(dbc.collection, Content, dbc.collection);
}*/