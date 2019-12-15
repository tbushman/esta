var baseFunctions = {
	isResponsive: function() {
		return (window.innerWidth < 600)
	},
	parseObj: function(obj) {
		if (!obj) return '';
		return obj;
	},
	parseBool: function(item) {
		if (!item) return false;
		return true;
	},
	ifNullThenArr: function(obj) {
		if (!obj) return [];
		return obj;
	},
	resizeFrame: function(e) {
		var self = this;
		self.dPath = self.dPathAttr()
		self.wWidth = window.innerWidth;
		self.wHeight = window.innerHeight;
	},
	deactivateMap: function() {
		var self = this;
		self.mapActive = false;
		var mapEdit = self.mapEdit;
		if (self.loggedin && self.loggedin !== '' && self.pu && self.pu !== '' && self.pu.properties.admin) {
			if (typeof self.dataLayer.disableEdit === 'function') { self.dataLayer.disableEdit(); }
			self.mapEdit = !mapEdit;
		}

		document.getElementById('editor').scrollIntoView();
	},
	activateMap: async function(){
		var self = this;
		var mapActive = self.mapActive;
		var mapEdit = self.mapEdit;
		self.mapReady = false;
		console.log(mapActive)
		if (!mapActive) {
			self.mapActive = true;
			document.getElementById('viewer').scrollIntoView();
			setTimeout(()=>{
				self.mapReady = false;
				if (self.loggedin && self.loggedin !== '' && self.pu && self.pu !== '' && self.pu.properties.admin && self.dataLayer._latlngs && self.dataLayer._latlngs.length < 2) {
					//- self.dataLayer.enableEdit();
					self.mapEdit = !mapEdit;
				}
				var droppedkeys = Object.keys(self.dropped);
				droppedkeys.forEach(key => self.dropped[key] = false);
				self.mapReady = true;
			},1000)
			
			//- tinymce.get('description').hide();
		}
		if (self.mapActive && !self.mapReady) {
			self.mapReady = true;
		}
	},
	drop: function(code, e) {
		var self = this;
		var cd = self.dropped[code];
		
		self.dropped[code] = !cd;
	},
	subDropdown: function(e) {
		var self = this;
		if (!$(e.target).next('.slidedown')) {
	
			return;
		} else {
			var sub = $(e.target).next('.slidedown')[0];
			//- console.log(e.target.nextSibling)
			//- console.log(sub)
			$('.drop').not($(e.target)).removeClass('active');
			$(sub).slideToggle(100);
			$(e.target).toggleClass('active');
		}
	},
	mainDropdown: function(e) {
		var self = this;
		if ($('.dropdown').hasClass('active')) {
			$('.dropdown').removeClass('active');
		} else {
			$('.dropdown').addClass('active');
		}
		$('.submenu.drop').slideToggle(100);
	},
	navigateTo: function(url){
		window.location.href = url;
	},
	getHTML: function(type, str) {
		var self = this;
		var span = document.createElement(type);
		span.innerHTML = str;
		return span.outerHTML;
	},
	accordion: function(n, ind, e) {
		var self = this;
		if (e) e.preventDefault();
		if (!ind) {
			if (!self.accordions[n].length) {
				if (!self.dat || self.dat === '') {
				} else {
					self.dat.forEach(async function(datas, i){
						if (i === n) {
							self.accordions[n] = await datas.map(function(doc){return doc.index})
						}
					});
					
				}
				self.accordions[n].sort();
			} else {
				var sac = self.accordions;
				if (sac) {
					while(sac[n].length > 0) {sac[n].pop();}
					self.accordions = sac;
				}
				
			}
		} else {
			if (self.accordions[n].indexOf(ind) === -1) {
				self.accordions[n].push(ind);
				self.accordions[n].sort();
			} else {
				self.accordions[n].splice(self.accordions[n].indexOf(ind), 1);
			}
		}
	},
	convertToRGB: function(hex) {
		// Returns an Array of integers (length = 3) from an Array of Strings (length = 6)
		var hx = hex.split('#')[1].split('');
		var converted = [];
		var alpha = ['A', 'B', 'C', 'D', 'E', 'F'];
		hx.forEach(function(num, i) {
			// if the argument is an alphabetical character, 
			// convert it to an integer between 10 ('A') and 15 ('F')
			if (isNaN(parseInt(num, 10))) {
				num = 10 + alpha.indexOf(num.toUpperCase());
			} else {
				num = parseInt(num, 10);
			}
			// the Array hex.length is 6, consisting of three pairs of characters
			// Multiply the first character's value by 16 to achieve base 16
			if (i === 0 || i === 2 || i === 4) {
				num = num * 16;
			}
	
			converted.push(num);
		});
	
		// First pair sum
		var r = converted[0] + converted[1];
		// Second pair sum
		var g = converted[2] + converted[3];
		// Third pair sum
		var b = converted[4] + converted[5];
		return [r, g, b];
	},
	sliderImg: function(int){
		var self = this;
		//- if ($('#slider')[0]) {
		//- 	var starttime;
		//- 	self.sliderInterval = setInterval(function(){
		//- 		self.sliderOpacity = 0;
		//- 		self.sliderTimeout1 = setTimeout(function(){
		//- 			if (self.sliderIndex > 3) {
		//- 				self.sliderIndex = 1;
		//- 			} else {
		//- 				self.sliderIndex += 1;
		//- 			}
		//- 			self.sliderTimeout2 = setTimeout(function(){
		//- 				self.sliderOpacity = 1;
		//- 			},(int/5))
		//- 		},(int/5))
		//- 	}, int)
		//- 		//- requestAnimationFrame(function(ts){
		//- 		//- 	var duration = int;
		//- 		//- 	if (!starttime) {
		//- 		//- 		starttime = ts;
		//- 		//- 	}
		//- 		//- 	var timestamp = ts || new Date().getTime()
		//- 		//- 	var runtime = timestamp - starttime;
		//- 		//- 	if (runtime >= duration) {
		//- 		//- 		self.sliderOpacity = 0;
		//- 		//- 		self.sliderTimeout1 = setTimeout(function(){
		//- 		//- 			if (self.sliderIndex > 3) {
		//- 		//- 				self.sliderIndex = 1;
		//- 		//- 			} else {
		//- 		//- 				self.sliderIndex += 1;
		//- 		//- 			}
		//- 		//- 			self.sliderTimeout2 = setTimeout(function(){
		//- 		//- 				self.sliderOpacity = 1;
		//- 		//- 			},(int/5))
		//- 		//- 
		//- 		//- 		},(int/5))
		//- 		//- 	}
		//- 		//- 
		//- 		/**/
		//- 	//- }) //10000
		//- } else {
		//- 	console.log('no slider')
		//- }
	}



}