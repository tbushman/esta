var adminFunctions = {
	parsePu: function(obj) {
		if (!obj) {
			return {
				properties: {
					givenName: ''
				}
			}
		}
		return obj;
	},
	getGpo: function() {
		var self = this;
		$.get(
			'/api/gpo'
		)
		.then(function(data){
			//- console.log(data)
			self.gpo = JSON.parse(data);
		})
		.catch(function(err){
			console.log(err)
		})
	},
	setXmlId: function(e){
		var self = this;
		var ind = parseInt(e.target.value, 10);
		self.newDoc.xmlid = self.gpo.packages[ind].packageId;
		self.newDoc.chind = (parseInt(self.gpo.packages[ind].congress, 10) - 1);
		self.newDoc.chtitle = self.gpo.packages[ind].title;
		//- console.log(self.newDoc)
	},
	filterGpo: function(e) {
		var self = this;
		if (e.target.value === '') {
			return self.getGpo();
		}
		var gpo = self.gpo.packages;
		gpo = gpo.filter(function(g){
			return new RegExp(e.target.value).test(g.title)
		})
		//- console.log(gpo)
		if (gpo && gpo.length > 0) {
			self.gpo.packages = gpo;
		}
	},
	changeDocType: function(e) {
		e.preventDefault()
		
		var self = this;
		//- console.log(e.target.value)
		var ind = parseInt(e.target.value, 10);
		self.newDoc.tiind = ind;
	},
	changePlaceType: function(e) {
		e.preventDefault()
		var self = this;
		var url;
		if (self.placetypes && self.placetypes.length > 0) {
			url = self.placetypes.filter(function(pt){
				if (pt && pt.name) {
					return pt.name === e.target.value;
				} else {
					return false;
				}
				
			});
		} 
		if (url[0]) {
			url = url[0].url;
			var type = 
				e.target.value
			$.getJSON(url).then(function(json){
				self.newDoc.placetype = type;
				self.newDoc.tempGeo = json.features;
				if (type === 'Nation' && self.newDoc.tiind === 0) {
					self.newDoc.tempGeo = [self.newDoc.tempGeo[0]];
					self.getGpo();
				}
				console.log(self.newDoc.tempGeo)
			})
			.catch(function(err){console.log(err)})
		}
		
	},
	changePlaceNew: function(e) {
		e.preventDefault()
		var self = this;
		//- console.log(e.target.value)
		var ind = parseInt(e.target.value, 10);
		//- console.log(ind)
		self.newDoc.place = (isNaN(ind) || !self.newDoc.tempGeo[ind] ? (!self.newDoc.tempGeo[self.newDoc.tempGeo.length-1] ? null : self.newDoc.tempGeo.length-1) : ind )
	},
	submitZip: function(e) {
		var self = this;
		$.post('/pu/getgeo/'+null+'/'+null+'/'+self.modal.zip+'')
		.then(function(href){
			window.location.href = href
		})
	},
	handleLocationOutcome: function(geolocation, pos) {
		var self = this;
		//- console.log(geolocation)
		var modal = document.getElementById('modal');
		if (!geolocation && modal) {
			self.modal.msg = 'geolocator didn\'t work. Please provide the zip code you vote from. ';
			self.modal.id = 'zip'
		} else if (geolocation) {
			if (!pos || !pos.lat) {
				
			} else {
				$.post('/pu/getgeo/'+pos.lat+'/'+pos.lng+'/'+null+'')
				.then(function(href){
					window.location.href = href
				})
			}
			
		} else {
			if (!self.pu || !self.pu._id){
				
			}else {
				window.location.href = '/pu/getgeo/'+self.pu._id+''
			}
		}
	},
	changeDiff: function(e) {
		var self = this;
		//- console.log(e.target.value)
		self.dfi = (!isNaN(parseInt(e.target.value, 10)) ? parseInt(e.target.value, 10) : null);
	},
	deleteEntry: function(doc, e) {
		e.preventDefault()
		//- console.log(doc)
		$.post('/api/deleteentry/'+doc._id+'').then(function(res){
			//- console.log(res)
			window.location.href = '/menu/'+doc.properties.title.ind+'/'+doc.properties.chapter.ind+'';
		})
		.catch(function(err){
			console.log(err)
		})
	},
	deleteMedia: function(ind) {
		var self = this;
		$.post('/api/deletemedia/'+self.doc._id+'/'+ind+'', function(res){
			self.doc = res;
		})
	},
	toggleExport: function() {
		this.export = !this.export;
	},

	toggleEdit: function(ind) {
		var self = this;
		this.edit = (!this.edit ? ind : null);
	},
	checkNameValidity: function(type, aSearchTerm, aMsg, event) {
		var self = this;
		var elem = event.target;//document.getElementById(aID);
		for (var i = 0; i < elem.value.length; i++) {
			if (aSearchTerm.indexOf(elem.value.charAt(i)) !== -1) {
				elem.setAttribute("aria-invalid", "true");
			} else {
				elem.setAttribute("aria-invalid", "false");
			}
		}
		var check = elem.value;
		if (check !== '' && type === 'givenName') {
			var url = check.replace(' ', '_');
			$.post('/check/'+check).done(function(result, res){
				//- console.log(result, res)
				self.avail = (result === 'Available')
			})
		}
	},
	initSig: function() {
		var self = this;
		self.type = 'draw';
		document.getElementById('viewer').scrollIntoView();

	},
	setSigData: function(i, val, ts, can) {
		var self = this;
		
		Vue.set(self.can, parseInt(i,10), can)
		//- console.log(self.ts, ts)
		if (!Array.isArray(self.ts)) {
			self.ts = [];
		}
		Vue.set(self.ts, 0, ts)
	},
	updateSignature: function(index, url) {
		Vue.set(this.signatureDataUris, 0, url);
	},
	signatureToBlob: function(cb) {
		var self = this;
		if (!HTMLCanvasElement.prototype.toBlob) {
		 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
			value: function (callback, type, quality) {
				var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
				len = binStr.length,
				arr = new Uint8Array(len);
				for (var i = 0; i < len; i++ ) {
					arr[i] = binStr.charCodeAt(i);
				}
				callback( new Blob( [arr], {type: type || 'image/png'} ) );
			}
		 });
		}
		self.can[0].toBlob(function(blob){
			cb(blob);
		}, 'image/png')
	},
	saveSignature: function(){
		var self = this;
		var fd = new FormData();
		self.signatureToBlob(function(blob){
			
			fd.append('img', blob);
			fd.append('_csrf', '#{csrfToken}');
			fd.append('ts', self.ts);

			var uploadurl = '/sig/uploadsignature/'+self.doc._id+'/'+self.pu._id+'';
			$.ajax({
				url: uploadurl,
				type: 'POST',
				data: fd,
				processData: false,
				contentType: false,
				success: function(response) {
					self.mode = 'blog';
					window.location.href = response
				}
			})
		})
	},
	addMapBlob: function() {
		var self = this;
		var ind = self.doc.properties.media.length;
		var mapActive = self.mapActive;
		self.mapActive = !mapActive;
		document.getElementById('inputs').scrollIntoView();

		if (typeof self.dataLayer.disableEdit === 'function'){
			self.dataLayer.disableEdit();
			self.mapEdit = false;
		}
		self.addNewMedia(self.doc._id, ind, function(){
			leafletImage(self.map, function(err, canvas){
				if (err) {
					return console.log(err)
				}
				$('a[id*=deletemedia]').hide();
				var im = new Image()
				im.src = canvas.toDataURL('image/png');
				im.onload = function(){
					self.checkImage(im, canvas, im.width, im.height, 1025, 1025, ind, 'map');
					setTimeout(function(){
						var img = document.querySelector('img#return'+ind+'');
						var can = $('#canvas'+ind+'')[0];
						var w = img.width;
						var h = img.height;
						can.width = w;
						can.height = h;
						var ctx = can.getContext("2d");
						ctx.drawImage(img, 0, 0, w, h);
						self.uploadBlob(img, can, ind, function(){
							var dataurl = can.toDataURL("image/png", 0.8);
							self.doc.properties.media[ind].thumb = dataurl.replace(/data:image\/png;base64,/, '');
						})
					},2000)
				}
			})
		});
	},
	addNewMedia: function(id, index, cb) {
		var self = this;
		$.post('/api/newmedia/'+id+'/'+index+'', function(res) {
			self.doc.properties.media.push(res);
			cb()
		})
	},
	handleGmapsFile: function(id, e) {
		var self = this;
		// self.files = e.target.files;
		var formData = new FormData();
		console.log(e.target.files[0])
		var files = e.target.files;
		var count = 0;
		for (var i = 0; i < files.length; i++) {
			formData.append('csv', files[i])
			// self.files.push(files[i]);
			count++;
		}
		if (count === files.length) {
			$.ajax({
				url: '/loadgmaps/'+self.doc._id+'/csv',
				method: 'POST',
				data: formData,
				processData: false,
				contentType: false
				
			}).done(function(result) {
				console.log(result)
				
			}).fail(function (xhr, status) {
				console.log(xhr, status)
				alert(status);
			})
		}
		
	},
	handleFile: function(did, index) {
		var self = this;
		self.did = did;
		self.file = document.getElementById('media_'+index).files[0];
		self.processImage(index);
	},
	processJson: function(){
		var self = this;
		var dataurl = null;
		var file = self.file;
		if (!file) return;
		//- console.log(file)
		// TODO validate json type somehow before upload
		var reader = new FileReader();
		reader.onloadend = function(e) {
		//- reader.addEventListener("load", function () {
			var fd = new FormData();
			var blob = this.result;
			//- console.log(blob)
			fd.append("json", file);
			fd.append('_csrf', self.csrfToken);

			var uploadurl = '/api/importjson/'+self.doc._id+'/json';
			$.ajax({
				url: uploadurl,
				type: 'POST',
				data: fd,
				processData: false,
				contentType: false,
					success: function(response) { 
						self.doc = response
						console.log(response)
						
					}
				})
		}
		//- }, false)
		reader.readAsDataURL(file);
		
	},
	processImage: function(imgindex) {
		var self = this;
		var dataurl = null;
		var file = self.file;
		if (!file) return;
		var imagefile = file.type;
		var imageTypes= ["image/jpeg","image/png","image/jpg","image/svg+xml"];
		if(imageTypes.indexOf(imagefile) === -1) {
			$("#info").html("<span class='msg-error'>Please Select A valid Image File</span><br /><span>Only jpeg, jpg, png, and pdf types allowed</span>");
			return false;
			
		} else {
			var reader = new FileReader();
			
			reader.onloadend = function(e) {
				var img = document.getElementById('return'+imgindex+'');
				img.src = e.target.result;
				var type = imagefile.split('image/')[1];
				img.onload = function() {
					$('#media').val('');
					var can = $('#canvas'+imgindex+'')[0];
					var maxWidth = 1025 ;
					var maxHeight = 1025 ;
					var w = img.width;
					var h = img.height;
					can.width = w;
					can.height = h;
					var ctx = can.getContext("2d");
					ctx.drawImage(img, 0, 0);
					self.checkImage(img, can, w, h, maxWidth, maxHeight, imgindex, type);
				}
				
			}
			reader.readAsDataURL(file);
		}
	},
	checkImage: function(img, can, w, h, maxWidth, maxHeight, imgindex, imgtype) {
		var self = this;
		if (h > maxHeight || w > maxWidth) {
			self.reSize(img, can, w, h, maxWidth, maxHeight, imgindex, imgtype)
		} else {
			if (imgtype === 'map') {
				var im = document.querySelector('img#return'+imgindex+'');
				im.setAttribute('src', can.toDataURL('image/png'))
			} else {
				if (maxHeight === 400) {
					self.drawThumb(img, can, w, h, imgindex, imgtype)
				} else {
					self.drawFull(img, can, w, h, imgindex, imgtype)
				}
			}
		}
		
	},
	reSize: function(img, can, w, h, maxWidth, maxHeight, imgindex, imgtype){
		can.height = h*0.99;
		can.width = w*0.99;

		var can2 = document.createElement('canvas');
		can2.width = w*0.99;
		can2.height = h*0.99;
		var ctx2 = can2.getContext('2d');
		var ctx = can.getContext('2d');
		ctx2.drawImage(img, 0, 0, w*0.99, h*0.99);
		ctx.drawImage(can2, 0, 0, w*0.99, h*0.99, 0, 0, w*0.99, h*0.99);
		w = w*0.99;
		h = h*0.99;
		img.width = w;
		img.height = h;
		this.checkImage(img, can, w, h, maxWidth, maxHeight, imgindex, imgtype)
	},
	uploadBlob: function(img, can, imgindex, cb) {
		var self = this;
		var orientation = 'portrait'
		if (can.width > can.height) { 
			orientation = 'landscape' 
		} else { 
			orientation = 'portrait' 
		}

		if (!HTMLCanvasElement.prototype.toBlob) {
		 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
			value: function (callback, type, quality) {
				var binStr = atob( this.toDataURL(type, quality).split(',')[1] ),
				len = binStr.length,
				arr = new Uint8Array(len);
				for (var i = 0; i < len; i++ ) {
					arr[i] = binStr.charCodeAt(i);
				}
				callback( new Blob( [arr], {type: type || 'image/png'} ) );
			}
		 });
		}
		can.toBlob(function(blob) {
			var fd = new FormData();
			fd.append("img", blob);
			var uploadurl = '/api/uploadmedia/'+self.doc.index+'/'+imgindex+'/png';
			$.ajax({
				url: uploadurl,
				type: 'POST',
				data: fd,
				processData: false,
				contentType: false,
					success: function(response) { 
					img.onload = function () {
						self.doc.properties.media[imgindex].image_abs = response;
						self.doc.properties.media[imgindex].image = response.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '');
						self.doc.properties.media[imgindex].thumb_abs = response;
						self.doc.properties.media[imgindex].thumb = response.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '');
						self.doc.properties.media[imgindex].orientation = orientation;
						cb();
					}
					img.src = response.replace('/var/www/pu', '').replace('/Users/traceybushman/Documents/pu.bli.sh/pu', '');
				}
			})
		}, 'image/png');
	},
	drawFull: function(img, can, w, h, imgindex, imgtype) {
		var self = this;
		can.height = h;
		can.width = w;
		var ctx = can.getContext('2d');
	// console.log(w,h)
		ctx.drawImage(img, 0, 0, w, h);
		self.uploadBlob(img, can, imgindex, function(){
			var can = $('#canvas'+imgindex+'')[0];
			var maxWidth = 250 ;
			var maxHeight = 250 ;
			var w = img.width;
			var h = img.height;

			self.checkImage(img, can, w, h, maxWidth, maxHeight, imgindex, imgtype);
		})
		
	},
	drawThumb: function(img, can, w, h, imgindex, imgtype) {
		var self = this;
		can.height = h;
		can.width = w;
		var ctx = can.getContext('2d');
		
		ctx.drawImage(img, 0, 0, w, h);
		var dataurl = can.toDataURL("image/png", 0.78);
		setTimeout(function(){
			self.doc.properties.media[imgindex].thumb = dataurl.replace(/data:image\/png;base64,/, '');
			//$('#inputthumb'+imgindex+'').val(dataurl.replace(/data:image\/png;base64,/, ''));
			
		}, 100);
	},
	handleGeoJson: function(e){
		var self = this;
		self.file = 
			//document.getElementById('lyr_'+doc._id)
			e.target.files[0];
		self.processJson()
	},

}