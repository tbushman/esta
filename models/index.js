const config = require('../config/index.js');
const testenv = config.testenv;

const mongoose = require('mongoose')

const Content = require('./content.js');
const Diffs = require('./diffs.js');
const Publisher = require('./publishers.js');
const Signature = require('./signatures.js');

const ContentTest = require('../test/models/content.js');
const PublisherTest = require('../test/models/publishers.js');
const SignatureTest = require('../test/models/signatures.js');

// const Content = (!testenv ? content : contenttest);//mongoose.model('Content', (!testenv ? content : contenttest));
// const Publisher = (!testenv ? publisher : publishertest);//mongoose.model('Publisher', (!testenv ? publisher : publishertest ));
// const Signature = (!testenv ? signature : signaturetest);//mongoose.model('Signature', (!testenv ? signature : signaturetest ));

module.exports = { Diffs, Content, Publisher, Signature, ContentTest, PublisherTest, SignatureTest };