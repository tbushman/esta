var express = require('express');
var asynk = require('async');
var passport = require('passport');
var router = express.Router();
var mongoose = require('mongoose');
var url = require('url');
var fs = require('fsxt');
var path = require('path');
var glob = require("glob");
//var HtmlDiff = require('node-htmldiff');
var moment = require("moment");
var multer = require('multer');
var mkdirp = require('mkdirp');
var spawn = require("child_process").exec;
var dotenv = require('dotenv');
var marked = require('marked');
var pug = require('pug');
// var jsts = require('jsts');
var csrf = require('csurf');
const { Publisher, Content, Signature, PublisherTest, ContentTest, SignatureTest } = require('../models/index.js');
// var Publisher = require('../models/publishers.js');
// var Content = require('../models/content.js');
// var Diffs = require('../models/diffs.js');
// var Signature = require('../models/signatures.js');
var HtmlDocx = require('html-docx-js');
var HtmlDiffer = require('html-differ').HtmlDiffer;
var csrfProtection = csrf({ cookie: true });
var publishers = path.join(__dirname, '/../../..');
var htmlDiffer = new HtmlDiffer({
	ignoreAttributes: ['id', 'for', 'class', 'href', 'style']
});
var {google} = require('googleapis');
const d3 = require('d3');
const config = require('../config/index.js');
const testenv = config.testenv;
const bodyParser = require('body-parser');
var parseForm = bodyParser.urlencoded({ extended: false });
const PublisherDB = (!testenv ? Publisher : PublisherTest);
const ContentDB = (!testenv ? Content : ContentTest);
const SignatureDB = (!testenv ? Signature : SignatureTest);
const { getBundle, ifExistsReturn, ensureSequentialSectionInd, ensureLocation, ensureCurly, rmFile, ensureStyle, resetLayers, getLayers, getGeo, ensureContent, getDat, ensureAuthenticated, ensureAdmin, ensureApiTokens, ensureGpo } = require('../config/middleware');
const {isJurisdiction, usleg, tis, geoLocate, storage, uploadmedia, removeExtras, curly, renameEachImgDir, emptyDirs, getDat64, tokenHandler, mkdirpIfNeeded, getDocxBlob, iteratePlaces, places, saveJsonDb, importMany } = require('../config/helpers');

dotenv.load();
var upload = multer({fieldSize: 25 * 1024 * 1024});
marked.setOptions({
	gfm: true,
	smartLists: true,
	smartypants: true,
	xhtml: true/*,
	breaks: true*/
})
 

var geolocation = require ('google-geolocation') ({
	key: process.env.GOOGLE_KEY
});
const googleMaps = require('@google/maps').createClient({
  key: process.env.GOOGLE_MAPS_KEY
});



router.all(/^\/((api|import|export).*)/, ensureAdmin/*, ensureApiTokens*/);

router.get(/(.*)/, ensureGpo/*, ensureSequentialSectionInd*/)

router.get('/', function(req, res, next){
	return res.redirect('/home')
});

// router.get('/loadgmaps'/*, csrfProtection*/, function(req, res, next){
// 	return res.render('loadgmaps', {
// 		csrfToken: req.csrfToken()
// 	})
// })

router.get('/loadculturalartifacts'/*, uploadmedia.single('pdf'), parseForm*/, async(req, res, next) => {
	const pdfreader = require('pdfreader');//req.file;
	const url = path.join(__dirname, '../..', 'pdf', 'Data Recovery Excavations at 42Dv2.pdf');
	let rows = {};
	var table = new pdfreader.TableParser();
	let isTable = false;
	const nbCols = 6;
	const cellPadding = 40; // each cell is padded to fit 40 characters
	const columnQuantitizer = item => parseFloat(item.x) >= 20;
	 
	const padColumns = (array, nb) =>
		Array.apply(null, { length: nb }).map((val, i) => array[i] || []);
	// .. because map() skips undefined elements

	const mergeCells = cells =>
		(cells || [])
			.map(cell => cell.text)
			.join("") // merge cells
			.substr(0, cellPadding)
			.padEnd(cellPadding, " "); // padding

	const renderMatrix = matrix =>
		(matrix || [])
			.map((row, y) =>
				padColumns(row, nbCols)
				.map(mergeCells)
				.join(" | ")
		)
		.join("\n");
	function printRows() {
	  Object.keys(rows) // => array of y-positions (type: float)
	    .sort((y1, y2) => parseFloat(y1) - parseFloat(y2)) // sort float positions
	    .forEach(y => console.log((rows[y] || []).join("")));
	}
	new pdfreader.PdfReader().parseFileItems(url, async(
		err,
		item
	) => {
		if (!item || item.page) {
			// end of file, or page
			// printRows();
			// console.log(renderMatrix(table.getMatrix()));
			// console.log("PAGE:", item.page);
			rows = {}; // clear rows for next page
			table = new pdfreader.TableParser(); // new/clear table for next page
		} else if (item.text) {
			// accumulate text items into rows object, per line
			(rows[item.y] = rows[item.y] || []).push(item.text);
			const keys = Object.keys(rows);
			const key = item.y + '';
			const kyi = keys.indexOf(key);
			const kyp = keys[kyi - 1];
			if (
				kyp &&
				/(easting)/ig.test(rows[kyp].join('')) &&
				/(northing)/ig.test(rows[kyp].join(''))
			) {
				console.log('has table')
				console.log(item, rows[kyp])

				table.processItem(item, columnQuantitizer(item));
			}
		}
	});
	// const dkeys = Object.keys(data[0])
	// // console.log(dkeys)
	// for (var k = 0; k < data.length; k++) {
	// 	var d = data[k];
	// 	if (!isUTEviction) {
	// 		var nkeys = Object.keys(d)[0].split(',');
	// 		var nvals = Object.values(d)[0].split(',');
	// 		var obj = {}
	// 		nkeys.forEach((key, i)=> {
	// 			obj[key] = nvals[i]
	// 		})
	// 		d = obj;
	// 	}
	// 	console.log(d);
	// }
	// const content = await fs.readFileSync(file.path, fileType);
	// const data = await d3.tsvParse(content);
	// 
	// const data = await require('request-promise')({
	// 	uri: uri,
	// 	// resolveWithFullResponse: true,
	// 	// encoding: null
	// 	// encoding: 'utf16le'
	// })
	// .then(async result => {})
	// .catch(err=>next(err));
})

router.post('/loadgmaps/:id/:type', uploadmedia.array('csv'), parseForm/*, csrfProtection*/, async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	importMany(req.files, req.params.id, function(err, json){
		if (err) return next(err);
		console.log(req.files, json)
		return res.status(200).send(json);
	})
})

router.get('/home', getDat, ensureCurly, function(req, res, next){
	//getDat(function(dat, distinct){
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	req.session.menu = 'home'
	if (!req.session.importgdrive) {
		req.session.importgdrive = false;
		ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (data.length === 0) {
				return res.redirect('/api/new/'+'Nation'+'/'+0+'/'+0+'/'+115+'/'+108+'/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal./'+null+'');
			}
			var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
				doctype: 'xml',
				csrfToken: req.csrfToken(),
				menu: !req.session.menu ? 'view' : req.session.menu,
				ff: req.distinct,
				dat: req.dat,
				appURL: req.app.locals.appURL,
				exports: false
			});
			return res.render('agg', {
				menu: !req.session.menu ? 'view' : req.session.menu,
				dat: req.dat,
				ff: req.distinct,
				str: str,
				pu: req.user,
				gp: (req.isAuthenticated() && req.session.authClient ? req.session.gp : null),
				exports: false

			});
				
			
		});
	} else {
		ensureApiTokens(req, res, function(err){
			if (err) {
				return next(err)
			}
			ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
				if (err) {
					return next(err)
				}
				if (data.length === 0) {
					return res.redirect('/api/new/'+'Nation'+'/'+0+'/'+0+'/'+115+'/'+108+'/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal./'+null+'');
				}
				var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
					doctype: 'xml',
					csrfToken: req.csrfToken(),
					menu: !req.session.menu ? 'view' : req.session.menu,
					ff: req.distinct,
					dat: req.dat,
					appURL: req.app.locals.appURL
				});
				return res.render('agg', {
					menu: !req.session.menu ? 'view' : req.session.menu,
					dat: req.dat,
					ff: req.distinct,
					str: str,
					pu: req.user,
					gp: (req.isAuthenticated() && req.session.authClient ? req.session.gp : null)
				});
					
				
			});

		})
	}
})
router.get('/auth/slack', passport.authenticate('slack'));
 
router.get('/auth/slack/callback',
  passport.authenticate('slack', { failureRedirect: '/login' }),
  (req, res) => {
	// console.log(req.user)
		req.session.userId = req.user._id;
		req.session.loggedin = req.user.username;
		return res.redirect('/sig/admin');
});

router.get('/register', function(req, res, next){
	res.cookie('XSRF-TOKEN', req.csrfToken())
	// var str = pug.renderFile(path.join(__dirname, '../views/includes/profile/puedit.pug'), {
	// 	doctype: 'xml',
	// 	csrfToken: req.csrfToken(),
	// 	menu: !req.session.menu ? 'register' : req.session.menu,
	// 	appURL: req.app.locals.appURL,
	// 	info: 'Welcome'
	// });
	// return res.render('register', {
	// 	menu: !req.session.menu ? 'register' : req.session.menu,
	// 	appURL: req.app.locals.appURL,
	// 	info: 'Welcome',
	// 	str: str
	// });
	return res.render('register', { csrfToken: req.csrfToken(), menu: 'register' } );
})

router.post('/register', function(req, res, next) {
	res.cookie('XSRF-TOKEN', req.csrfToken())
	var langs = [];
	// googleTranslate.getSupportedLanguages(function(err, languageCodes) {
	// 
	// 	for (var i = 0; i < languageCodes.length; i++) {
	// 		if (languages[languageCodes[i]] !== undefined) {
	// 			var obj = languages[languageCodes[i]];
	// 			obj.code = languageCodes[i];
	// 			langs.push(obj)
	// 		}
	// 
	// 	}
		if (!req.body.givenName) {
			//upload.array() has not yet been fs-ed.
			return res.render('register', {info: 'You must provide your full name for the digital signature. No punctuation allowed. Example: "Firstname Lastname"', languages: langs})
		}
		PublisherDB.find({}, function(err, data){
			if (err) {
				return next(err)
			}
			var admin;
			if (process.env.ADMIN.split(/(\,\s{0,5})/).indexOf(req.body.username) !== -1) {
				admin = true;
			} else {
				admin = false;
			}
			PublisherDB.register(new PublisherDB(
				{ username : req.body.username, 
					/*language: req.body.languages,*/ 
					email: req.body.email, 
					properties: { 
						avatar: '/images/publish_logo_sq.svg', 
						admin: admin, 
						givenName: req.body.givenName, 
						address1: req.body.address1,
						address2: req.body.address2,
						city: req.body.city,
						state: req.body.state,
						/*title: req.body.title,*/ 
						zip: req.body.zip, 
						time: {
							begin: new Date(),
							end: new Date()
						}
						/*place: req.body.place, placetype: req.body.placetype, time: { begin: req.body.datebegin, end: req.body.dateend }*/ 
					}
				}
			), req.body.password, function(err, user) {
				if (err) {
					return res.render('register', {info: "Sorry. That Name already exists. Try again.", languages: langs});
				}
				req.session.username = req.body.username;
				passport.authenticate('local')(req, res, function () {
					PublisherDB.findOne({username: req.body.username}, function(error, doc){
						if (error) {
							return next(error)
						}
						req.session.userId = doc._id;
						req.session.loggedin = doc.username;
						
						return res.redirect('/sig/admin')
					})
				});
			});
		})
	// })

});

router.get('/login', function(req, res, next){
	res.cookie('XSRF-TOKEN', req.csrfToken())
	var referrer = req.get('Referrer');
	req.session.referrer = referrer;
	return res.render('login', { 
		user: req.user,
		csrfToken: req.csrfToken(),
		menu: 'login'
	});
});

router.post('/login', passport.authenticate('local', {
	failureRedirect: '/login'
}), function(req, res, next) {
	req.session.userId = req.user._id;
	req.session.loggedin = req.user.username;
	var referrer = !req.session.referrer ? '/sig/admin' : req.session.referrer
	res.redirect(referrer);		
});

/*router.get('/auth/googledrive', passport.authenticate('google', {scope: 'https://www.googleapis.com/auth/drive'}), function(req, res, next){
	return next();
})*/

router.get('/auth/google', passport.authenticate('google', {
	scope: 
		[
			//'https://www.googleapis.com/auth/plus.login', 
			'https://www.googleapis.com/auth/userinfo.email', 
			'https://www.googleapis.com/auth/userinfo.profile', 
			'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.metadata', 'https://www.googleapis.com/auth/drive.file'
		],
		authType: 'rerequest',
		accessType: 'offline',
		prompt: 'consent',
		includeGrantedScopes: true
	}), function(req, res, next){
	return next();
});

router.get('/auth/google/callback', passport.authenticate('google', { 
	failureRedirect: '/' 
}), function(req, res, next) {
	req.session.userId = req.user._id;
	req.session.loggedin = req.user.username;
	req.session.authClient = true;
	if (!req.session.importgdrive) {
		return res.redirect('/');
		
	} else {
		return res.redirect('/importgdrive');
	}
	
});

router.get('/logout', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	asynk.waterfall([
		function(next){
			req.session.userId = null;
			req.session.loggedin = null;
			req.session.failedAttempt = false;
			req.logout();
			next(null, req)
		},
		function(req, next) {
			if (req.user || req.session) {
				req.user = null;
				req.session.destroy(function(err){
					if (err) {
						req.session = null;
						//improve error handling
						
					} else {
						req.session = null;
					}
					next(null)
				});		
			} else {
				next(null);
			}
		}
	], function(err){
		if (err) {
			return next(err)
		}
		return res.redirect('/');
	})	
});

router.get('/search', function(req, res, next) {
	return res.status(404).send(new Error('not found no params'))
})
router.post('/search', function(req, res, next) {
	return res.status(404).send(new Error('not found no params'))
})

router.post('/search/:term', async function(req, res, next){
	// var outputPath = url.parse(req.url).pathname;
	const term = decodeURIComponent(req.params.term);
	
	if (term === '' || term === ' ') return res.status(404).send(new Error('not found no params'))
	
	var regex = new RegExp(term, 'gi');

	const data = await ContentDB
	.find({'properties.label': { $regex: regex }})
	.then(data => data)
	.catch(err => console.log(err))
	
	
	const data2 = await ContentDB.find({'properties.title.str': { $regex: regex }}).then(doc=>doc).catch(err=>console.log(err));

	if (data2.length === 0 && data.length === 0) {
		return res.status(404).send(new Error('no docs'))
	}

	const ret = [...data, ...data2];
	return res.json(ret)
})

/*router.post('/api/importdoc/:type/:fileid', uploadmedia.single('doc'), function(req, res, next){
	fs.readFile(req.file.path, 'utf8', function (err, content) {
		if (err) {
			next(err)
		}
		var fileId = req.params.fileid;
		var now = Date.now();
		var dest = ''+publishers+'/pu/publishers/esta/txt/'+now+'.txt'
		
		var OAuth2 = google.auth.OAuth2;
		PublisherDB.findOne({_id: req.session.userId}, function(err, pu){
			if (err) {
				return next(err)
			}
			var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
			authClient.setCredentials({refresh_token: pu.garefresh, access_token: pu.gaaccess});
			google.options({auth:authClient})
			req.session.authClient = true;
			var drive = google.drive({version: 'v3'});
			drive.files.export({
				fileId, mimeType: 'text/plain'
			}, function(err, result){
				if (err){
					return next(err)
				}
				var file = require(dest)
				return res.status(200).send(file)
			})
		})
	})
})*/


/*router.post('/api/importgdriverev/:fileid', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var fileId = req.params.fileid;
	var now = Date.now();
	var os = require('os');
		//(publishers + '/esta/tmp/'+now+'.txt').toString()//);
	var p = ''+publishers+'/pu/publishers/esta/tmp';
	var OAuth2 = google.auth.OAuth2;
	PublisherDB.findOne({_id: req.session.userId}, function(err, pu){
		if (err) {
			return next(err)
		}
		var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
		authClient.setCredentials({refresh_token: pu.garefresh, access_token: pu.gaaccess});
		google.options({auth:authClient})
		req.session.authClient = true;
		var drive = google.drive({version: 'v3'});
		drive.revisions.list({
			fileId: fileId
		}).then(function(rev){
			//console.log(rev.data.revisions)
			var revs = rev.data.revisions.sort(function(a,b){
				if (a.modifiedTime < b.modifiedTime) {
					return -1;
				} else {
					return 1;
				}
			})
			var revId = revs[revs.length-1].id;
			drive.revisions.get({
				fileId: fileId,
				revisionId: revId
			})
			.then(function(file){
				console.log(file.downloadUrl)
			})
		}).catch(function(err){
			console.log(err)
		});
		
	})
})*/

router.get('/viewmap/:id', getLayers, async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	// console.log(outputPath)
	ContentDB.findOne({_id: req.params.id}, async function(err, doc){
		if (err) {
			return next(err)
		}

		//console.log(result.body.toString())
		ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			var str = pug.renderFile(path.join(__dirname, '../views/includes/maptemplate.pug'), {
				layers: req.layers,
				doc: doc,
				appURL: req.app.locals.appURL,
				info: req.session.info,
				mapActive: true
			});
			return res.render('singlemap', {
				layers: req.layers,
				doc: doc,
				str: str,
				mapActive: true
			})
		})
	})
})


router.post('/utahcourts/:id/:latestweek', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	// console.log(outputPath)
	const doc = await Content.findOne({_id: req.params.id}).then(doc=>doc).catch(err=>next(err));
	const id = req.params.id;
	if (req.params.latestweek && !isNaN(+req.params.latestweek)) {
		let latestWeek = req.params.latestweek;
		let lw = parseInt(req.params.latestweek, 10) + 1;
		if (lw < 10) {
			latestWeek = '0'+lw
		} else {
			latestWeek = ''+lw
		}
		const courtUri = `https://www.utcourts.gov/records/weeklyreports/current/filings/Week_${latestWeek}-Filing_Report-${new Date().getFullYear()}.csv`
		// const fetch = require('node-fetch');
		// console.log(courtUri)
		// const data = await d3.tsv(courtUri, d => d);
		const data = await require('request-promise')({
			uri: courtUri,
			// resolveWithFullResponse: true,
			// encoding: null
			encoding: 'utf16le'
		})
		.then(async result => {
			console.log(courtUri, result.toString()[1], /\W/.test(result.toString('utf16l3')[1]))
			if (!/\W/.test(result.toString('utf16l3')[1])) {
				const dc = await d3.tsvParse(result.toString('utf16le'));
				return dc
			} else {
				return null;
			}
		})
		//  function(result){
		// 
		// })
		.catch(function(err){
			console.log(err)
		});
		if (data) {
			// console.log('data length');
			// console.log(data.length);
			var p = ''+publishers+'/pu/publishers/esta/json';
			var pathh = await path.join(p, '/json_'+req.params.id+'.json');
			var jsonExists = await fs.existsSync(pathh);
			const json = (!jsonExists ?
				{ 
					type: "FeatureCollection",
					name: "Evictions_SLC",
					crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
					features: [] 
				} : await JSON.parse(fs.readFileSync(pathh, 'utf8'))
			);
			let newJson = json;
			await iteratePlaces(data, pathh, newJson).then(async (js) => {
				if (!js || js.features.length === 0 || js[0] === {} ) {
					// console.log(js, data)
					return next(new Error('didn\'t work'))
				} else {
					if (js.features.length > 0) {
						newJson = await saveJsonDb(js, id, courtUri).then(async j => {
							await fs.writeFileSync(pathh, JSON.stringify(j))
							return j
						})
						.catch(err => next(err))
					}
				}
			}).catch(err => next(err));
			return res.status(200).send(newJson);
		} else {
			return next(new Error('no data at that url'))
		}

	} else {
		return next(new Error('no data yet'))
	}
})

router.post('/evictionlabload', async function(req, res, next){
	const AWS = require('aws-sdk');
	AWS.config.logger = console;
	AWS.config.update({credentials:{
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey
	}});
	const s3 = new AWS.S3();
	await getObject({
    Bucket: "eviction-lab-data-downloads",
		Key: "UT/block-groups.geojson"
  }).then( (result) => {
    console.log('Retrieved object from S3');
    return res.status(200).send(result.Body.toString())//res.Body.toString();
  })
	.catch((err)=>console.log(err))
 
	async function getObject(params){
	  return await s3.getObject(params).promise();
	}
})

router.post('/censusload/:code', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var code;
	switch (parseInt(req.params.code, 10)) {
		case 0:
			code = null;
			break;
		case 1:
			code = 3
			break;
		case 2:
			code = 2
			break;
		default:
			code = 3
	}
	
	const censusData = await require('request-promise')({
		uri: 'https://api.census.gov/data/2010/dec/sf1/variables.json',//'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/layers?f=json',//,//'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/'+code+'?f=json',
		encoding: null
	})
	.then(async function(result){
		return result
	})
	.catch(function(err){
		console.log(err)
	});
	if (censusData) {
		// console.log(censusData.toString())
		return res.status(200).send(censusData.toString())
	} else {
		return next(new Error('no data at that url'))
	}
})


// router.post('/census/:code/:zoom/:x/:y', async function(req, res, next){
router.post('/census/:code/:field'/*/:tableid/:state'*/, async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath);
	var field = decodeURIComponent(req.params.field);
	var code, service;
	switch (parseInt(req.params.code, 10)) {
		case 0:
			code = null;
			service = null;
			break;
		case 1:
			code = 98;
			service = 'tigerWMS_Census2010'
			break;
		case 2:
			code = 100;
			service = 'tigerWMS_Census2010'
			break;
		case 3:
			//blocks
			code = 12;
			service = 'tigerWMS_Current'
			break;
		default:
			code = 3
	}
	// tracts: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/14
	// block groups: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/16
	// blocks: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/12
	console.log(req.params.code)
	const datumTransformations = //encodeURIComponent(JSON.stringify(
		[{'wkid': 4326}, {'geoTransforms': [{'wkid': 4326}]}]
	// ))
	const query = 'STATE = '+49;
	const stats =
	// = 
		// [
		encodeURIComponent(
			JSON.stringify(
				{
					statisticType:'min',
					onStatisticField:'POP100',
					// onStatisticField:encodeURIComponent(field),
					outStatisticFieldName:'low'
				},{
					statisticType:'max',
					onStatisticField:'POP100',
					// onStatisticField:encodeURIComponent(field),
					outStatisticFieldName:'high'
				}
			)
		)
		// ]
	// );
	//TODO stats
	var uri = 
	'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/'+service+'/MapServer/'+code+
	// 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/2'+
	'/query?where='+
	encodeURIComponent(query)+
	'&text='+
	'&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel='+
	// 'esriSpatialRelIntersects'+
	'&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset='+
	// '&geometryPrecision=8'+
	'&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics='+
	// 'STATE'+
	// (code === 98 ? 'STATE' : (code === 100 ? 'COUNTY' : 'STATE'))+
	'&outStatistics='+
	// '['+stats+']'+
	'&returnZ=false&returnM=false&gdbVersion=&'+
	// 'historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&'+
	'f=json';
	
	// uri += ''
	// 'query?where="'STATE' = 49"&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=8&outSR=4326&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&f=json';
	uri = uri.replace(/\%[7][B]/g, '{').replace(/\%[3][A]/g, ':').replace(/\%[2][C]/g, ',').replace(/\%[7][D]/g, '}')
	console.log(uri.toString())
	const censusData = await require('request-promise')({
		//codes: counties = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/100
		// states = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/98
		// zcta = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/8
		// glaciers = https://tigerweb.geo.census.gov/arcgis/rest/services/Census2010/tigerWMS_PhysicalFeatures/MapServer/14
		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/find?f=pjson&searchText=utah&searchFields=&sr=4326&datumTransformations='+datumTransformations+'&returnGeometry=true&layers=1,2',
		/*+req.params.type+*/
		/*'+parseInt(req.params.code, 10)+'*/
		// http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/3/query?where=&f=pjson&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&outSR=4262&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=
		uri: uri,
		// &outStatistics=
		// 	`,
		// 
			// ${}

		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/'+req.params.code+'/?returnGeometry=true&f=json',
		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/find?searchText=ut&contains=true&searchFields=&sr=4262&layers=1,2&layerDefs=&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&dynamicLayers=&returnZ=false&returnM=false&gdbVersion=&f=json',
		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/100?f=pjson&returnGeometry=true',
		// `https://api.censusreporter.org/1.0/data/show/latest?table_ids=${req.params.tableid}&geo_ids=${req.params.code}00US${req.params.state}`,
		// uri: 'https://api.censusreporter.org/1.0/geo/search?q=utah&sumlevs='+req.params.code+',050',
		encoding: null

	})

	.then(async function(response) {
		// console.log(response.toString())
		return response.toString();
	})
	.catch(function(err){
		console.log(err)
	});
	if (censusData) {
		return res.status(200).send(censusData.toString())
	} else {
		return next(new Error('no data at that url'))
	}
})

router.get('/profile/:username',  function(req, res, next) {
	ContentDB.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
		if (err) {return next(err)}
		PublisherDB.findOne({_id: req.session.userId}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.render('publish', {
				// dat: [data],
				data: data,
				// doc: doc,
				pu: pu,
				type: 'blog', //'blog' //'map'
				// drawtype: 'filling', //'substrates',
				menu: 'data' //home, login, register, data, doc, pu?
			})
		})
	})
})
// //every edit-access api checks auth
router.all('/api/*', ensureAuthenticated, ensureLocation, ensureAdmin)

router.all('/sig/*', ensureAuthenticated, ensureLocation)

router.all('/pu/*', ensureAuthenticated)

router.get('/sig/admin', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	if (process.env.ADMIN.split(',').indexOf(req.user.username) !== -1) {
		PublisherDB.findOneAndUpdate({_id: req.session.userId}, {$set:{admin: true}}, {new: true}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.redirect('/sig/editprofile')
		})
	} else {
		return res.redirect('/sig/editprofile')
	}
});

router.get('/pu/getgeo/:puid', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	PublisherDB.findOne({_id: req.params.puid}, function(err, pu){
		if (err){
			return next(err)
		}
		console.log('user mismatch?')
		console.log(!new RegExp(req.params.puid).test(req.session.userId))
		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
		var str = pug.renderFile(path.join(__dirname, '../views/includes/modal.pug'), {
			type: 'geo',
			pu: pu,
			menu: !req.session.menu ? 'view' : req.session.menu,
			//data: data,
			info: req.session.info
			
		});
		return res.render('single', {
			type: 'geo',
			menu: !req.session.menu ? 'view' : req.session.menu,
			pu: pu,
			str: str
		})
	})
})

router.get('/user/getgeo', async function(req, res, next){
	var str = pug.renderFile(path.join(__dirname, '../views/includes/modal.pug'), {
		type: 'geo',
		menu: !req.session.menu ? 'view' : req.session.menu,
		info: 'visitor geo'
		
	});
	return res.render('single', {
		type: 'geo',
		menu: !req.session.menu ? 'view' : req.session.menu,
		str: str
	})
})

router.post('/user/getgeo/:lat/:lng/:zip', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var coordinates, lnglat;
	if (!lat || lat === 'null') {
		if (req.params.zip && req.params.zip !== 'null') {
			var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
			var zipcode = await JSON.parse(zipcodes).features.filter(function(zip){
				return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(pu.properties.zip, 10))
			});
			if (zipcode.length === 0) {
				// default chicago for now
				lat = 42
				lng = -87.6
			}
			lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
			lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
		} else {
			lng = puPosition(pu).lng;
			lat = puPosition(pu).lat;
		}
		
	}
	req.session.position.lng = lng;
	req.session.position.lat = lat;
	return res.status(200).send('ok')
})

router.post('/pu/getgeo/:lat/:lng/:zip', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var puid = ''+req.user._id+'';
	PublisherDB.findOne({_id: puid}).lean().exec(async function(err, pu){
		if (err) {
			return next(err)
		}
		var coordinates, lnglat;
		if (!lat || lat === 'null') {
			if (!pu.geometry || !pu.geometry.coordinates.length) {
				var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
				var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
					return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(pu.properties.zip, 10))
				});
				if (zipcode.length === 0) return res.redirect('/pu/getgeo/'+pu._id+'');
				lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
				lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
				coordinates = [[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]];
				lnglat = [lng,lat]
			} else {
				coordinates = pu.geometry.coordinates
				lng = puPosition(pu).lng;
				lat = puPosition(pu).lat;
				lnglat = [lng,lat]
			}
			
		} else {
			lnglat = [lng,lat]
			coordinates = [[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]];
		}
		var geometry = {
			type: 'MultiPolygon',
			coordinates: coordinates
		}
		var set1 = {$set:{}};
		var key1 = 'geometry';
		set1.$set[key1] = geometry;
		
		var set2 = {$set:{}};
		var key2 = 'properties.lnglat';
		set2.$set[key2] = lnglat;
		// console.log(lnglat)
		PublisherDB.findOneAndUpdate({_id: req.user._id}, set1, {new:true, safe:true}, function(err, pu){
			if (err) {
				return next(err)
			}
			PublisherDB.findOneAndUpdate({_id: req.user._id}, set2, {new:true, safe:true}, function(err, pu){
				if (err) {
					return next(err)
				} else if (pu) {
					const referrer = (!req.get('Referrer') ? '/sig/editprofile' : req.get('Referrer'))
					return res.status(200).send(referrer)
				} else {
					return res.redirect('/')
				}
			})
			
		})
	})
	
})
// router.get('/sig/getgeo/:did/:puid', function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	PublisherDB.findOne({_id: req.params.puid}, function(err, pu){
// 		if (err){
// 			return next(err)
// 		}
// 		console.log('user mismatch?')
// 		console.log(!new RegExp(req.params.puid).test(req.session.userId))
// 		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
// 		ContentDB.findOne({_id: req.params.did}, function(err, doc){
// 			if (err) {
// 				return next(err)
// 			}
// 			console.log('blrgh');
// 			var l = '/publishers/esta/signatures/'+doc._id+'/'+pu._id+'/img_'+doc._id+'_'+pu._id+'.png';
// 			SignatureDB.findOne({image: l}, function(err, pud){
// 				if (err) {
// 					return next(err)
// 				}
// 				console.log(pud)
// 				var str = pug.renderFile(path.join(__dirname, '../views/includes/modal.pug'), {
// 					type: 'geo',
// 					unsigned: (!pud ? true : false),
// 					pu: pu,
// 					menu: !req.session.menu ? 'view' : req.session.menu,
// 					//data: data,
// 					doc: doc,
// 					info: req.session.info
// 
// 				});
// 				return res.render('single', {
// 					type: 'geo',
// 					menu: !req.session.menu ? 'view' : req.session.menu,
// 					unsigned: (!pud ? true : false),
// 					pu: pu,
// 					doc: doc,
// 					str: str
// 				})
// 			})
// 		})
// 	})
// })
// 
// router.post('/sig/getgeo/:did/:lat/:lng/:ts/:zip', async function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var lat = parseFloat(req.params.lat);
// 	var lng = parseFloat(req.params.lng);
// 	var puid = ''+req.params.puid+'';
// 	var did = req.params.did;
// 	if (!lat || lat === 'null') {
// 		var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
// 		var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
// 			return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(req.params.zip, 10))
// 		});
// 		if (zipcode.length === 0) return res.redirect('/sig/geo/'+did+'/'+puid+'/'+req.params.ts+'');
// 		lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
// 		lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
// 	}
// 	var geometry = {
// 		type: 'MultiPolygon',
// 		coordinates: [[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]]
// 	}
// 	console.log(geometry)
// 	PublisherDB.findOneAndUpdate({_id: req.user._id}, {$set:{geometry:geometry}}, {new:true, safe:true}, function(err, pu){
// 		if (err) {
// 			return next(err)
// 		} else {
// 			if (pu) {
// 				return res.status(200).send('/list/'+did+'/'+null+'')
// 			} else {
// 				return res.redirect('/')
// 			}
// 		}
// 
// 	})
// })
// 
// router.get('/sig/geo/:did/:puid/:ts', function(req, res, next){
// 	console.log('huzzah')
// 	PublisherDB.findOne({_id: req.params.puid}, function(err, pu){
// 		if (err){
// 			return next(err)
// 		}
// 		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
// 		ContentDB.findOne({_id: req.params.did}, function(err, doc){
// 			if (err) {
// 				return next(err)
// 			}
// 			return res.render('publish', {
// 				doc: doc,
// 				pu: pu,
// 				ts: [req.params.ts],
// 				type: 'blog', //'blog' //'map'
// 				menu: 'doc' //home, login, register, data, doc, pu?
// 			})
// 		})
// 	})
// })
// 
// router.post('/sig/geo/:did/:lat/:lng/:ts/:zip', async function(req, res, next){
// 	var outputPath = url.parse(req.url).pathname;
// 	console.log(outputPath)
// 	var lat = req.params.lat;
// 	var lng = req.params.lng;
// 	var puid = ''+req.user._id+'';
// 	var did = req.params.did;
// 	console.log(puid)
// 	PublisherDB.findOne({_id: puid}).lean().exec(async function(err, pu){
// 		if (err) {
// 			return next(err)
// 		}
// 		if (!lat || lat === 'null') {
// 			if (pu.geometry && pu.geometry.coordinates.length) {
// 				lat = puPosition(pu).lat;
// 				lng = puPosition(pu).lng;
// 			} else {
// 				var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
// 				var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
// 					return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(req.params.zip, 10))
// 				});
// 				if (zipcode.length === 0) {
// 					console.log('blg')
// 				 // return res.redirect('/sig/getgeo/'+did+'/'+puid+'/'+req.params.ts+'');
// 				}
// 				lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
// 				lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
// 			}
// 
// 		}
// 		if (!lat) {
// 
// 		}
// 		var signature = new SignatureDB({
// 			ts: ''+lat+','+lng+'G/'+pu.properties.givenName+'/'+req.params.ts+'',//new Date(),
// 			puid: puid,
// 			uname: pu.username,
// 			givenName: pu.properties.givenName,
// 			documentId: did,	
// 			image: '/publishers/esta/signatures/'+did+'/'+puid+'/img_'+did+'_'+puid+'.png',
// 			image_abs: ''+publishers+'/pu/publishers/esta/signatures/'+did+'/'+puid+'/img_'+did+'_'+puid+'.png'
// 		});
// 		var push = {$push:{}};
// 		var key = 'sig';
// 		push.$push[key] = JSON.parse(JSON.stringify(signature))
// 		signature.save(function(err){
// 			if (err) {
// 				if (err.code === 11000) req.session.info = 'Unable to save signature.'
// 				else return next(err)
// 			} 
// 			PublisherDB.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
// 				if (err){
// 					return next(err)
// 				}
// 				return res.status(200).send('/list/'+did+'/'+null+'')
// 			})
// 
// 		})
// 	})
// 
// })

var puPosition = function(pu){
	var lng, lat;
	if (!Array.isArray(pu.geometry.coordinates[0])) {
		lat = pu.geometry.coordinates[1]
		lng = pu.geometry.coordinates[0]
	} else if (!Array.isArray(pu.geometry.coordinates[0][0])) {
		lat = pu.geometry.coordinates[0][1]
		lng = pu.geometry.coordinates[0][0]
	} else if (!Array.isArray(pu.geometry.coordinates[0][0][0])) {
		lat = pu.geometry.coordinates[0][0][1]
		lng = pu.geometry.coordinates[0][0][0]
	} else if (!Array.isArray(pu.geometry.coordinates[0][0][0])) {
		lat = pu.geometry.coordinates[0][0][0][1]
		lng = pu.geometry.coordinates[0][0][0][0]
	} else if (!Array.isArray(pu.geometry.coordinates[0][0][0][0])) {
		lat = pu.geometry.coordinates[0][0][0][0][1]
		lng = pu.geometry.coordinates[0][0][0][0][0]
	} else {
		console.log('deep')
		console.log(pu.geometry.coordinates[0][0][0][0][0])
	}
	console.log(lat, lng)
	return {lng: lng, lat: lat}
}

router.post('/sig/uploadsignature/:did/:puid', ifExistsReturn, uploadmedia.single('img'), csrfProtection, function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath, req.file)
	ContentDB.findOne({_id: req.params.did}, function(err, doc){
		if (err) {
			return next(err)
		}
		PublisherDB.findOne({_id: req.params.puid}, function(err, pu){
			if (err){
				return next(err)
			}
			if (!new RegExp(req.params.puid).test(pu._id)) return res.redirect('/login');
			var position;
			if (!pu.properties.lnglat || pu.properties.lnglat.length !== 2) {
				position  = puPosition(pu);
			// console.log(pu)
			} else {
				position = {lat:pu.properties.lnglat[1], lng:pu.properties.lnglat[0]}
				var signature = new SignatureDB({
					ts: ''+position.lat+','+position.lng+'G'+req.body.ts+'',//new Date(),
					puid: pu._id,
					username: pu.username,
					givenName: pu.properties.givenName,
					documentId: doc._id,	
					image: '/publishers/esta/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png',
					image_abs: ''+publishers+'/pu/publishers/esta/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png'
				});
				var push = {$push:{}};
				var key = 'sig';
				push.$push[key] = JSON.parse(JSON.stringify(signature))
				signature.save(function(err){
					if (err) {
						if (err.code === 11000) req.session.info = 'You have already signed this document.'
						else return next(err)
					} 
					PublisherDB.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
						if (err){
							return next(err)
						}
						return res.status(200).send('/list/'+doc._id+'/'+null+'')
					})
					
				})
			}
			
		})
	})
});

router.get('/sig/editprofile', function(req, res, next){
// console.log('bleh')
	res.cookie('XSRF-TOKEN', req.csrfToken())
	ContentDB.find({}).lean().sort({'properties.time.end': 1}).exec(function(err, data){
		if (err) {return next(err)}
		PublisherDB.findOne({_id: req.session.userId}, async function(err, pu){
			if (err) {
				return next(err)
			}
			if (pu.sig.length > 0) {
				var sigs = await pu.sig.map(function(s){
					return s.documentId;
				});
				data = await data.filter(function(doc){
					var s = sigs.join('.')
					return (new RegExp(doc._id).test(s))
				})
			} else {
				data = null
			}
			return res.render('profile', {
				dat: [data],
				// data: data,
				loggedin: req.session.loggedin,
				pu: pu,
				csrfToken: req.csrfToken()
				// ,
				// avail: true
			})
		})
	})
})

// save edits
router.post('/sig/editprofile', function(req, res, next){
	var body = req.body;
	var username = req.user.username;
// console.log(body)
	asynk.waterfall([
		function(next) {
		// console.log(req.user._id)
			PublisherDB.findOne({_id: req.user._id}).lean().exec(function(err, pu){
				if (err) {
					return next(err)
				}
				var imgurl = ''+publishers+'/publishers/esta/images/avatar/'+ pu.username + '.png';
				var pd = (process.env.NODE_ENV === 'production' ? process.env.PD.toString() :  process.env.DEVPD.toString())
				if (body.avatar) {
					if (body.avatar.substring(0,1) !== "/") {
						var imgbuf = new Buffer(body.avatar, 'base64'); // decode

						fs.writeFile(imgurl, imgbuf, function(err) {
							if (err) {
								console.log("err", err);
							}
							
							imgurl = imgurl.replace(pd, '')
							next(null, imgurl, body, pu)
						})
					} else {
						imgurl = imgurl.replace(pd, '')
						next(null, imgurl, body, pu)
					}
				} else {
					imgurl = imgurl.replace(pd, '')
					next(null, imgurl, body, pu)
				}
			})
		},
		function(imgurl, body, reqUser, next) {
			
			PublisherDB.findOne({_id: reqUser._id}).lean().exec(async function(err, pu){
				if (err) {
					return next(err)
				}
				var keys = Object.keys(body);
				// keys.splice(Object.keys(body).indexOf('avatar'), 1);
				var puKeys = Object.keys(PublisherDB.schema.paths);
				// console.log(keys, puKeys)
				for (var j in puKeys) {
					var set = {$set:{}};
					var key;
					for (var i in keys) {
						body[keys[i]] = (!isNaN(parseInt(body[keys[i]], 10)) ? ''+body[keys[i]] +'' : body[keys[i]] );
						if (puKeys[j].split('.')[0] === 'properties') {
							if (puKeys[j].split('.')[1] === keys[i] && keys[i] !== 'avatar') {
								key = 'properties.'+ keys[i];
								set.$set[key] = body[keys[i]];
							}
						} else {
							if (puKeys[j] === keys[i] && keys[i] !== 'avatar') {
								key = keys[i]
								set.$set[key] = body[keys[i]];
							} else {
								
							}
						}
					}
					if (key) {
						await PublisherDB.findOneAndUpdate({_id: pu._id}, set, {safe: true, upsert:false, new:true}).then((pu)=>{}).catch((err)=>{
							console.log('mongoerr')
							console.log(err)
						});
					}

				}
				next(null, pu)
			})
		}
			
	], function(err, pu){
		if (err) {
			return next(err)
		}
		return res.redirect('/sig/editprofile')
	})
})

router.get('/api/exportword/:id', async function(req, res, next){
	ContentDB.findOne({_id: req.params.id}, async function(err, doc){
		if (err) {
			return next(err)
		}
		SignatureDB.find({documentId: doc._id}, async function(err, sig){
			if (err) {
				return next(err)
			}
			if (doc) {
				var now = Date.now();

				getDocxBlob(now, doc, sig, async function(docx){
					var p = ''+publishers+'/pu/publishers/esta/word';
							
					await fs.access(p, async function(err) {
						if (err && err.code === 'ENOENT') {
							await fs.mkdir(p, {recursive: true}, function(err){
								if (err) {
									console.log("err", err);
								}
							})
						}
					});
					
					var pathh = await path.join(p, '/'+now+'.docx');
					fs.writeFile(pathh, docx, function(err){
						if (err) {
							return next(err)
						}
						//this doesnt work on server:
						// return res.redirect('/publishers/esta/word/'+now+'.docx');
						//need to use:
						var pugpath = path.join(__dirname, '../views/includes/exportwordview.pug');
						var str = pug.renderFile(pugpath, {
							md: require('marked'),
							moment: require('moment'),
							doctype: 'strict',
							hrf: '/publishers/esta/word/'+now+'.docx',
							doc: doc,
							sig: sig
						});
						res.send(str)
					});
				})
			}
		})
		
	})
	
})

router.post('/panzoom/:lat/:lng/:zoom', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)

	var zoom = parseInt(req.params.zoom, 10);
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var position = {
		lat: lat,
		lng: lng,
		zoom: zoom
	}
	
	req.session.position = position;
	return res.status(200).send('ok')
	
});

router.post('/check/:givenName', function(req, res, next){
	PublisherDB.find({'properties.givenName': decodeURIComponent(req.params.givenName)}, function(error, pages){
		if (error) {
			return next(error)
		}
		// res.setHeader('Content-type','text/plain')
		if (!error && pages.length > 0) {
			console.log('this name is in use')
			return res.send('This name is in use.')
		} else {
			console.log('this name is available')
			return res.send('Available')
		}

	})
})

router.post('/checkchaptername/:name', function(req, res, next){
	ContentDB.findOne({'properties.chapter.str': {$regex:RegExp(''+req.params.name +'\.?$'), $options: 'im'}}, function(err, doc){
		if (err) {
			return next(err)
		}
		if (!doc) {
			return res.status(200).send(null)
		} else {
			return res.status(200).send(doc.properties.chapter.str)
		}
	})
})

router.get('/list/:id/:index', getLayers, getGeo, async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	// console.log(outputPath)
	req.session.importgdrive = false;
	ContentDB.findOne({_id: req.params.id}/*, {properties:1}*/, async function(err, doc){
		if (err) {
			return next(err)
		}
		var xml;
		if (doc && doc.properties.xmlurl) {
			// console.log(doc.properties.xmlurl);
			var xmlpath = ''+publishers+'/pu/publishers/esta/xml/';
			var xmlfolder = await fs.existsSync(xmlpath);
			if (!xmlfolder) {
				await fs.mkdir(xmlpath, {recursive: true}, function(err){
					if (err){
						console.log(err)
					}
				})
			}
			xml = await require('request-promise')({
				uri: (doc.properties.xmlurl.replace('/htm', '/xml') +'?api_key='+process.env.GPOKEY),
				encoding: null
			}).then(async function(response) {
					// console.log('ok!');
					var rp = ''+publishers+'/pu/publishers/esta/xml/' + doc._id + '.png';
					var rq = ''+publishers+'/pu/publishers/esta/xml/bill.dtd';
					var options = {nonull:true,nodir:true}
					var p = glob.sync(rp, options)[0];
					await fs.pathExists(p, async function(err, exists){
						if (err) {
							console.log(err)
						}
						if (!exists) {
							var np = (xmlpath+doc._id+'.xml')
							await fs.writeFileSync(np, response);
							// var xsl = (docxmlpath+'billres.xsl');
							var opxsl = path.join(__dirname, '../views/includes/gpo/billres.xsl');
							var npxsl = xmlpath+'billres.xsl';
							await fs.copySync(opxsl, npxsl, { overwrite: true });
							
							var opxsl2 = path.join(__dirname, '../views/includes/gpo/billres-details.xsl');
							var npxsl2 = xmlpath+'billres-details.xsl';
							await fs.copySync(opxsl2, npxsl2, { overwrite: true });
							
							var opdc = path.join(__dirname, '../views/includes/gpo/dc.xsd');
							var npdc = xmlpath+'dc.xsd';
							await fs.copySync(opdc, npdc, { overwrite: true });
							
							var opdtd = path.join(__dirname, '../views/includes/gpo/res.dtd');
							var npdtd = xmlpath+'res.dtd';
							await fs.copySync(opdtd, npdtd, { overwrite: true });
							
							var opbdtd = path.join(__dirname, '../views/includes/gpo/bill.dtd');
							var npbdtd = xmlpath+'bill.dtd';
							await fs.copySync(opbdtd, npbdtd, { overwrite: true });
						} else {
							var q = glob.sync(rq, options)[0];
							var qexists = await fs.pathExistsSync(p);
							if (!qexists) {
								var opbdtd = path.join(__dirname, '../views/includes/gpo/bill.dtd');
								var npbdtd = xmlpath+'bill.dtd';
								await fs.copySync(opbdtd, npbdtd, { overwrite: true });
							}
						}
					})
					
					return '/publishers/esta/xml/'+doc._id+'.xml'
			})
			.catch(function(err){
				console.log(err)
				return ''
			})
		} else {
			xml = ''
		}
		
		//console.log(result.body.toString())
		ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (req.isAuthenticated()) {
				var l = '/publishers/esta/signatures/'+doc._id+'/'+req.user._id+'/img_'+doc._id+'_'+req.user._id+'.png';
				var m = (req.isAuthenticated() ? '/pu/getgeo/'+req.user._id+'' : '/user/getgeo/');
				SignatureDB.findOne({image: l}, function(err, pud){
					if (err) {
						return next(err)
					}
					var pu = req.user;
					var reqpos = (req.session && req.session.position ? req.session.position : null)

					isJurisdiction(reqpos, doc, req.user, function(signable){
					// console.log('signable?')
					// console.log(signable)
						var csrftoken = req.csrfToken();
						if (signable === null) {
							return res.redirect(m)
						} else {
							var str = pug.renderFile(path.join(__dirname, '../views/includes/doctemplate.pug'), {
								csrfToken: csrftoken,
								pu: pu,
								menu: !req.session.menu ? 'view' : req.session.menu,
								//data: data,
								layers: req.layers,
								availablelayers: req.availablelayers,
								loggedin: req.session.loggedin,
								doc: doc,
								unsigned: (!pud ? true : false),
								signable: (doc.properties.title.str !== 'Geography' ? signable : false),
								appURL: req.app.locals.appURL,
								info: req.session.info,
								xml: xml
								
							});
							return res.render('single', {
								csrfToken: csrftoken,
								unsigned: (!pud ? true : false),
								loggedin: req.session.loggedin,
								layers: req.layers,
								availablelayers: req.availablelayers,
								signable: signable,
								doc: doc,
								pu: pu,
								str: str,
								xml: xml
							})
						}
					})
				})
			} else {
				var str = pug.renderFile(path.join(__dirname, '../views/includes/doctemplate.pug'), {
					menu: !req.session.menu ? 'view' : req.session.menu,
					//data: data,
					layers: req.layers,
					doc: doc,
					appURL: req.app.locals.appURL,
					mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null),
					info: req.session.info,
					xml: xml
					
				});
				return res.render('single', {
					layers: req.layers,
					doc: doc,
					mindex: (!isNaN(parseInt(req.params.index, 10)) ? parseInt(req.params.index, 10) : null),
					str: str,
					xml: xml
				})
			}
			
		})
		
	})
})

router.get('/menu/:tiind/:chiind', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
// console.log(outputPath)
	req.session.importgdrive = false;
	var key, val;
	var key2 = null, val2;
	var find = {}

	if (!req.params.chiind || req.params.chiind === 'null') {
		if (!req.params.tiind) {
			return res.redirect('/')
		}
		key = 'properties.title.ind';
		val = req.params.tiind;
		
			
	} else {
		key = 'properties.chapter.ind';
		val = req.params.chiind;
		key2 = 'properties.title.ind';
		val2 = req.params.tiind;
		
	}
	find[key] = val;
	/*if (key2) {
		find[key2] = val2;
	}*/
	ContentDB.find(find).sort( { index: 1 } ).lean().exec(async function(err, data){
		if (err) {
			return next(err)
		}
		data = await data.sort(function(a,b){
			if (parseInt(a.properties.section.ind,10) < parseInt(b.properties.section.ind, 10)) {
				return -1;
			} else {
				return 1;
			}
		})
		//console.log(data)
		var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
			doctype: 'xml',
			csrfToken: req.csrfToken(),
			menu: !req.session.menu ? 'view' : req.session.menu,
			dat: [data],
			appURL: req.app.locals.appURL
		});
		return res.render('publish', {
			menu: !req.session.menu ? 'view' : req.session.menu,
			dat: [data],
			str: str,
			pu: req.user,
			exports: false
		})
	})
	
})

// router.get('/point/:id/:lat/:lng', function(req, res, next){
// 
// })
router.post('/api/data', (req, res, next) => {
	ContentDB.find({}).lean().exec((err, data) => {
		if (err) {
			return next(err)
		}
		return res.status(200).send(data)
	})
})

router.post('/api/users', (req, res, next) => {
	PublisherDB.find({}).lean().exec((err, users) => {
		if (err) {
			return next(err)
		}
		// console.log(users)
		return res.status(200).send(users)
	})
})

router.post('/api/gpo/:start/:end', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	// console.log(outputPath)
	// console.log(req.params.start, req.params.end)
	// console.log(+req.params.start.split('-')[0], isNaN(+req.params.start.split('-')[0]))
	var startdate = (!req.params.start || req.params.start === 'undefined' || isNaN(+req.params.start.split('-')[0]) ? moment().utc().format() : moment(req.params.start, 'YYYY-MM-DD').utc().format());
	var enddate = (!req.params.end || req.params.end === 'undefined' || isNaN(+req.params.end.split('-')[0]) ? moment().utc().format() : moment(req.params.end, 'YYYY-MM-DD').utc().format());
	require('request-promise')({
		uri: 'https://api.govinfo.gov/collections/BILLS/'+startdate/*.subtract('3', 'months')*/+'/'+enddate+'/?offset=0&pageSize=100&api_key='+process.env.GPOKEY,
		encoding: 'utf8'
	}).then(function(result){
		// console.log(result.toString())
		return res.status(200).send(result.toString())
	})
	.catch(function(err){
		console.log('err')
		console.log(err.toString().data)
		return next(err)
	})
})

router.get('/api/geointersect/:id', function(req, res, next){
	ContentDB.findOne({_id:req.params.id}).lean().exec(function(err, doc){
		if (err) {
			return next(err)
		}
		ContentDB.find({'properties.title.str': 'Geography', geometry: {$geoIntersects: {$geometry: doc.geometry}}}).lean().exec(function(err, data){
			if (err) {
				return next(err)
			}
			return res.status(200).send(data)
		})
	})
})

router.post('/api/importjson/:id/:type', uploadmedia.single('json')/*, csrfProtection*/, function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)

	fs.readFile(req.file.path, 'utf8', async function (err, content) {
		if (err) {
			return console.log(err)
		}
		var json = JSON.parse(content);
		// await json.features.forEach(feat => {
		// 	if (feat.properties.dates) {
		// 		var dates = typeof feat.properties.dates === 'string' ? feat.properties.dates.split(':')[1].replace(')', '') : feat.properties.dates.join(',');
		// 		if (dates) {
		// 			feat.properties.dates = dates.split(',').join(', ')
		// 
		// 		}
		// 
		// 	}
		// })
		var multiPolygon;
		var type = 'MultiPolygon';
		var keys;
		if (json.features && json.features.length) {
			// console.log(json.features[0].geometry)
			keys = Object.keys(json.features[0].properties);
			if (json.features[0] && json.features[0].geometry.type === 'Point') {
				type = 'MultiPoint'
			}
			// console.log(type)
			multiPolygon = await json.features.map(function(ft){
				if (!Array.isArray(ft.geometry.coordinates[0])) {
					return [ft.geometry.coordinates[0], ft.geometry.coordinates[1]];
				} else {
					return ft.geometry.coordinates[0];
				}
			})
		} else {
			if (json[0].geometry) {
				keys = Object.keys(json[0].properties)
				multiPolygon = json[0].geometry.coordinates;
			} else if (json.geometry) {
				keys = Object.keys(json.properties)
				multiPolygon = json.geometry.coordinates
			}
		} 
		var geo = {
			type: type,
			coordinates: multiPolygon
		}
		// console.log(multiPolygon)
		var set = {$set:{}};
		var key1 = 'geometry';
		var key2 = 'properties.keys'
		set.$set[key1] = geo;
		set.$set[key2] = keys;
		ContentDB.findOneAndUpdate({_id: req.params.id}, set, {safe: true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			fs.writeFile(req.file.path, JSON.stringify(json), function(err){
				if (err) {
					return next(err);
				}
				return res.status(200).send(doc)
			})
		})
		
	})
})

///api/new/State/45/0/undefined/undefined/Salt%20Lake%20City%20Corporation%20v%20Inland%20Port%20Authority
// /api/new/Nation/0/0/0/0/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal.
// /api/new/State/45/4/null/undefined/Inland Port b/
router.get('/api/new/:placetype/:place/:tiind/:chind/:secind/:stitle/:xmlid', async function(req, res, next){
	req.session.importgdrive = false;
	var outputPath = url.parse(req.url).pathname;
	// console.log(outputPath)
	// var csrf = req.csrfToken();
	const arr = tis;
	var usstates = //await //JSON.stringify(
		await require(''+path.join(__dirname, '/..')+'/public/json/usstates.json').features;
	// var uscounties = 
	// 	require(''+path.join(__dirname, '/..')+'/public/json/uscounties.json').features;
	// var us = 
	// 	require(''+path.join(__dirname, '/..')+'/public/json/us.json').features;
	var places,query;
	var placeind = parseInt(req.params.place, 10)
	//console.log(places[placeind])
	ContentDB.find({}).sort( { index: 1 } ).exec(async function(err, data){
		if (err) {
			return next(err)
		}
		await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png')
		await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/full/'+(data.length)+'/img_0.png')
		var tiind = parseInt(req.params.tiind,10);
		var chind = parseInt(req.params.chind,10);
		var secind = parseInt(req.params.secind,10);
		if (isNaN(chind)) {
			// if (isNaN(secind)) {
			// 
			// } else {
			// 	console.log('q has no chapter but has section?')
			// 
			// }
			query = {'properties.title.ind': tiind}
		} else {
			// if (isNaN(secind)) {
			// 	// console.log('q has chapter but has no section?')
			// 
			// } else {
			// 
			// }
			query = {'properties.title.ind': tiind, 'properties.chapter.ind': chind}
		}
		ContentDB.find(query, async function(err, chunk){
			if (err) {
				return next(err)
			}
			// var sind, 
			var stitle, chtitle, chnd, snd, xmlurl;
		// console.log(req.params.placetype)
			if (req.params.placetype === 'Nation' || req.params.placetype === "'Nation'") {
				places = usstates;
				if (isNaN(chind)) {
					if (!req.params.xmlid || req.params.xmlid === 'undefined' || req.params.xmlid === 'null') {
						chnd = chunk.length;//arr[tiind].chapter[arr[tiind].chapter.length-1].ind;
						snd = (isNaN(secind) ? (chunk.length === 0 ? 0 : (chunk[chunk.length-1].properties.section.ind + 1)) : secind);
						chtitle = 'Jurisdiction: '+ places[placeind].properties.name;
						
					} else {
						var chobj = usleg.filter(function(l){
							return (req.params.xmlid.split('BILLS-')[1].split(/(\d{0,4})/)[1] === l.code)
						})[0];
						chnd = (!req.params.xmlid.split('BILLS-')[1] ? 
							arr[tiind].chapter[arr[tiind].chapter.length-1].ind :
							parseInt(req.params.xmlid.split('BILLS-')[1].split(chobj.code)[0], 10)
						);
						snd = (!req.params.xmlid.split('BILLS-')[1] ? 
							arr[tiind].chapter[chind].section[secind].ind :
							parseInt(req.params.xmlid.split(chobj.code)[1].split(/\w/)[0], 10)
						);
						chtitle = chobj.name;
						xmlurl = (tiind === 0 ? 'https://api.govinfo.gov/packages/'+
							req.params.xmlid
							+'/xml' : null );
					}
					stitle = (!req.params.stitle ? '' : decodeURIComponent(req.params.stitle))
				} else {
					chnd = chind;
					if (!req.params.xmlid || req.params.xmlid === 'null') {
						console.log('fsdkj;')
						snd = 108//(isNaN(secind) ? 108 : secind);//arr[tiind].chapter[chind].section[secind].ind;
						chtitle = arr[0].chapter[0].name;
						xmlurl = 'https://api.govinfo.gov/packages/BILLS-116hres109ih/xml'
					} else {
						// console.log('wtafff?')
						// console.log(req.params.xmlid)
						var chobj = usleg.filter(function(l){
							// console.log(req.params.xmlid.split('BILLS-')[1].split(/\d/).filter(item=>isNaN(+item) && item !== ''))
							const codes = req.params.xmlid.split('BILLS-')[1].split(/\d/).filter(item=>isNaN(+item) && item !== '');
							return (codes[0] === l.code)
						})[0];
						snd = parseInt(req.params.xmlid.split(chobj.code)[1].split(/\D/)[0], 10) - 1;//arr[tiind].chapter[chind].section[secind].ind;
						chtitle = (!chobj ? arr[0].chapter[0].name : chobj.name);
						xmlurl = (tiind === 0 ? 'https://api.govinfo.gov/packages/'+
							req.params.xmlid
							+'/xml' : null )
					}
					stitle = decodeURIComponent(req.params.stitle);
					
				}
				
			} else {
				places = usstates;
				var chk = await ContentDB.find({'properties.chapter.str': 'Jurisdiction: '+ places[placeind].properties.name}).then(function(doc){return doc}).catch(function(err){return console.log(err)});
				// console.log(chk)
				if (isNaN(chind) || !arr[tiind].chapter[chind]) {
					chnd = (!chk || chk.length ===  0 ? 0 : chk[0].properties.chapter.ind);
				} else {
					chnd = chind;
				}
				chtitle = 'Jurisdiction: '+ places[placeind].properties.name;
				snd = (isNaN(secind) ? (!chk || chk.length == 0 ? 0 : (chk[chk.length-1].properties.section.ind + 1)) : secind);
				stitle = decodeURIComponent(req.params.stitle);
			
				
				// xmlurl = (tiind === 0 ? 'https://api.govinfo.gov/packages/'+
				// 	req.params.xmlid
				// 	+'/htm' : null )
				//arr[tiind].code+''+(arr[tiind].chapter[chind].ind+1)+''+arr[tiind].chapter[chind].code+''+(arr[tiind].chapter[chind].section[secind].ind+1)+''+arr[tiind].chapter[chind].section[secind].code
				
			}
			
			var multipolygon = JSON.parse(JSON.stringify(places[placeind].geometry.coordinates));

			var content = new ContentDB({
				type: 'Feature',
				index: data.length,
				properties: {
					// db
					
					title: {
						ind: arr[tiind].ind,
						str: arr[tiind].name
					},
					chapter: {
						ind: chnd,
						str: chtitle
					},
					section: {
						ind: snd,
						str: stitle 
					},
					published: true,
					label: (!req.params.stitle ? 'Edit Title' : decodeURIComponent(req.params.stitle) ),
					place: places[placeind].properties.name,
					description: marked(curly('Edit document text.')),
					xmlurl: xmlurl,
					current: false,
					time: {
						begin: moment().utc().format(),
						end: moment().add(1, 'hours').utc().format()
					},
					media: [
						{
							index: 0,
							name: 'Sample image',
							image_abs: ''+publishers+'/pu/publishers/esta/images/full/'+(data.length)+'/img_0.png',
							image: '/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png',
							thumb_abs: ''+publishers+'/pu/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png',
							thumb: '/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png',
							caption: 'Sample caption',
							postscript: 'Sample postscript',
							url: 'https://pu.bli.sh'
						}
					]		
				},
				geometry: {
					type: 'MultiPolygon',
					coordinates: (!Array.isArray(multipolygon[0][0][0]) ? [multipolygon] : multipolygon)
				}
			});
			content.save(function(err){
				if (err) {
					console.log(err)
				}
				ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
					if (err) {
						return next(err)
					}
					return res.redirect('/list/'+content._id+'/'+null+'')
				});
			});
			

		})
		
	});
});

router.post('/api/uploadmedia/:index/:counter/:type', rmFile, uploadmedia.single('img'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath, req.file)
	return res.status(200).send(req.file.path)
	
});

router.post('/api/editcontent/:id', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var id = req.params.id;
	var body = req.body;
	var keys = Object.keys(body);
	//console.log(body.lat, body.lng)
	if (!body.description){
		body.description = ''
	}
	// console.log(body)
	asynk.waterfall([
		function(next){
			var publishersDir = (process.env.NODE_ENV === 'production' ? process.env.PD.toString() : (!process.env.DEVPD ? null : process.env.DEVPD.toString()));

			ContentDB.findOne({_id: req.params.id}, async function(err, doc) {
				if (err) {
					return next(err)
				}
				var pu = req.user;
				if (!pu) {
					return res.redirect('/login')
				}
				var thumburls = [];
				var count = 0;
				var i = 0;
				await keys.forEach(function(key, i){
					var thiskey = 'thumb'+count+'';
					if (key === thiskey) {
						// console.log(thiskey, body[thiskey])
						var thisbody = body[thiskey];
						if (thisbody && typeof thisbody.split === 'function' && thisbody.split('').length > 100) {
							var thumbbuf = new Buffer(body[thiskey], 'base64'); // decode
							var thumburl = ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+count+'.png'
							thumburls.push(thumburl.replace(publishersDir, ''))
							count++;
						// console.log('thumburl, thumbbuf')
						// console.log(thumburl, thumbbuf)
							fs.writeFile(thumburl, thumbbuf, function(err) {
								if(err) {
									console.log("err", err);
								} 
							})

						} else {
								thumburls.push(body[thiskey])
								count++
						}						
					} else {
						count = count;
					}
				})
				// for (var i in keys) {
				// 
				// }
				next(null, doc, thumburls, body, keys, pu, id)
				
			})
		},
		function(doc, thumburls, body, keys, pu, id, next) {
			var imgs = [];
			var orientations = [];
			var count = 0;
			for (var k = 0; k < keys.length; k++) {
				var thiskey = 'img'+count+'';
				var thiso = 'orientation'+count+'';
				if (keys[k] === thiskey) {
					imgs.push(body[keys[k]])
					orientations.push(body[thiso]);
					count++;
				}
			}
			// console.log(imgs)
			next(null, doc, thumburls, imgs, orientations, body, keys, pu, id)
		},
		function(doc, thumburls, imgs, orientations, body, keys, pu, id, next) {
			var footnotes = [];
			var count = 0;
			for (var k = 0; k < keys.length; k++) {
				
				var thatkey = 'footnote'+count+''
				if (keys[k] === thatkey) {
					console.log('footnote')
					console.log(body[thatkey])
					if (body[thatkey]) {
						footnotes.push(body[thatkey])
						count++;
					}
				}

			}
			next(null, doc, thumburls, imgs, orientations, footnotes, body, pu, id)
		},
		function(doc, thumburls, imgs, orientations, footnotes, body, pu, id, next) {
			// console.log('footnotes')
			// console.log(footnotes)
			var straight = function(str) {
				return str.replace(/(\d\s*)&rdquo;/g, '$1\"').replace(/(\d\s*)&rsquo;/g, "$1'")
			}
			var desc = removeExtras(body.description);
			var isEqual = htmlDiffer.isEqual((!doc.properties.description ? '' : doc.properties.description), marked(curly((!desc ? '' : desc))))
			//var Diff = require('diff');
			//console.log(doc.properties.description, marked(curly(desc)))
			var diff = htmlDiffer.diffHtml((!doc.properties.description ? '' : doc.properties.description), marked(curly((!desc ? '' : desc))));
			//console.log('sent this diff')
			//console.log(diff)
			var diffss = [], newdiff = null;
			if (!isEqual) {
				newdiff = {
					date: newdate,
					user: {
						_id: pu._id,
						uname: pu.username,
						avatar: pu.properties.avatar
					},
					str: desc//marked(curly(desc))
				};
			}

			var newdate = new Date();
		// console.log(body.latlng)
			//console.log(desc, body.description);
			var end;
			var current;
			var type = 'MultiPolygon';
			// console.log(body.latlng)
			if (!Array.isArray(JSON.parse(body.latlng)[0][0])) {
				type = 'MultiPoint'
			}
			// console.log(body)
			var entry = {
				_id: id,
				type: "Feature",
				index: doc.index,
				properties: {
					credit: body.credit,
					title: {
						ind: doc.properties.title.ind,
						str: doc.properties.title.str 
					},
					chapter: {
						ind: doc.properties.chapter.ind,
						str: doc.properties.chapter.str 
					},
					section: {
						ind: doc.properties.section.ind,
						str: body.section ? curly(body.section) : doc.properties.section.str
					},
					published: (!body.published ? false : true),
					_id: id,
					label: body.label && body.label !== '' ? curly(body.label) : doc.properties.label,
					place: body.place && body.place !== '' ? curly(body.place) : doc.properties.place,
					description: desc ? marked(curly(desc)) : doc.properties.description,
					time: {
						begin: new Date(body.datebegin),
						end: moment().utc().format()
					},
					xmlurl: doc.properties.xmlurl,
					media: [],
					// (!doc.properties.media || doc.properties.media.length === 0 ? [] : doc.properties.media),
					diffs: doc.properties.diffs,
					footnotes: footnotes,
					layers: (!body.layers ? [] : JSON.parse(body.layers)),
					keys: (!body.keys ? [] : JSON.parse(body.keys))
				},
				geometry: {
					type: type,
					coordinates: JSON.parse(body.latlng)
				}
			}
			
			//console.log(body.latlng)
			//console.log(entry)
			var entrymedia = []
			var thumbs = thumburls;
			var count = 0;
			if (thumbs.length > 0) {
				for (var i = 0; i < thumbs.length; i++) {
					var media;
					console.log(thumbs[i])
					media = {
						index: count,
						name: (body['img'+i+'_name'] ? curly(body['img'+i+'_name']) : ''),
						image: imgs[i],
						image_abs: path.join(publishers, '/pu'+imgs[i]),
						iframe: (!body['iframe'+i+''] ? null : body['iframe'+i+'']),
						thumb: thumbs[i],
						thumb_abs: path.join(publishers, '/pu'+thumbs[i]),
						caption: (body['img'+i+'_caption'] ? curly(body['img'+i+'_caption']) : ''),
						postscript: (body['img'+i+'_postscript'] ? curly(body['img'+i+'_postscript']) : ''),
						featured: body['img'+i+'_featured'],
						orientation: orientations[i]
					}
			
					entrymedia.push(media)
					count++
				}
			}
		// console.log(id)// doc._id = ''+doc._id
			entry = JSON.parse(JSON.stringify(entry))
			var set1 = {$set: {}};
			set1.$set['properties'] = entry.properties;

			var key2 = 'properties.media';
			var set2 = {$set: {}};
			set2.$set[key2] = entrymedia;

			var set3 = {$set: {}};
			set3.$set['geometry'] = entry.geometry;

			var set4 = {$push: {}};
			var key4 = 'properties.diffs'
			set4.$push[key4] = newdiff;
			
			var options = {safe: true, new: true, upsert: false};
			ContentDB.findOneAndUpdate({_id: id}, set1, options, function(err, docc) {
				if (err) {
					return next(err) 
				}
				ContentDB.findOneAndUpdate({_id: id}, set2, options, function(errr, doc) {
					if (errr) {
						return next(errr)
					}
					ContentDB.findOneAndUpdate({_id: id}, set3, options, function(errr, doc) {
						if (errr) {
							return next(errr)
						}
						if (!newdiff) {
							next(null, doc)
						} else {
							ContentDB.findOneAndUpdate({_id: id}, set4, options, function(errr, doc) {
								if (errr) {
									next(errr)
								} else {
									next(null, doc)
								}
							})
						}
					})
				})
			})
			
		}
	], function(err, doc){
		if (err) {
			return next(err)
		}
		return res.redirect('/list/'+doc._id+'/'+null+'');
	})
	
});

// router.post('/api/new', function(req, res, next) {
// 
// })

router.post('/api/newmap/:id/:index', uploadmedia.single('img'), function(req, res, next) {
	ContentDB.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err) 
		}
		var index = parseInt(req.params.index, 10);
		var media = {
			index: index,
			name: 'Image '+(index + 1)+'',
			image: '/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			image_abs: ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			iframe: null,
			thumb: '/publishers/esta/images/full/'+doc.index+'/img_'+index+'.png',
			thumb_abs: ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'/img_'+index+'.png',
			caption: '',
			postscript: '',
			featured: false
		}
		ContentDB.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})
	})
})

router.post('/api/newmedia/:id/:index', function(req, res, next) {
	ContentDB.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err) 
		}
		var index = parseInt(req.params.index, 10);
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+index+'.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'/img_'+index+'.png')
		var media = {
			index: index,
			name: 'Image '+(index + 1)+'',
			image: '/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			image_abs: ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+index+'.png',
			iframe: null,
			thumb: '/publishers/esta/images/full/'+doc.index+'/img_'+index+'.png',
			thumb_abs: ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'/img_'+index+'.png',
			caption: '',
			postscript: '',
			featured: false
		}
		ContentDB.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(media)
		})
	})
	
});

router.post('/api/deleteentry/:id', async function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var id = req.params.id;
	// var index = parseInt(req.params.index, 10);
	var dc = await ContentDB.findOne({_id: id}).then(function(doc){return doc}).catch(function(err){return next(err)});
	var med = null, index = null;
	if (dc.properties.media.length > 0) {
		med = dc.properties.media[0].thumb;
		index = med.split('thumbs/')[1].split('/')[0];
	} 
	if (!index) {
		index = 0;
	}
	ContentDB.remove({_id: id}, function(err, data) {
		if (err) {
			return next(err); 
		}
		emptyDirs(index, function(err){
			if (err) {
				return next(err)
			}
			ContentDB.find({index:{$gt:index}}).sort( { index: 1 } ).exec(function(err, dat){
				if (err) {
					return next(err)
				}
				var indexes = [];
				for (var i = 0; i < dat.length; i++) {
					indexes.push(dat[i].index);
				}
				dat = JSON.parse(JSON.stringify(dat));
				renameEachImgDir(dat, 'decrement', indexes, null, function(err){
					if (err) {
						console.log(err)
					}
					ContentDB.update({index: {$gt: index}}, {$inc: {index: -1}}, { multi: true }, function(err, data) {
						if (err) {
							return next(err)
						}
					
						return res.status(200).send('ok');
					});
					
				})
			});
		})
	})
});

router.post('/api/deletemedia/:id/:index', function(req, res, next) {
	var id = req.params.id;
	var index = parseInt(req.params.index, 10);
	ContentDB.findOne({_id: id}, function(err, thisdoc){
		if (err) {
			return next(err)
		}
		ContentDB.findOneAndUpdate({_id: id}, {$pull: {'properties.media': {index: index}}}, {multi: false, new: true}, async function(err, doc) {
			if (err) {
				return next(err) 
			}
			var publishersDir = (process.env.NODE_ENV === 'production' ? process.env.PD.toString() : process.env.DEVPD.toString());

			var media = doc.properties.media;
			if (media.length === 0) {
				media = []
			} else {
				for (var i = index; i < media.length; i++) {
					var oip = ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'/'+'img_' + (i+1) + '.png';
					var otp = ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/'+'thumb_' + (i+1) + '.png';
					var nip = ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'/'+'img_' + i + '.png';
					var ntp = ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/'+'thumb_' + i + '.png';
					var options = {nonull:true,nodir:true}
					var oldImgPath = glob.sync(oip, options)[0];
					var oldThumbPath = glob.sync(otp, options)[0];
					var newImgPath = glob.sync(nip, options)[0];
					var newThumbPath = glob.sync(ntp, options)[0];
					if (await fs.existsSync(oldImgPath)) {
						fs.moveSync(oldImgPath, newImgPath, { overwrite: true });
						fs.moveSync(oldThumbPath, newThumbPath, { overwrite: true });
					}
					media[i].image_abs = newImgPath;
					media[i].thumb_abs = newThumbPath;
					media[i].image = newImgPath.replace(publishersDir, '');
					media[i].thumb = newThumbPath.replace(publishersDir, '')
					media[i].index -= 1;
				}
			}
			ContentDB.findOneAndUpdate({_id: id}, {$set:{'properties.media': media}}, function(err, doc){
				if (err) {
					return next(err)
				}
				// if deleted media was featured, assign featured value to first media
				if (thisdoc.properties.media[index] && thisdoc.properties.media[index].featured) {
					ContentDB.findOneAndUpdate({_id: id, 'properties.media.index': 0}, {$set: {'properties.media.$.featured': true}}, function(err, doc) {
						if (err) {
							return next(err)
						}
						return res.status(200).send(doc);
					})
				} else {
					return res.status(200).send(doc);
				}
				
			})
		})	
	})
});

module.exports = router;