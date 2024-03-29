var vuefunctions = {
	mapFunctions: {
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
			console.log('it\'s working :D')
			var self = this;
			var thickness = (!thickness ? 50 : thickness);
			var nw = (!self.wWidth ? window.innerWidth : self.wWidth);
			var nh = (!self.wHeight ? window.innerHeight : self.wHeight);
			var d;
			if (self.type === 'draw') {
				d = "M0,0v"+nh+"h"+nw+"V0H0L0,0z"
			} else {
				d = "M0,0v"+nh+"h"+nw+"V0H0L0,0z "+
				"M"+(thickness)+","+(thickness)+"H"+(nw - thickness)+"V"+(nh - thickness)+"H"+(thickness)+"V"+(thickness)+"z "
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
				console.log(res)
			})
		},
		styleOf: function(feature, type) {
			var self = this;
			var keys = self.doc.properties.layers.map(function(item){return item.lid})
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
		filterViewerList: async function(ll1, ll2, feature, id, keys, vals, buf) {
			var self = this;
			//- console.log(ll1, ll2, feature, keys, vals, buf)
			var latlng = ll2;
			//- console.log(self.json[id], id, feature)
			if (self.json[id]) {
				var counter = 0;
				//- console.log(self.json[id].features, self.json[id])
				//- self.json[id]._id = id
				self.geo = (!self.json[id].features ? [self.json[id]] : await self.json[id].features
				.filter(function(ft, j){
					//- console.log(self.isPointCoords(ft.geometry.coordinates))
					ft._id = id
					if (self.isPointCoords(ft.geometry.coordinates)) {
						var bff = L.geoJSON(ft).addTo(self.map);
						latlng = bff.getBounds().getCenter();
						bff.remove()
						//- var rx = ft.geometry.coordinates.reverse();
						//- var center = L.latLng(rx[0], rx[1]) 
						//- latlng = center;
						//- console.log(ll1.contains(latlng), ll1)
						if (ll1.contains(latlng)) {
							ft.geometry.coordinates.reverse()
							var bf = L.GeoJSON.geometryToLayer(ft, {
								pointToLayer: function(ft, latlng) {
									var style = {fillColor:'tomato', color:'tomato', opacity: 0.8, fillOpacity: 0.6, radius: 8, interactive: false}
									var circle = new L.CircleMarker(latlng, style)//, self.styleOf(ft, ft.geometry.type))
									return circle;
								}

							}).addTo(self.map)
							self.buf[counter] = bf;
							counter++
						}
						//- console.log(ll1, rx, ll1.contains(center), center)
						return ll1.contains(latlng);
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
				//- console.log(self.geo)
				if (self.geo && self.geo.length > 0) {
					//- console.log(self.geo)
					if (ll1._southWest) {
						self.map.fitBounds(ll1);
						var mark = L.latLngBounds(ll1).getCenter();
						self.map.panTo(mark);
						self.lMarker.setLatLng(mark);
					} else {
						self.map.panTo(latlng);
						self.lMarker.setLatLng(latlng);
					}
					//- 
					self.lMarker.setOpacity(1);

					self.btn.x = (self.wWidth/2);
					self.btn.y = (self.wHeight/2);

					if (self.geo.length > 0) {
						self.viewerList = true;
					} else {
						self.viewerList = false;
					}
				} else {
					console.log('wtaf')

				}
				if (buf) {
					setTimeout(function(){
						buf.remove()
					},5000)
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
				go.geometry.coordinates.reverse()
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
		//- arrayEqArray(arr1, arr2)
		setView: function(feature, id, latlng, e){
			var self = this;
			self.geo = []
			if (self.buf && self.buf.length > 0) {
				self.buf.forEach(function(item){
					item.remove()
				})
			}
			self.wWidth = window.innerWidth;
			self.wHeight = window.innerHeight;
			self.cZF = (self.map.getZoom() + self.zfactor);
			if (!latlng) {
				var bf = L.geoJSON(feature).addTo(self.map);
				latlng = bf.getBounds().getCenter();
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
				if (!self.lyr[id]._layers) {
					keys = Array.from(Array(self.lyr[id]._latlngs.length).keys())
				} else {
					keys = Object.keys(self.lyr[id]._layers)
				}
				vals = self.lyr[id];
			} else {
				vals = self.dataLayer;
				keys = (!vals || !vals._layers ? Array.from(Array(self.dataLayer._latlngs.length).keys()) : Object.keys(vals._layers));
			}
			//- console.log(bounds, ll2, feature, id, keys, vals, buf)
			self.filterViewerList(bounds, ll2, feature, id, keys, vals, buf)
			
			
		},
		determineLegend: function(item, style, ind, cb) {
			var self = this;
			var colors = style.colors;
			var theseKeys = Object.keys(item.features[0].properties).filter(function(it){return !isNaN(parseInt(item.features[0].properties[it], 10))})
			var thisKey = (!style.key || style.key === "" ? theseKeys[theseKeys.length-1] : style.key);
			var count = 0;
			var distinct = [];
			var vals = item.features.map(function(feature){
				if (feature.properties[thisKey] !== parseInt(feature.properties[thisKey], 10) || isNaN(parseInt(feature.properties[thisKey]))) {
					// register non-integer value
					count++
				}
				if (!isNaN(parseInt(feature.properties[thisKey],10))) {
					if (distinct.indexOf(parseInt(feature.properties[thisKey], 10)) === -1) {
						distinct.push(parseInt(feature.properties[thisKey], 10));
					}
					return parseInt(feature.properties[thisKey], 10)
				} else {
					return 0;
				}
			});
			distinct.sort(function(a, b){
				return a - b;
			});
			var min = distinct[0];
			var max = distinct[distinct.length-1];
			var range = max - min;
			style.min = min;
			style.max = max;
			if (count === 0) {
				style.inc = null;
				var set = [];
				if (distinct.length > 4) {
					var ic = parseInt((distinct.length / 4), 10);
					var l0 = distinct[0];
					var l1 = distinct[ic];
					var l2 = distinct[(ic*2)];
					var l3 = distinct[(ic*3)];
					var h3 = distinct[distinct.length - 1];
					set.push(l0,l1,l2,l3);
				} else {
					set = distinct;
				}
				style.set = set;
				for (var i = colors.length; i < style.set.length; i++) {
					style.colors.push(self.c[i]) 
				}
			} else {
				var inc = range / colors.length;
				style.inc = inc;
				var set = [];
				for (var i = 0; i < colors.length; i++) {
					set.push((min + (inc * i)))
				}
				style.set = set;
			}
			style.isInt = count === 0;
			self.doc.properties.layers[ind] = style;
			cb(style)
		},
		loadLayer: function(item, id) {
			var self = this;
			var ljson;
			if (self.lyr[id] && typeof self.lyr[id].clearLayers === 'function') {
				self.lyr[id].clearLayers();
			}
			var ind = null;
			var style = (!id ? {buckets:1,colors:['#fff']} : self.doc.properties.layers
			.map(function(item, i){
				if (item.lid === id) {
					ind = i;
				}
				return item;
			}).filter(function(item){
				
				return item.lid === id
			})[0]);
			if (item.features && item.features[0]) {

				self.determineLegend(item, style, ind, function(styl){
					ljson = L.geoJson().addTo(self.map);

					var isPointCoords = (!item.features ? self.isPointCoords(item.geometry.coordinates) : self.isPointCoords(item.features[0].geometry.coordinates))
					if (isPointCoords) {

						var ojson = L.geoJson(item, {
							
							onEachFeature:function(feature,layer){
								var thisLayer = L.GeoJSON.geometryToLayer(feature, {
									pointToLayer: function(ft, latlng) {
										var thisVal = ft.properties[styl.key]
										var cl = styl.colors.filter(function(color,i){
											var mi = styl.set[i];
											var ma = (!styl.colors[i+1] ? styl.max : styl.set[i+1]);
											return (thisVal >= mi && thisVal <= ma)
										})[0]
										var style = {fillColor:cl, color:cl, opacity: 0.8, fillOpacity: 0.6, radius: 8}
										var circle = new L.CircleMarker(latlng, style)//, self.styleOf(ft, ft.geometry.type))
											.on('click', function(){
												return self.setView(ft, id, latlng)
											});
										return circle;
									}

								});
								ljson.addLayer(thisLayer)
							}
						})
					} else {

						var ojson = L.geoJson(item, {
							
							onEachFeature:function(feature,layer){
								var thisLayer = L.GeoJSON.geometryToLayer(feature);
								thisLayer.setStyle({fillColor:'#fff',color:'#fff', weight:1, opacity: 0.3, fillOpacity: 0.2});
								var color = styl.colors.filter(function(c, i){
									var mi = styl.set[i];
									var ma = (!styl.colors[i+1] ? styl.max : styl.set[i+1]);
									var thisVal = parseFloat(
										feature.properties[styl.key]
									)
									return (thisVal >= mi && thisVal < ma)
								})[0]
								thisLayer.setStyle({fillColor:color, color:color, opacity: 0.8, fillOpacity: 0.6})
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
			self.colorTimeout = setTimeout(function(){
				var length = parseInt(e.target.value,10);
				self.doc.properties.layers.forEach(function(item, j){
					if (item.lid === lid) {
						if (self.doc.properties.layers[j].colors.length < length) {
							var diff = length - self.doc.properties.layers[j].colors.length;
							for (var i = 0; i < diff; i++) {
								self.doc.properties.layers[j].colors.push('#000000')
							}
						} else {
							var diff = self.doc.properties.layers[j].colors.length - length;
							self.doc.properties.layers[j].colors.splice(length-1, diff)
						}
						if (self.json[lid]) {
							self.lyr[lid] = self.loadLayer(self.json[lid], lid)
						}
					}
				});
			},500)
			
		},
		changeColorBucket: function(i, index, e) {
			var self = this;
			if (self.colorTimeout) clearTimeout(self.colorTimeout);
			self.colorTimeout = setTimeout(function(){
					self.doc.properties.layers[i].colors[index] = e.target.value;
					if (self.json[self.doc.properties.layers[i].lid]) {
						self.lyr[self.doc.properties.layers[i].lid] = self.loadLayer(self.json[self.doc.properties.layers[i].lid], self.doc.properties.layers[i].lid)
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
			var self = this;
			var latlng;
			var customIcon = L.icon({
				iconUrl: '/images/buttonmarker.svg',
				iconSize: [33, 33]
			});
			if (isDataLayer) {
				self.dataLayer = self.loadLayer(self.doc);
				self.map.addLayer(self.dataLayer);
				if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') self.dataLayer.bringToBack()
				if (!latlng) {
					latlng = self.dataLayer.getBounds().getCenter();
					// currently modifying Leaflet source code directly to enable the custom icon to be captured in leaflet-image captures
					// custom icon was otherwise crashing leaflet-image during map image captures .
					self.lMarker = L.marker(latlng, {/*icon:customIcon, */draggable: true, opacity: 0}).addTo(self.map);
					self.map.panTo(latlng)

				}
				cb(latlng)
			} else {
				$.get('/publishers/esta/json/json_'+key+'.json').then(async function(results){
					if (results) {
						var result = self.adjustedGeometryCoord(results);
						var coords = (!result.features ? result.geometry.coordinates : result.features[0].geometry.coordinates)
						//- var adj = (!result.features ? result.geometry.coordinates : result.features[0].geometry.coordinates);
						//- var needsAdj = adj.length === 3;
						//- if (needsAdj) adj.shift()
						//- var pointCoordsAdjusted = (!result.features ? (result.geometry.coordinates.length === 3 ? adj : result.geometry.coordinates) : (result.features[0].geometry.coordinates.length === 3 ? adj : result.features[0].geometry.coordinates))
						var isPointCoords = self.isPointCoords(coords)
						if (isDataLayer) {
							self.dataLayer = await self.loadLayer(result);
							self.map.addLayer(self.dataLayer);
							if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') self.dataLayer.bringToBack()

						} else {
							self.json[key] = result;
							self.json[key]._id = key
							self.lyr[key] = self.loadLayer(result, key);
							if (self.lyr[key].options) self.lyr[key].options.interactive = false;

							if (isPointCoords) {
								self.lyr[key].bringToFront()
							} else {
								self.lyr[key].bringToBack()
								if (self.dataLayer && typeof self.dataLayer.bringToBack === 'function') self.dataLayer.bringToBack()
							}
							if (!latlng) {
								latlng = self.lyr[key].getBounds().getCenter();
								self.lMarker = L.marker(latlng, {/*icon:customIcon, */draggable: true, opacity: 0}).addTo(self.map);
								if (isPointCoords) {
									var bounds = self.lyr[key].getBounds();
									self.map.fitBounds(bounds);
								}
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
				minZoom: 2,
				maxZoom: 18,
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
			
			//- self.censusLayer = L.tileLayer('https://api.censusreporter.org/1.0/geo/tiger2013/tiles/040/{z}/{x}/{y}.geojson').addTo(map)
			//- self.censusLayer.bringToFront();
			var credit = (!self.credit || self.credit === '' ? self.getCredit() : self.credit) + ' | ' + self.baseMaps[self.base].attribution
			self.tilelayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: map.getBounds().pad(1000), attribution: credit}).addTo(map);
			self.map = map;

			var myRenderer = L.canvas({ padding: 0.5 });
			if (self.doc && self.doc !== '') {
				// generate geographic points from data
				var key = self.doc._id;
				self.serverJson(true, key, async function(latlng){
					console.log(self.lMarker)
					if (self.doc.properties && self.doc.properties.title.str !== 'Geography') {
						var keys = await self.doc.properties.layers.map(async function(item){return item.lid})
						if (self.layers && self.layers.length > 0) {
							if (self.dataLayer.options) {
								self.dataLayer.options.interactive = false;
							}
							self.mapEdit = false;
							await self.layers.forEach(function(item){
								var k = item._id;
								self.serverJson(false, k, function(latlng){
									if (latlng && Object.keys(self.json).length >= self.layers.length) {
										self.mapReady = true;
									}
								})
							});
						}
						if (self.availablelayers && self.availablelayers.length > 0) {
							await self.availablelayers.forEach(function(item, i){
								var key = item._id;
								$.get('/publishers/esta/json/json_'+key+'.json').then(function(result){
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
			self.mapCtrl = !mapCtrl;
			//- if (self.mapCtrl) {
			//- 
			//- }
		},
		getCredit: function() {
			var self = this;
			var credit = null;
			if (self.layers && self.layers.length > 0) {
				var credits = self.layers.map(function(layer){ return (!layer.properties.credit ? '' : layer.properties.credit)}).join(' | ');
				credit = (!self.doc || !self.doc.properties.credit ? '' : self.doc.properties.credit);
				credit += credits;
			} else {
				credit = (!self.doc || !self.doc.properties.credit ? '' : self.doc.properties.credit);
			}
			return credit
		},
		changeBase: function(i, e) {
			var self = this;
			var credit = self.credit + ' | ' + self.baseMaps[self.base].attribution;
			if (e.target.checked) {
				self.base = i
				self.tilelayer.remove();
				self.tilelayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: self.map.getBounds().pad(1000), attribution: credit}).addTo(self.map);
			}

		},
		layerAdd: function(id) {
			var self = this;
			if (self.json[id]) self.lyr[id] = self.loadLayer(self.json[id], id);
			if (self.lyr[id].options) self.lyr[id].options.interactive = true;
			//- self.map.addLayer(self.lyr[id]);
		},
		setBtn: function(x, y) {
			var self = this;
			self.btn.x = x;
			self.btn.y = y;

		},
		addLayer: async function(id, e) {
			console.log('it\'s working :D')
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
			var thisAvailableLayer = await self.availablelayers.filter(function(item, i){
				if (item._id === id) {
					ind = i;
				} 
				return item._id === id
			})[0];
			var thisLayer = await self.layers.filter(function(item, i){
				return item._id === id
			})[0];
			if (!thisLayer && thisAvailableLayer) {
				if (ind !== null && self.json[id]) {
					self.availablelayers.splice(ind, 1);
					self.layers.push(thisAvailableLayer);
					await self.doc.properties.layers.push(style);
					self.layerAdd(id)
				}
			}
		},
		removeLayer: async function(id, e) {
			var self = this;
			var keys = self.doc.properties.layers.map(function(item){return item.lid})
			var ind = null;
			var thisLayer = await self.layers.filter(function(item, i){
				if (item._id === id) {
					ind = i;
				} 
				return item._id === id
			})[0];
			var thisAvailableLayer = self.availablelayers.filter(function(item, i){
				return item._id === id;
			})[0]
			if (thisLayer && !thisAvailableLayer) {
				if (ind > -1) {
					self.layers.splice(ind, 1);
					self.doc.properties.layers.splice(keys.indexOf(id), 1);
				}
				self.availablelayers.push(thisLayer);
			}
			if (self.doc.properties.layers && self.doc.properties.layers.length === 0 && typeof self.dataLayer.getBounds === 'function') {
				var bounds = self.dataLayer.getBounds();
				self.map.fitBounds(bounds)
			}
			self.lyr[id].remove()
		},
		changeLayers: function(id, e) {
			var self = this;
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
			var thisLayer = self.doc.properties.layers.forEach(function(item, i){
				if (ind) return;
				if (item.lid === id) {
					ind = i;
					self.doc.properties.layers[ind].key = key
				} 
			});
		},
	},
	baseFunctions: {
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
}