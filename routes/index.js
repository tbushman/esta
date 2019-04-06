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
var csrf = require('csurf');
var Publisher = require('../models/publishers.js');
var Content = require('../models/content.js');
var Diffs = require('../models/diffs.js');
var Signature = require('../models/signatures.js');
var csrfProtection = csrf({ cookie: true });
var publishers = path.join(__dirname, '/../../..');

var isJurisdiction = async function isJurisdiction(doc, pu, cb) {
	// var inside = require('point-in-polygon');
	var lat, lng;
	
	Publisher.findOne({_id: pu._id}).lean().exec(async function(err, pu){
		if (err) {
			return next(err)
		}
		// console.log(pu)
		//.then((pu)=>pu).catch((err)=>console.log(err));
		// const sig = (!pu.sig[pu.sig.length-1] ? null : pu.sig[pu.sig.length-1])
		var gtype, gcoords;
		if (!pu.geometry || !pu.geometry.type || pu.geometry.coordinates.length === 0) {
			gtype = 'MultiPolygon'
			if (!pu.sig[pu.sig.length-1]) {
				console.log(pu)
				
				var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
				var zipcoden; 
				if (pu.properties.zip) {
					zipcoden = pu.properties.zip;
				}
				else if (pu.properties.place && !isNaN(parseInt(pu.properties.place, 10))) {
					zipcoden = pu.properties.place;
					//prompt geolocate
					// if (zipcode.length === 0) return res.redirect('/sig/geo/'+doc._id+'/'+pu._id+'/'+null+'');
					
				
				}
				var zipcode = await JSON.parse(zipcodes).features.filter(function(zip){
					return (
						// parseInt(
						zip.properties['ZCTA5CE10']
						// , 10) 
						=== 
						// parseInt(
							zipcoden
							// , 10)
						)
				});
				console.log('zipcode')
				console.log(zipcode)
				//  else {
				// 	// return res.redirect('/sig/geo/'+doc._id+'/'+pu._id+'/'+null+'');
				// }
				
				if (zipcode.length === 0) return cb(null);
				lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
				lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
				gcoords = 
					[[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]]
				
			} else {
				var ts = pu.sig[pu.sig.length-1].ts;
				// console.log(ts)
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
			gcoords = pu.geometry.coordinates;
		}
		
		// console.log(lat, lng)
		// console.log(inside([lng,lat], doc.geometry.coordinates))
		// console.log(lat,lng, doc.geometry.coordinates)
		// var match = false;
		// var fC = await doc.geometry.coordinates.filter(function(coord){
		// 	console.log(inside([lng,lat], coord), inside([lat,lng], coord))
		// 	return inside([lng,lat], coord)
		// })
		// console.log(fC)
		// if (fC.length > 0 ) {
		// 	match = true;
		// }
		// console.log(match)
		// cb(match);
		if (!gcoords || gcoords.length === 0) {
			console.log(gcoords)
			cb(null)
		} else {
			console.log(gcoords)
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
		
	})
	
}
var tis = //{
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
			index: 0,
			name: 'In support of legislation',
			code: 'BILLS-',
			chapter: [
				{
					index: 115,
					name: 'United States Congress',
					code: 'hres',
					section: [
						{
							index: 108,
							name: 'House Simple Resolution (H. Res.)',
							code: 'ih'
						}
					]
				}
			]
		},
		{
			index: 1,
			name: 'Candidate for Public Office',
			chapter: [
				{
					name: 'Jurisdiction'
				}
			]
		},
		{
			index: 2,
			name: 'Environmental Impact Statement',
			chapter: [
				{
					name: 'Jurisdiction'
				}
			]
		},
		{
			index: 3,
			name: 'Geography',
			chapter: [
				{
					name: 'Jurisdiction'
				}
			]
		}
	]
// }
// var tis = ['Bills', 'Petitions', 'Environmental Impact Statements', 'Appendix'];
var chis = ['']
var InDesign = require('async-indesign-script');
var juice = require('juice');
var HtmlDocx = require('html-docx-js');
var mammoth = require('mammoth');
var HtmlDiffer = require('html-differ').HtmlDiffer;
var htmlDiffer = new HtmlDiffer({
	ignoreAttributes: ['id', 'for', 'class', 'href', 'style']
});
var publishersDir = (process.env.NODE_ENV === 'production' ? process.env.PD : process.env.DEVPD);
//var google = require("googleapis"); 
var {google} = require('googleapis');
//var {googleAuth} = require('google-auth-library');
dotenv.load();
var upload = multer();

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
	// Configure API parameters
	var params = {
		wifiAccessPoints: [{
			macAddress: ''+mac+'',
			signalStrength: -65,
			signalToNoiseRatio: 40
		}]
	};
	geolocation(params, function(err, data) {
		if (err) {
			console.log(err)
			position = {lat: 40.7608, lng: -111.8910, zoom: zoom };
		} else {
			position = { lng: data.location.lng, lat: data.location.lat, zoom: zoom };	
		}
		cb(position);
	
	})
}

var storage = multer.diskStorage({
	
	destination: function (req, file, cb) {
		var p, q;
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
		} else {
			p = ''+publishers+'/pu/publishers/esta/images/full/'+req.params.index+''
			q = ''+publishers+'/pu/publishers/esta/images/thumbs/'+req.params.index+''

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
		}
  }
});
var uploadmedia = multer({ storage: storage/*, limits: { fieldSize: 25 * 1024 * 1024 }*/});

var removeExtras = function(str){
	var desc = null;
	if (str) {
		desc = str.trim()
			.replace(/\u2028/g, '  \n  \n')
			.replace(/\s{2,7}(\d{1,4}\.)/g, '  \n$1')
			.replace(/(\v)/g, '   \n  \n')
			.replace(/(?:<br>|<br \/>){1,7}(?:&nbsp;){1,7}/g, '  \n  \n')
			.replace(/(<br>|<br \/>)/g, '  \n')
			.replace(/&nbsp;&nbsp;/g, '')
			.replace(/&nbsp;/g, '')
			.replace(/^(\d|\w\.)\t/gm, '$1\\t')
			.replace(/^([A-Z]\.)/gm, '  \n**$1**')
			.replace(/[\s\.]([A-Z]\.)/g, '  \n  \n**$1**')
			.replace(/\s\t(\d{1,4}\.)/g, '  \n$1')
			.replace(/\s{2,7}\t(\d)/g, '  \n$1')
			.replace(/\s{2,7}\t/g, '  \n')
			.replace(/\\t(\d)/g, '$1');
	}
	return desc;
}

var curly = function(str){
	//console.log(/\\n/g.test(str))
	//console.log(str.match(/\s/g))
	//console.log(str.match(/\"/g))
	if (!str){
		return ''
	} else {
		return str
		.replace(/(\s)'(\w)/g,'$1&lsquo;$2')
		.replace(/(\w)'(\s)/g,'$1&rsquo;$2')
		.replace(/(\s)"(\w)/g,'$1&ldquo;$2')
		.replace(/(\w)"(\s)/g,'$1&rdquo;$2')
		//.replace(/'\b/g, "&lsquo;")     // Opening singles
		//.replace(/\b'/g, "&rsquo;")     // Closing singles
		//.replace(/"\b/g, "&ldquo;")     // Opening doubles
		//.replace(/\b"/g, "&rdquo;")     // Closing doubles
		.replace(/(\w\.)"/g, "$1&rdquo;")     // Closing doubles
		.replace(/\u2018/g, "&lsquo;")
		.replace(/\u2019/g, "&rsquo;")
		.replace(/\u201c/g, "&ldquo;")
		.replace(/\u201d/g, "&rdquo;")
		.replace(/[“]/g, "&ldquo;")
		.replace(/[”]/g, "&rdquo;")
		.replace(/[’]/g, "&rsquo;")
		.replace(/[‘]/g, "&lsquo;")
		//.replace(/([a-z])'([a-z])/ig, '$1&rsquo$2')     // Apostrophe
		//
		//.replace(/(\d\s*)&rdquo/g, '$1\"')
		//.replace(/(\d\s*)&rsquo/g, "$1\'")
		.replace(/([a-z])&lsquo([a-z])/ig, '$1&rsquo;$2')
	}
}


function textImporter(req, str, gid, cb) {
	asynk.waterfall([
		function(next){
				
			//console.log(str.split(/(^Chapter \d{1,3}.+$)/gm))
			var newchtitlestr = str.split(/(^Chapter \d{1,3}.+$)/gm)[1];
			var newcontentstr = str.split(/(^Chapter \d{1,3}.+$)/gm)[2];
			var newch;
			if (newchtitlestr) {
				var newcharr = newchtitlestr.split(/\d/g);
				newch = newcharr[newcharr.length - 1].replace('.', '').trim();
			} else {
				newch = decodeURIComponent(req.params.chtitle);
			}
			var entry = [];

			// non-capturing marker at title.properties.chapter.section index with global and multiple modifier
			// Used to split the text into an array by section
			var drx = /(^(?:Section ){0,1}\d{1,3}\.\d{1,3}\.\d{0,4}\.{0,1}[\s\S]*?)(?=^(?:Section ){0,1}\d{1,3}\.\d{1,3}\.\d{1,4}\.{0,1}\s*?)/gm;
			// title.properties.chapter.section index
			var numrx = /^(?:Section ){0,1}(\d{1,3}\.\d{1,3}\.\d{0,4}\.{0,1}[\s\S]*?)/si
			//var nrx = /^\d{1,3}\.\d{1,3}\.\d{0,4}\.\s/
			// title rx
			var trx = /(?:^(?:Section ){0,1}\d{1,3}\.\d{1,3}\.\d{0,4}\.{0,1})(.*?)(?=[\n\.])/si
			// isolate description
			var descrx = /(?:[\n])(.*)/si
			//remove stray spaces
			var dat = newcontentstr.split(drx).filter(function(item){
				return item !== '' && item !== 'Section ' && item !== undefined
			}).map(function(it){
				var num;
				if (numrx.exec(it)) {
					num = numrx.exec(it)
				} else {
					num = ['']
				}
				it = it.replace(/\u2028/g, '  \n  \n');
				var desc = (descrx.exec(it) ? 
					descrx.exec(it)[1].toString().trim()
					//.replace(/(^\d)/gm, '  \n  \n$1')
					.replace(/^(\d|\w\.)\t/gm, '$1\\t')
					.replace(/\s{2,7}(\d{1,4}\.)/g, '  \n$1')
					//.replace(/(\t)/g, '  \t')
					.replace(/(\v)/g, '   \n  \n')
					.replace(/\u2028/g, '  \n  \n')
					//.replace(/[\n ](\d\.)/g, '  \n  \n$1')
					: 
					(trx.exec(it) ? trx.exec(it)[2] : '')
				);
				desc = desc.replace(/^([A-Z]\.)/gm, '  \n**$1**').replace(/[\s\.]([A-Z]\.)/g, '  \n  \n**$1**');
				var num = num[0]
				num = num.split('.');
				if (num[num.length-1] === '.') {
					var end = num.pop();
				}
				num = num.join('.');
				num = num.replace('Section ', '')
				//console.log(num)
				return {
					num: num,
					title: (trx.exec(it) ? trx.exec(it)[1] : '').trim(),
					desc: desc.toString()
				}
				
			});
			dat = dat.sort(function(a,b){
				if (parseInt(a.num.split('.')[a.num.split('.').length-1], 10) < parseInt(b.num.split('.')[b.num.split('.').length-1], 10)) {
					return -1;
				} else {
					return 1;
				}
			})
			next(null, dat, newch, gid, req.user);
		},
		function(dat, chtitle, gid, pu, next){
			var newdate = new Date();
			//console.log('dat')
			//console.log(dat)
			Content.find({}, function(err, data){
				if (err) {
					return next(err)
				}
				var startind = data.length;
				dat.forEach(function(item, i){
					if (item.num !== '') {
						Content.findOne({'properties.section': item.num}, function(err, doc){
							if (err) {
								return next(err)
							}
							
							if (!doc) {
								return res.redirect('/api/new/')
							} else {
								/*Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.gid': gid}}, {safe:true,new:true}, function(err, doc){
									if (err) {
										return next(err)
									}*/
									Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.title.str':curly(item.title)}}, {safe:true,new:true}, function(err, doc){
										if (err) {
											return next(err)
										}
										Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.chapter.str': curly(chtitle)}}, {safe:true, new:true}, function(err, docc){
											if (err) {
												return next(err)
											}
											Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.description': marked(curly(item.desc))}}, {safe:true, new:true}, function(err, doc){
												if (err) {
													return next(err)
												}
												if (docc.properties.description) {
													
													//var Diff = require('diff');
													var isEqual = htmlDiffer.isEqual(docc.properties.description, marked(curly(item.desc)))
													var diff = htmlDiffer.diffHtml(docc.properties.description, marked(curly(item.desc)));
													//console.log('sent this diff')
													//console.log(diff)
													var diffss = [];
													if (!isEqual) {
														diff.forEach(function(dif){
															//console.log(dif)
															diffss.push({
																count: dif.count,
																value: dif.value,
																added: dif.added,
																removed: dif.removed
															})
														})
														var newdiff = {
															date: newdate,
															dif: diffss,
															user: {
																_id: pu._id,
																username: pu.username,
																avatar: pu.avatar
															},
															str: marked(curly(item.desc))
														};
														Content.findOneAndUpdate({_id: doc._id}, {$push:{'properties.diffs': newdiff}}, {safe:true, new:true}, function(err, doc){
															if (err) {
																return next(err)
															}
															
														})
													}

												}
											})
										})
									})
								//})
								
							}
						})
					}
				});
				next(null, dat[0].num.split('.')[1])
			})
		}
	], function(err, chind){
		if (err) {
			return cb(err)
		}
		console.log('yay')
		cb(null, chind)
	})
}

function rmDocs(req, res, next) {
	///api/importtxt/:type/:chtitle/:rmdoc
	//\b(\w)
	if (req.params.rmdoc) {
		asynk.waterfall([
			function(next){
				Content.find({'properties.chapter.str': {$regex: RegExp(''+decodeURIComponent(req.params.chtitle)+'\.?$')}}, function(err, data){
					if (err) {
						return next(err)
					}
					Content.remove({'properties.chapter.str': {$regex: RegExp(''+decodeURIComponent(req.params.chtitle)+'\.?$')}}, function(err, dat){
						if (err) {
							return next(err)
						}
						data.forEach(function(doc){
							var imgp = ''+publishers+'/pu/publishers/esta/images/full/'+doc.index+'';
							var thumbp = ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'';
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
													console.log(imgp, thumbp)

												})
											})	
										}
									})
								}
							})
						});
						next(null, req);
					});
					
				})
			},
			function(req, next){
				Content.find({}).sort({index:1}).lean().exec(function(err, data){
					if (err) {
						return next(err)
					}
					data.forEach(function(doc, i){
						if (doc.index !== i) {
							doc.index = i;
							Content.findOneAndUpdate({_id: doc._id}, {$set: {index: i}}, {safe: true}, function(err, doc){
								if(err){
									return next(err)
								}
							})
							/*doc.save(function(err){
								if (err) {
									console.log(err);
								} else {
									console.log('saved')
								}
							})*/
						}
					})
					next(null)
				})
			}
		], function(err){
			if (err) {
				return next(err)
			}
			return next();
		})

	}
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

function ensureHyperlink(req, res, next) {
  Content.find({}, function(err, data) {
		if (err){
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'')
		}
		data.forEach(function(doc){
			//console.log(doc.properties.description)
			var numrx = /(\s\d{1,3}\.\d{1,3}\.{0,1}\d{0,4}\.{0,1}\s)/;
	  	var desc = removeExtras(doc.properties.description);
			var hls = numrx.test(desc);
			if (desc) {
				var spl = desc.split(numrx);
				if (hls) {
					var hs = numrx.exec(desc)
					hs.forEach(function(h){
						var ind = spl.indexOf(h);
						//console.log(spl[ind+1].substring(0,1))
						//h = h.trim();
						if (ind !== -1 && spl[ind+1].substring(0,1) !== '<') {
							var s = h.split('.');
							var title = s[0].trim();
							var chap = s[1];
							var sect = s[2];
							var cha = chap;//(chap.substring(0,1) === '0' ? chap.slice(1) : chap);
							var sec = (sect ? '#'+sect.trim() : '');//(sect ? '#'+(sect.trim().substring(0,1) === '0' ? sect.trim().slice(1) : sect.trim()) : '');
							var id =(sect ? sect.trim() : '')
							
							spl.splice(ind, 1, `<a onclick="$('#${id.trim()}').click()" class="hl" href="/menu/${title}/${cha}${sec}">${h.trim()}</a>`);
							//console.log(spl.splice(ind, 1, `<a href="/menu/${title}/${chap}#${sect}">${h}</a>`))
						}
						
					});
					doc.properties.description = marked(spl.join(' '));
					doc.save(function(err){
						if (err) {
							console.log(err)
						}
					})
				}

			}

	  });
		return next()
	});
}

function ensureCurly(req, res, next) {
	Content.find({}, function(err, data) {
		if (err){
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'')
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
			return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'')
		} else {
			return next()
		}
	});
}


function ensureEscape(req, res, next) {
	Content.find({}, function(err,data){
		if (err) {
			return next(err)
		}
		data.forEach(function(doc){
			if (/^\r{1}\d. /mg.test(doc.properties.description)) {
				
			}
			//var descarr = doc.properties.description.split('');
			/*var lineseparr = descarr.filter(function(fr){
				return /\u2028/g.test(fr)
			});
			var nullarr = descarr.filter(function(fr){
				return /(\0)/g.test(fr)
			});
			var newlinearr = descarr.filter(function(fr){
				return /(\\n)/g.test(fr)
			});
			var tabarr = descarr.filter(function(fr){
				return /(\t)/g.test(fr)
			});*/
			
			/*doc.properties.media.forEach(function(img){
				img.caption
			})*/
			/*if (newlinearr.length > 0 || tabarr.length > 0 || nullarr.length > 0 || lineseparr.length > 0) {
				console.log('blagh')
			}*/
			if (/\u2028/g.test(doc.properties.description)) {
				console.log('blip')
				doc.properties.description = doc.properties.description.replace(/\u2028/g, '  \\n')
				doc.save(function(err){
					if (err) {
						console.log(err)
					}
				})
			}
		})
		return next()
	})
}

function getDat(req, res, next){
	asynk.waterfall([
		function(cb){
			var dat = []
			Content.distinct('properties.chapter.ind', function(err, distinct){
				if (err) {
					cb(err)
				}
				if (distinct.length === 0) {
					Content.find({}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
						if (err) {
							cb(err)
						}
						data = data.sort(function(a,b){
							if (parseInt(a.properties.section.ind,10) < parseInt(b.properties.section.ind, 10)) {
								return -1;
							} else {
								return 1;
							}
						})
						dat.push(data)
						cb(null, dat, [1])
					})
				} else {
					distinct.forEach(function(key, i) {
						Content.find({'properties.chapter.ind':key}).sort({index: 1, 'properties.section.ind':1}).lean().exec(function(err, data){
							if (err) {
								cb(err)
							}
							
							if (data.length === 0) return;
							if (data.length > 0) {
								data = data.sort(function(a,b){
									if (parseInt(a.properties.section.ind,10) < parseInt(b.properties.section.ind, 10)) {
										return -1;
									} else {
										return 1;
									}
								})
								dat.push(data)
							}
						})
					});
					cb(null, dat, distinct)
				}
				
			});
		}
	], function(err, dat, distinct){
		if (err) {
			return next(err)
		}
		req.dat = dat;
		req.distinct = distinct;
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
		if (!pu.admin) {
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

function getDocxBlob(now, dat, toc, cb){
	var pugpath, hfpath;
	if (toc) {
		pugpath = path.join(__dirname, '../views/includes/exportword.pug');
		hfpath = path.join(__dirname, '../views/includes/exportword/headerfooter.html')
		pfpath = path.join(__dirname, '../views/includes/exportword/headerfooter.pug')
	} else {
		pugpath = path.join(__dirname, '../views/includes/exportwordnotoc.pug');
		hfpath = null;
	}
	var str = pug.renderFile(pugpath, {
		md: require('marked'),
		moment: require('moment'),
		doctype: 'strict',
		hrf: '/publishers/esta/word/'+now+'.docx',
		dat: dat.sort(function(a,b){
			//console.log(a[0].properties.chapter.ind)
			if (parseInt(a[0].properties.chapter.ind, 10) < parseInt(b[0].properties.chapter.ind, 10)) {
				return -1
			} else {
				return 1
			}
		})
	});
	var cloc = ''+publishers+'/pu/publishers/esta/word/'+now+'.docx'
	//console.log(str)
	//juice.excludedProperties = ['margin']
	//str = str.replace(/<p>/g, `<p style="font-family:'Calibri', sans-serif!important;">`)
	var juicedmain = juice(str, 
		{
			preserveFontFaces: true,
			//removeStyleTags: false,
			preserveMediaQueries: true,
			preserveImportant: true,
			insertPreservedExtraCss: true,
			extraCss: '@page {size:8.5in 11.0in;margin: 0.5in 0.75in 0.5in 0.75in;mso-footer:f1;mso-header:h1;font-family:"Calibri",sans-serif;}@page Section1{size:8.5in 11.0in;margin: 0.5in 0.75in 0.5in 0.75in;mso-footer:f1;mso-header:h1;font-family:"Calibri",sans-serif;}@page WordSection1{size:8.5in 11.0in;margin: 0.5in 0.75in 0.5in 0.75in;mso-footer:f1;mso-header:h1;font-family:"Calibri",sans-serif;}'
		}
	);
	//console.log(juicedmain);
	var doc = 
		'MIME-Version: 1.0\nContent-Type: multipart/related; boundary="----=_NextPart."\n\n'+
		'------=_NextPart.\n'+
		//'Content-Location: file://'+cloc+'\n'+
		'Content-Transfer-Encoding: base64\nContent-Type: text/html; charset="utf-8"\n\n'+
		Buffer.from(str).toString('base64') + '\n\n' +
		
		/*(
			hfpath ? 
			'------=_NextPart.\n'+
			//'Content-Location: file://'+hfpath+'\n'+
			'Content-Transfer-Encoding: base64\nContent-Type: text/html; charset="utf-8"\n\n'+
			Buffer.from(pug.renderFile(pfpath, {
				doctype: 'strict'
			})).toString('base64') + '\n\n------=_NextPart.--'
			:
			'\n\n------=_NextPart.--'
		)*/
		'------=_NextPart.--'
	var p = `<p></p>`
	var docx = 
	HtmlDocx.asBlob(
		
		//juice(str)
		str
    //.replace(/(\/ol>)/g, '$1<p style="font-family:\'Calibri\',sans-serif;font-size:10.5pt;line-height:13.5pt;"><\/p>')
		//.replace(/(\/p>\s*)<ol>/g, '$1<ol style="font-family:\'Calibri\',sans-serif;font-size:10.5pt;line-height:13.5pt;">')
		//.replace(/(\/ol>\s*)<li>/g, '$1<li style="font-family:\'Calibri\',sans-serif;font-size:10.5pt;line-height:13.5pt;">')
	);
	//cb(docx)
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
/*router.all(/^\/((?!importgdrive|auth).*)$/, function(req, res, next){
	req.session.importgdrive = false;
	return next()
})*/

/*router.all(/(.*)/, function(req, res, next){
	if (!req.session.importgdrive) {
		req.session.importgdrive = false;
	}
	return next()
})*/


router.all(/^\/((api|import|export|check).*)/, ensureAdmin/*, ensureApiTokens*/);

router.get('/', function(req, res, next){
	return res.redirect('/home')
});

router.get('/home', getDat, ensureCurly, /*ensureEscape,*/ ensureHyperlink, function(req, res, next){
	//getDat(function(dat, distinct){
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	if (!req.session.importgdrive) {
		req.session.importgdrive = false;
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (data.length === 0) {
				return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'');
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
				gp: (req.isAuthenticated() && req.session.authClient ? req.session.gp : null)
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
					return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'');
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
		console.log(req.user)
		req.session.userId = req.user._id;
		req.session.loggedin = req.user.username;
		res.redirect('/');
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
			if (req.body.username === 'tbushman') {
				admin = true;
			} else {
				admin = false;
			}
			Publisher.register(new Publisher(
				{ username : req.body.username, 
					avatar: '/images/publish_logo_sq.svg', 
					/*language: req.body.languages,*/ 
					email: req.body.email, 
					properties: { 
						admin: admin, 
						givenName: req.body.givenName, 
						/*title: req.body.title,*/ 
						zip: req.body.zip, 
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
						if (!user.admin) {
							return res.redirect('/sig/editprofile')
						}
						return res.redirect('/api/publish')
					})
				});
			});
		})
	// })

});

// router.post('/register', function(req, res, next){
// 	var admin;
// 	Publisher.find({}, function(err, pubs){
// 		if (err) {
// 			return next(err)
// 		}
// 		/*if (pubs.length === 0 || req.body.username === 'tbushman' || req.body.username === 'rcain' || req.body.username === 'tb') {
// 			admin = true;
// 		} else {
// 			admin = false;
// 		}*/
// 		admin = true;
// 		Publisher.register(new Publisher({ userindex: pubs.length, username : req.body.username, email: req.body.email, admin: admin}), req.body.password, function(err, user) {
// 			if (err) {
// 				return res.render('register', {info: "Sorry. That username already exists. Try again."});
// 			}
// 			passport.authenticate('local')(req, res, function () {
// 				Publisher.findOne({username: req.body.username}, function(error, pu){
// 					if (error) {
// 						return next(error)
// 					}
// 					req.session.userId = pu._id;
// 					req.session.loggedin = pu.username;
// 					return res.redirect('/');
// 				})
// 			});
// 		});
// 	})
// })

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

router.get('/profile/:username', function(req, res, next) {
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
router.all('/api/*', ensureAuthenticated, ensureAdmin)

router.all('/sig/*', ensureAuthenticated)

router.get('/sig/admin', function(req, res, next) {
	if (process.env.ADMIN.split(',').indexOf(req.session.loggedin) !== -1) {
		Publisher.findOneAndUpdate({_id: req.session.userId}, {$set:{admin: true}}, function(err, pu){
			if (err) {
				return next(err)
			}
			return res.redirect('/api/publish')
		})
	}
});

router.get('/sig/getgeo/:did/:puid', function(req, res, next){
	Publisher.findOne({_id: req.params.puid}, function(err, pu){
		if (err){
			return next(err)
		}
		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
		Content.findOne({_id: req.params.did}, function(err, doc){
			if (err) {
				return next(err)
			}
			console.log('blrgh');
			var l = '/publishers/gnd/signatures/'+doc._id+'/'+pu._id+'/img_'+doc._id+'_'+pu._id+'.png';
			Signature.findOne({image: l}, function(err, pud){
				if (err) {
					return next(err)
				}
				console.log(pud)
				var str = pug.renderFile(path.join(__dirname, '../views/includes/modal.pug'), {
					unsigned: (!pud ? true : false),
					signable: true,
					pu: pu,
					menu: !req.session.menu ? 'view' : req.session.menu,
					//data: data,
					doc: doc,
					info: req.session.info
					
				});
				return res.render('single', {
					menu: !req.session.menu ? 'view' : req.session.menu,
					unsigned: (!pud ? true : false),
					signable: true,
					pu: pu,
					doc: doc,
					str: str
				})
			})
		})
	})
})

router.post('/sig/getgeo/:did/:lat/:lng/:ts/:zip', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var lat = parseFloat(req.params.lat);
	var lng = parseFloat(req.params.lng);
	var puid = ''+req.params.puid+'';
	var did = req.params.did;
	if (!lat || lat === 'null') {
		var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
		var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
			return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(req.params.zip, 10))
		});
		if (zipcode.length === 0) return res.redirect('/sig/geo/'+did+'/'+puid+'/'+req.params.ts+'');
		lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
		lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
	}
	var geometry = {
		type: 'MultiPolygon',
		coordinates: [[[[lng,lat],[(lng+.00001),lat],[(lng+.00001),(lat+.00001)],[lng,(lat+.00001)],[lng,lat]]]]
	}
	console.log(geometry)
	Publisher.findOneAndUpdate({_id: req.user._id}, {$set:{geometry:geometry}}, {new:true, safe:true}, function(err, pu){
		if (err) {
			return next(err)
		} else {
			if (pu) {
				return res.status(200).send('/list/'+did+'/'+null+'')
			} else {
				return res.redirect('/')
			}
		}
		
	})
})

router.get('/sig/geo/:did/:puid/:ts', function(req, res, next){
	console.log('huzzah')
	Publisher.findOne({_id: req.params.puid}, function(err, pu){
		if (err){
			return next(err)
		}
		if (!new RegExp(req.params.puid).test(req.session.userId)) return res.redirect('/login');
		Content.findOne({_id: req.params.did}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.render('publish', {
				doc: doc,
				pu: pu,
				ts: [req.params.ts],
				type: 'blog', //'blog' //'map'
				menu: 'doc' //home, login, register, data, doc, pu?
			})
		})
	})
})

router.post('/sig/geo/:did/:lat/:lng/:ts/:zip', async function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var lat = req.params.lat;
	var lng = req.params.lng;
	var puid = ''+req.user._id+'';
	var did = req.params.did;
	if (!lat || lat === 'null') {
		var zipcodes = await fs.readFileSync(''+path.join(__dirname, '/..')+'/public/json/us_zcta.json', 'utf8');
		var zipcode = JSON.parse(zipcodes).features.filter(function(zip){
			return (parseInt(zip.properties['ZCTA5CE10'], 10) === parseInt(req.params.zip, 10))
		});
		if (zipcode.length === 0) return res.redirect('/sig/geo/'+did+'/'+puid+'/'+req.params.ts+'');
		lat = parseFloat(zipcode[0].properties["INTPTLAT10"]);
		lng = parseFloat(zipcode[0].properties["INTPTLON10"]);
	}
	console.log(puid)
	Publisher.findOne({_id: puid}).lean().exec(function(err, pu){
		if (err) {
			return next(err)
		}
		// console.log(pu)
		var signature = new Signature({
			ts: ''+lat+','+lng+'G/'+pu.properties.givenName+'/'+req.params.ts+'',//new Date(),
			puid: puid,
			username: pu.username,
			givenName: pu.properties.givenName,
			documentId: did,	
			image: '/publishers/gnd/signatures/'+did+'/'+puid+'/img_'+did+'_'+puid+'.png',
			image_abs: ''+publishers+'/pu/publishers/gnd/signatures/'+did+'/'+puid+'/img_'+did+'_'+puid+'.png'
		});
		var push = {$push:{}};
		var key = 'sig';
		push.$push[key] = JSON.parse(JSON.stringify(signature))
		signature.save(function(err){
			if (err) {
				if (err.code === 11000) req.session.info = 'Unable to save signature.'
				else return next(err)
			} 
			Publisher.findOneAndUpdate({_id: pu._id}, push, {safe: true, new:true}, function(err, pu){
				if (err){
					return next(err)
				}
				return res.status(200).send('/list/'+did+'/'+null+'')
			})
			
		})
	})
	
})

router.post('/sig/uploadsignature/:did/:puid'/*, rmFile*/, uploadmedia.single('img'), csrfProtection, function(req, res, next){
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
			// console.log(req.ip)
			var reqIp;
			/*if (cf.check(req)) //CF
			{
				reqIp = cf.get(req);
			}
				else //not CF
			{	*/
				reqIp = req.headers['x-forwarded-for'];//req.ip;
			// }
console.log(req.ip, req.ips, req.connection.remoteAddress, req.headers['cf-connecting-ip'], reqIp);
			// if (!reqIp) {
			// 	console.log(req.ip)
			// 	return res.redirect('/sig/geo/'+doc._id+'/'+pu._id+'/'+req.body.ts+'');
			// }
			geoLocate(reqIp, 6, function(position){
				console.log(position)
				if (position.lat === 37.09024 || !reqIp) {
					return res.status(200).send('/sig/geo/'+doc._id+'/'+pu._id+'/'+req.body.ts.split('/')[req.body.ts.split('/').length-1]+'')
				}
				var signature = new Signature({
					ts: ''+position.lat+','+position.lng+'G'+req.body.ts+'',//new Date(),
					puid: pu._id,
					username: pu.username,
					givenName: pu.properties.givenName,
					documentId: doc._id,	
					image: '/publishers/gnd/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png',
					image_abs: req.url
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
			})
		})
	})
});

// router.get('/sig/publish/:id', function(req, res, next){
// 	Content.find({}).sort({'properties.time.end': 1}).lean().exec(function(err, data){
// 		if (err) {return next(err)}
// 		Content.findOne({_id: req.params.id}, function(err, doc){
// 			if (err) {return next(err)}
// 			Publisher.findOne({_id: req.session.userId}, function(err, pu){
// 				if (err) {
// 					return next(err)
// 				}
// 				return res.render('publish', {
// 					// data: data,
// 					doc: doc,
// 					pu: pu,
// 					type: 'draw', //'blog' //'map'
// 					drawtype: 'filling', //'substrates',
// 					menu: 'sign'
// 				})
// 			})
// 		})
// 	})
// })

router.get('/sig/editprofile', function(req, res, next){
	console.log('bleh')
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
			return res.render('publish', {
				data: data,
				loggedin: req.session.loggedin,
				pu: pu,
				type: 'blog', //'blog' //'map'
				menu: 'pu', //home, login, register, data, doc, pu?
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
	console.log(body)
	asynk.waterfall([
		function(next) {
			console.log(req.user._id)
			Publisher.findOne({_id: req.user._id}).lean().exec(function(err, pu){
				if (err) {
					return next(err)
				}
				var imgurl = ''+publishers+'/publishers/gnd/images/avatar/'+ pu.username + '.png';
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
				// var pub = pu._doc
				var keys = Object.keys(body);
				keys.splice(Object.keys(body).indexOf('avatar'), 1);
				//console.log(keys)
				var puKeys = Object.keys(Publisher.schema.paths);
				console.log(keys, puKeys)
				for (var j in puKeys) {
					var set = {$set:{}};
					var key;
					for (var i in keys) {
						body[keys[i]] = (!isNaN(parseInt(body[keys[i]], 10)) ? ''+body[keys[i]] +'' : body[keys[i]] );
						if (puKeys[j].split('.')[0] === 'properties') {
							// var propKeys = await Object.keys(pu.properties);
							if (puKeys[j].split('.')[1] === keys[i]) {
								// pu.properties[keys[i]] = body[keys[i]]
								key = 'properties.'+ keys[i];
								set.$set[key] = body[keys[i]];
							}
						} else {
							if (puKeys[j] === keys[i]) {
								// pu[keys[i]] = body[keys[i]]
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
							// next(err)
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
		return res.redirect('/profile/'+pu.username)
	})
})

// data
router.get('/api/publish', getDat, function(req, res, next) {

	var outputPath = url.parse(req.url).pathname;
	var dat = req.dat;
	asynk.waterfall([
		function(cb) {
			Publisher.findOne({_id: req.session.userId}, function(err, pu){
				if (err) {
					cb(err);
				}
				Content.find({signatures: {$elemMatch:{pu:pu._id}}}, function(err, pages){
					if (err) {
						cb(err)
					}
					cb(null, pu, pages, dat)
				})
			})
		}
	], function(err, pu, pages, dat){
		if (err) {
			return next(err)
		}
		return res.render('publish', {
			loggedin: pu.username,
			menu: 'dat',
			data: (pages.length ? pages : null),
			dat: dat,
			pu: pu,
			type: 'blog'
		})
	})
})


router.get('/api/exportgdrivewhole', function(req, res, next){
	var now = Date.now();
	getDat64(function(dat){
		//console.log(dat)
		getDocxBlob(now, dat, true, function(docx){
			//console.log(docx)
			Publisher.findOne({_id: req.session.userId}, function(err, pu){
				if (err) {
					return next(err)
				}
				var OAuth2 = google.auth.OAuth2;

				var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
				authClient.setCredentials({refresh_token: pu.garefresh, access_token: pu.gaaccess});
				google.options({auth:authClient})
				req.session.authClient = true;
				var drive = google.drive({version: 'v3'});
				drive.files.list({
					q: 'name="establish" and mimeType="application/vnd.google-apps.folder"',
					'name': 'establish',
					'mimeType': 'application/vnd.google-apps.folder'
				})
				.then(function(folder){
					var mimeType = 'application/msword';
					//var mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
					drive.files.list({
						q: 'name="export_docx" and "'+folder.data.files[0].id+'" in parents and mimeType="application/vnd.google-apps.folder"'
					})
					.then(function(watch){
						var flId = null;
						if (!watch || watch.data.files.length < 1) {
							var fileMetadata = {
								
							  'name': 'export_docx',
							  'mimeType': 'application/vnd.google-apps.folder',
								'parents': [""+folder.data.files[0].id+""]
							};
							drive.files.create({
							  resource: fileMetadata,
							  fields: 'id'
							}, function (err, fl) {
							  if (err) {
							    // Handle error
							    console.error(err);
							  } else {
									flId = fl.data.id;
							  }
							});

						} else {
							flId = watch.data.files[0].id
						}
						
						var fileMetadata = {
							name: dat[0][0].properties.title.str + now,
							mimeType: mimeType,
							parents: [flId]
						}
						var p = ''+publishers+'/pu/publishers/esta/word';
								
						fs.access(p, function(err) {
							if (err && err.code === 'ENOENT') {
								mkdirp(p, function(err){
									if (err) {
										console.log("err", err);
									}
								})
							}
						});
						
						var pathh = path.join(p, '/'+now+'.docx');
						async function fsWriteFile(cbk){
							await fs.writeFile(pathh, docx)
							cbk(null);

						}
						
						fsWriteFile(function(err){
							if (err) {
								return next(err)
							}
							var media = {
								mimeType: mimeType,
								body: fs.createReadStream(
									pathh
									//path.join(p, '1536201305514.docx')
								)
							}
							drive.files.create({
								resource: fileMetadata,
								media: media,
								fields: 'id'
							})
							.then(function(fl){
								req.session.importgdrive = false
								/*var open = require('open');
								open('https://drive.google.com/drive/folders/'+flId+'', function(err){
									if (err) {
										return next(err)
									}
									return res.redirect('/')
								})*/
								return res.redirect('https://drive.google.com/drive/folders/'+flId)
							})
							.catch(function(err){
								if (err) {
									return next(err)
								}
							})
						})
					})
					.catch(function(err){
						if (err) {
							return next(err)
						}
					})
				})
				.catch(function(err){
					if (err) {
						return next(err)
					}
				})
				
			})
		})
	})
})

router.get('/api/exportgdriverev/:fileid/:chind', function(req, res, next){
	var fileId = req.params.fileid;
	var chind = req.params.chind;
	Content.find({'properties.chapter.ind': chind}).lean().exec(function(err, data){
		if (err) {
			return next(err)
		}
		data = data.sort(function(a,b){
			if (parseInt(a.properties.chapter.ind, 10) < parseInt(b.properties.chapter.ind, 10)) {
				return -1;
			} else {
				return 1;
			}
		});
		var dat = [data];
		var now = Date.now();
		getDocxBlob(now, dat, false, function(docx){
			//console.log(docx)
			Publisher.findOne({_id: req.session.userId}, function(err, pu){
				if (err) {
					return next(err)
				}
				var OAuth2 = google.auth.OAuth2;

				var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
				authClient.setCredentials({refresh_token: pu.garefresh, access_token: pu.gaaccess});
				google.options({auth:authClient})
				req.session.authClient = true;
				var drive = google.drive({version: 'v3'});
				drive.files.get({
					fileId: fileId,
					fields: 'id,name'
				})
				.then(function(file){
					//console.log(file)
					drive.files.list({
						q: 'name="establish" and mimeType="application/vnd.google-apps.folder"',
						'name': 'establish',
						'mimeType': 'application/vnd.google-apps.folder'
					})
					.then(function(folder){
						var mimeType = file.mimeType;
						drive.files.list({
							q: 'name="watch_docx" and "'+folder.data.files[0].id+'" in parents and mimeType="application/vnd.google-apps.folder"'
						})
						.then(function(watch){
							var flId = null;
							if (!watch || watch.data.files.length < 1) {
								var fileMetadata = {
									
								  'name': 'watch_docx',
								  'mimeType': 'application/vnd.google-apps.folder',
									'parents': [""+folder.data.files[0].id+""]
								};
								drive.files.create({
								  resource: fileMetadata,
								  fields: 'id'
								}, function (err, fl) {
								  if (err) {
								    // Handle error
								    console.error(err);
								  } else {
										flId = fl.data.id;
								  }
								});

							} else {
								flId = watch.data.files[0].id
							}
							
							var fileMetadata = {
								name: file.data.name + '_watch',
								mimeType: mimeType,
								parents: [flId]
							}
							var p = ''+publishers+'/pu/publishers/esta/word';
									
							fs.access(p, function(err) {
								if (err && err.code === 'ENOENT') {
									mkdirp(p, function(err){
										if (err) {
											console.log("err", err);
										}
									})
								}
							});
							
							var pathh = path.join(p, '/'+now+'.docx');
							async function fsWriteFile(cbk){
								await fs.writeFile(pathh, docx)
								cbk(null);

							}
							
							fsWriteFile(function(err){
								if (err) {
									return next(err)
								}
								var media = {
									mimeType: mimeType,
									body: fs.createReadStream(
										pathh
										//path.join(p, '1536201305514.docx')
									)
								}
								drive.files.create({
									resource: fileMetadata,
									media: media,
									fields: 'id'
								})
								.then(function(fl){
									//console.log('createdfile')
									//console.log(fl)
									drive.revisions.list({
										fileId: fl.data.id
									})
									.then(function(f){
										Content.find({'properties.chapter.ind': chind}, function(err, data){
											if (err) {
												return next(err)
											}
											data.forEach(function(doc){
												//doc = doc.toObject();
												doc.properties.fileId = fl.data.id;
												var rev = f.data.revisions[f.data.revisions.length - 1];
												doc.properties.revisionId = rev.id;
												doc.save(function(err){
													if (err) {
														return next(err)
													}
												})
											})
											req.session.importgdrive = false
											
											return res.redirect('/')
										})
										
									})
									.catch(function(err){
										if (err) {
											return next(err)
										}
									})
								})
								.catch(function(err){
									if (err) {
										return next(err)
									}
								})
							})
						})
						.catch(function(err){
							if (err) {
								return next(err)
							}
						})
					})
					.catch(function(err){
						if (err) {
							return next(err)
						}
					})
				})
				.catch(function(err){
					return next(err)
				})
			})
		})
		
	})
})

router.post('/api/importgdoc/:fileid', function(req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var fileId = req.params.fileid;
	var now = Date.now();
	var os = require('os');
		//(publishers + '/esta/tmp/'+now+'.txt').toString()//);
	var p = ''+publishers+'/pu/publishers/esta/tmp';
	mkdirpIfNeeded(p, function(){

		var dest = fs.createWriteStream(''+publishers+'/pu/publishers/esta/tmp/'+now+'.docx');
		dest.on('open', function(){
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
					/*drive.revisions.get({
						fileId: fileId,
						revisionId: revId,
						alt: 'media'
						/*,
						fields: 'downloadUrl'
					})*/
					drive.files.get({
						fileId: fileId,
						fields: 'webContentLink'
					})
					.then(function(file){
						//console.log(file)
						//console.log(file.downloadUrl)
						var dlurl = 
						//file.downloadUrl
						file.data.webContentLink.split('&')[0];
						//console.log(dlurl);
						//https://stackoverflow.com/a/29296405/3530394
						require('request').get({
							url: dlurl,
							encoding: null,
							headers: {
								Authorization: 'Bearer'+ pu.gaaccess
							}
						}//)
						//.on('response'
						, function(error, result){
							if (error) {
								return next(error)
							}
							result.pipe(dest);
							async function fsWriteFile(cbk) {
								await fs.writeFile(''+publishers+'/pu/publishers/esta/tmp/'+now+'.docx', result.body);
								mammoth.extractRawText({path: ''+publishers+'/pu/publishers/esta/tmp/'+now+'.docx'})
								.then(function(result){
									var text = result.value;
									//console.log(text)
									var messages = result.messages;
									//console.log(messages)
									var str = text.toString();
									var gid = {
										fileId: fileId,
										revisionId: revId
									}
									textImporter(req, str, gid, function(err, chind){
										if (err) {
											return cbk(err)
										}
										//console.log('hooray')
										req.session.importgdrive = false;
										//console.log(req.session)
										//return res.status(200).send(data)
										return cbk(null, gid, chind)
									})

								})
								.done()
							}
							
							fsWriteFile(function(err, gid, chind){
								if (err) {
									return next(err)
								}
								// save draft to gdrive
								return res.redirect('/api/exportgdriverev/'+gid.fileId+'/'+chind)
								//return res.status(200).send('ok')
							});
						})
					})
					.catch(function(err){
						return next(err)
					})
					
				})
				.catch(function(err){
					return next(err)
				}) 
				
			})
		})
	});
})


router.get('/importgdrive', function(req, res, next){
	req.session.importgdrive = true;
	if (!req.session.authClient) {
		return res.redirect('/auth/google');
	}
	//req.session.importgdrive = false;
	var OAuth2 = google.auth.OAuth2;
	Publisher.findOne({_id: req.session.userId}, function(err, pu){
		if (err) {
			return next(err)
		}
		/*var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
		authClient.setCredentials({refresh_token: pu.garefresh, access_token: pu.gaaccess});
		google.options({auth:authClient})
		req.session.authClient = true;
		var drive = google.drive({version: 'v3'});
		drive.files.list({
			pageSize: 10,
			fields: 'nextPageToken, files(id, name)',
		}, (err, result) => {
			if (err) return console.log('The API returned an error: ' + err);
			var files = result.data.files;
			if (files.length) {
				console.log('Files:');
				files.map((file) => {
					console.log(`${file.name} (${file.id})`);
				});*/
				req.session.gp = {
					google_key: process.env.GOOGLE_KEY,
					scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.metadata', 'https://www.googleapis.com/auth/drive.file'],
					//google_clientid: process.env.GOOGLE_OAUTH_CLIENTID,
					access_token: pu.gaaccess,
					picker_key: process.env.GOOGLE_PICKER_KEY
				}
				return res.redirect('/')
			/*} else {
				console.log('No files found.');
			}
		});*/
	})

})

router.get('/exportpdf', getDat, function(req, res, next){
	//getDat(function(dat, distinct){
	req.session.importgdrive = false;
		var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
		req.session.refer = newrefer;
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (data.length === 0) {
				return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'');
			}
			var str = pug.renderFile(path.join(__dirname, '../views/includes/exporttemplate.pug'), {
				doctype: 'xml',
				csrfToken: req.csrfToken(),
				menu: !req.session.menu ? 'view' : req.session.menu,
				ff: req.distinct,
				dat: req.dat,
				appURL: req.app.locals.appURL
			});
			return res.render('export', {
				menu: !req.session.menu ? 'view' : req.session.menu,
				dat: req.dat,
				ff: req.distinct,
				str: str,
				exports: true
			});
				
			
		});
	//})

});

router.post('/api/exportpdf', getDat, function(req, res, next){
	var body = req.body;
	//console.log(req.body.xml)
	var htmlbuf = new Buffer(body.pdf, 'utf8'); // decode
	var now = Date.now();
	var p = ''+publishers+'/pu/publishers/esta/pdf';
		
	fs.access(p, function(err) {
		if (err && err.code === 'ENOENT') {
			mkdirp(p, function(err){
				if (err) {
					console.log("err", err);
				}
			})
		}
	});
	var htmlurl = path.join(p, '/'+now+'.html');
	var pdfurl = path.join(p, '/'+now+'.pdf');
	//console.log(xmlurl)
	fs.writeFile(htmlurl, htmlbuf, function(err) {
		if(err) {
			console.log("err", err);
		}
		//var electronPDF = require('electron-pdf');
		//spawn('electron-pdf https://ta.bli.sh/exportpdf '+path.join(p, '/'+now+'.pdf'))
		var juice = require('juice');
		var pdf = require('html-pdf');
		var html = fs.readFileSync(htmlurl, 'utf8') || htmlbuf;
		html = juice(html);
		var options = { 
			format: 'Letter'
			//,base: req.protocol + '://' + req.get('host')
		 	//base: 'file://' + path.join(__dirname, '../public') */
		};
		
		//console.log('file://' + path.join(__dirname, '../public'))
		pdf.create(html, options).toFile(pdfurl, function(err, result) {
			if (err) return console.log(err);
			console.log(result)
			//return res.redirect('/publishers/esta/pdf/'+now+'.pdf');
			var pugviewpath = path.join(__dirname, '../views/includes/exporttemplate.pug');
			var viewstr = pug.renderFile(pugviewpath, {
				md: require('marked'),
				doctype: 'html',
				hrf: '/publishers/esta/pdf/'+now+'.docx',
				dat: req.dat.sort(function(a,b){
					//console.log(a[0].properties.chapter.ind)
					if (parseInt(a[0].properties.chapter.ind, 10) < parseInt(b[0].properties.chapter.ind, 10)) {
						return -1
					} else {
						return 1
					}
				})
			});
			return res.status(200).send(viewstr);
		});
	})
	
	
})

router.get('/exportword', function(req, res, next){
	req.session.importgdrive = false;
	getDat64(function(dat){
		var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
		req.session.refer = newrefer;
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (data.length === 0) {
				return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'');
			}
			
			var pugviewpath = path.join(__dirname, '../views/includes/exportwordview.pug');
			var now = Date.now();
			
			getDocxBlob(now, dat, true, function(docx){
				var viewstr = pug.renderFile(pugviewpath, {
					md: require('marked'),
					moment: require('moment'),
					doctype: 'html',
					hrf: '/publishers/esta/word/'+now+'.docx',
					dat: dat
				});
				var p = ''+publishers+'/pu/publishers/esta/word';
						
				fs.access(p, function(err) {
					if (err && err.code === 'ENOENT') {
						mkdirp(p, function(err){
							if (err) {
								console.log("err", err);
							}
						})
					}
				});
				
				var pathh = path.join(p, '/'+now+'.docx');
				fs.writeFile(pathh, docx, function(err){
					if (err) {
						return next(err)
					}
					
					res.send(viewstr)
					//return res.redirect('/publishers/esta/word/'+now+'.docx');
				});

			})
			//return res.send(str)
			
			
		});
	})

});

router.get('/exportindd'/*, ensureCurly*/, function(req, res, next){
	req.session.importgdrive = false;
	var dat = []
	Content.distinct('properties.chapter.str', function(err, distinct){
		if (err) {
			return next(err)
		}
		if (distinct.length === 0) {
			Content.find({}).sort({index:1}).lean().exec(function(err, data){
				if (err) {
					return next(err)
				}
				dat.push(data)
			})
		} else {
			//console.log(distinct)
			distinct.forEach(function(key, i) {
				Content.find({'properties.chapter.str':{$regex:key}}).sort({index:1}).lean().exec(function(err, data){
					if (err) {
						console.log(err)
					}
					
					if (data.length === 0) return;
					if (data.length > 0) {
						// I either add the 1 here or in template. A conundrum.
						dat.splice(0, 0, data)
					}
				})
			});
		}
		
		var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
		req.session.refer = newrefer;
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			if (data.length === 0) {
				return res.redirect('/api/new/Nation/'+0+'/'+0+'/'+0+'/'+0+'');
			}
			var str = pug.renderFile(path.join(__dirname, '../views/includes/exportindd.pug'), {
				doctype: 'xml',
				csrfToken: req.csrfToken(),
				menu: !req.session.menu ? 'view' : req.session.menu,
				ff: distinct,
				dat: dat,
				appURL: req.app.locals.appURL
			});
			return res.render('export', {
				menu: !req.session.menu ? 'view' : req.session.menu,
				dat: dat,
				ff: distinct,
				str: str,
				exports: true
			});
				
			
		});
	});
	/**/
})

router.post('/api/exportindd/:version', function(req, res, next){
	var body = req.body;
	//console.log(req.body.xml)
	var xmlbuf = new Buffer(body.xml, 'utf8'); // decode
	var indd = path.join(__dirname, '/../../indd')

	var xmlurl = path.join(__dirname, '/../../indd') + '/xml.xml';
	//console.log(xmlurl)
	fs.writeFile(xmlurl, xmlbuf, function(err) {
	  if(err) {
	  	console.log("err", err);
	  } 
	})
	var id = new InDesign({
	  version: 'CS6'
	});
	//console.log(path.join(__dirname, '/../..', 'indd/importIndd.jsx'))
	id.run(path.join(__dirname, '/../..', 'indd/importIndd.jsx'), {
		message: 'hi from node',
		dirname: path.join(__dirname, '/../..'),
		xmlurl: 'xml.xml'
	}, function(res) {
		//console.log(res);
		//return res.redirect('/')
		return res.status(200).send('ok')
	});

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

router.get('/list/:id/:index', function(req, res, next){
	req.session.importgdrive = false;
	Content.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			
			
			
			if (req.isAuthenticated()) {
				var l = '/publishers/gnd/signatures/'+doc._id+'/'+req.user._id+'/img_'+doc._id+'_'+req.user._id+'.png';
				var m = '/sig/getgeo/'+doc._id+'/'+req.user._id+'';
				console.log('m')
				console.log(m)
				Signature.findOne({image: l}, function(err, pud){
					if (err) {
						return next(err)
					}
					var pu = req.user.properties;
					console.log(pu)
					isJurisdiction(doc, req.user, function(signable){
						console.log('signable?')
						console.log(signable)
						if (signable === null) {
							return res.redirect(m)
						} else {
							var str = pug.renderFile(path.join(__dirname, '../views/includes/doctemplate.pug'), {
								unsigned: (!pud ? true : false),
								csrfToken: req.csrfToken(),
								pu: pu,
								menu: !req.session.menu ? 'view' : req.session.menu,
								//data: data,
								loggedin: req.session.loggedin,
								doc: doc,
								signable: signable,
								appURL: req.app.locals.appURL,
								mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null),
								info: req.session.info
								
							});
							return res.render('single', {
								doc: doc,
								pu: pu,
								mindex: (!isNaN(parseInt(req.params.index, 10)) ? parseInt(req.params.index, 10) : null),
								str: str
							})
						}
						
					})
					
				})
			} else {
				var str = pug.renderFile(path.join(__dirname, '../views/includes/doctemplate.pug'), {
					menu: !req.session.menu ? 'view' : req.session.menu,
					//data: data,
					doc: doc,
					appURL: req.app.locals.appURL,
					mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null),
					info: req.session.info
					
				});
				return res.render('single', {
					doc: doc,
					mindex: (!isNaN(parseInt(req.params.index, 10)) ? parseInt(req.params.index, 10) : null),
					str: str
				})

				// return res.render('publish', {
				// 	menu: 'doc',
				// 	type: 'blog',
				// 	doc: doc,
				// 	mi: (!isNaN(parseInt(req.params.mi, 10)) ? parseInt(req.params.mi, 10) : null)
				// })
			}
			
			
			
			
		})
	})
})

router.get('/menu/:tiind/:chiind', function(req, res, next){
	req.session.importgdrive = false;
	var key, val;
	var key2 = null, val2;
	var find = {}

	if (!req.params.chiind || req.params.chiind === 'null') {
		if (!req.params.tiind) {
			return res.redirect('/')
		}
		key = 'properties.title.ind';
		val = ''+req.params.tiind;
		
			
	} else {
		key = 'properties.chapter.ind';
		val = ''+req.params.chiind;
		key2 = 'properties.title.ind';
		val2 = req.params.tiind;
		
	}
	find[key] = val;
	/*if (key2) {
		find[key2] = val2;
	}*/
	Content.find(find).sort( { index: 1 } ).lean().exec(function(err, data){
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
			exports: false
		})
	})
	
})

/*router.get('/api/importtxt', function(req, res, next){
	req.session.importgdrive = false;
	return res.render('import', {
		info: 'Please enter Chapter name exactly as it appears in the document'
	})
})*/

router.post('/api/importtxt/:type'/*, rmDocs*/, uploadmedia.single('txt'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	fs.readFile(req.file.path, 'utf8', function (err, content) {
		if (err) {
			next(err)
		}
		var str = content.toString();
		textImporter(req, str, null, function(err, chind){
			if (err) {
				return next(err)
			}
			var dat = []
			Content.distinct('properties.chapter.str', function(err, distinct){
				if (err) {
					return next(err)
				}
				distinct.forEach(function(key, i) {
					Content.find({'properties.chapter.str':{$regex:key}}).sort({index:1}).lean().exec(function(err, data){
						if (err) {
							console.log(err)
						}
						if (data.length === 0) return;
						if (data.length > 0) {
							// I either add the 1 here or in template. A conundrum.
							//chind = i + 1;
							dat.splice(0,0,data)
							//ff.shift();
						}
					})
				});
				//next(null, dat)
				return res.status(200).send(dat)
			})
		})
	})

})


router.post('/api/importdocx/:type'/*, rmDocs*/, uploadmedia.single('docx'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath, req.file)
	mammoth.extractRawText({path: req.file.path})
	.then(function(result){
		var text = result.value;
		//console.log(text)
		var messages = result.messages;
		//console.log(messages)
		var str = text.toString();
	
		textImporter(req, str, null, function(err, chind){
			if (err) {
				return next(err)
			}
			var dat = []
			Content.distinct('properties.chapter.str', function(err, distinct){
				if (err) {
					return next(err)
				}
				distinct.forEach(function(key, i) {
					Content.find({'properties.chapter.str':{$regex:key}}).sort({index:1}).lean().exec(function(err, data){
						if (err) {
							console.log(err)
						}
						if (data.length === 0) return;
						if (data.length > 0) {
							// I either add the 1 here or in template. A conundrum.
							//chind = i + 1;
							dat.splice(0,0,data)
							//ff.shift();
						}
					})
				});
				//next(null, dat)
				return res.status(200).send('ok')
			})
		})
	})

})

router.post('/api/importcsv/:id/:type', uploadmedia.single('csv'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)

	fs.readFile(req.file.path, 'utf8', function (err, content) {
		if (err) {
			return console.log(err)
		}
		//console.log(req.file)
		var entry = [[]];
		var json = require('d3').csvParse(content);
		for (var i in json) {
			if (!isNaN(parseFloat(json[i].longitude))) {
				var coords = [parseFloat(json[i].longitude), parseFloat(json[i].latitude)];
				entry[0].push(coords)
			}
		}
		var geo = {
			type: 'Polygon',
			coordinates: entry
		}
		Content.findOneAndUpdate({_id: req.params.id}, {$set:{geometry: null }}, function(err, doc){
			if (err) {
				return next(err)
			}
			
			Content.findOneAndUpdate({_id: req.params.id}, {$set:{geometry: geo }}, {safe: true, new:true}, function(err, doc){
				if (err) {
					return next(err)
				}
				/*Content.findOneAndUpdate({_id: req.params.id}, {$set:{'geometry.type': 'Polygon'}}, {safe: true, new: true}, function(err, doc){
					if (err) {
						return next(err)
					}*/
					return res.status(200).send(doc)
				//})
			})
			
		})
		
	})
})

router.get('/api/coverimg/:tiind/:chind', function(req, res, next){
	req.session.importgdrive = false;
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var csrf = req.csrfToken();
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/full/'+(data.length)+'/img_0.png')
		var chind = 1;
		var secind = '10';
		Content.find({'properties.chapter.ind': req.params.chind}, function(err, chunk){
			if (err) {
				return next(err)
			}
			var content = new Content({
				type: 'Feature',
				index: data.length,
				// db
				title: {
					ind: 25,
					str: 'Subdivisions' 
				},
				chapter: {
					ind: (chunk.length === 0 ? '01' : chunk[0].properties.chapter.ind),
					str: (chunk.length === 0 ? 'General Provisions.' : chunk[0].properties.chapter.str )
				},
				section: {
					ind: '000',
					str: 'Cover' 
				},
				properties: {
					section: '25.'+(chunk.length === 0 ? '01' : chunk[0].properties.chapter.ind)+'.000',
					published: true,
					label: 'Edit Subtitle',
					title: (chunk.length === 0 ? 'General Provisions.' : chunk[0].properties.chapter.str ),
					place: 'Edit Place',
					description: '',
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
					type: 'Polygon',
					coordinates:
					[
						[
							[-112.014822, 41.510547],
							[-112.014822, 41.510838],
							[-112.014442, 41.510838],
							[-112.014442, 41.510547],
							[-112.014822, 41.510547]
						]
					]
				}
			});
			content.save(function(err){
				if (err) {
					console.log(err)
				}
				return res.redirect('/list/'+content._id+'/'+content.index+'')
			});
			

		})
		
	});
})

router.get('/api/new/:placetype/:place/:tiind/:chind/:secind', function(req, res, next){
	req.session.importgdrive = false;
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	// var csrf = req.csrfToken();
	var arr = tis;
	var usstates = //await //JSON.stringify(
		require(''+path.join(__dirname, '/..')+'/public/json/usstates.json').features;
	// var uscounties = 
	// 	require(''+path.join(__dirname, '/..')+'/public/json/uscounties.json').features;
	// var us = 
	// 	require(''+path.join(__dirname, '/..')+'/public/json/us.json').features;
	var places;
	switch(req.params.placetype) {
		case 'Nation':
			places = usstates;
			break;
		case 'State':
			places = usstates;
			break;
		default:
			places = usstates;
	}
	var placeind = parseInt(req.params.place, 10)
	var multipolygon = places[placeind].geometry.coordinates;
	//console.log(places[placeind])
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/thumbs/'+(data.length)+'/thumb_0.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/esta/images/full/'+(data.length)+'/img_0.png')
		var tiind = parseInt(req.params.tiind,10);
		var chind = parseInt(req.params.chind,10);
		var secind = parseInt(req.params.secind,10);
		Content.find({'properties.title.ind': tiind, 'properties.chapter.ind': chind}, function(err, chunk){
			if (err) {
				return next(err)
			}
			
			var content = new Content({
				type: 'Feature',
				index: data.length,
				properties: {
					// db
					
					title: {
						ind: arr[tiind].index,
						str: arr[tiind].name
					},
					chapter: {
						ind: arr[tiind].chapter[chind].index,
						str: arr[tiind].chapter[chind].name
					},
					section: {
						ind: arr[tiind].chapter[chind].section[secind].index,
						str: arr[tiind].chapter[chind].section[secind].name 
					},
					published: true,
					label: 'Edit Title',
					place: 'Edit Place',
					description: marked(curly('Edit document text.')),
					xmlurl: (tiind === 0 ? 'https://api.govinfo.gov/packages/'+arr[tiind].code+''+(arr[tiind].chapter[chind].index+1)+''+arr[tiind].chapter[chind].code+''+(arr[tiind].chapter[chind].section[secind].index+1)+''+arr[tiind].chapter[chind].section[secind].code+'/xml' : null ),
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
					coordinates: multipolygon
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
					return res.redirect('/')
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
	//console.log(outputPath)
	var id = req.params.id;
	var body = req.body;
	var keys = Object.keys(body);
	//console.log(body.lat, body.lng)
	if (!body.description){
		body.description = ''
	}
	asynk.waterfall([
		function(next){
			
			Content.findOne({_id: req.params.id},function(err, doc) {
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
				for (var i in keys) {
					var thiskey = 'thumb'+count+'';
					if (keys[i] === thiskey) {
						//console.log(body[thiskey])
						var thisbody = body[thiskey];
						if (thisbody && typeof thisbody.split === 'function' && thisbody.split('').length > 100) {
							var thumbbuf = new Buffer(body[thiskey], 'base64'); // decode
							var thumburl = ''+publishers+'/pu/publishers/esta/images/thumbs/'+doc.index+'/thumb_'+count+'.png'
							thumburls.push(thumburl.replace(publishersDir, ''))
							count++;
							console.log('thumburl, thumbbuf')
							console.log(thumburl, thumbbuf)
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
				}
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
				diff.forEach(function(dif){
					//console.log(dif)
					diffss.push({
						count: dif.count,
						value: dif.value,
						added: dif.added,
						removed: dif.removed
					})
				})
				newdiff = {
					date: newdate,
					user: {
						_id: pu._id,
						username: pu.username,
						avatar: pu.avatar
					},
					dif: diffss,
					str: marked(curly(desc))
				};
			}

			var newdate = new Date();
			console.log(body.latlng)
			//console.log(desc, body.description);
			var end;
			var current;
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
					media: [],
					// (!doc.properties.media || doc.properties.media.length === 0 ? [] : doc.properties.media),
					diffs: doc.properties.diffs,
					footnotes: footnotes
				},
				geometry: {
					type: "MultiPolygon",
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
			console.log(id)// doc._id = ''+doc._id
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
			
			var set5 = {$set:{}}
			var key5 = 'properties.section.str'
			set5.$set[key5] = entry.properties.section.str;

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
						Content.findOneAndUpdate({_id: id}, set5, options, function(errr, doc) {
							if (err) {
								return next(err)
							}
							if (!newdiff) {
								next(null)
							} else {
								Content.findOneAndUpdate({_id: id}, set4, options, function(errr, doc) {
									if (errr) {
										next(errr)
									} else {
										next(null)
									}
								})
							}
						})
						
						
					})
				})
			})
			
		}
	], function(err){
		if (err) {
			return next(err)
		}
		return res.redirect('/');
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

router.post('/api/deleteentry/:id/:index', function(req, res, next) {
	var id = req.params.id;
	var index = parseInt(req.params.index, 10);
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