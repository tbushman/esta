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