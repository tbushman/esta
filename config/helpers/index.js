require('dotenv').config();
const asynk = require('async');
const url = require('url');
const fs = require('fsxt');
const glob = require("glob");
const path = require('path');
const multer = require('multer');
const mkdirp = require('mkdirp');
const publishers = path.join(__dirname, '/../../../..');
const config = require('../index.js');
const testenv = config.testenv;
const { Publisher, Content, Signature, PublisherTest, ContentTest, SignatureTest } = require('../../models/index.js');
const PublisherDB = (!testenv ? Publisher : PublisherTest);
const ContentDB = (!testenv ? Content : ContentTest);
const SignatureDB = (!testenv ? Signature : SignatureTest);

const isJurisdiction = async function isJurisdiction(reqpos, doc, pu, cb) {
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
	// 	pu = await PublisherDB.findOne({_id: pu._id}).lean().exec(async function(err, pubr){
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
		ContentDB.findOne({_id: doc._id, geometry: {$geoIntersects: {$geometry: {type: gtype, coordinates: gcoords}}}}).lean().exec(function(err, doc){
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

const storage = multer.diskStorage({
	
	destination: async function (req, file, cb) {
		var p, q = null;
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
		// TODO change to fs.mkdir or mkdirp update which uses Promises
		const existsP = await fs.existsSync(p);
		if (!existsP) {
			await mkdirp(p).then(made=>console.log(made)).catch(err=>next(err));
		}
		const existsQ = await fs.existsSync(q);
		if (!existsQ && q) {
			await mkdirp(q).then(made=>console.log(made)).catch(err=>next(err));
		}
		cb(null, p);
		// fs.access(p, function(err) {
		// 	if (err && err.code === 'ENOENT') {
		// 		fs.mkdir(p, {recursive: true}, function(err){
		// 			if (err) {
		// 				console.log("err", err);
		// 			}
		// 			if (q) {
		// 				fs.access(q, function(err){
		// 					if (err && err.code === 'ENOENT') {
		// 						fs.mkdir(q, {recursive: true}, function(err){
		// 							if (err) {
		// 								console.log("err", err);
		// 							}
		// 							cb(null, p)
		// 						})
		// 					} else {
		// 						cb(null, p)
		// 					}
		// 				})
		// 			} else {
		// 				cb(null, p)
		// 			}
		// 
		// 		})
		// 	} else {
		// 		cb(null, p)
		// 	}
		// })
		
	},
	filename: function (req, file, cb) {
		if (req.params.type === 'png') {
			cb(null, 'img_' + req.params.counter + '.png')
		} else if (req.params.type === 'csv') {
			cb(null, 'csv_' + req.params.id + '_' + Date.now()+ '_temp.csv')
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


const uploadmedia = multer({ storage: storage, limits: { fieldSize: 25 * 1024 * 1024 }});

const removeExtras = function(str){
	var desc = null;
	if (str) {
		desc = str.trim()
			.replace(/\u2028/g, '  \n  \n')
			.replace(/(\v)/g, '   \n  \n')
			.replace(/(<br>)/g, '  \n')
	}
	return desc;
}

const curly = function(str){
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
// 	ContentDB.update({''})
// }
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
				ContentDB.findOne(q.query, function(err, doc){
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



function getDat64(next){
	asynk.waterfall([
		function(cb){
			var dat = []
			ContentDB.distinct('properties.chapter.ind', function(err, distinct){
				if (err) {
					return next(err)
				}
				if (distinct.length === 0) {
					ContentDB.find({}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
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
							ContentDB.find({'properties.chapter.ind':key}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
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


function tokenHandler(authClient, next) {
	
	authClient.getToken(authCode).then(function(resp){
		if (resp.tokens) {
			next(null, resp.tokens)
		} else {
			next(new Error('no tokens'))
		}
	});
	
}

function mkdirpIfNeeded(p, cb){
	fs.access(p, function(err) {
		if (err && err.code === 'ENOENT') {
			fs.mkdir(p, {recursive: true}, function(err){
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

module.exports = {isJurisdiction, usleg, tis, geoLocate, storage, uploadmedia, removeExtras, curly, renameEachImgDir, emptyDirs, getDat64, tokenHandler, mkdirpIfNeeded, getDocxBlob}

