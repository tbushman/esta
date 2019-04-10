var mongoose = require('mongoose'),
	Media = require('mongoose-geojson-schema'),
	Schema = mongoose.Schema;
var schema = new Schema({
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
	layers: [String],
	geometry: Schema.Types.GeoJSON
});
schema.index({ geometry: '2dsphere' });
module.exports = mongoose.model('Media', schema);