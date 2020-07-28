var mapFunctions = {
	moveStart: function(){
		var coord = self.lMarker.getLatLng();
		var xy = self.map.latLngToContainerPoint(coord);
		var x = xy.x;
		var y = xy.y;
		self.dPath = self.dPathAttr()
		self.setBtn(x, y);
		self.viewerList = false;
	},
	moveEnd: function(){
		self.wWidth = window.innerWidth;
		self.wHeight = window.innerHeight;
		var coord = self.lMarker.getLatLng();
		var xy = self.map.latLngToContainerPoint(coord);
		var x = xy.x;
		var y = xy.y;
		self.dPath = self.dPathAttr()
		self.setBtn(x, y);
		if (self.geo.length > 0) {
			self.viewerList = true;
		}
	},
	dPathAttr: function() {
		var self = this;
		var thickness = (!self.thickness ? 65 : self.thickness);
		var nw = (!self.wWidth ? window.innerWidth : self.wWidth);
		var nh = (!self.wHeight ? window.innerHeight : self.wHeight);
		var toolh = (thickness * 3) + (thickness * 2) + 18 
		var m = (!self.pu ? 
			"M"+(thickness)+",0H"+(nw)+"V"+(nh)+"H0V"+toolh+"H"+(thickness)+"V0z " :
			"M"+(thickness)+","+(thickness)+"H"+(nw - thickness)+"V"+(nh - thickness)+"H"+(thickness)+"V"+(thickness)+"z "
		)
		var d;
		if (self.type === 'draw') {
			d = "M0,0v"+nh+"h"+nw+"V0H0L0,0z"
		} else {
			d = "M0,0v"+nh+"h"+nw+"V0H0L0,0z "+
			m
		}
		return d;
	},
	
	panZoom: function(){
		var self = this;
		//console.log(self.map)
		if (self.map && self.latlng) {
			$.post('/panzoom/'+self.latlng.lat+'/'+self.latlng.lng+'/'+self.map.getZoom()+'', function(result){
			})
		}
		
	},
	getLayers: function(id) {
		//- self.lyr[item._id]
		var self = this;
		$.get('/api/geointersect/'+id+'', function(res){
			if (res.length === 1 && res[0]._id === self.doc._id) {
				$.get('/')
			}
		})
	},
	styleOf: function(feature, type) {
		var self = this;
		var keys = self.doc.properties.layers.map(function(item){if (item){return item.lid}else{return}}).filter(function(item){return item !== null && item !== undefined})
		var cind = keys.indexOf(feature._id);
		var c = (!self.c[cind] ? 'var(--highlight)' : self.c[cind]);
		var style = {
								fillColor: c,
								color: c,
								weight: 2,
								opacity: 1,
								fillOpacity: 0.8,
								className: feature._id
								
								}
		switch(type){
			case 'MultiPoint':
				style.radius = 10;
				style.color = '#fff';
				style.fillColor = c;
				break;
			case 'Point':
				style.radius = 10;
				style.color = '#fff';
				style.fillColor = c;
				break;
			case 'Polygon':
				break;
			case 'MultiPolygon':
				break;
			default: 
		}
		return style;
	},
	coordsToLatLng: function(coords) { // : function: function(Array[, Boolean]) -> LatLng
		return new L.LatLng(coords[1], coords[0]);
	},
	coordsToLatLngs: function(coords, levelsDeep, coordsToLatLng) { // : function(Array[, Number, Function]) -> Array
		var latlng, i, len,
				latlngs = [];
		for (i = 0, len = coords.length; i < len; i++) {
			latlng = levelsDeep ?
				this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
				(coordsToLatLng || this.coordsToLatLng)(coords[i]);
			latlngs.push(latlng);
		}
		return latlngs;
	},
	isPointCoords: function(ll) {
		if (ll.length === 2 || ll.length === 3 && !Array.isArray(ll[0])) {
			return true
		} else 
		if (ll[0][0] && ll[0].length === 2 && !Array.isArray(ll[0][0])) {
			return true
		} else if (ll[0][0][0] && ll[0][0].length === 2 && !Array.isArray(ll[0][0][0])) {
			return true
		} else {
			return false;
		}
	},
	isPointLatlng: function(ll) {
		if (!Number.isNaN(parseInt(ll.lat, 10))) {
			return true
		} else {
			return false
		} 
	},
	filterViewerList: async function(ll1, ll2, feature, id/*, keys*/, vals, buf) {
		var self = this;
		var latlng = ll2;
		// console.log(ll1, ll2, feature, id, vals, buf)
		if (self.json[id]) {
			var counter = 0;
			self.geo = (!self.geo ? [] : self.geo);
			self.geo = (!self.json[id].features ? [self.json[id]] : await self.json[id].features
			.filter(function(ft, j){
				ft._id = id
				if (self.isPointCoords(ft.geometry.coordinates)) {
					var bff = L.geoJSON(ft).addTo(self.map);
					latlng = bff.getBounds().getCenter();
					var lltcp = self.map.latLngToContainerPoint(latlng);
					var cptll = self.map.containerPointToLatLng(lltcp);
					bff.remove()
					if (ll1.contains(cptll)) {
						var bf = L.GeoJSON.geometryToLayer(ft, {
							pointToLayer: function(ft, latlng) {
								var style = {fillColor:'tomato', color:'tomato', opacity: 0.8, fillOpacity: 0.6, radius: 8, interactive: false}
								var circle = new L.CircleMarker(latlng, style)//, self.styleOf(ft, ft.geometry.type))
								return circle;
							}

						}).addTo(self.map)
						self.buf[counter] = bf;
						counter++
					} else {
					}
					return ll1.contains(cptll);
				} else {
					var bf = L.geoJSON(ft, {
						style: function (feature) {
							return {color: 'tomato', interactive: false};
						}
					}).addTo(self.map);
					var l1 = bf.getBounds();
					var contains = (l1.contains(latlng));
					if (contains) {
						ll1 = l1
						self.buf[counter] = bf;
						counter++
					} else {
						bf.remove()
					}
					return contains;
				}
			}))
			if (self.geo && self.geo.length > 0) {
				if (ll1._southWest) {
					self.map.fitBounds(ll1);
					var mark = L.latLngBounds(ll1).getCenter();
					self.map.panTo(mark);
					self.lMarker.setLatLng(mark);
				} else {
					self.map.panTo(latlng);
					self.lMarker.setLatLng(latlng);
				}
				self.lMarker.setOpacity(1);

				self.btn.x = (self.wWidth/2);
				self.btn.y = (self.wHeight/2);
				self.viewerList = true;

			} else {
				console.log(ll1, latlng)
				self.viewerList = false;
				self.geo = [];

			}
			if (counter === 0) {
				self.geo = [];
				self.viewerList = false;
			}
			// if (self.geo.length > 0) {
			// 	self.viewerList = true;
			// } else {
			// 	console.log('no geo?')
			// 	self.viewerList = false;
			// }

			if (buf) {
				if (self.buf && self.buf.length){
					self.buf.forEach(function(b){
						if (typeof b.remove === 'function') {
							b.remove();
						}
					})
				} 
				setTimeout(function(){
					self.buf = [];
					buf.remove()
				},3000)
			}
		}
		
	},
	getAttributes: function(feature) {
		var self = this;
		var vals = self.lyr[feature._id]
		$.get('/publishers/esta/json/json_'+feature._id+'.json')
		.then(async function(json){
			if (json.features){
				return Object.keys(json.features[0])
			}
		})
		.catch(function(err){
			console.log(err)
			return []
		})
	},
	highlightFeature: function(go) {
		var self = this;
		if (self.buf && self.buf.length > 0) {
			self.buf.forEach(function(item){
				item.remove()
			})
		}
		if (self.isPointCoords(go.geometry.coordinates)) {
			// go.geometry.coordinates.reverse()
		}
		self.buf.push(!self.isPointCoords(go.geometry.coordinates) ? 
			L.geoJSON(go, {
				style: function (feature) {
					return {color: 'tomato', interactive: false};
				}
			}).addTo(self.map) :
			L.GeoJSON.geometryToLayer(go, {
				pointToLayer: function(ft, latlng) {
					var style = {fillColor:'tomato', color:'tomato', opacity: 0.8, fillOpacity: 0.6, radius: 8, interactive: false}
					var circle = new L.CircleMarker(latlng, style)//, self.styleOf(ft, ft.geometry.type))
					return circle;
				}

			}).addTo(self.map)
		);
	},
	unHighlightFeature: function(go) {
		var self = this;
		if (self.buf && self.buf.length > 0) {
			self.buf.forEach(function(item){
				item.remove()
			})
		}
	},
	filterByTerm: function(term, id) {
		var self = this;
		var searchResults = !self.json[id].features ? 
		[self.json[id]] : 
		self.json[id].features
		.filter(function(ft, j){
			ft._id = id
			var rx = new RegExp(term, 'gi');
			var keys = Object.keys(ft.properties);
			var count = 0;
			keys.forEach(function(key){
				var val = ft.properties[key] + ''
				if (rx.test(val)) {
					count++
				}
			})
			return count > 0;
			// return ft._id === id
		})
		return searchResults
	},
	initSearch: function() {
		var self = this;
		self.searchReady = true;
		self.searchResults = [];
	},
	searchThis: function(e) {
		var self = this;
		var term = e.target.value;
		// console.log(term);
		var jks = self.layers.map(function(lr){if(lr) { return lr._id } else {return}});//Object.keys(self.json);
		if (term !== '' && term !== ' ' && term.length > 1) {
			var r1 = self.filterByTerm(term, jks[0]);
			// console.log(r1)
			jks.forEach(function(jk, i){
				if (i > 0) {
					console.log(self.filterByTerm(term, jk))
					r1.concat(self.filterByTerm(term, jk))
				}
			})

			self.searchResults = r1
				
			
			// $.post('/search/'+encodeURIComponent(term)+'').then(function(response){
			// 	console.log(response)
			// 	if (Array.isArray(response) && response.length > 0) {
			// 		self.searchResults = response
			// 	} else {
			// 		self.searchResults = []
			// 	}
			// })
		}
	},
	setFocus: function(feature, id, e) {
		e.preventDefault();
		var self = this;
		self.activateMap();
		self.geo = [];
		if (self.json[id]) {
			var counter = 0;
			
			var bf = L.geoJSON(feature).addTo(self.map);
			var latlng = bf.getBounds().getCenter()
			bf.remove()
			self.map.fitBounds(bf.getBounds());
			self.lMarker.setLatLng(latlng);
			setTimeout(function(){
				var xy = self.map.latLngToContainerPoint(latlng);
				var x = xy.x;
				var y = xy.y;
				self.dPath = self.dPathAttr()
				self.setBtn(x, y);
				self.geo = [feature]
				self.viewerList = true;
				self.searchResults = [];
				self.searchReady = false;
			}, 1000)
		}
		
	},
	//- arrayEqArray(arr1, arr2)
	setView: function(feature, id, latlng, e){
		var self = this;
		self.geo = []
		if (self.buf && self.buf.length > 0) {
			self.buf.forEach(function(item){
				item.remove()
			})
		}
		self.buf = [];
		self.wWidth = window.innerWidth;
		self.wHeight = window.innerHeight;
		self.cZF = (self.map.getZoom() + self.zfactor);
		if (!latlng) {
			// console.log('no latlng')
			if (self.isPointCoords(feature.geometry.coordinates)) {
				// feature.geometry.coordinates.reverse();
				// console.log(feature.geometry.coordinates)
			} else {
				// console.log(feature)
			}
			var bf = L.geoJSON(feature).addTo(self.map);
			latlng = bf.getBounds().getCenter()
			// console.log(latlng)
			bf.remove()
		}
		var cp = self.map.latLngToContainerPoint(latlng);
		var x1 = cp.x-30;
		var y1 = cp.y-30;
		var x2 = cp.x+30;
		var y2 = cp.y+30;
		var northWest = self.map.containerPointToLatLng(L.point(x1,y1));//L.latLng(y1,x1);
		var southEast = self.map.containerPointToLatLng(L.point(x2,y2));//L.latLng(y2,x2);
		var bounds = L.latLngBounds(northWest, southEast)//[[x1,y1],[x2,y2]];
		var buf = L.rectangle(bounds, {fill: 'rgba(255,255,255,0.5)', color: 'rgba(255,255,255,0.5)', interactive: false }).addTo(self.map)//L.featureGroup([L.circle(p1), L.circle(p2)]).addTo(self.map);
		var ll2 = (!latlng ? bounds.getCenter() : latlng);
		var keys;
		var vals;
		if (!self.dataLayer._layers && self.lyr[id]) {
			vals = self.lyr[id];
		} else {
			console.log('clicking dataLayer')
			vals = self.dataLayer;
		}
		
		self.filterViewerList(bounds, ll2, feature, id/*, keys*/, vals, buf)
		
		
	},
	getFeatureColor: function(id, gpp) {
		var self = this;
		var thisLayer = self.doc.properties.layers.filter(function(lyr){
			return lyr && lyr.lid === id
		})[0]
		var ind = thisLayer.set.filter(function(it, i){ 
			var lr = thisLayer.set[i + 1]
			if (!lr) {
				if (gpp >= thisLayer.set[thisLayer.set.length-2] && gpp <= it) {
					return true;
				} else if (gpp >= it) {
					return true;
				} else {
					return false;
				}
			} else {
				return gpp >= it && gpp <= lr;
			}
			
		})[0];
		var i = thisLayer.set.indexOf(ind);
		var color = thisLayer.colors[i];
		if (color) {
			return color;
		} else {
			return thisLayer.colors[0]
		}
	},
	getStyle: function(p, go) {
		var self = this;
		var l = self.doc.properties.layers.filter(function(lyr) { return lyr && lyr.lid === go._id})[0];
		return l;
	},
	getAttributeColor: function(p, go) {
		var self = this;
		var rgbaColor = 
		(
			self.getStyle.key === p 
				? 
					(
						'rgba('+ 
							self.convertToRGB(self.getFeatureColor(go._id, go.properties[p]))[0] +','+ 
							self.convertToRGB(self.getFeatureColor(go._id, go.properties[p]))[1] +','+ 
							self.convertToRGB(self.getFeatureColor(go._id, go.properties[p]))[2] +',0.2)' 
					)
				: 'rgba(255,255,255,0)'
			)
		console.log(rgbaColor)
		return rgbaColor;
	},
	determineLegend: function(item, style, ind, cb) {
		var self = this;
		var buckets = style.buckets;
		var colors = style.colors;
		// get object keys corresponding with Number values
		var numberKeys = Object.keys(item.features[0].properties).filter(function(it){
			
			return self.exclude.indexOf(it) === -1 && +(item.features[0].properties[it]) === item.features[0].properties[it] 
		})
		// if no number values, get boolean-type values
		var booleanKeys = Object.keys(item.features[0].properties).filter(function(it){
			return self.exclude.indexOf(it) === -1 && /(yes|no|true|false)/i.test(item.features[0].properties[it])
		})
		// if no number or boolean keys, categorical
		// if (theseKeys.length === 0) {
		// 	theseKeys = ['source']
		// 	style.key = 'source';
		// }
		var categoricalKeys = Object.keys(item.features[0].properties).filter(function(it){
			return self.exclude.indexOf(it) === -1 && isNaN(+(item.features[0].properties[it])) && !/(yes|no|true|false)/i.test(item.features[0].properties[it])
		})
		var theseKeys = numberKeys.concat(booleanKeys, categoricalKeys);
		// get new key
		style.key = (!style.key || style.key === "" ? theseKeys[theseKeys.length-1] : style.key);
		var thisKey = style.key;
		console.log(thisKey)
		// instantiate count of non-integer values
		var count = 0;
		var distinct = []
		var vals = item.features.map(function(feature){
			if (typeof feature.properties[thisKey] === 'string' && !feature.properties[thisKey].length) {
				
			} else
			if (isNaN(+(feature.properties[thisKey])) ) {
				// register non-integer value
				// console.log(feature.properties[thisKey])
				var val = feature.properties[thisKey]
				// if distinct array doesn't already contain this number
				if (distinct.indexOf(val) === -1) {
					// push it
					distinct.push(val);
				}
				count++
			}
			// if feature's value at 'thisKey' is a number
			if (!isNaN(parseFloat(feature.properties[thisKey]))) {
				var val = parseFloat(feature.properties[thisKey])
				// if distinct array doesn't already contain this number
				if (distinct.indexOf(val) === -1) {
					// push it
					distinct.push(val);
				}
				return val;
			} else {
				// if feature's value at 'thisKey' is boolean-ish, change to 1 (true) or 0 (false)
				var val = /(yes|true)/i.test(feature.properties[thisKey]) ? 1 : 0;
				if (distinct.indexOf(val) === -1) {
					distinct.push(val);
				}

				return val;
			}
		})
		
		distinct.sort(function(a, b){
			return a - b;
		});
		console.log(distinct)
		var min = distinct[0];
		var max = distinct[distinct.length-1];
		var range = max - min;
		style.min = min;
		style.max = max;
		// console.log(feature.properties[thisKey])
		if (count === 0) {
			style.inc = null;
			var set = [];
			if (distinct.length > buckets) {
				var ic = parseInt((distinct.length / buckets), 10);
				for (var i = 0; i < buckets; i++) {
					set.push(distinct[ic*i]);
				}
			} else {
				set = distinct;
			}
			style.set = set;
		} else {
			console.log(item.features[0].properties[thisKey])
			style.set = distinct.filter(item=>isNaN(+(item)));
			var inc = 1;
			style.inc = inc;
			style.buckets = style.set.length;
		}
		if (style.set) {
			for (var i = colors.length; i < style.set.length; i++) {
				style.colors.push(self.c[i]) 
			}
		}
		style.isInt = count === 0;
		if (style) {
			self.doc.properties.layers[ind] = style;
			self.doc.properties.keys = theseKeys;
		}
		cb(item, style)
	},
	initDragLayer: function(i, e) {
		var self = this;
		setTimeout(function(){
			if (!self.mapCtrl) {
				self.dragging.isDragging = true;
				self.dragging.y = e.screenY;
				setTimeout(function(){
					if (!self.dragging.isDragging) {
						e.preventDefault()
						self.dragging.isDragging = false;
					} else {
						
					}
				},1000)
			}	
		}, 500);
		
	},
	dragLayer: function(i, e) {
		var self = this;
		if (self.dragging.isDragging) {
			self.dragging.y = e.clientY;
			e.target.style.cursor = 'grabbing'
			e.target.style.position = 'fixed';
			e.target.style.height = '65px';
			e.target.style.height = 'var(--thumbw)';
			e.target.style.top = self.dragging.y - 22 + 'px'
			self.dragging.isDragging = true;
		} else {
			e.target.style.cursor = null;
		}
	},
	endDragLayer: function(i, e) {
		var self = this;
		if (self.dragging.isDragging) {
			self.dragging.isDragging = false;
			e.target.style.position = 'relative';
			e.target.style.top = 'unset'
			var layerEls = document.getElementsByClassName('layer');
			// console.log(layerEls[i]);
			var prevSibling = layerEls[i - 1];
			var nextSibling = layerEls[i + 1];
			if (prevSibling && typeof prevSibling.getBoundingClientRect === 'function' && self.dragging.y < prevSibling.getBoundingClientRect().bottom) {
				// console.log('move up')
				var dtemp = self.doc.properties.layers[i-1];
				var tmp = self.layers[i-1];
				var dlayer = self.doc.properties.layers[i];
				var layer = self.layers[i];
				self.layers[i-1] = layer;
				self.doc.properties.layers[i-1] = dlayer;
				self.layers[i] = tmp;
				self.lyr[self.layers[i-1]._id].bringToFront();
				self.doc.properties.layers[i] = dtemp;
			} else if (nextSibling && typeof nextSibling.getBoundingClientRect === 'function' && self.dragging.y > nextSibling.getBoundingClientRect().top) {
				// console.log('move down')
				var dtemp = self.doc.properties.layers[i+1];
				var tmp = self.layers[i+1];
				var dlayer = self.doc.properties.layers[i];
				var layer = self.layers[i];
				self.layers[i+1] = layer;
				self.doc.properties.layers[i+1] = dlayer;
				self.layers[i] = tmp;
				self.doc.properties.layers[i] = dtemp;
				self.lyr[self.layers[i+1]._id].bringToBack();
			}

		} else {
			return self.dragging.isDragging = false;
		}

	},
	loadLayer: function(item, id) {
		var self = this;
		var ljson;
		if (self.lyr[id] && typeof self.lyr[id].clearLayers === 'function') {
			self.lyr[id].clearLayers();
		}
		var ind = null;
		var style = (!id ? {buckets:1,colors:['#fff']} : self.doc.properties.layers
		.map(function(itm, i){
			if (itm && itm.lid === id) {
				ind = i;
			}
			return itm;
		}).filter(function(itm){
			if (itm) {
				return itm.lid === id
			} else {
				return false;
			}
		})[0]);
		// console.log(style)
		if (item.features && item.features[0]) {

			self.determineLegend(item, style, ind, function(it, styl){
				// self.layers[ind] = it;
				ljson = L.geoJson().addTo(self.map);

				var isPointCoords = (!it.features ? self.isPointCoords(it.geometry.coordinates) : self.isPointCoords(it.features[0].geometry.coordinates))
				if (isPointCoords) {

					var ojson = L.geoJson(it, {
						
						onEachFeature:function(feature,layer){
							var th = (!styl.th ? (!styl.set || styl.set.length === 1 ? 1 : styl.set[1]) : +styl.th);
							var ih = feature.properties[styl.key] && +feature.properties[styl.key] > th;
							var thisLayer = L.GeoJSON.geometryToLayer(feature, {
								pointToLayer: function(ft, latlng) {
									var thisVal = ft.properties[styl.key];
									var cl = styl.colors.filter(function(color,i){
										var mi = styl.set[i];
										var ma = (!styl.colors[i+1] ? styl.max : styl.set[i+1]);
										return (thisVal >= mi && thisVal <= ma)
									})[0]
									var style = {fillColor:cl, color:cl, opacity: 0.8, fillOpacity: 0.6, radius: 8, riseOnHover: true, pane: (ih ? 'markerPane' : 'overlayPane')}
									var circle = new L.CircleMarker(latlng, style)//, self.styleOf(ft, ft.geometry.type))
										.on('click', function(){
											self.setView(ft, id, latlng)
										});
									if (thisVal > th) ih = true;
									return circle;
								}

							});
							if (ih) {
								thisLayer.bringToFront();
							} else {
								thisLayer.bringToBack();
							}
							ljson.addLayer(thisLayer);
						}
					})
				} else {

					var ojson = L.geoJson(it, {
						
						onEachFeature:function(feature,layer){
							var thisLayer = L.GeoJSON.geometryToLayer(feature);
							thisLayer.setStyle({fillColor:'#fff',color:'#fff', weight:1, opacity: 0.3, fillOpacity: 0.2});
							var color = styl.colors.filter(function(c, i){
								var mi = styl.set[i];
								var ma = (!styl.colors[i+1] ? styl.max : styl.set[i+1]);
								var thisVal = parseFloat(
									feature.properties[styl.key]
								)
								return (thisVal >= mi && thisVal <= ma)
							})[0]
							thisLayer.setStyle({fillColor:color, color:color, opacity: 0.8, fillOpacity: 0.5})
							thisLayer.on('click', function(e){
								self.setView(feature, id, e.latlng)
							})
							ljson.addLayer(thisLayer)
						}
					})
				}

			})
				
			
		} 
		else {
			var isPointCoords = (!item.features || !item.features[0] ? self.isPointCoords(item.geometry.coordinates) : self.isPointCoords(item.features[0].geometry.coordinates))
			if (isPointCoords) {
				ljson = L.GeoJSON.geometryToLayer(item, {
					style: function(feature) {
						return self.styleOf(feature, feature.geometry.type)
					},
					pointToLayer: function(feature, latlng) {
						var circle = new L.CircleMarker(latlng, self.styleOf(feature, feature.geometry.type))
							.on('click', function(){
								return self.setView(feature, id, latlng)
							});
						return circle;
					}
				})
		
			} else {
				//- console.log('wtaff?')
				ljson = L.GeoJSON.geometryToLayer(item)
			}
		
		}
		return ljson;
		
	},
	numberColorBucket: function(lid, e) {
		var self = this;
		if (self.colorTimeout) clearTimeout(self.colorTimeout);
		self.colorTimeout = setTimeout(async function(){
			var length = parseInt(e.target.value,10);
			var item = self.json[lid];
			if (item) {
				var itemi = null;
				var style = await self.doc.properties.layers.filter(function(it, i){
					if (it && it.lid === lid) {
						itemi = i;
						return true;
					} else {
						return false;
					}
				})[0];
				if (style.buckets < length) {
					var diff = length - style.buckets;
					for (var i = 0; i < diff; i++) {
						style.colors.push(self.c[length+i])
					}
				} else {
					var diff = style.buckets - length;
					style.colors.splice(length, diff)
				}
				style.buckets = length;
				self.doc.properties.layers[itemi] = style;
				self.determineLegend(item, style, itemi, function(it, styl){
					self.lyr[lid] = self.loadLayer(it, lid)
				})

			}
			
			
		},500)
		
	},
	changeColorBucket: function(i, index, e) {
		var self = this;
		if (self.colorTimeout) clearTimeout(self.colorTimeout);
		self.colorTimeout = setTimeout(function(){
			var style = self.doc.properties.layers[i];
			style.colors[index] = e.target.value;
				if (self.json[self.doc.properties.layers[i].lid]) {
					var item = self.json[self.doc.properties.layers[i].lid];
					self.determineLegend(item, style, i, function(it, styl){
						self.doc.properties.layers[i] = styl;
						self.lyr[self.doc.properties.layers[i].lid] = self.loadLayer(self.json[self.doc.properties.layers[i].lid], self.doc.properties.layers[i].lid)
					})
				}
		},500)
		
		
	},
	adjustCoord: function(coords) {
		var self = this;
		if (coords.length === 3 && coords[2] === 0) {
			//- console.log(coords)
			coords.pop()
		} else if (coords.length === 3 && coords[0] === 0) {
			coords.shift()
		}
		return coords;
	},
	adjustedGeometryCoord: function(feature) {
		var self = this;
		if (!feature.features) {
			var coord = feature.geometry.coordinates;
			feature.geometry.coordinates = self.adjustCoord(coord)
		} else {
			feature.features.forEach(function(item) {
				var coords = item.geometry.coordinates;
				item.geometry.coordinates = self.adjustCoord(coords)
			})
		}
		return feature
	},
	serverJson: function(isDataLayer, key, cb) {
		// console.log(isDataLayer)
		var self = this;
		var latlng;
		var customIcon = L.icon({
			iconUrl: '/images/buttonmarker.svg',
			iconSize: [33, 33]
		});
		if (isDataLayer) {
			self.dataLayer = self.loadLayer(self.doc);
			self.map.addLayer(self.dataLayer);
			// if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') {
			// 	self.dataLayer.bringToBack();
			// 	self.tileLayer.bringToBack();
			// }
			if (!latlng) {
				latlng = self.dataLayer.getBounds().getCenter();
				// currently modifying Leaflet source code directly to enable the custom icon to be captured in leaflet-image captures
				// custom icon was otherwise crashing leaflet-image during map image captures .
				self.lMarker = L.marker(latlng, {/*icon:customIcon, */draggable: true, opacity: 0}).addTo(self.map);
				self.map.panTo(latlng)

			}
			cb(latlng)
		} else {
			$.get('/publishers/esta/json/json_'+key+'.json?v='+Math.random()).then(async function(results){
				if (results) {
					var result = results;//self.adjustedGeometryCoord(results);
					// if (!result || result.features[0]) console.log(key)
					var coords = (!result.features ? result.geometry.coordinates : result.features[0].geometry.coordinates)
					//- var adj = (!result.features ? result.geometry.coordinates : result.features[0].geometry.coordinates);
					//- var needsAdj = adj.length === 3;
					//- if (needsAdj) adj.shift()
					//- var pointCoordsAdjusted = (!result.features ? (result.geometry.coordinates.length === 3 ? adj : result.geometry.coordinates) : (result.features[0].geometry.coordinates.length === 3 ? adj : result.features[0].geometry.coordinates))
					var isPointCoords = self.isPointCoords(coords)
					if (isDataLayer) {
						self.dataLayer = await self.loadLayer(result);
						self.map.addLayer(self.dataLayer);
						

					} else {
						self.json[key] = result;
						self.json[key]._id = key
						self.lyr[key] = self.loadLayer(result, key);
						if (self.lyr[key].options) self.lyr[key].options.interactive = false;

						if (isPointCoords) {
							// console.log('isPointCoords');
							// self.lyr[key].bringToFront()
							// if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') {
							// 	self.dataLayer.bringToBack();
							// 	self.tileLayer.bringToBack();
							// 
							// } 
						} else {
							// console.log('isPolyCoords');
							// self.lyr[key].bringToBack()
							// if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') {
							// 	self.dataLayer.bringToBack();
							// 	self.tileLayer.bringToBack();
							// 
							// } 
						}
						if (!latlng) {
							latlng = self.lyr[key].getBounds().getCenter();
							self.lMarker = L.marker(latlng, {/*icon:customIcon, */draggable: true, opacity: 0}).addTo(self.map);
							if (isPointCoords) {
								var bounds = self.lyr[key].getBounds();
								self.map.fitBounds(bounds);
								// self.lyr[key].bringToFront()
								// setTimeout(()=>,500)
								
							}
							//  else {
							// 	self.lyr[key].bringToBack()
							// }
						}

					}
					

					cb(latlng)
				} else {
					console.log('no result')
					cb(null)
				}
			})
			.catch(function(err){
				//- if (isDataLayer) {
				console.log('there was an error')
				console.log(err)
					
				cb(null)
			})

		}
	}
	 /*Leaflet requires reversed geo-coordinate (lat, lng)*/,
	loadMap: async function(cb) {
		var self = this;
		var dataLayer;
		var dataCoords;
		var map = new L.map('map', { 
			center: [
				(!self.latlng ? 40.7608 : self.latlng.lng),
				(!self.latlng ? -111.8910 : self.latlng.lat)
			], 
			zoom: (!self.position ? 6 : self.position.zoom),
			zoomControl: false,
			minZoom: 0,
			maxZoom: 25,
			editable: true,
			renderer: L.canvas(),
			preferCanvas: true,
			editOptions: {
				skipMiddleMarkers: true
			}
		});
		L.control.zoom({
			position:'topleft'
		}).addTo(map);
		
		var credit = (!self.credit || self.credit === '' ? self.getCredit() : self.credit) + self.baseMaps[self.base].attribution
		self.map = map;
		self.tileLayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: map.getBounds().pad(1000), attribution: credit}).addTo(self.map);

		var myRenderer = L.canvas({ padding: 0.5 });
		if (self.doc && self.doc !== '') {
			// generate geographic points from data
			var key = self.doc._id;
			self.serverJson(true, key, async function(latlng){
				if (self.doc.properties && self.doc.properties.title.str !== 'Geography') {
					var keys = await self.doc.properties.layers.map(async function(item){return item.lid})
					if (self.layers && self.layers.length > 0) {
						if (self.dataLayer.options) {
							self.dataLayer.options.interactive = false;
						}
						self.mapEdit = false;
						try {
							await self.layers.forEach(function(item){
								if (item) {
									var k = item._id;
									self.serverJson(false, k, function(latlng){
										if (latlng && Object.keys(self.json).length >= self.layers.length) {
											self.mapReady = true;
										}
									})
								}
							});
						} catch(err) {
							console.log(err)
						}
					}
					if (self.availablelayers && self.availablelayers.length > 0) {
						await self.availablelayers.forEach(function(item, i){
							var key = item._id;
							$.get('/publishers/esta/json/json_'+key+'.json?v=1').then(function(result){
								if (result) {
									self.json[key] = result;
									self.json[key]._id = key;
									self.lyr[key] = self.loadLayer(item, key)
									if (self.lyr[key].options) self.lyr[key].options.interactive = false;
									self.lyr[key].remove()
									if (!latlng) {
										latlng = self.lyr[key].getBounds().getCenter();
									}
								}
							})
							.catch(function(err){
								self.json[key] = item;
								self.json[key]._id = key;
								self.lyr[key] = self.loadLayer(item, key);
								if (self.lyr[key].options) self.lyr[key].options.interactive = false;
								self.lyr[key].remove()
								if (!latlng) {
									latlng = self.lyr[key].getBounds().getCenter();
								}
							})
						})
					}
					if (latlng) {
						cb(latlng)
					} else {
						console.log('no latlng?')
					}
				} else {
					if (latlng) {
						cb(latlng)
					} else {
						console.log('no latlng?')
					}
				}
			})
		} else {
			cb(null)
		}

	},
	switchMapCtrl: function(e) {
		e.preventDefault()
		var self = this;
		var mapCtrl = self.mapCtrl;
		if (!mapCtrl) {
			self.mapCtrl = true;
		} else {
			self.mapCtrl = false;
		}
		// self.mapCtrl = !mapCtrl;
		//- if (self.mapCtrl) {
		//- 
		//- }
	},
	getCredit: function() {
		var self = this;
		var credit = null;
		if (self.layers && self.layers.length > 0) {
			var credits = self.layers.map(function(layer){ return (!layer || !layer.properties.credit ? '' : layer.properties.credit)}).join(' | ');
			credit = (!self.doc || !self.doc.properties.credit ? '' : self.doc.properties.credit);
			credit += credits;
		} else {
			credit = (!self.doc || !self.doc.properties.credit ? '' : self.doc.properties.credit);
		}
		return credit
	},
	geoNull: function(){
		this.geo = []
	},
	changeBase: function(i, e) {
		var self = this;
		if (e.target.checked) {
			self.base = i
			var credit = (!self.credit || self.credit === '' ? self.getCredit() : self.credit) + self.baseMaps[self.base].attribution;
			self.tileLayer.remove();
			self.tileLayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: self.map.getBounds().pad(1000), attribution: credit}).addTo(self.map);
		}

	},
	layerAdd: function(id) {
		var self = this;
		if (self.json[id]) {
			self.lyr[id] = self.loadLayer(self.json[id], id);
		}
		if (self.lyr[id] && self.lyr[id].options) self.lyr[id].options.interactive = true;
		//- self.map.addLayer(self.lyr[id]);
	},
	setBtn: function(x, y) {
		var self = this;
		self.btn.x = x;
		self.btn.y = y;

	},
	addLayer: function(id, e) {
		console.log(id)
		var self = this;
		var tlrs = self.doc.properties.layers.filter(function(item){
			return item.lid === id
		})[0];
		var style;
		if (!tlrs) { 
			style = {
				lid: id,
				buckets: 1,
				colors: [self.c[0]],
				key: ''
			};
		} else { 
			style = tlrs;
		}
		var ind = null;
		var thisAvailableLayer = self.availablelayers.filter(function(item, i){
			if (item && item._id === id) {
				ind = i;
			} 
			return item && item._id === id
		})[0];
		var thisLayer = self.layers.filter(function(item, i){
			return item && item._id === id
		})[0];
		// console.log(thisLayer, thisAvailableLayer)
		if (!thisLayer && thisAvailableLayer) {
			if (ind !== null && self.json[id]) {
				self.availablelayers.splice(ind, 1);
				console.log(style)
				if (style) self.doc.properties.layers.push(style);
				var styles = 
				self.doc.properties.layers.filter(function(k){return k !== null && k !== undefined});
				self.doc.properties.layers = styles;
				self.layers.push(thisAvailableLayer);
				var layers = self.layers.filter(function(k){return  k !== null && k !== undefined});
				self.layers = layers;
				self.layerAdd(id)
			}
		}
	},
	removeLayer: async function(id, e) {
		var self = this;
		var keys = self.doc.properties.layers.map(function(item){if (item) {return item.lid}else{return}}).filter(function(item){return item !== null && item !== undefined})
		var ind = null;
		var thisLayer = self.layers.filter(function(item, i){
			if (item && item._id === id) {
				ind = i;
			} 
			return item && item._id === id
		})[0];
		console.log(thisLayer)
		var thisAvailableLayer = self.availablelayers.filter(function(item, i){
			return item && item._id === id;
		})[0]
		console.log(thisAvailableLayer)
		if (thisLayer && !thisAvailableLayer) {
			if (ind > -1) {
				self.layers.splice(ind, 1);
				self.doc.properties.layers.splice(self.doc.properties.layers.indexOf(null),1)
				self.doc.properties.layers.splice(keys.indexOf(id), 1);
			}
			self.availablelayers.push(thisLayer);
		} else if (thisAvailableLayer) {
			if (ind > -1) {
				self.layers.splice(ind, 1);
				self.doc.properties.layers.splice(self.doc.properties.layers.indexOf(null),1)
				self.doc.properties.layers.splice(keys.indexOf(id), 1);
			}
		}
		if (self.doc.properties.layers && self.doc.properties.layers.length === 0 && typeof self.dataLayer.getBounds === 'function') {
			var bounds = self.dataLayer.getBounds();
			self.map.fitBounds(bounds)
		}
		self.lyr[id].remove()
	},
	changeLayers: function(id, e) {
		var self = this;
		// console.log('checked')
		// console.log(e.target.checked)
		if (e.target.checked) {
			self.addLayer(id, e)
		} else {
			self.removeLayer(id, e)
		}
	},
	changeAttribute: function(id, e) {
		var self = this;
		var ind = null;
		var key = e.target.value;
		self.doc.properties.layers.forEach(function(item, i){
			console.log(item)
			if (ind) return;
			if (item && item.lid === id) {
				ind = i;
				self.doc.properties.layers[ind].key = key
				self.lyr[self.doc.properties.layers[ind].lid] = self.loadLayer(self.json[self.doc.properties.layers[ind].lid], self.doc.properties.layers[ind].lid)
			} 
		});
	},
	resetMap: function(viewerList) {
		var self = this;
		self.wWidth = window.innerWidth;
		self.wHeight = window.innerHeight;
		var coord = self.lMarker.getLatLng();
		var xy = self.map.latLngToContainerPoint(coord);
		var x = xy.x;
		var y = xy.y;
		self.dPath = self.dPathAttr()
		self.setBtn(x, y);
		if (viewerList) {
			if (self.geo.length > 0) {
				self.viewerList = true;
			}
		} else {
			self.viewerList = false;
		}
		self.searchResults = [];
		self.searchReady = false;
	},
	getClip: function() { 
		var self = this;
		if (self.btn) {// make central clipping svg d value reactive
		var wW = ( !self.wWidth ? window.innerWidth : self.wWidth ), 
		wH = ( !self.wHeight ? window.innerHeight : self.wHeight ), 
		pW = ( !self.pWidth ? ( wW * (self.res?0.5:0.5) ) : self.pWidth ), 
		pH = ( !self.pHeight ? (wH * (self.res?0.5:0.5) ) : self.pHeight ), 
		r = self.btn.r, cRc = (r * 0.5523), cRr = 0.81, 
		sY = (isNaN(self.btn.y)?(wH*(self.res?0.5:0.5)):self.btn.y);
		var lx = self.btn.x;
		var ly = self.btn.y;

		var circle = 
		`M${lx + r},${sY}c0-${cRc}-${(cRc * cRr)}-${r}-${r}-${r}
			c-${cRc},0-${r},${(cRc * cRr)}-${r},${r} 
		c0,${cRc},${(cRc * cRr)},${r},${r},${r}
			C${lx + cRc},${(sY+r)},${lx+r},${(sY + cRc)},
			${(lx + r)},${sY}z`
		
		var str = 
		`M${wW},${wH}H0V0h${wW}V${wH}z ${circle}`
		return str; }
	}

}
