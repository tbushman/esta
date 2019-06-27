var mongoose = require('mongoose'),
		Publisher = require('mongoose-geojson-schema'),
		Schema = mongoose.Schema,
		passportLocalMongoose = require('passport-local-mongoose');

var schema = new Schema({
	username: {
		type: String,
		unique: true,
		trim: true
	},
	password: String,
	language: String,
	email: String,
	sig: [],
	geometry: Schema.Types.GeoJSON,
	slack: {
		oauthID: String
	},
	properties: {
		lnglat: [],
		avatar: String,
		admin: Boolean,
		address1: String,
		address2: String,
		city: String,
		state: String,
		zip: String,
		place: String,
		placetype: String,
		title: String,
		givenName: String,
		time: {
			begin: Date,
			end: Date
		}
	}
	
}, { collection: 'estalogintest' });
schema.index({ geometry: '2dsphere' });
schema.plugin(passportLocalMongoose);
// geometry: {
// 	type: {
// 		type: String,
// 		enum: ['MultiPolygon'],
// 		required: true
// 	},
// 	coordinates: {
// 		type: [[Number]]
// 	}
// },

module.exports = mongoose.model('PublisherTest', schema);