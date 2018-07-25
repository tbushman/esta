var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
var Diffs = new Schema({
	date: Date,
	old: String,
	dif: String,
	str: String
});
module.exports = mongoose.model('Diffs', Diffs)