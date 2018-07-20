var express = require('express');
var async = require('async');
//var passport = require('passport');
var router = express.Router();
var mongoose = require('mongoose');
var url = require('url');
var fs = require('fs-extra');
var path = require('path');
var glob = require("glob");

var moment = require("moment");
var multer = require('multer');
var mkdirp = require('mkdirp');
var spawn = require("child_process").exec;
var dotenv = require('dotenv');
var marked = require('marked');
var pug = require('pug');
//var Publisher = require('../models/publishers.js');
var Content = require('../models/content.js');
var publishers = path.join(__dirname, '/../../..');

dotenv.load();
var upload = multer();

var storage = multer.diskStorage({
	
	destination: function (req, file, cb) {
		var p = ''+publishers+'/pu/publishers/ordinancer/images/full/'+req.params.index+''
		var q = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+req.params.index+''
		
		fs.access(p, function(err) {
			if (err && err.code === 'ENOENT') {
				mkdirp(p, function(err){
					if (err) {
						console.log("err", err);
					}
					mkdirp(q, function(err){
						if (err) {
							console.log("err", err);
						}
						cb(null, p)
					})
				})
			} else {
				cb(null, p)
			}
		})
		
	},
	filename: function (req, file, cb) {
		if (req.params.type === 'pdf') {
			cb(null, 'pdf_' + req.params.counter + '.pdf')
		} else {
			cb(null, 'img_' + req.params.counter + '.png')
		}    	
  }
});
var uploadmedia = multer({ storage: storage/*, limits: {files: 1}*/ });

var curly = function(str){
	return str
	
	.replace(/'\b/g, "\u2018")     // Opening singles
	.replace(/\b'/g, "\u2019")     // Closing singles
	.replace(/"\b/g, "\u201c")     // Opening doubles
	.replace(/\b"/g, "\u201d")     // Closing doubles
	//
	.replace(/(\d\s*)\u201d/g, '$1\"')
	.replace(/(\d\s*)\u2019/g, "$1\'")
	.replace(/([a-z])\u2018([a-z])/ig, '$1\u2019$2')
}

function rmFile(req, res, next) {
	var imgp = ''+publishers+'/pu/publishers/ordinancer/images/full/'+req.params.index+'/'+'img_' + req.params.counter + '.{jpeg,png}';
	var thumbp = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+req.params.index+'/'+'thumb_' + req.params.counter + '.{jpeg,png}';
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
	Content.find({}, function(err, data) {
		if (err){
			return next(err)
		}
		data.forEach(function(doc){
			doc.properties.orientation = doc.properties.orientation ? curly(doc.properties.orientation) : null;
			doc.properties.description = doc.properties.description ? curly(doc.properties.description) : null;
			doc.properties.media.forEach(function(media){
				media.name = media.name ? curly(media.name) : null;
				media.caption = media.caption ? curly(media.caption) : null;
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
router.get('/', ensureCurly, function(req, res, next){
	
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	//console.log(require('global/window'))
	//return res.redirect('/home');
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new')
		}
		var str = pug.renderFile(path.join(__dirname, '../views/publish.pug'), {
			doctype: 'xml',
			menu: !req.session.menu ? 'view' : req.session.menu,
			data: data,
			doc: data[0],
			diff: str
		});
		var file = path.join(__dirname, '/..')+'/public/json/testtemplate.xml';
		fs.outputFileSync(file, str);
		//console.log(str)
		return res.render('publish', {
			csrfToken: req.csrfToken(),
			menu: !req.session.menu ? 'view' : req.session.menu,
			data: data,
			doc: data[0]/*,
			diff: str*/
		});
	});
});


router.get('/api/new', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var csrf = req.csrfToken();
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.svg', ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.svg')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.svg', ''+publishers+'/pu/publishers/ordinancer/images/full/'+(data.length)+'/img_0.svg')
		
		var firstfew = ['Short Title', 'Purposes', 'Final Plat Required Before Lots May Be Sold', 'Enactment', 'Subdivision Defined']
		
		var content = new Content({
			type: 'Feature',
			index: data.length,
			// db
			title: {
				ind: 24,
				str: 'Subdivisions' 
			},
			// collection
			chapter: {
				ind: 0,
				str: 'General Provisions' 
			},
			// document
			section: {
				ind: data.length,
				str: firstfew[data.length] 
			},
			properties: {
				section: '25.01.0'+data.length,
				published: true,
				label: 'Edit Subtitle',
				title: 'Edit Title',
				place: 'Edit Place',
				description: '...edit description...',
				current: false,
				time: {
					begin: moment().utc().format(),
					end: moment().add(1, 'hours').utc().format()
				},
				media: [
					{
						index: 0,
						name: 'Sample image',
						image_abs: ''+publishers+'/pu/publishers/ordinancer/images/full/'+(data.length)+'/img_0.png',
						image: '/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.svg',
						thumb_abs: ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.png',
						thumb: '/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.svg',
						caption: 'Sample caption',
						postscript: 'Sample postscript',
						url: 'https://pu.bli.sh'
					}
				]		
			},
			geometry: {
				type: 'Point',
				coordinates: [-111.854704, 40.769673]
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
				/*
				return res.render('edit', {
					menu: !req.session.menu ? 'edit' : req.session.menu,
					data: data,
					doc: content,
					csrfToken: csrf,
					info: "Edit this entry now or later"
				});*/
				return res.redirect('/')
			});
		});
	});
});

router.post('/api/uploadmedia/:index/:counter/:type', rmFile, uploadmedia.single('img'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath, req.file.path)
	return res.status(200).send(req.file.path)
	
});

router.post('/api/editcontent/:id', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var id = req.params.id;
	var body = req.body;
	var keys = Object.keys(body);
	async.waterfall([
		function(next){
			
			Content.findOne({_id: req.params.id},function(err, doc) {
			//dbFindOne(Content, req.params.id, function(err, doc){
				if (err) {
					return next(err)
				}
				var thumburls = [];
				var count = 0;
				var i = 0;
				for (var i in keys) {
					var thiskey = 'thumb'+count+'';

					if (keys[i] === thiskey) {
						//console.log(body[thiskey])
						var thisbody = body[thiskey];
						if (thisbody !== '/images/publish_logo_sq.svg' && thisbody.split('').length > 100) {
							//fs.writefile
							var thumbbuf = new Buffer(body[thiskey], 'base64'); // decode
							var thumburl = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+doc.index+'/thumb_'+count+'.png'
							thumburls.push(thumburl.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', ''))
							count++;
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
				next(null, doc, thumburls, body, keys)
				
			})
		},
		function(doc, thumburls, body, keys, next) {
			var imgs = [];
			var count = 0;
			for (var k = 0; k < keys.length; k++) {
				var thiskey = 'img'+count+''
				if (keys[k] === thiskey) {
					imgs.push(body[keys[k]])
					count++;
				}
			}
			//console.log(imgs)
			next(null, doc, thumburls, imgs, body)
		},
		function(doc, thumburls, imgs, body, next) {
			//console.log(body)
			var curly = function(str){
				return str
				
				.replace(/'\b/g, "\u2018")     // Opening singles
				.replace(/\b'/g, "\u2019")     // Closing singles
				.replace(/"\b/g, "\u201c")     // Opening doubles
				.replace(/\b"/g, "\u201d")     // Closing doubles
				.replace(/(\.)"/g, "$1\u201d")     // Closing doubles
				//
				//.replace(/(\d\s*)\u201d/g, '$1 inches')
				//.replace(/(\d\s*)\u2019/g, '$1 feet')
				.replace(/([a-z])\u2018([a-z])/ig, '$1\u2019$2')
			}
			
			var straight = function(str) {
				return str.replace(/(\d\s*)\u201d/g, '$1\"').replace(/(\d\s*)\u2019/g, "$1'")
			}
			var end;
			var current;
			var entry = {
				_id: doc._id,
				type: "Feature",
				index: doc.index,
				title: {
					ind: doc.title.ind,
					str: doc.title.str 
				},
				chapter: {
					ind: doc.chapter.ind,
					str: doc.chapter.str 
				},
				section: {
					ind: doc.section.ind,
					str: doc.section.str
				},
				properties: {
					published: (!body.published ? false : true),
					_id: id,
					title: body.title ? curly(body.title) : '',
					label: body.label ? curly(body.label) : '',
					place: body.place ? curly(body.place) : '',
					description: body.description ? curly(body.description) : '',
					time: {
						begin: new Date(body.datebegin),
						end: moment().utc().format()
					},
					media: []
				},
				geometry: {
					type: "Point",
					coordinates: [parseFloat(body.lng), parseFloat(body.lat)]
				}
			}
			var entrymedia = []
			var thumbs = thumburls;
			var count = 0;
			if (thumbs.length > 0) {
				for (var i = 0; i < thumbs.length; i++) {
					var media;
					
					media = {
						index: count,
						name: (body['img'+i+'_name'] ? curly(body['img'+i+'_name']) : ''),
						image: imgs[i],
						iframe: (!body['iframe'+i+''] ? null : body['iframe'+i+'']),
						thumb: thumbs[i],
						caption: (body['img'+i+'_caption'] ? curly(body['img'+i+'_caption']) : ''),
						postscript: (body['img'+i+'_postscript'] ? curly(body['img'+i+'_postscript']) : ''),
						featured: body['img'+i+'_featured']
					}

					entrymedia.push(media)
					count++
				}
			}
			entry = JSON.parse(JSON.stringify(entry))

			var set1 = {$set: {}};
			set1.$set['properties'] = entry.properties;
			
			var key2 = 'properties.media';
			var set2 = {$set: {}};
			set2.$set[key2] = entrymedia;

			var options = {safe: true, new: true, upsert: false};
			Content.findOneAndUpdate({_id: doc._id}, set1, options, function(err, doc) {

			//dbSet(Content, doc._id, set1, options, function(err, doc){
				if (err) {
					return next(err) 
				}
				Content.findOneAndUpdate({_id: doc._id}, set2, options, function(errr, doc) {
				//dbSet(Content, doc._id, set2, options, function(errr, doc){
					if (errr) {
						return next(errr)
					}
					var str = pug.renderFile(path.join(__dirname, '../views/includes/editmedia.pug'), {
						doc: doc
					});
					var file = path.join(__dirname, '../../testtemplate.xml');
					fs.outputFileSync(file, str);
					next(null)
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

router.post('/api/new', function(req, res, next) {
	
})

router.post('/api/newmedia/:id/:index', function(req, res, next) {
	var index = parseInt(req.params.index, 10);
	var media = {
		index: index,
		name: 'Image '+(index + 1)+'',
		image: '/images/publish_logo_sq.svg',
		iframe: null,
		thumb: '/images/publish_logo_sq.svg',
		caption: '',
		postscript: '',
		featured: false
	}
	Content.findOneAndUpdate({_id: req.params.id}, {$push:{'properties.media': media}}, {safe:true, new:true}, function(err, doc){
		if (err) {
			return next(err)
		}
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+doc.index+'/thumb_'+index+'.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/full/'+doc.index+'/img_'+index+'.png')
		return res.status(200).send(pug.renderFile(path.join(__dirname, '../views/includes/editmedia.pug'), {
			item: media,
			doc: doc
			
		}))
		//return res.status(200).send('ok')
	})
})
module.exports = router;