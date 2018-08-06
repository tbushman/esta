var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
		Content = require('mongoose-geojson-schema');

var GeoJSON = new Schema({
	type: String,
	index: Number,
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
	properties: {
		label: String,
		section: String,
		published: Boolean,
		title: String,
		place: String,
		description: String,
		current: Boolean,
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
				url: String
			}
		]
	},
	geometry: Schema.Types.Polygon
}, 
//{pluralize: false}
{collection: 'ordinancer'}
);

GeoJSON.index({ geometry: '2dsphere' });
module.exports = mongoose.model('Content', GeoJSON);
/*function(dbc){ 
	
	return mongoose.model(dbc.collection, Content, dbc.collection);
}*/