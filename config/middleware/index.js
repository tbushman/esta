require('dotenv').config();
const asynk = require('async');
const url = require('url');
const fs = require('fsxt');
const glob = require("glob");
const path = require('path');
const mkdirp = require('mkdirp');
const publishers = path.join(__dirname, '/../../../..');
const config = require('../index.js');
const testenv = config.testenv;
const { curly } = require('../helpers');
const { Publisher, Content, Signature, PublisherTest, ContentTest, SignatureTest } = require('../../models/index.js');
const PublisherDB = (!testenv ? Publisher : PublisherTest);
const ContentDB = (!testenv ? Content : ContentTest);
const SignatureDB = (!testenv ? Signature : SignatureTest);
const geolocation = require ('google-geolocation') ({
	key: process.env.GOOGLE_KEY
});
async function getBundle(req, res, next) {
	req.vuefile = null;
	var vuepath = path.join(__dirname, '../public/scripts/main.js');
	var exists = await fs.existsSync(vuepath);
	if (exists) {
		req.vuefile = await require(vuepath)
	}
	return next();
}

async function ifExistsReturn(req, res, next) {
	var path = ''+publishers+'/pu/publishers/esta/signatures/'+req.params.did+'/'+req.params.puid+'/img_'+req.params.did+'_'+req.params.puid+'.png';
	var exists = await fs.existsSync(path);
	if (exists) {
		return res.redirect('/list/'+req.params.id+'/'+null);
	}
	return next();
}

function ensureSequentialSectionInd(req, res, next){
	ContentDB.find({}).lean().sort({'properties.section.ind':1}).exec(async function(err, data){
		if (err){
			console.log('no data')
		}
		var count = -1
		await data.forEach(async function(doc, i){
			const dc = await ContentDB.findOne({_id:doc._id, 'properties.title.str': 'Geography', 'properties.chapter.str': 'Jurisdiction: Utah'}).then(function(d){return d}).catch(function(err){console.log(err)});
			if (dc) {
				count++;
				await ContentDB.findOneAndUpdate({_id:dc._id}, {$set:{'properties.section.ind': count, 'properties.chapter.ind': 0}}, {safe:true, upsert:false, new:true}).then(function(d){
					console.log('ok')
				})
				.catch(function(err){
					console.log(err);
				})
			}
			// ContentDB.findOneAndUpdate({_id:doc._id, 'properties.chapter.str': 'Jurisdiction: Utah'}, {$set:{'properties.section.ind': count}}, {safe:true, upsert:false, new:true}, function(err, dc){
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
	PublisherDB.findOne({_id: req.user._id}).lean().exec(async function(err, pu){
		if (err) {
			return next(err)
		}
		if (!pu) {
			return res.redirect('/login')
		}
		else if (pu.geometry && pu.geometry.coordinates.length) {
			return next()
		} else {
			// const referrer = req.get('Referrer');
			if (pu.properties.zip && pu.properties.zip !== ''/* && /(\/sig\/admin)/gi.test(referrer)*/) {
				return next()
			}
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
			// PublisherDB.findOneAndUpdate({_id: req.user._id}, {$set:{geometry:geometry}}, {new:true, safe:true}, function(err, pu){
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

function ensureCurly(req, res, next) {
	ContentDB.find({}, function(err, data) {
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

async function resetLayers(req, res, next) {
	Content.update({}, {$set:{'properties.layers':[]}}, {multi:true}).exec(async function(err, data){
		if (err) {
			return next(err)
		}
		var set1 = {$set:{}};
		var set2 = {$set:{}};
		var set3 = {$set:{}};
		var key1 = 'properties.layers';
		set1.$set[key1] = ["5ccb69789ee39e92a59cf784","5ccb7c371c1f45935f9d79fa","5ccfde4c20005f195e68ff67"];
		set2.$set[key1] = ["5d0b271f42c7bc8c6e755d0b"];
		set3.$set[key1] = ["5ccfde4c20005f195e68ff67","5d0b271f42c7bc8c6e755d0b"];
		Content.findOneAndUpdate({_id: '5cf989b465bd382260a16722'}, set1).exec((err,doc)=>{
			if (err){return next(err)}
			Content.findOneAndUpdate({_id: '5d2904a7b4aef770a18a2b24'}, set2).exec((err,doc)=>{
				if (err){return next(err)}
				console.log('ok')
				Content.findOneAndUpdate({_id: '5ccb694f9ee39e92a59cf782'}, set3).exec((err,doc)=>{
					if (err){return next(err)}
					return next()
				
				})
			})
			
		})
	})
}

function ensureStyle(req, res, next) {
	Content.find({}).lean().exec(function(err, data){
		if (err) {
			return next(err)
		}
		var color = require('randomcolor');
		data.forEach(async function(doc){
			var durl = ''+publishers+'/pu/publishers/esta/json/json_'+doc._id+'.json';
			var dexist = await fs.existsSync(durl);
			// var djson = null;
			if (dexist) {
				const djson = await fs.readFileSync(durl, 'utf8');
				if (djson) {
					var keys = Object.keys(JSON.parse(djson).features[0].properties)
					await Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.keys': keys}}).then((doc)=>console.log('ok')).catch((err)=>next(err));
				}
			}
			if (doc.properties.layers.length > 0 && typeof doc.properties.layers[0] === 'string') {
				
				
				const arr = (doc.properties.layers.length > 0 ? 
					doc.properties.layers.map(function(layer){
						var lurl = ''+publishers+'/pu/publishers/esta/json/json_'+layer+'.json';
						var lexist = fs.existsSync(lurl);
						// var ljson = null;
						if (lexist) {
							const ljson = fs.readFileSync(lurl, 'utf8');
							if (ljson) {
								var keys = Object.keys(JSON.parse(ljson).features[0].properties)
								return {
									lid: layer,
									buckets: 1,
									colors: [color()],
									key: keys[0]
								}
							}
							
						}
					}) : []
				);
				// const arr = //JSON.parse(JSON.stringify(
				// 	layers
				//))
				// doc.properties.layers = layers;
				Content.findOneAndUpdate({_id: doc._id}, {$set:{'properties.layers':arr}}).then((doc)=>console.log('ok')).catch((err)=>next(err));
				// doc.save(function(err){
				// 	if (err){
				// 		return next(err)
				// 	}
				// })
			}
		});
		return next();
	})
}

function ensureContent(req, res, next) {
	ContentDB.find({}).sort( { index: 1 } ).exec(function(err, data){
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
	ContentDB.findOne({_id: req.params.id}).lean().exec(async function(err, doc){
		if (err) {
			return next(err)
		}
		if (doc && doc.properties.layers) {
			var count = 0;
			var layerids = await doc.properties.layers.map(function(layer){
				if (layer) {return layer.lid} else {count++;return}}).filter(function(layer){return layer !== undefined}) || [];
			// console.log(layerids, doc.properties.layers)
			ContentDB.find({_id: {$in:layerids}}).lean().sort({'geometry.type':1}).exec(function(err, data){
				if (err) {
					return next(err)
				}
				if (count > 0) {
					var styles = doc.properties.layers.filter(function(lr){return lr !== null && lr !== undefined});
					// console.log(count)
					var pull = {$set:{}};
					var key = 'properties.layers';
					pull.$set[key] = styles
					ContentDB.findOneAndUpdate({_id:doc._id}, pull, {safe: true, new: true}, function(err, doc){
						if (err) {
							return next(err)
						}
						// console.log(doc.properties.layers)
					})
				}
				req.layers = data;
				return next();

			})
		} else {
			return next()
		}
		// const layers = layerids.map(async function(id){
		// 	const d = await ContentDB.findOne({_id:id}).lean().then((doc) =>doc).catch((err)=>next(err));
		// 	return d;
		// });
		// console.log(layers)
		// req.layers = layers;
	})
}

function getGeo(req, res, next) {
	ContentDB.findOne({_id:req.params.id}).lean().exec(async function(err, doc){
		if (err) {
			return next(err)
		}
		ContentDB.find({'properties.title.str': 'Geography', geometry: {$geoIntersects: {$geometry: {type: doc.geometry.type, coordinates: doc.geometry.coordinates}}} }).lean().sort({'geometry.type':1}).exec(async function(err, data){
			if (err) {
				return next(err)
			}
			var reqpos = (req.session && req.session.position ? req.session.position : null)
			await data.filter(async function(dc){
				var keys = (!doc.properties.layers ? [] : doc.properties.layers.map(function(item){if (item) return item.lid}))

				if (keys.indexOf(dc._id) === -1) {
					return false;
				} else {
					const isJ = await isJurisdiction(reqpos, dc, req.user, function(jd){
						if (jd === null) {
							return false; 
						} else {
							return jd;
						}
						// return res.redirect('/user/getgeo');
					});
					return isJ;
				}
			})
			req.availablelayers = data;
			return next()
		})
	})
}

function getDat(req, res, next){
	asynk.waterfall([
		function(cb){
			ContentDB.distinct('properties.title.ind', function(err, tdistinct){
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
					ContentDB.find({'properties.title.ind': parseInt(td,10)}).lean().exec(function(err, distinct){
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
	const userId = (!req.session || !req.session.userId ? (!req.user ? null : req.user._id ) : req.session.userId);
	PublisherDB.findOne({_id: userId}, async function(err, pu){
		if (err) {
			return next(err)
		}
		// console.log(pu)
		const referrer = (!req.get('Referrer') ? null : req.get('Referrer'));
		if (!referrer) {
			if (!pu) {
				return res.redirect('/login');
			}
			// TODO checkadminlist middleware
			if (!pu.properties.admin) {
				const isAdmin = config.admin.split(/,\s{0,5}/).indexOf(pu.username) !== -1;
				if (isAdmin) {
					const adminPublisher = await PublisherDB.findOneAndUpdate({_id: userId}, {$set: {'properties.admin': true}}).then(doc=>doc).catch(err=>next(err))
					req.user = adminPublisher;
					req.session.loggedin = req.user.username;
					return next()
				} else {
					return res.redirect('/')
				}
			} else {
				req.user = pu;
				req.session.loggedin = req.user.username;
				return next()
			}
		}
		if (pu && pu.properties.admin) {
			// req.publisher = Publisher;
			req.user = pu;
			req.session.loggedin = req.user.username;
			return next();
		} else {
			// req.publisher = Publisher;
			req.session.loggedin = null;
			return res.redirect(referrer)
		}
	})
}

function ensureApiTokens(req, res, next){
	var OAuth2 = google.auth.OAuth2;

	var authClient = new OAuth2(process.env.GOOGLE_OAUTH_CLIENTID, process.env.GOOGLE_OAUTH_SECRET, (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV));
	/*if (!req.user) {
		return res.redirect('/login')
	}*/
	PublisherDB.findOne({_id: req.session.userId}, function(err, pu){
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
			PublisherDB.findOneAndUpdate({_id: req.user._id}, {$set:{garefresh:tokens.refresh_token, gaaccess:tokens.access_token}}, {safe:true,new:true}, function(err, pub){
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

function ensureGpo(req, res, next) {
	req.session.gpo = process.env.GPOKEY;
	return next()
}

module.exports = { getBundle, ifExistsReturn, ensureSequentialSectionInd, ensureLocation, ensureCurly, rmFile, ensureStyle, resetLayers, getLayers, getGeo, ensureContent, getDat, ensureAuthenticated, ensureAdmin, ensureApiTokens, ensureGpo }