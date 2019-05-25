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
var Publisher = require('../models/publishers.js');
var Content = require('../models/content.js');
var Diffs = require('../models/diffs.js');
var Signature = require('../models/signatures.js');
var HtmlDocx = require('html-docx-js');
var HtmlDiffer = require('html-differ').HtmlDiffer;
var csrfProtection = csrf({ cookie: true });
var publishers = path.join(__dirname, '/../../..');
var htmlDiffer = new HtmlDiffer({
	ignoreAttributes: ['id', 'for', 'class', 'href', 'style']
});
var {google} = require('googleapis');
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

var isJurisdiction = async function isJurisdiction(reqpos, doc, pu, cb) {
	var lat, lng;
	var gtype, gcoords;
	if (!pu) {
		// console.log(req.session)
		if (!reqpos) {
			return cb(null)
		} else {
			gtype = 'Point';
			gcoords = [reqpos.lng, reqpos.lat]
		}
	}
	//  else {
	// 	pu = await Publisher.findOne({_id: pu._id}).lean().exec(async function(err, pubr){
	// 		if (err) {
	// 			return cb(err)
	// 		}
	// 		return pubr;
	// 	})
	// 	.catch(function(err){
	// 		console.log(err)
	// 	});
	// }
	else if (
		// !gcoords 
		!pu.geometry || !pu.geometry.type || pu.geometry.coordinates.length === 0
	) {
		gtype = 'MultiPolygon'
		if (!pu || !pu.sig[pu.sig.length-1]) {
		// console.log(pu)
			
			var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
			var zipcoden; 
			if (pu && pu.properties.zip) {
				zipcoden = pu.properties.zip;
			}
			else if (pu && pu.properties.place && !isNaN(parseInt(pu.properties.place, 10))) {
				zipcoden = pu.properties.place;
			} else {
				return cb(null)
			}
			var zipcode = await JSON.parse(zipcodes).features.filter(function(zip){
				return (
					zip.properties['ZCTA5CE10']
					=== 
					zipcoden
					)
			});
		// console.log('zipcode')
		// console.log(zipcode)
			
			if (zipcode.length === 0) return cb(null);
			lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
			lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
			gcoords = 
				[[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]]
			
		} else {
			var ts = (!pu || !pu.sig ? null : pu.sig[pu.sig.length-1].ts);
			if (!ts) {
				return cb(null)
			}
			var pos = ts.split('G/')[0];
			pos = pos.split(',');
			pos.forEach(function(l){
				return parseFloat(l)
			})
			
			gcoords = 
				[[[[pos[1], pos[0]],[(pos[1]+.00001),pos[0]],[(pos[1]+.00001),(pos[0]+.00001)],[pos[1],(pos[0]+.00001)],[pos[1],pos[0]]]]]
		}
	} else {
		gtype = 'MultiPolygon';
		if (!pu || !pu.geometry) return cb(null);
		gcoords = pu.geometry.coordinates;
	}
	if (!gcoords || gcoords.length === 0) {
	// console.log(gcoords)
		cb(null)
	} else {
	// console.log(gcoords)
		Content.findOne({_id: doc._id, geometry: {$geoIntersects: {$geometry: {type: gtype, coordinates: gcoords}}}}).lean().exec(function(err, doc){
			if (err) {
				console.log(err)
				cb(null)
			} else {
				if (!err && !doc) {
					cb(false);
				} else {
					cb(true);
				}
			}
			
		})
	}
}

const usleg =  [
	{code: 'hconres', name: 'House Concurrent Resolution (H. Con.Res.)'},
	{code: 'hjres', name: 'House Joint Resolution (H.J. Res.)'},
	{code: 'hr', name: 'House Bill (H.R.)'},
	{code: 'hres', name: 'House Simple Resolution (H. Res.)'},
	{code: 's', name: 'Senate Bill (S.)'},
	{code: 'sconres', name: 'Senate Concurrent Resolution (S. Con. Res.)'},
	{code: 'sjres', name: 'Senate Joint Resolution (S.J. Res.)'},
	{code: 'sres', name: 'Senate Simple Resolution (S.)'},
	{code: 's', name: 'Senate Bill (S. Res.)'}
]

const tis = 
// TODO use gpo API to populate tis[0]
//{
	/*bill: [
		'House Simple Resolution (H. Res.)',
		'House Concurrent Resolution (H. Con. Res.)',
		'House Joint Resolution (H.J. Res.)',
		'House Bill (H.R.)',
		'Senate Bill (S.)',
		'Senate Concurrent Resolution (S. Con. Res.)',
		'Senate Joint Resolution (S.J. Res.)',
		'Senate Simple Resolution (S. Res.)'
	],*/
	// title: 
	[
		{
			ind: 0,
			name: 'in support of legislation',
			code: 'BILLS-',
			chapter: [
				{
					ind: 115,
					name: 'United States Congress',
					code: 'hres',
					section: [
						{
							ind: 108,
							name: 'House Simple Resolution (H. Res.)',
							code: 'ih'
						}
					]
				}
			]
		},
		{
			ind: 1,
			name: 'in Solidarity',
			chapter: [
				{
					ind: 0,
					name: 'Jurisdiction'
				}
			]
		},
		{
			ind: 2,
			name: 'Candidate for Public Office',
			chapter: [
				{
					ind: 0,
					name: 'Jurisdiction'
				}
			]
		},
		{
			ind: 3,
			name: 'Environmental Impact Statement',
			chapter: [
				{
					ind: 0,
					name: 'Jurisdiction'
				}
			]
		},
		{
			ind: 4,
			name: 'Geography',
			chapter: [
				{
					ind: 0,
					name: 'Jurisdiction'
				}
			]
		}
	]

function geoLocate(ip, zoom, cb) {
	var ping = spawn('ping', [ip]);
	ping.stdout.on('data', function(d){
		console.log(d)
	})
	var arp = spawn('arp', ['-a']);
	var mac;
	arp.stdout.on('data', function(dat){
		dat += '';
		dat = dat.split('\n');
		mac = dat[0].split(' ')[3];
	})
	var params = {
		wifiAccessPoints: [{
			macAddress: ''+mac+'',
			signalStrength: -65,
			signalToNoiseRatio: 40
		}]
	};
	geolocation(params, function(err, data) {
		console.log(data)
		if (err) {
			console.log(err)
			position = null;
			// position = {lat: 40.7608, lng: -111.8910, zoom: zoom };
		} else {
			position = { lng: data.location.lng, lat: data.location.lat, zoom: zoom };	
		}
		cb(position);
	
	})
}

var storage = multer.diskStorage({
	
	destination: function (req, file, cb) {
		var p, q;
		if (!req.params.type) {
			p = ''+publishers+'/pu/publishers/esta/signatures/'+req.params.did+'/'+req.params.puid+''
		} else {
			if (req.params.type === 'png') {
				p = ''+publishers+'/pu/publishers/esta/images/full/'+req.params.index+''
				q = ''+publishers+'/pu/publishers/esta/images/thumbs/'+req.params.index+''

			} else if (req.params.type === 'csv') {
				p = ''+publishers+'/pu/publishers/esta/csv/'+req.params.id+''
				q = ''+publishers+'/pu/publishers/esta/csv/thumbs/'+req.params.id+''
				
			} else if (req.params.type === 'txt') {
				p = ''+publishers+'/pu/publishers/esta/txt'
				q = ''+publishers+'/pu/publishers/esta/txt/thumbs'
			} else if (req.params.type === 'doc') {
				var os = require('os');
				p = os.tmpdir() + '/gdoc';
				q = ''+publishers+'/pu/publishers/esta/tmp';
			} else if (req.params.type === 'docx') {
				p = ''+publishers+'/pu/publishers/esta/docx'
				q = null;//''+publishers+'/pu/publishers/esta/word/thumbs'
			} else if (req.params.type === 'json') {
				p = ''+publishers+'/pu/publishers/esta/json';
				q = null;
			} else {
				p = ''+publishers+'/pu/publishers/esta/images/full/'+req.params.index+''
				q = ''+publishers+'/pu/publishers/esta/images/thumbs/'+req.params.index+''

			}
		}
				
		fs.access(p, function(err) {
			if (err && err.code === 'ENOENT') {
				mkdirp(p, function(err){
					if (err) {
						console.log("err", err);
					}
					if (q) {
						fs.access(q, function(err){
							if (err && err.code === 'ENOENT') {
								mkdirp(q, function(err){
									if (err) {
										console.log("err", err);
									}
									cb(null, p)
								})
							} else {
								cb(null, p)
							}
						})
					} else {
						cb(null, p)
					}
					
				})
			} else {
				cb(null, p)
			}
		})
		
	},
	filename: function (req, file, cb) {
		if (req.params.type === 'png') {
			cb(null, 'img_' + req.params.counter + '.png')
		} else if (req.params.type === 'csv') {
			cb(null, 'csv_' + req.params.id + '.csv')
		} else if (req.params.type === 'txt') {
			cb(null, 'txt_' + Date.now() + '.txt')
		} else if (req.params.type === 'docx') {
			cb(null, 'docx_'+Date.now()+'.docx')
		} else if (req.params.type === 'json') {
			cb(null, 'json_'+req.params.id+'.json')
		} else if (!req.params.type){
			cb(null, 'img_'+req.params.did+'_'+req.params.puid+'.png')
		}
  }
});
var uploadmedia = multer({ storage: storage, limits: { fieldSize: 25 * 1024 * 1024 }});

var removeExtras = function(str){
	var desc = null;
	if (str) {
		desc = str.trim()
			.replace(/\u2028/g, '  \n  \n')
			.replace(/(\v)/g, '   \n  \n')
			.replace(/(<br>)/g, '  \n')
	}
	return desc;
}

var curly = function(str){
	if (!str || typeof str.replace !== 'function'){
		return ''
	} else {
		return str
		.replace(/(\s)'(\w)/g,'$1&lsquo;$2')
		.replace(/(\w)'(\s)/g,'$1&rsquo;$2')
		.replace(/(\s)"(\w)/g,'$1&ldquo;$2')
		.replace(/(\w)"(\s)/g,'$1&rdquo;$2')
		.replace(/(\w\.)"/g, "$1&rdquo;")     // Closing doubles
		.replace(/\u2018/g, "&lsquo;")
		.replace(/\u2019/g, "&rsquo;")
		.replace(/\u201c/g, "&ldquo;")
		.replace(/\u201d/g, "&rdquo;")
		.replace(/[“]/g, "&ldquo;")
		.replace(/[”]/g, "&rdquo;")
		.replace(/[’]/g, "&rsquo;")
		.replace(/[‘]/g, "&lsquo;")
		.replace(/([a-z])&lsquo([a-z])/ig, '$1&rsquo;$2')
	}
}

// function ensureCorrectAbsPath(req, res, next){
// 	Content.update({''})
// }

async function ifExistsReturn(req, res, next) {
	var path = ''+publishers+'/pu/publishers/esta/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png';
	var exists = await fs.existsSync(path);
	if (exists) {
		return res.redirect('/list/'+req.params.id+'/'+null);
	}
	return next();
}

function ensureSequentialSectionInd(req, res, next){
	Content.find({}).lean().sort({'properties.section.ind':1}).exec(async function(err, data){
		if (err){
			console.log('no data')
		}
		var count = -1
		await data.forEach(async function(doc, i){
			const dc = await Content.findOne({_id:doc._id, 'properties.title.str': 'Geography', 'properties.chapter.str': 'Jurisdiction: Utah'}).then(function(d){return d}).catch(function(err){console.log(err)});
			if (dc) {
				count++;
				await Content.findOneAndUpdate({_id:dc._id}, {$set:{'properties.section.ind': count, 'properties.chapter.ind': 0}}, {safe:true, upsert:false, new:true}).then(function(d){
					console.log('ok')
				})
				.catch(function(err){
					console.log(err);
				})
			}
			// Content.findOneAndUpdate({_id:doc._id, 'properties.chapter.str': 'Jurisdiction: Utah'}, {$set:{'properties.section.ind': count}}, {safe:true, upsert:false, new:true}, function(err, dc){
			// 	if (err){
			// 		console.log('')
			// 	}
			// 	if (dc) {
			// 		count++;
			// 	}
			// })
		})
		return next();
	})
}

function ensureLocation(req, res, next) {
	Publisher.findOne({_id: req.user._id}).lean().exec(async function(err, pu){
		if (err) {
			return next(err)
		}
		if (!pu) {
			return res.redirect('/login')
		}
		else if (pu.geometry && pu.geometry.coordinates.length) {
			return next()
		} else {
			return res.redirect('/pu/getgeo/'+pu._id+'')
			// var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
			// var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
			// 	return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(pu.properties.zip, 10))
			// });
			// if (zipcode.length === 0) {
			// 	console.log('blg')
			//  return res.redirect('/pu/getgeo/'+pu._id+'');
			// }
			// lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
			// lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
			// var geometry = {
			// 	type: 'MultiPolygon',
			// 	coordinates: [[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]]
			// }
			// console.log(geometry)
			// Publisher.findOneAndUpdate({_id: req.user._id}, {$set:{geometry:geometry}}, {new:true, safe:true}, function(err, pu){
			// 	if (err) {
			// 		return next(err)
			// 	} else {
			// 		if (!pu) {
			// 			if (req.isAuthenticated()) {
			// 				return res.redirect('/pu/getgeo/'+req.user._id+'')
			// 			} else {
			// 				return res.redirect('/login')
			// 			}
			// 		} else {
			// 			return next()
			// 		}
			// 	}
			// 
			// })
		}
	})
}

function rmFile(req, res, next) {
	var imgp = ''+publishers+'/pu/publishers/esta/images/full/'+req.params.index+'/'+'img_' + req.params.counter + '.png';
	var thumbp = ''+publishers+'/pu/publishers/esta/images/thumbs/'+req.params.index+'/'+'thumb_' + req.params.counter + '.png';
	//console.log(imgp, thumbp)
	var options = {nonull:true,nodir:true}
	var p = glob.sync(imgp, options)[0];
	var q = glob.sync(thumbp, options)[0];
	fs.pathExists(q, function(err, exists){
		if (err) {
			console.log(err)
		}
		if (exists) {
			fs.pathExists(p, function(err, exists2){
				if (err) {
					console.log(err)
				}
				if (exists2) {
					fs.remove(p, function(e){
						if (e) {
							console.log(e)
						}
						fs.remove(q, function(e){
							if (e) {
								console.log(e)
							}
							next()
						})
					})	
				} else {
					next();
				}
			})
			
		} else {
			next();
		}
	})
}
function renameEachImgDir(data, direction, indexes, oldInd, next) {
	
	asynk.waterfall([
		
		function(cb) {
			var qs = [];
			var count = 0;
			
			for (let i of indexes) {
				switch(direction){
					case 'none':
						break;
					case 'decrement':
						i--;
						break;
					case 'increment':
						i++;
						break;
					default:
						break;
				}
			
				var doc = data[count];
				
				for (var j = 0; j < doc.properties.media.length; j++) {
					j = parseInt(j, 10);
					var q1 = {
						query: {_id: doc._id},
						key: 'image',
						index: i,
						ind: j,
						//key: 'properties.media.$.image',
						image: '/publishers/esta/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q1);
					var q2 = {
						query: {_id: doc._id},
						key: 'thumb',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: '/publishers/esta/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q2);
					var q3 = {
						query: {_id: doc._id},
						key: 'thumb_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/esta/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q3);
					var q4 = {
						query: {_id: doc._id},
						key: 'image_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/esta/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q4);
					
				}
				var oldImgDir = ''+publishers+'/pu/publishers/esta/images/full/'+(oldInd ? oldInd : doc.index)+'';
				var oldThumbDir = ''+publishers+'/pu/publishers/esta/images/thumbs/'+(oldInd ? oldInd : doc.index)+'';
				var newImgDir = ''+publishers+'/pu/publishers/esta/images/full/'+i+'';
				var newThumbDir = ''+publishers+'/pu/publishers/esta/images/thumbs/'+i+'';
				if (fs.existsSync(oldImgDir)) {
					fs.moveSync(oldImgDir, newImgDir, { overwrite: true });
					fs.moveSync(oldThumbDir, newThumbDir, { overwrite: true });
				}
				count++;
			}
			cb(null, qs)
		},
		function(qs, cb) {
			asynk.eachSeries(qs, function(q, nxt){
				Content.findOne(q.query, function(err, doc){
					if (err) {
						nxt(err)
					}
					if (doc) {
						doc.properties.media[q.ind][q.key] = q.image;
						doc.save(function(err){
							if (err) {
								nxt(err)
							} else {
								nxt(null)
							}
						})
					} else {
						nxt(null)
					}
				})
			}, function(err){
				if(err) {
					cb(err)
				} else {
					cb(null)
				}
			})
		}
	], function(err) {
		if (err) {
			return next(err) 
		}
		return next();
	})
	
}

// https://gist.github.com/liangzan/807712/8fb16263cb39e8472d17aea760b6b1492c465af2
function emptyDirs(index, next) {
	var p = ''+publishers+'/pu/publishers/esta/images/full/'+index+'';
	var q = ''+publishers+'/pu/publishers/esta/images/thumbs/'+index+'';
	fs.emptyDir(p, function(err){
		if (err) {
			return next(err)
		}
		fs.emptyDir(q, function(err) {
			if (err) {
				return next(err)
			}
			next()
		})
	})
}


function ensureCurly(req, res, next) {
	Content.find({}, function(err, data) {
		if (err){
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new/'+'Nation'+'/'+0+'/'+0+'/'+115+'/'+108+'/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal./'+null+'')
		}
		data.forEach(function(doc){
			//console.log(doc.index)
			doc.properties.description = (!doc.properties.description ? null : curly(doc.properties.description));
			doc.properties.media.forEach(function(media){
				media.name = media.name ? curly(media.name) : null;
				media.caption = (!media.caption ? null : curly(media.caption));
			})
			doc.save(function(err){
				if (err) {
					return next(err)
				}
			})
		})
		return next()
	})
}

function ensureContent(req, res, next) {
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new/'+'Nation'+'/'+0+'/'+0+'/'+115+'/'+108+'/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal./'+null+'')
		} else {
			return next()
		}
	});
}

function getLayers(req, res, next) {
	Content.findOne({_id:req.params.id}).lean().exec(async function(err, doc){
		if (err) {
			return next(err)
		}
		var layerids = doc.properties.layers || [];
		const layers = await layerids.map(function(id){
			return Content.findOne({_id:id}).then((doc) =>doc).catch((err)=>next(err));
		})
		req.layers = layers;
		return next();
	})
}

function getGeo(req, res, next) {
	Content.findOne({_id:req.params.id}).lean().exec(async function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({'properties.title.str': 'Geography', geometry: {$geoIntersects: {$geometry: {type: doc.geometry.type, coordinates: doc.geometry.coordinates}}} }).lean().exec(async function(err, data){
			if (err) {
				return next(err)
			}
			var reqpos = (req.session && req.session.position ? req.session.position : null)
			await data.filter(async function(doc){
				const isJ = await isJurisdiction(reqpos, doc, req.user, function(jd){
					if (jd === null) {
						return false; 
					} else {
						return jd;
					}
					// return res.redirect('/user/getgeo');
				});
				return isJ;
			})
			req.layers = data;
			return next()
		})
	})
}

function getDat(req, res, next){
	asynk.waterfall([
		function(cb){
			Content.distinct('properties.title.ind', function(err, tdistinct){
				if (err) {
					cb(err)
				}
				var dat = []; 
				if (tdistinct.length === 0) {
					if (req.isAuthenticated() && req.user.properties.admin) {
						return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+115+'/'+108+'/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal./'+null+'')
					} else {
						return res.redirect('/login')
					}
				}
				tdistinct.forEach(function(td, i){
					Content.find({'properties.title.ind': parseInt(td,10)}).lean().exec(function(err, distinct){
						if (err) {
							return cb(err)
						}
						
						dat[i] = distinct;
						
					})
				})
			// console.log(dat)
				cb(null, dat)
			})
		}
	], function(err, dat){
		if (err) {
			return next(err)
		}
		req.dat = dat;
		return next()
	})
}


function getDat64(next){
	asynk.waterfall([
		function(cb){
			var dat = []
			Content.distinct('properties.chapter.ind', function(err, distinct){
				if (err) {
					return next(err)
				}
				if (distinct.length === 0) {
					Content.find({}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
						if (err) {
							return next(err)
						}
						data = data.sort(function(a,b){
							if (parseInt(a.properties.section.ind,10) < parseInt(b.properties.section.ind, 10)) {
								return -1;
							} else {
								return 1;
							}
						})
						data.forEach(function(doc){
							if (doc.properties !== undefined) {
								if (doc.properties.media.length > 0) {
									doc.properties.media.forEach(function(img){
										var imageAsBase64 = fs.readFileSync(''+publishers+'/pu'+img.image, 'base64')
										img.image = 'data:image/png;base64,'+imageAsBase64
									})
								}
							}
						})
						dat.push(data)
						cb(null, dat)
					})
				} else {
					distinct.sort();

					asynk.forEach(
						distinct,
						function(key, callback){
							Content.find({'properties.chapter.ind':key}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
								if (err) {
									console.log(err)
								}
								//console.log(data)
								//if (data.length === 0) return;
								if (data.length > 0) {
									data = data.sort(function(a,b){
										if (parseInt(a.properties.section.ind,10) < parseInt(b.properties.section.ind, 10)) {
											return -1;
										} else {
											return 1;
										}
									})
									data.forEach(function(doc){
										if (doc.properties !== undefined) {
											if (doc.properties.media.length > 0) {
												doc.properties.media.forEach(function(img){
													var imageAsBase64 = fs.readFileSync(''+publishers+'/pu'+img.image, 'base64')
													img.image = 'data:image/png;base64,'+imageAsBase64
												})
											}
										}
									})
									dat.push(data)
								}
								callback();
							})
							
						},
						function(err){
							if (err) {
								cb(err)
							}
							cb(null, dat)
						}
					)
				}
			})
		}
	], function(err, dat) {
		if (err) {
			console.log(err)
		}
		//console.log(dat)
		dat = dat.sort(function(a,b){
			//console.log(a[0].properties.chapter.ind)
			if (parseInt(a[0].properties.chapter.ind, 10) < parseInt(b[0].properties.chapter.ind, 10)) {
				return -1
			} else {
				return 1
			}
		})
		next(dat)
	})
}

function ensureAuthenticated(req, res, next) {
	// console.log(req.isAuthenticated())
	if (req.isAuthenticated()) {
		req.session.userId = req.user._id;
		req.session.loggedin = req.user.username;
		return next();
	}
	return res.redirect('/login');
}

function ensureAdmin(req, res, next) {
	//console.log(req.isAuthenticated())
	if (!req.isAuthenticated()) {
		return res.redirect('/login')
	}
	//req.session.userId = req.user._id;
	Publisher.findOne({_id: req.session.userId}, function(err, pu){
		if (err) {
			return next(err)
		}
		
		if (pu && pu.properties.admin) {
			req.publisher = Publisher;
			req.user = pu;
			req.session.loggedin = req.user.username;
			return next();
		} else {
			// req.publisher = Publisher;
			req.session.loggedin = null;
			return res.redirect('/')
		}
	})
}

function tokenHandler(authClient, next) {
	
	authClient.getToken(authCode).then(function(resp){
		if (resp.tokens) {
			next(null, resp.tokens)
		} else {
			next(new Error('no tokens'))
		}
	});
	
}

function ensureApiTokens(req, res, next){
	var OAuth2 = google.auth.OAuth2;

	var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
	/*if (!req.user) {
		return res.redirect('/login')
	}*/
	Publisher.findOne({_id: req.session.userId}, function(err, pu){
		if (err) {
			return next(err)
		}
		if (!pu) {
			return res.redirect('/logout')
		}
		if (!pu.properties.admin) {
			return res.redirect('/')
		}
		authClient.setCredentials({
			refresh_token: pu.garefresh,
			access_token: pu.gaaccess
		});
		google.options({auth:authClient})
		authClient.refreshAccessToken()
		.then(function(response){
			if (!response.tokens && !response.credentials) {
				return res.redirect('/login');
  		}
			var tokens = response.tokens || response.credentials;
			Publisher.findOneAndUpdate({_id: req.user._id}, {$set:{garefresh:tokens.refresh_token, gaaccess:tokens.access_token}}, {safe:true,new:true}, function(err, pub){
				if (err) {
					return next(err)
				}
				if (req.session.importdrive) {
					req.session.gp = {
						google_key: process.env.GOOGLE_KEY,
						scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.metadata', 'https://www.googleapis.com/auth/drive.file'],
						//google_clientid: process.env.GOOGLE_OAUTH_CLIENTID,
						access_token: pub.gaaccess,
						picker_key: process.env.GOOGLE_PICKER_KEY
					}
					req.session.authClient = true;
				}
				return next()
			})
		})
	})
}

function mkdirpIfNeeded(p, cb){
	fs.access(p, function(err) {
		if (err && err.code === 'ENOENT') {
			mkdirp(p, function(err){
				if (err) {
					console.log("err", err);
				} else {
					cb()
				}
			})
		} else {
			cb()
		}
	})
	
}

function getDocxBlob(now, doc, sig, cb){
	var pugpath = path.join(__dirname, '../views/includes/exportword.pug');
	sig.forEach(function(si){
		var imageAsBase64 = fs.readFileSync(''+publishers+'/pu'+si.image, 'base64')
		si.image = 'data:image/png;base64,'+imageAsBase64
	})
	var str = pug.renderFile(pugpath, {
		md: require('marked'),
		moment: require('moment'),
		doctype: 'strict',
		hrf: '/publishers/esta/word/'+now+'.docx',
		doc: doc,
		sig: sig
	});
	var docx = 
	HtmlDocx.asBlob(str);
  cb(docx)
}


router.get('/runtests', function(req, res, next){
	req.session.importgdrive = false;
	let chromedriver = require('chromedriver');
	var mocha = require('mocha');
	var assert = require('chai').assert;
	let webdriver = require('selenium-webdriver'),
		By = webdriver.By,
		until = webdriver.until,
		test = webdriver.testing;
	var driver = new webdriver.Builder().
		withCapabilities(webdriver.Capabilities.chrome()).build();
	//Content.remove
		/*driver.get('http://'+process.env.DEVAPPURL+'');
		driver.wait(
	  	until.elementLocated(webdriver.By.css('#description')),
			12000
		).then(function(){
			driver.findElement(webdriver.By.css('#description')).click();
		})
				

		driver.findElement(webdriver.By.name('description')).sendKeys('simple programmer');
		driver.wait(
	  	until.elementLocated(webdriver.By.id('submit_0')),
	  	12000
	  )
	  .then(function(){
			driver.findElement(webdriver.By.css('#submit_0')).click();
			return res.render('test', {
				info: 'ok'
			})
		}, function(err) {
			return next(err)
		});*/
		/*
		driver.wait(
			until.elementLocated(webdriver.By.css('#vue')),
			12000
		).then(function(el){
			//console.log(el.getAttribute('innerHTML'))
			var captures;
			/*Content.find({}, function(err, data) {
				if (err) {
					return next(err)
				}
				/*var input = pug.renderFile(path.join(__dirname, '../views/publish.pug'), {
					doctype: 'xml',
					menu: !req.session.menu ? 'view' : req.session.menu,
					data: data,
					doc: data[0]/*,
					diff: str
				});
				var rx = /^(\w(?:[-:\w]*\w)?)/
				//var rx = /^(\w[-:\w]*)(\/?)/
				while (input.length) {
					if (!rx.exec(input)) {
						input = input.substr(1)
					} else {
						captures = rx.exec(input);
						input = input.substr(captures[0].length)
						//console.log(input)
						console.log(captures)
					}
				}
			})
			*/
			//driver.executeScript('return arguments[0].innerHTML;', el).then(function(ele){
				//	console.log(input)
				//el.getInnerHtml().then(function(input){
				//var input = ele;
				//console.log(/^(\w[-:\w]*)(\/?)/.exec(input))
				//console.log(!/^(\w[-:\w]*)(\/?)/.exec(input))
				
				/*do {
					if (!/^(\w[-:\w]*)(\/?)/.exec(input)) {
						input = input.substr(1)
						//console.log(input)
				  }	else {
						captures = /^(\w[-:\w]*)(\/?)/.exec(input);
						input = input.substr(captures[0].length)
						console.log(input)
						console.log(captures)
			  		//this.consume(captures[0].length);
			  		/*var tok, name = captures[1];
			  		if (':' == name[name.length - 1]) {
			  	  	name = name.slice(0, -1);
			  	  	tok = this.tok('tag', name);
			  	  	this.defer(this.tok(':'));
			  	  	while (' ' == this.input[0]) this.input = this.input.substr(1);
				  	} else {
				  	  tok = this.tok('tag', name);
				  	}
				  	tok.selfClosing = !! captures[2];
						if (captures[2]) {
							console.log('closing tag')
							console.log(captures[2])
						}
				  	//return tok;
						/*assert.isTrue(
							//.test
						)
					}*/
				//} while (!/^(\w[-:\w]*)(\/?)/.exec(input));
			//})

			
			
		//})
		
		//driver.quit();
	
})

function ensureGpo(req, res, next) {
	req.session.gpo = process.env.GPOKEY;
	return next()
}

router.all(/^\/((api|import|export).*)/, ensureAdmin/*, ensureApiTokens*/);

router.get(/(.*)/, ensureGpo/*, ensureSequentialSectionInd*/)

router.get('/', function(req, res, next){
	return res.redirect('/home')
});

router.get('/home', getDat, ensureCurly, function(req, res, next){
	//getDat(function(dat, distinct){
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	req.session.menu = 'home'
	if (!req.session.importgdrive) {
		req.session.importgdrive = false;
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
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
			Content.find({}).sort( { index: 1 } ).exec(function(err, data){
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
		return res.redirect('/sig/editprofile');
});

router.get('/register', function(req, res, next){
	return res.render('register', { csrfToken: req.csrfToken(), menu: 'register' } );
})

router.post('/register', function(req, res, next) {
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
		Publisher.find({}, function(err, data){
			if (err) {
				return next(err)
			}
			var admin;
			if (process.env.ADMIN.split(',').indexOf(req.body.username) !== -1) {
				admin = true;
			} else {
				admin = false;
			}
			Publisher.register(new Publisher(
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
					Publisher.findOne({username: req.body.username}, function(error, doc){
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
	res.redirect('/');		
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


/*router.post('/api/importdoc/:type/:fileid', uploadmedia.single('doc'), function(req, res, next){
	fs.readFile(req.file.path, 'utf8', function (err, content) {
		if (err) {
			next(err)
		}
		var fileId = req.params.fileid;
		var now = Date.now();
		var dest = ''+publishers+'/pu/publishers/esta/txt/'+now+'.txt'
		
		var OAuth2 = google.auth.OAuth2;
		Publisher.findOne({_id: req.session.userId}, function(err, pu){
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
	Publisher.findOne({_id: req.session.userId}, function(err, pu){
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

router.post('/censusload/:code', async function(req, res, next){
	var code;
	switch (parseInt(req.params.code, 10)) {
		case 0:
			code = null;
			break;
		case 1:
			code = 98
			break;
		case 2:
			code = 100
			break;
		default:
			code = 100
	}
	
	const censusData = await require('request-promise')({
		uri: 'https://api.census.gov/data/2010/dec/sf1/variables.json',//'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/'+code+'?f=json',
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
router.post('/census/:code/:type'/*/:tableid/:state'*/, async function(req, res, next){
	//ex. summarylevel
	//https://api.censusreporter.org/1.0/geo/search?q=utah&sumlevs=010,020,030,040,050,060,160,250,310,500,610,620,860,950,960,970

	//ex. sex by age in UT / Counties
	// params : table_id, state
	//https://api.censusreporter.org/1.0/data/show/latest?table_ids=B01001&geo_ids=050|04000US49
	console.log(req.params.code)
	const datumTransformations = //encodeURIComponent(JSON.stringify(
		[{'wkid': 4326}, {'geoTransforms': [{'wkid': 4326}]}]
	// ))
	const censusData = await require('request-promise')({
		//codes: counties = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/100
		// states = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/98
		// zcta = https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/8
		// glaciers = https://tigerweb.geo.census.gov/arcgis/rest/services/Census2010/tigerWMS_PhysicalFeatures/MapServer/14
		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/find?f=pjson&searchText=utah&searchFields=&sr=4326&datumTransformations='+datumTransformations+'&returnGeometry=true&layers=1,2',
		uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/find?searchText='+req.params.type+'&contains=true&searchFields=&sr=4262&layers='+parseInt(req.params.code, 10)+'&layerDefs=&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&dynamicLayers=&returnZ=false&returnM=false&gdbVersion=&f=json',
		// uri: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2010/MapServer/100?f=pjson&returnGeometry=true',
		// `https://api.censusreporter.org/1.0/data/show/latest?table_ids=${req.params.tableid}&geo_ids=${req.params.code}00US${req.params.state}`,
		// uri: 'https://api.censusreporter.org/1.0/geo/search?q=utah&sumlevs='+req.params.code+',050',
		encoding: null

	})
	// const censusData = await require('request-promise')({
	// 	uri: 'https://api.censusreporter.org/1.0/geo/tiger2016/tiles/'+req.params.code+'/'+req.params.zoom+'/'+req.params.x+'/'+req.params.y+'.geojson',
	// 	encoding: null
	// })
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
	Content.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
		if (err) {return next(err)}
		Publisher.findOne({_id: req.session.userId}, function(err, pu){
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
		Publisher.findOneAndUpdate({_id: req.session.userId}, {$set:{admin: true}}, function(err, pu){
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
	Publisher.findOne({_id: req.params.puid}, function(err, pu){
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
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var coordinates, lnglat;
	if (!lat || lat === 'null') {
		if (req.params.zip && req.params.zip !== 'null') {
			var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
			var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
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
	Publisher.findOne({_id: puid}).lean().exec(async function(err, pu){
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
		Publisher.findOneAndUpdate({_id: req.user._id}, set1, {new:true, safe:true}, function(err, pu){
			if (err) {
				return next(err)
			}
			Publisher.findOneAndUpdate({_id: req.user._id}, set2, {new:true, safe:true}, function(err, pu){
				if (err) {
					return next(err)
				} else if (pu) {
					return res.status(200).send('/sig/editprofile')
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
// 	Publisher.findOne({_id: req.params.puid}, function(err, pu){
// 		if (err){
// 			return next(err)
// 		}
// 		console.log('user mismatch?')
// 		console.log(!new RegExp(req.params.puid).test(req.session.userId))
// 		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
// 		Content.findOne({_id: req.params.did}, function(err, doc){
// 			if (err) {
// 				return next(err)
// 			}
// 			console.log('blrgh');
// 			var l = '/publishers/esta/signatures/'+doc._id+'/'+pu._id+'/img_'+doc._id+'_'+pu._id+'.png';
// 			Signature.findOne({image: l}, function(err, pud){
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
// 	Publisher.findOneAndUpdate({_id: req.user._id}, {$set:{geometry:geometry}}, {new:true, safe:true}, function(err, pu){
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
// 	Publisher.findOne({_id: req.params.puid}, function(err, pu){
// 		if (err){
// 			return next(err)
// 		}
// 		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
// 		Content.findOne({_id: req.params.did}, function(err, doc){
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
// 	Publisher.findOne({_id: puid}).lean().exec(async function(err, pu){
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
// 		var signature = new Signature({
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
// 			Publisher.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
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
	Content.findOne({_id: req.params.did}, function(err, doc){
		if (err) {
			return next(err)
		}
		Publisher.findOne({_id: req.params.puid}, function(err, pu){
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
				var signature = new Signature({
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
					Publisher.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
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
	Content.find({}).lean().sort({'properties.time.end': 1}).exec(function(err, data){
		if (err) {return next(err)}
		Publisher.findOne({_id: req.session.userId}, async function(err, pu){
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
			Publisher.findOne({_id: req.user._id}).lean().exec(function(err, pu){
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
			
			Publisher.findOne({_id: reqUser._id}).lean().exec(async function(err, pu){
				if (err) {
					return next(err)
				}
				var keys = Object.keys(body);
				keys.splice(Object.keys(body).indexOf('avatar'), 1);
				var puKeys = Object.keys(Publisher.schema.paths);
				// console.log(keys, puKeys)
				for (var j in puKeys) {
					var set = {$set:{}};
					var key;
					for (var i in keys) {
						body[keys[i]] = (!isNaN(parseInt(body[keys[i]], 10)) ? ''+body[keys[i]] +'' : body[keys[i]] );
						if (puKeys[j].split('.')[0] === 'properties') {
							if (puKeys[j].split('.')[1] === keys[i]) {
								key = 'properties.'+ keys[i];
								set.$set[key] = body[keys[i]];
							}
						} else {
							if (puKeys[j] === keys[i]) {
								key = keys[i]
								set.$set[key] = body[keys[i]];
							} else {
								
							}
						}
					}
					if (key) {
						await Publisher.findOneAndUpdate({_id: pu._id}, set, {safe: true, upsert:false, new:true}).then((pu)=>{}).catch((err)=>{
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
	Content.findOne({_id: req.params.id}, async function(err, doc){
		if (err) {
			return next(err)
		}
		Signature.find({documentId: doc._id}, async function(err, sig){
			if (err) {
				return next(err)
			}
			if (doc) {
				var now = Date.now();

				getDocxBlob(now, doc, sig, async function(docx){
					var p = ''+publishers+'/pu/publishers/esta/word';
							
					await fs.access(p, async function(err) {
						if (err && err.code === 'ENOENT') {
							await mkdirp(p, function(err){
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
	Publisher.find({'properties.givenName': decodeURIComponent(req.params.givenName)}, function(error, pages){
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
	Content.findOne({'properties.chapter.str': {$regex:RegExp(''+req.params.name +'\.?$'), $options: 'im'}}, function(err, doc){
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

router.get('/list/:id/:index', /*getLayers,*/ getGeo, async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	req.session.importgdrive = false;
	Content.findOne({_id: req.params.id}, async function(err, doc){
		if (err) {
			return next(err)
		}
		// console.log(doc.properties.xmlurl)
		var xml;
		if (doc && doc.properties.xmlurl) {
			console.log(doc.properties.xmlurl);
			var xmlpath = ''+publishers+'/pu/publishers/esta/xml/';
			var xmlfolder = await fs.existsSync(xmlpath);
			if (!xmlfolder) {
				await mkdirp(xmlpath, function(err){
					if (err){
						console.log(err)
					}
				})
			}
			xml = await require('request-promise')({
				uri: (doc.properties.xmlurl.replace('/htm', '/xml') +'?api_key='+process.env.GPOKEY),
				encoding: null
			}).then(async function(response) {
				// console.log(response)
				// if (!response) {
				// 	return '<pre>';
				// } else {
					console.log('ok!');
					// var xslt = require('xslt');
					// var inputXml = await pug.renderFile(path.join(__dirname, '../views/includes/gpo/xml.pug'), {
					// 	xml: response.toString().replace(/href=(.)billres/gm, 'href=$1/billres'),
					// 	doctype: 'xml'
					// })
					// console.log(inputXml)
					var rp = ''+publishers+'/pu/publishers/esta/xml/' + doc._id + '.png';
					var rq = ''+publishers+'/pu/publishers/esta/xml/bill.dtd';
					//console.log(imgp, thumbp)
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
					
					// var inputXml = response.toString().replace(/href=(.)billres/gm, 'href=$1/billres')
					// var resp = xmljs(response.toString())
					// return inputXml
					// return response.toString().replace(/([`][`])/g,"'").replace(/([']['])/g,"'").replace(/\r/g,'\n').replace(/\s{3,700}/g,'  ').replace(/\s{0,1}\n\n\s{1,4}[(](\d{1,4})[)]/g,'  \n1. ').replace(/\s{2}[(](\w{1})[)]/g,'  \n  * \($1\) ').replace(/\n\s\s(\([i,v]{1,4}\))/g,'    $1');
				// }
			})
			.catch(function(err){
				console.log(err)
				return ''
				// if (err) {
				// 	return '<pre>'
				// }
			})
		} else {
			xml = ''
		}
		
		//console.log(result.body.toString())
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (req.isAuthenticated()) {
				var l = '/publishers/esta/signatures/'+doc._id+'/'+req.user._id+'/img_'+doc._id+'_'+req.user._id+'.png';
				var m = (req.isAuthenticated() ? '/pu/getgeo/'+req.user._id+'' : '/user/getgeo/');
				Signature.findOne({image: l}, function(err, pud){
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
	Content.find(find).sort( { index: 1 } ).lean().exec(async function(err, data){
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

router.get('/api/gpo', function(req, res, next){
	require('request-promise')({
		uri: 'https://api.govinfo.gov/collections/BILLS/'+moment().subtract('1', 'years').utc().format()+'?offset=0&pageSize=1000&api_key='+process.env.GPOKEY,
		encoding: null
	}).then(function(result){
		return res.status(200).send(result)
	})
	.catch(function(err){
		return next(err)
	})
})

router.get('/api/geointersect/:id', function(req, res, next){
	Content.findOne({_id:req.params.id}).lean().exec(function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({'properties.title.str': 'Geography', geometry: {$geoIntersects: {$geometry: doc.geometry}}}).lean().exec(function(err, data){
			if (err) {
				return next(err)
			}
			return res.status(200).send(data)
		})
	})
})

router.post('/api/importjson/:id/:type', uploadmedia.single('json'), csrfProtection, function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)

	fs.readFile(req.file.path, 'utf8', async function (err, content) {
		if (err) {
			return console.log(err)
		}
		var json = JSON.parse(content);
		var multiPolygon;
		var type = 'MultiPolygon'
		if (json.features && json.features.length) {
			// console.log(json.features)
			if (!Array.isArray(json.features[0].geometry.coordinates[0])) {
				type = 'MultiPoint'
			}
			console.log(type)
			multiPolygon = await json.features.map(function(ft){
				if (!Array.isArray(ft.geometry.coordinates[0])) {
					return [ft.geometry.coordinates[0], ft.geometry.coordinates[1]];
				} else {
					return ft.geometry.coordinates[0];
				}
			})
		} else if (json[0].geometry) {
			multiPolygon = json[0].geometry.coordinates;
		} else if (json.geometry) {
			multiPolygon = json.geometry.coordinates
		}
		// console.log(multiPolygon)
		var geo = {
			type: type,
			coordinates: multiPolygon
		}
		Content.findOneAndUpdate({_id: req.params.id}, {$set:{geometry: geo }}, {safe: true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})
		
	})
})

///api/new/State/45/0/undefined/undefined/Salt%20Lake%20City%20Corporation%20v%20Inland%20Port%20Authority
// /api/new/Nation/0/0/0/0/Recognizing%20the%20duty%20of%20the%20Federal%20Government%20to%20create%20a%20Green%20New%20Deal.
// /api/new/State/45/4/null/undefined/Inland Port b/
router.get('/api/new/:placetype/:place/:tiind/:chind/:secind/:stitle/:xmlid', async function(req, res, next){
	req.session.importgdrive = false;
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
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
	Content.find({}).sort( { index: 1 } ).exec(async function(err, data){
		if (err) {
			return next(err)
		}
		await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png')
		await fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/full/'+(data.length)+'/img_0.png')
		var tiind = parseInt(req.params.tiind,10);
		var chind = parseInt(req.params.chind,10);
		var secind = parseInt(req.params.secind,10);
		if (isNaN(chind)) {
			if (isNaN(secind)) {
				
			} else {
				console.log('q has no chapter but has section?')

			}
			query = {'properties.title.ind': tiind}
		} else {
			if (isNaN(secind)) {
				console.log('q has chapter but has no section?')
				
			} else {
				
			}
			query = {'properties.title.ind': tiind, 'properties.chapter.ind': chind}
		}
		Content.find(query, async function(err, chunk){
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
						console.log('wtafff?')
						var chobj = usleg.filter(function(l){
							return (req.params.xmlid.split('BILLS-')[1].split(/(\d{0,4})/)[2] === l.code)
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
				var doc = Content.findOne({'properties.chapter.str': 'Jurisdiction: '+ places[placeind].properties.name}).then(function(doc){return doc}).catch(function(err){return console.log(err)});
					
				if (isNaN(chind) || !arr[tiind].chapter[chind]) {
					chnd = (!doc ? 0 : doc.properties.chapter.ind);
				} else {
					chnd = chind;
				}
				chtitle = 'Jurisdiction: '+ places[placeind].properties.name;
				snd = (isNaN(secind) ? (chunk[chunk.length-1].properties.section.ind + 1) : secind);
				stitle = decodeURIComponent(req.params.stitle);
			
				
				// xmlurl = (tiind === 0 ? 'https://api.govinfo.gov/packages/'+
				// 	req.params.xmlid
				// 	+'/htm' : null )
				//arr[tiind].code+''+(arr[tiind].chapter[chind].ind+1)+''+arr[tiind].chapter[chind].code+''+(arr[tiind].chapter[chind].section[secind].ind+1)+''+arr[tiind].chapter[chind].section[secind].code
				
			}
			
			var multipolygon = JSON.parse(JSON.stringify(places[placeind].geometry.coordinates));

			var content = new Content({
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
				Content.find({}).sort( { index: 1 } ).exec(function(err, data){
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
	asynk.waterfall([
		function(next){
			var publishersDir = (process.env.NODE_ENV === 'production' ? process.env.PD.toString() : (!process.env.DEVPD ? null : process.env.DEVPD.toString()));

			Content.findOne({_id: req.params.id}, async function(err, doc) {
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
			//console.log(imgs)
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
			console.log('footnotes')
			console.log(footnotes)
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
			var entry = {
				_id: id,
				type: "Feature",
				index: doc.index,
				properties: {
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
						str: doc.properties.section.str
					},
					published: (!body.published ? false : true),
					_id: id,
					label: body.label ? curly(body.label) : doc.properties.label,
					place: body.place ? curly(body.place) : doc.properties.place,
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
					layers: body.layers
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
			// var ix = entry.properties.media.length;
			// media = {
			// 	index: count,
			// 	name: (body['img'+ix+'_name'] ? curly(body['img'+ix+'_name']) : ''),
			// 	image: imgs[i],
			// 	image_abs: path.join(publishers, '/pu'+imgs[i]),
			// 	iframe: (!body['iframe'+ix+''] ? null : body['iframe'+ix+'']),
			// 	thumb: thumbs[i],
			// 	thumb_abs: path.join(publishers, '/pu'+thumbs[i]),
			// 	caption: (body['img'+ix+'_caption'] ? curly(body['img'+ix+'_caption']) : ''),
			// 	postscript: (body['img'+ix+'_postscript'] ? curly(body['img'+ix+'_postscript']) : ''),
			// 	featured: body['img'+ix+'_featured'],
			// 	orientation: orientations[i]
			// }
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
			
			// var set5 = {$set:{}}
			// var key5 = 'properties.section.str'
			// set5.$set[key5] = entry.properties.section.str;

			var options = {safe: true, new: true, upsert: false};
			Content.findOneAndUpdate({_id: id}, set1, options, function(err, docc) {
				if (err) {
					return next(err) 
				}
				Content.findOneAndUpdate({_id: id}, set2, options, function(errr, doc) {
					if (errr) {
						return next(errr)
					}
					Content.findOneAndUpdate({_id: id}, set3, options, function(errr, doc) {
						if (errr) {
							return next(errr)
						}
						// Content.findOneAndUpdate({_id: id}, set5, options, function(errr, doc) {
						// 	if (err) {
						// 		return next(err)
						// 	}
							if (!newdiff) {
								next(null, doc)
							} else {
								Content.findOneAndUpdate({_id: id}, set4, options, function(errr, doc) {
									if (errr) {
										next(errr)
									} else {
										next(null, doc)
									}
								})
							}
						// })
						
						
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
	Content.findOne({_id: req.params.id}, function(err, doc){
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
		Content.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})
	})
})

router.post('/api/newmedia/:id/:index', function(req, res, next) {
	Content.findOne({_id: req.params.id}, function(err, doc){
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
		Content.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
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
	var dc = await Content.findOne({_id: id}).then(function(doc){return doc}).catch(function(err){return next(err)});
	var med = dc.properties.media[0].thumb;
	var index = med.split('thumbs/')[1].split('/')[0];
	Content.remove({_id: id}, function(err, data) {
		if (err) {
			return next(err); 
		}
		emptyDirs(index, function(err){
			if (err) {
				return next(err)
			}
			Content.find({index:{$gt:index}}).sort( { index: 1 } ).exec(function(err, dat){
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
					Content.update({index: {$gt: index}}, {$inc: {index: -1}}, { multi: true }, function(err, data) {
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
	Content.findOne({_id: id}, function(err, thisdoc){
		if (err) {
			return next(err)
		}
		Content.findOneAndUpdate({_id: id}, {$pull: {'properties.media': {index: index}}}, {multi: false, new: true}, async function(err, doc) {
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
			Content.findOneAndUpdate({_id: id}, {$set:{'properties.media': media}}, function(err, doc){
				if (err) {
					return next(err)
				}
				// if deleted media was featured, assign featured value to first media
				if (thisdoc.properties.media[index] && thisdoc.properties.media[index].featured) {
					Content.findOneAndUpdate({_id: id, 'properties.media.index': 0}, {$set: {'properties.media.$.featured': true}}, function(err, doc) {
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