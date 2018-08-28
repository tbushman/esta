var mongoose = require('mongoose'),
		Schema = mongoose.Schema,
		passportLocalMongoose = require('passport-local-mongoose');

var Publisher = new Schema({
	userindex: {
		type: Number
	},
	username: {
		type: String,
		unique: true,
		trim: true
	},
	garefresh: String,
	gaaccess: String,
	admin: Boolean,
	password: String,
	email: String,
	avatar: String
	
}, { collection: 'ordinancerlogin' });

Publisher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Publisher', Publisher);