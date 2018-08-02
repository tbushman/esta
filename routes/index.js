var express = require('express');
var async = require('async');
//var passport = require('passport');
var router = express.Router();
var mongoose = require('mongoose');
var url = require('url');
var fs = require('fs-extra');
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
//var Publisher = require('../models/publishers.js');
var Content = require('../models/content.js');
var Diffs = require('../models/diffs.js');
var publishers = path.join(__dirname, '/../../..');

dotenv.load();
var upload = multer();

 

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
	const params = {
		wifiAccessPoints: [{
			macAddress: ''+mac+'',
			signalStrength: -65,
			signalToNoiseRatio: 40
		}]
	};
	geolocation(params, function(err, data) {
		if (err) {
			console.log(err)
			position = {lat: 41.509859, lng: -112.015802, zoom: zoom };
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
			p = ''+publishers+'/pu/publishers/ordinancer/images/full/'+req.params.index+''
			q = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+req.params.index+''

		} else if (req.params.type === 'csv') {
			p = ''+publishers+'/pu/publishers/ordinancer/csv/'+req.params.id+''
			q = ''+publishers+'/pu/publishers/ordinancer/csv/thumbs/'+req.params.id+''
			
		} else if (req.params.type === 'txt') {
			p = ''+publishers+'/pu/publishers/ordinancer/txt'
			q = ''+publishers+'/pu/publishers/ordinancer/txt/thumbs'
		} else {
			p = ''+publishers+'/pu/publishers/ordinancer/images/full/'+req.params.index+''
			q = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+req.params.index+''

		}
				
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
		if (req.params.type === 'png') {
			cb(null, 'img_' + req.params.counter + '.png')
		} else if (req.params.type === 'csv') {
			cb(null, 'csv_' + req.params.id + '.csv')
		} else if (req.params.type === 'txt') {
			cb(null, 'txt_' + Date.now() + '.txt')
		}  	
  }
});
var uploadmedia = multer({ storage: storage/*, limits: {files: 1}*/ });

var curly = function(str){
	//console.log(/\\n/g.test(str))
	//console.log(str.match(/\s/g))
	//console.log(str.match(/\"/g))
	return str
	
	.replace(/'\b/g, "\u2018")     // Opening singles
	.replace(/\b'/g, "\u2019")     // Closing singles
	.replace(/"\b/g, "\u201c")     // Opening doubles
	.replace(/\b"/g, "\u201d")     // Closing doubles
	//.replace(/([a-z])'([a-z])/ig, '$1\u2019$2')     // Apostrophe
	//
	//.replace(/(\d\s*)\u201d/g, '$1\"')
	//.replace(/(\d\s*)\u2019/g, "$1\'")
	.replace(/([a-z])\u2018([a-z])/ig, '$1\u2019$2')
}

function rmFile(req, res, next) {
	var imgp = ''+publishers+'/pu/publishers/ordinancer/images/full/'+req.params.index+'/'+'img_' + req.params.counter + '.png';
	var thumbp = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+req.params.index+'/'+'thumb_' + req.params.counter + '.png';
	console.log(imgp, thumbp)
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
	
	async.waterfall([
		
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
						image: '/publishers/ordinancer/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q1);
					var q2 = {
						query: {_id: doc._id},
						key: 'thumb',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: '/publishers/ordinancer/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q2);
					var q3 = {
						query: {_id: doc._id},
						key: 'thumb_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+i+'/thumb_'+j+'.png'
					}
					qs.push(q3);
					var q4 = {
						query: {_id: doc._id},
						key: 'image_abs',
						index: i,
						ind: j,
						//key: 'properties.media.$.thumb',
						image: ''+publishers+'/pu/publishers/ordinancer/images/full/'+i+'/img_'+j+'.png'
					}
					qs.push(q4);
					
				}
				var oldImgDir = ''+publishers+'/pu/publishers/ordinancer/images/full/'+(oldInd ? oldInd : doc.index)+'';
				var oldThumbDir = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+(oldInd ? oldInd : doc.index)+'';
				var newImgDir = ''+publishers+'/pu/publishers/ordinancer/images/full/'+i+'';
				var newThumbDir = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+i+'';
				fs.moveSync(oldImgDir, newImgDir, { overwrite: true });
				fs.moveSync(oldThumbDir, newThumbDir, { overwrite: true });
				count++;
			}
			cb(null, qs)
		},
		function(qs, cb) {
			async.eachSeries(qs, function(q, nxt){
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
	var p = ''+publishers+'/pu/publishers/ordinancer/images/full/'+index+'';
	var q = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+index+'';
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
			return res.redirect('/api/new')
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
			return res.redirect('/api/new')
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

router.get('/runtests', function(req, res, next){
	let chromedriver = require('chromedriver');
	var mocha = require('mocha');
	var assert = require('chai').assert;
	let webdriver = require('selenium-webdriver'),
		By = webdriver.By,
		until = webdriver.until,
		test = webdriver.testing;
		var driver = new webdriver.Builder().
		withCapabilities(webdriver.Capabilities.chrome()).build();
		 
		driver.get('http://'+process.env.DEVAPPURL+'');
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
		});
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

//router.all(/.*/, ensureContent)

router.get('/', ensureCurly/*, ensureEscape*/, function(req, res, next){
	
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new');
		}
		//console.log(data)
		Diffs.find({}).sort({date:1}).exec(function(err, diffs){
			if (err) {
				return next(err) 
			}
			//console.log(diffs)
			var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
				doctype: 'xml',
				csrfToken: req.csrfToken(),
				menu: !req.session.menu ? 'view' : req.session.menu,
				data: data,
				appURL: req.app.locals.appURL
			});
			//console.log(str)
			return res.render('publish', {
				menu: !req.session.menu ? 'view' : req.session.menu,
				data: data,
				str: str/*,
				diff: (!diffs[diffs.length-1] ? null : diffs[diffs.length-1].dif)*/
			});
		})
			
		
	});
});

router.get('/export', ensureCurly, function(req, res, next){
	var newrefer = {url: url.parse(req.url).pathname, expired: req.session.refer ? req.session.refer.url : null, title: 'home'};
	req.session.refer = newrefer;
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		if (data.length === 0) {
			return res.redirect('/api/new');
		}
		// console.log(data)
		Diffs.find({}).sort({date:1}).exec(function(err, diffs){
			if (err) {
				return next(err) 
			}
			//console.log(diffs)
			var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
				doctype: 'xml',
				csrfToken: req.csrfToken(),
				menu: !req.session.menu ? 'view' : req.session.menu,
				data: data,
				appURL: req.app.locals.appURL
			});
			//console.log(str)
			return res.render('export', {
				menu: !req.session.menu ? 'view' : req.session.menu,
				data: data,
				str: str,
				exports: true/*,
				diff: (!diffs[diffs.length-1] ? null : diffs[diffs.length-1].dif)*/
			});
		})
			
		
	});
})

router.post('/diff', function(req, res, next){
	Diffs.find({}).sort({date:1}).exec(function(err, diffs){
		if (err) {
			return next(err)
		}
		//console.log(req.body);
		//var Diff = require('text-diff');
		var Diff = require('diff');
		var diff = Diff.diffChars((diffs.length === 0 ? req.body.str : diffs[diffs.length - 1].str), req.body.str);
		diff.forEach(function(part){
			//console.log(part)
			
		})
		///var textDiff = diff.main((diffs.length === 0 ? req.body.str : diffs[diffs.length - 1].str), req.body.str)
		
		//var newdf = HtmlDiff((diffs.length === 0 ? req.body.str : diffs[diffs.length - 1].str), req.body.str, 'diff', 'diff', 'form,input,label,iframe,object,math,svg,script,video,head,style').toString()//new Diff({timeout:60});
		//console.log(newdf)
		//var newdf = diff.main((diffs.length === 0 ? req.body.str : diffs[diffs.length - 1].str), req.body.str);
		//if (diffs.length === 0 || newdf.split('</ins>')[1] || newdf.split('</del>')[1]) {
		if (diff.length) {
			var newdiff = new Diffs({
				date: new Date(),
				dif: [...diff],
				str: req.body.str
			});
			newdiff.save(function(err){
				if (err) {
					return next(err)
				} else {
					return res.status(200).send(diff)
				}
				
			})

		} else {
			return res.status(200).send('unchanged');
		}
		//console.log(newdf)
		/*if (!newdiff) {
			return next(new Error('no newdiff'))
		}*/
	});
});

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

router.get('/list/:id/:index', function(req, res, next){
	Content.findOne({_id: req.params.id}, function(err, doc){
		if (err) {
			return next(err)
		}
		Content.find({}).sort( { index: 1 } ).exec(function(err, data){
			if (err) {
				return next(err)
			}
			Diffs.find({}).sort({date:1}).exec(function(err, diffs){
				if (err) {
					return next(err)
				}
				var str = pug.renderFile(path.join(__dirname, '../views/includes/doctemplate.pug'), {
					csrfToken: req.csrfToken(),
					menu: !req.session.menu ? 'view' : req.session.menu,
					//data: data,
					doc: doc,
					appURL: req.app.locals.appURL
					
				});
				return res.render('single', {
					//data: data,
					doc: doc,
					mindex: (!isNaN(parseInt(req.params.index, 10)) ? parseInt(req.params.index, 10) : null),
					str: str
					/*,
					diff:*/
				})
			})
		})
	})
})

router.get('/menu/:title/:chapter', function(req, res, next){
	var key, val;
	var find = {}

	if (!req.params.chapter) {
		if (!req.params.title) {
			return res.redirect('/')
		}
		key = 'title.ind'
		val = parseInt(req.params.title, 10)
		
			
	} else {
		key = 'chapter.ind'
		val = parseInt(req.params.chapter, 10)
		
	}
	find[key] = val;
	Content.find(find).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		var str = pug.renderFile(path.join(__dirname, '../views/includes/datatemplate.pug'), {
			doctype: 'xml',
			csrfToken: req.csrfToken(),
			menu: !req.session.menu ? 'view' : req.session.menu,
			data: data,
			appURL: req.app.locals.appURL
		});
		return res.render('publish', {
			menu: !req.session.menu ? 'view' : req.session.menu,
			data: data,
			str: str,
			exports: false
		})
	})
})

router.post('/api/importtxt/:id/:type', uploadmedia.single('txt'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	async.waterfall([
		function(next){
			fs.readFile(req.file.path, 'utf8', function (err, content) {
				if (err) {
					next(err)
				}
				var entry = [];
				//var json = require('d3').csvParse(content);
				//console.log(content)
				var str = content.toString();
				// description
				// non-capturing marker at title.chapter.section index with global and multiple modifier
				// Used to split the text into an array
				var drx = /(\d{1,3}\.\d{1,3}\.\d{0,4}\.[\s\S]*?)(?=\d{1,3}\.\d{1,3}\.\d{1,4}\.\s*?)/gm
				// title.chapter.section index
				var numrx = /^(\d{1,3}\.\d{1,3}\.\d{0,4}\.[\s\S]*?)/si
				var nrx = /^\d{1,3}\.\d{1,3}\.\d{0,4}\.\s/
				// title rx
				var trx = /(?:^\d{1,3}\.\d{1,3}\.\d{0,4}\.)(.*?)(?=\n[\w])/si
				// isolate description
				var descrx = /(?:[\n])(.*)/si
				//remove stray spaces
				var dat = str.split(drx).filter(function(item){
					return item !== ''
				}).map(function(it){
					var num;
					if (numrx.exec(it)) {
						num = numrx.exec(it)
					} else {
						num = ['']
					}
					//console.log(/\r/g.test(it))
					var desc = (descrx.exec(it) ? 
						descrx.exec(it)[1].toString().trim().replace(/(\d|\w\.)\t/g, '$1 ').replace(/(\t)/g, '  \t').replace(/(\v)/g, '   \n  \n').replace(/\u2028/g, '  \n  \n')
						.replace(/[\n ](\d\.)/g, '  \n  \n$1')
						//.replace(/^([A-Z]\.)/gm, '  \n- **$1**')
						//.replace(/[\s\.]([A-Z]\.)/g, '  \n  \n- **$1**')
						: 
						''
					);
					desc = desc.replace(/^([A-Z]\.)/gm, '  \n**$1**').replace(/[\s\.]([A-Z]\.)/g, '  \n  \n**$1**');

					return {
						num: num[0],
						title: (trx.exec(it) ? trx.exec(it)[1] : '').trim(),
						desc: desc.toString()
						//.replace(/(\t)/g, '  ').replace(/(\n)/g, '\n  ').replace(/(\r)/g, '\r  ').replace(/(\s{2})/g, ' ').replace(/(\s{3})/g, '  ').replace(/(\\n)/g, '  \n').replace(/(\\r)/g, '  \r')
					}
					
				});
				next(null, dat);
			})
		},
		function(dat, next){
			dat.forEach(function(item, i){
				fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+i+'/thumb_0.png')
				fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/full/'+i+'/img_0.png')

				var entry = new Content({
					index: i,
					type: 'Feature',
					title: {
						ind: parseInt(item.num.split('.')[0], 10),
						str: 'Subdivisions'
					},
					chapter: {
						ind: parseInt(item.num.split('.')[1], 10),
						str: 'General Provisions'
					},
					section: {
						ind: parseInt(item.num.split('.')[2], 10),
						str: item.title
					},
					properties: {
						section: item.num,
						published: true,
						label: 'Edit Subtitle',
						title: curly(item.title),
						place: 'Edit Place',
						description: curly(item.desc),
						current: false,
						media: [
							{
								index: 0,
								name: 'Sample image',
								image_abs: ''+publishers+'/pu/publishers/ordinancer/images/full/'+i+'/img_0.png',
								image: '/publishers/ordinancer/images/thumbs/'+i+'/thumb_0.png',
								thumb_abs: ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+i+'/thumb_0.png',
								thumb: '/publishers/ordinancer/images/thumbs/'+i+'/thumb_0.png',
								caption: 'Sample caption',
								postscript: 'Sample postscript',
								url: 'https://pu.bli.sh'
							}
						]
					},
					geometry: {
						type: 'Point',
						coordinates: [-112.014717, 41.510488]
					}
				});
				entry.save(function(err){
					if (err) {
						console.log(err)
					}
				})
			});
			next(null)
		},
		function(next) {
			Content.find({}, function(err, data){
				if (err) {
					next(err)
				} else {
					next(null, data)
				}
				
			})
		}
	], function(err, data){
		if (err) {
			return next(err)
		}
		return res.status(200).send(data)
	})
	
		
		//console.log(data)
		/*if (str) {
			while (str.length > 0) {
				data.push(str.split(rx)[0])
				str = str.split(rx)[1]
			}
			//var rx = /^(\d{1,2}.\d{1,3}.\d{0,4}.)/gm
			//data = str.split(rx);
			console.log(str.split(rx))
		}*/
		/*Content.findOneAndUpdate({_id: req.params.id}, {$set:{geometry: geo }}, {safe: true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})*/
})

router.post('/api/importcsv/:id/:type', uploadmedia.single('csv'), function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)

	fs.readFile(req.file.path, 'utf8', function (err, content) {
		if (err) {
			return console.log(err)
		}
		console.log(req.file)
		var entry = [];
		var json = require('d3').csvParse(content);
		for (var i in json) {
			if (!isNaN(parseFloat(json[i].longitude))) {
				var coords = [parseFloat(json[i].longitude), parseFloat(json[i].latitude)];
				entry.push(coords)
			}
		}
		var geo = {
			type: 'LineString',
			coordinates: entry
		}
		Content.findOneAndUpdate({_id: req.params.id}, {$set:{geometry: geo }}, {safe: true, new:true}, function(err, doc){
			if (err) {
				return next(err)
			}
			return res.status(200).send(doc)
		})
	})
})

router.get('/api/new', function(req, res, next){
	var outputPath = url.parse(req.url).pathname;
	//console.log(outputPath)
	var csrf = req.csrfToken();
	Content.find({}).sort( { index: 1 } ).exec(function(err, data){
		if (err) {
			return next(err)
		}
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.png')
		fs.copySync(''+path.join(__dirname, '/..')+'/public/images/publish_logo_sq.jpg', ''+publishers+'/pu/publishers/ordinancer/images/full/'+(data.length)+'/img_0.png')
		
		var firstfew = ['Short Title', 'Purposes', 'Final Plat Required Before Lots May Be Sold', 'Enactment', 'Subdivision Defined']
		var ff = ['General Provisions.', 'Sketch Plan.', 'Intent and Purpose.', 'Final Subdivision Applications.', 'Vacating or Amending a Recorded Final Subdivision Plat, Street or Alley Final.', 'Subdivision Ordinance Amendments.', 'Noticing Requirements.', 'Appeals.', 'Special Excepetions.', 'Design and Construction Standards.', 'Guarantees for Subdivision Improvements, Facilities, and Amenities.', 'Definitions.']
		var chind = 0;
		ff.forEach(function(key, i) {
			Content.find({chapter:{$regex:key}}).lean().exec(function(err, data){
				if (err) {
					console.log(err)
				}
				if (data.length === 0) return;
				if (data.length > 0) {
					// I either add the 1 here or in template. A conundrum.
					chind = i + 1;
					ff.shift();
				}
			})
		});
		var content = new Content({
			type: 'Feature',
			index: data.length,
			// db
			title: {
				ind: 25,
				str: 'Subdivisions' 
			},
			// collection
			chapter: {
				ind: chind,
				str: ff[0] 
			},
			// document
			section: {
				ind: 1,
				str: 'Introduction' 
			},
			properties: {
				section: '25.'+chind+'.0'+1,
				published: true,
				label: 'Edit Subtitle',
				title: 'Edit Title',
				place: 'Edit Place',
				description: 'Sample text with  \n  \n**A.** lists and  \n  \n1. More  \n2. lists',
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
						image: '/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.png',
						thumb_abs: ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.png',
						thumb: '/publishers/ordinancer/images/thumbs/'+(data.length)+'/thumb_0.png',
						caption: 'Sample caption',
						postscript: 'Sample postscript',
						url: 'https://pu.bli.sh'
					}
				]		
			},
			geometry: {
				type: 'Point',
				coordinates: [-112.014717, 41.510488]
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
	console.log(outputPath, req.file)
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
						if (thisbody && thisbody.split('').length > 100) {
							//fs.writefile
							var thumbbuf = new Buffer(body[thiskey], 'base64'); // decode
							var thumburl = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+doc.index+'/thumb_'+count+'.png'
							console.log(body, thumbbuf, thumburl)
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
						image_abs: path.join(publishers, '/pu'+imgs[i]),
						iframe: (!body['iframe'+i+''] ? null : body['iframe'+i+'']),
						thumb: thumbs[i],
						thumb_abs: path.join(publishers, '/pu'+thumbs[i]),
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
					next(err) 
				}
				Content.findOneAndUpdate({_id: doc._id}, set2, options, function(errr, doc) {
				//dbSet(Content, doc._id, set2, options, function(errr, doc){
					if (errr) {
						next(errr)
					} else {
						next(null)

					}
					/*var str = pug.renderFile(path.join(__dirname, '../views/includes/editmedia.pug'), {
						doc: doc
					});
					var file = path.join(__dirname, '../../testtemplate.xml');
					fs.outputFileSync(file, str);*/
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
		image: '/images/publish_logo_sq.png',
		iframe: null,
		thumb: '/images/publish_logo_sq.png',
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
		Content.findOneAndUpdate({_id: id}, {$pull: {'properties.media': {index: index}}}, {multi: false, new: true}, function(err, doc) {
			if (err) {
				return next(err) 
			}
			var media = doc.properties.media;
			if (media.length === 0) {
				media = []
			} else {
				for (var i = index; i < media.length; i++) {
					var oip = ''+publishers+'/pu/publishers/ordinancer/images/full/'+doc.index+'/'+'img_' + (i+1) + '.png';
					var otp = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+doc.index+'/'+'thumb_' + (i+1) + '.png';
					var nip = ''+publishers+'/pu/publishers/ordinancer/images/full/'+doc.index+'/'+'img_' + i + '.png';
					var ntp = ''+publishers+'/pu/publishers/ordinancer/images/thumbs/'+doc.index+'/'+'thumb_' + i + '.png';
					var options = {nonull:true,nodir:true}
					var oldImgPath = glob.sync(oip, options)[0];
					var oldThumbPath = glob.sync(otp, options)[0];
					var newImgPath = glob.sync(nip, options)[0];
					var newThumbPath = glob.sync(ntp, options)[0];
					fs.moveSync(oldImgPath, newImgPath, { overwrite: true });
					fs.moveSync(oldThumbPath, newThumbPath, { overwrite: true });
					media[i].image_abs = newImgPath;
					media[i].thumb_abs = newThumbPath;
					media[i].image = newImgPath.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '');
					media[i].thumb = newThumbPath.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '')
					media[i].index -= 1;
				}
			}
			Content.findOneAndUpdate({_id: id}, {$set:{'properties.media': media}}, function(err, doc){
				if (err) {
					return next(err)
				}
				// if deleted media was featured, assign featured value to first media
				if (thisdoc.properties.media[index].featured) {
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