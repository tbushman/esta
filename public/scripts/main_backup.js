Vue.prototype.moment = moment;
Vue.prototype.marked = marked;
Vue.prototype.SignaturePad = SignaturePad;
Vue.prototype.$ = $;
Vue.prototype.htmldiff = htmldiff;
//- Vue.prototype.d3 = d3;
//- Vue.prototype.xth = xth;
Vue.prototype.L = L;
//- Vue.prototype.CensusReporter = CensusReporter;
if (typeof tinymce === 'object') Vue.prototype.tinymce = tinymce;
new Vue({
	el: '#vue',
	data: function data(){
		return {
			buf: null,
			availablelayers: this.ifNullThenArr(!{JSON.stringify(availablelayers)}),
			c: ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928","#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"],
			//['#39B54A', '#D9E021', '#FBB03B', '#FC644D', '#ED1C24'],
			lvl: 'h',
			btn: { x: (this.wWidth / 2), 
				y: (this.wHeight/ 2),
				r: 42,
				vis: (!this.mapActive || !this.mapEdit ? null : 'block')
			},
			h: 0,
			i: 0,
			j: 0,
			m: 0,
			signable: this.parseBool(!{JSON.stringify(signable)}),
			unsigned: this.parseBool(!{JSON.stringify(unsigned)}),
			avail: this.parseBool(!{JSON.stringify(avail)}),
			type: this.parseObj(!{JSON.stringify(type)}),
			pu: this.parsePu(!{JSON.stringify(pu)}),
			loggedin: (this.parseObj(!{JSON.stringify(session)}) !== '' && this.parseObj(!{JSON.stringify(session.loggedin)}) !== '' ? this.parseObj(!{JSON.stringify(session.loggedin)}) : null ),
			menu: this.parseObj(!{JSON.stringify(menu)}),
			dat: this.parseObj(!{JSON.stringify(dat)}),
			doc: this.parseObj(!{JSON.stringify(doc)}),
			layers: this.parseObj(!{JSON.stringify(layers)}),
			position: (!this.parseObj(!{JSON.stringify(session.position)}) ? {lat: 40, lng: -111.89, zoom: 6}/*null*/ : this.parseObj(!{JSON.stringify(session.position)})),
			edit: (this.parseObj(!{JSON.stringify(doc)}) === '' ? null : this.parseObj(!{JSON.stringify(doc)}).index),
			chindexes: [],
			chindex: 0,
			dindexes: [],
			dindex: (this.parseObj(!{JSON.stringify(doc)}) === '' ? 0 : this.parseObj(!{JSON.stringify(doc)}).index),
			cursor: null,
			input: '',
			fixedPug: '',
			map: '',
			mapActive: false,
			mapEdit: false,
			mapEditable: false,
			dataLayer: '',
			lMarker: '',
			thickness: 45,
			wWidth: window.innerWidth,
			wHeight: window.innerHeight,
			res: (window.innerWidth < 600),
			dPath: this.dPathAttr(),
			tinymce: '',
			dfi: 0,
			diff: null,
			web: true,
			export: this.parseBool(!{JSON.stringify(exports)}),
			ff: this.parseObj(!{JSON.stringify(ff)}),
			newDoc: {tempGeo:[],placetype:'',place:null,tiind:null,xmlid:'',chind:null,chtitle:''},						
			placemenu: false,
			
			placetypes: [{
				ind: 0,
				name: 'Nation',
				url: '/json/usstates.json'
			},
			{
				ind: 1,
				name: 'State',
				url: '/json/usstates.json'
			},
			{
				ind: 2,
				name: 'County',
				url: '/json/uscounties.json'
			}],
			modal: {msg:null},
			uploadisreplace: false,
			uploadchtitle: null,
			dragind: null,
			latlngs: null,
			//- gp: (this.parseObj(#{session.importgdrive}) !== '' ? this.parseObj(!{JSON.stringify(gp)}) : null),
			sliderIndex: 1,
			sliderInterval: '',
			sliderTimeout1: '',
			sliderTimeout2: '',
			str: this.parseObj(!{JSON.stringify(str)}),
			ts: this.ifNullThenArr(!{JSON.stringify(ts)}),
			can: [],
			lyr: {},
			geo: [],
			tis: [
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
			],
			xml: //this.parseXML(
				this.parseObj(!{JSON.stringify(xml)})
			//)
			,
			xmlnode: '',
			accordions: [[]],
			sliderOpacity: 1,
			gpo: null,
			latlng: {lat: 40, lng: -111.8},
			//- lyrs: [],
			base: 0,
			baseMaps: [
				{
					url: 'https://api.mapbox.com/styles/v1/tbushman/ciq7gm0ov008kbfm580v9mm9c/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoidGJ1c2htYW4iLCJhIjoiSmI0aU94OCJ9.SZytljBzoWupPUYeu_OR9A',
					attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
				},
				{
					url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
					attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
				}
				
			],
			zfactor: (0.01 * (!this.map ? 6 : (18 - this.map.getZoom() ) )),
			cZF: null,
			viewerList: false,
			censusVars: null,
			censusLoad: {tempGeo:[],placetype:'',cats:null,cat:null} 
			//- boundary: null,
			//- //https://gist.githubusercontent.com/wboykinm/ae69cce5f5b419c071bf/raw/83fc193556f94c32eacdd64747eee876e1e0f790/cr-leaflet.js
			//- //from censusreporter
			//- boundaries: [
			//- 	{code: '020', name:'region'},
			//- 	{code: '030', name:'division'},
			//- 	{code: '040', name:'state'},
			//- 	{code: '050', name:'county'},
			//- 	{code: '060', name:'county subdivision'},
			//- 	{code: '140', name:'census tract'},
			//- 	{code: '150', name:'block group'},
			//- 	{code: '160', name:'place'},
			//- 	{code: '170', name:'consolidated city'},
			//- 	{code: '230', name:'Alaska native regional corporation'},
			//- 	{code: '250', name:'native area'},
			//- 	{code: '251', name:'tribal subdivision'},
			//- 	{code: '256', name:'tribal tract'},
			//- 	{code: '310', name:'metro area (CBSA)'},
			//- 	{code: '314', name:'metropolitan division'},
			//- 	{code: '330', name:'combined statistical area'},
			//- 	{code: '335', name:'combined NECTA'},
			//- 	{code: '350', name:'NECTA'},
			//- 	{code: '364', name:'NECTA division'},
			//- 	{code: '400', name:'urban area'},
			//- 	{code: '500', name:'congressional district'},
			//- 	{code: '610', name:'state house (upper)'},
			//- 	{code: '620', name:'state house (lower)'},
			//- 	{code: '795', name:'PUMA'},
			//- 	{code: '860', name:'ZIP code'},
			//- 	{code: '950', name:'school district (elementary)'},
			//- 	{code: '960', name:'school district (secondary)'},
			//- 	{code: '970', name:'school district (unified)'}],
				//(!this.map ? (6 * this.zfactor) : (this.map.getZoom() + this.zfactor))
				//(!this.parseObj(!{JSON.stringify(dat)}).length ? [[]] : Array(this.parseObj(!{JSON.stringify(dat)}).length).fill([]))
			
		}
	},
	components: {
		canvasc: {
			data: function() {
				return {
					signaturePad: null,
					ctx: null,
					dataUrl: null,
					pts: null,
					cW: window.innerWidth,
					cH: window.innerHeight,
					pu: this.$parent.pu
				}
			},
			mounted: function(){
				var self = this;
				self.signaturePad = new SignaturePad(self.$refs.canv, {
					onEnd: async function() {
						self.$refs.canv.style['letter-spacing'] = '0px'
						var ctx = self.$refs.canv.getContext('2d');
						ctx.font = '12px serif';
						
						var ts = '/'+self.pu.properties.givenName+'/'+moment().utc().format();
						ctx.beginPath();
						ctx.fillText(ts, 23, 132);
						ctx.closePath();
						self.dataUrl = self.signaturePad.toDataURL()
						self.pts = self.signaturePad.toData();
						self.$emit('update', self.dataUrl, ts, self.$refs.canv);
						
					},
					onBegin: function() {
						// clear timestamp only
						var ctx = self.$refs.canv.getContext('2d');
						ctx.clearRect(23, 123, 277, 32);

					}
				});
			},
			methods: {
				clearCanv(){
					var self = this;
					var ctx = self.$refs.canv.getContext('2d');
					ctx.clearRect(0, 0, 300, 150);
					
				}
			},
			template: 
			`
			<div class="row" style="text-align: center;">
			<canvas
				id="maincanvas"
				ref="canv"
			></canvas>
			<a role="button" @click="clearCanv" title="Clear signature" v-text="'Clear signature'"></a>
			</div>
			`
		}
	},
	watch: {
		accordions: {
			deep: true,
			handler(accordions) {
				var self = this;
				self.accordions = accordions
			}
		}
	},
	
	updated: function(){
		var self = this;
	},
	mounted: function(){
		$(document).ready(function(){
			document.addEventListener('keydown', function(event) {
				var keyName = event.key;
				if (keyName === 'Enter') event.preventDefault()
			});
		})
		var self = this;
		$(document).on('click', '.href', function(e){
			e.stopPropagation();
		});
		//- $('.submenu.drop').slideToggle(100);
		//- $('.slidedown').slideToggle(100);
		$('.submenu.drop').slideUp(100);
		$('.slidedown').slideUp(100);
		var modal = document.getElementById('modal');
		if (self.type === 'geo') {
			var pos = null;
			if (navigator.geolocation) {
				var options = {
					enableHighAccuracy: true,
					timeout: 5000,
					maximumAge: 0
				};
				navigator.geolocation.getCurrentPosition(function(position) {
					pos = {
						lat: position.coords.latitude,
						lng: position.coords.longitude
					};
					//- console.log(pos)
					self.handleLocationOutcome(true, pos);
				}, function() {
					self.handleLocationOutcome(false, pos);
				}, options);
			} else {
				// Browser doesn't support Geolocation
				self.handleLocationOutcome(false, pos);
			}
		
		} else {
			self.dindexes = (!self.dat || self.dat === '' ? [[(!self.doc || self.doc === '' ? 0 : self.doc.index)]]
			:
			self.dat.map(function(data){
				return data.map(function(doc){return doc.index});
			}) );
			self.dindexes.sort();

			if (!self.doc || self.doc === '') {
				if (!self.dat || self.dat === '') {
					self.accordions = [[]];
				} else {
					self.accordions = self.dat.map(function(data){
						return []
					});
					//- 

					
				}
			} else {
				if (!self.dat || self.dat === '') {
					self.accordions = [[self.doc.index]];
				} else {
					//- self.lyrs = 
					
					self.accordions = self.dat.map(function(data){return data.map(function(doc){return doc.index})});
				}
				self.edit = self.doc.index;
				self.dindex = 0;
				//- console.log(self.pu, self.ts.length, !self.unsigned)
				
			}
		}

		if (self.tinymce === ''  && $('#description')[0] && typeof tinymce === 'object') {
			console.log($('#description')[0])
			self.tinymce = tinymce.init({
				menubar: false,
				statusbar: false,
				theme: 'inlite',
				inline: true,
				selector: "#description,#title",
				plugins: 'lists',
				valid_elements: '*[*]',
				setup: function (editor) {
					editor.addButton('footnote', {
						text: 'Add footnote',
						icon: 'link',
						onclick: function(){
							self.doc.properties.footnotes.push(
								''
							);
							editor.insertContent('<a v-if="doc.properties.footnotes && doc.properties.footnotes['+(self.doc.properties.footnotes.length - 1)+']" href="ftnref'+(self.doc.properties.footnotes.length)+'"><span class="super">'+(self.doc.properties.footnotes.length)+'</span></a>')
							//editor.insertContent('<span v-if="doc.properties.footnotes && doc.properties.footnotes['+(self.doc.properties.footnotes.length - 1)+']" class="super">'+(self.doc.properties.footnotes.length)+'</span>')
							$('#footnote'+self.doc.properties.footnotes.length - 1).focus()
						}
					})
				},
				selection_toolbar: 'bold italic underline strikethrough | bullist numlist | outdent indent blockquote | subscript superscript | footnote'
			});
		}
		self.loadMap(async function(dataCoords){
			console.log(dataCoords)
			if (dataCoords){
				self.latlng.lng = dataCoords.lng;
				self.latlng.lat = dataCoords.lat;
				self.panZoom();
			} else {
				self.latlng.lat = 40;
				self.latlng.lng = -111;
				self.panZoom();
			}
			self.map.on('click', function(e){
				self.viewerList = false;
			});
			//- self.map.on('zoomend', function(e){
			//- 	self.viewerList = false;
			//- })
			//- new CensusReporter.SummaryLevelLayer('040').addTo(self.map);
			if ($('#slider')[0] && (!self.sliderInterval || self.sliderInterval === '')) {
				var int = 8000;
				self.sliderImg(int)
			}
			self.censusVars = await $.getJSON('https://api.census.gov/data/2010/dec/sf1/variables.json')
			.then(function(data){
				var variables = data.variables;
				return variables;
			})
			.catch(function(err){
				console.log(err)
			})
		})
	},
	beforeDestroy: function(){
		//TODO clearTimout
		var self = this;
		clearInterval(self.sliderInterval);
		clearTimeout(self.sliderTimeout1);
		clearTimeout(self.sliderTimeout2)
	},
	methods: {
		ifNullThenArr(obj) {
			if (!obj) return [];
			return obj;
		},
		parsePu(obj) {
			if (!obj) {
				return {
					properties: {
						givenName: ''
					}
				}
			}
			return obj;
		},
		getXML(){
			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.addEventListener("load", self.selfOnload, false);
			xhr.open('GET', xml, false);
			xhr.send();

		},
		selfOnload(e) {
			var self = this;
			self.xmlnode = e.target.responseXML;
		},
		parseXML(xml){
			console.log(xml)
			var parser = new DOMParser();
			var parsed = parser.parseFromString(xml, 'text/xml');
			return parsed;
		},
		subDropdown(e) {
			var self = this;
			if (!$(e.target).next('.slidedown')) {
		
				return;
			} else {
				var sub = $(e.target).next('.slidedown')[0];
				console.log(e.target.nextSibling)
				console.log(sub)
				$('.drop').not($(e.target)).removeClass('active');
				$(sub).slideToggle(100);
				$(e.target).toggleClass('active');
			}
		},
		mainDropdown(e) {
			var self = this;
			if ($('.dropdown').hasClass('active')) {
				$('.dropdown').removeClass('active');
			} else {
				$('.dropdown').addClass('active');
			}
			$('.submenu.drop').slideToggle(100);
		},
		getGpo() {
			var self = this;
			$.get(
				'/api/gpo'
			)
			.then(function(data){
				console.log(data)
				self.gpo = JSON.parse(data);
			})
			.catch(function(err){
				console.log(err)
			})
		},
		changeBase(i, e) {
			var self = this;
			if (e.target.checked) {
				self.base = i
				self.tilelayer.remove();
				self.tilelayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: self.map.getBounds().pad(1000), attribution: self.baseMaps[self.base].attribution}).addTo(self.map);
			}

		},
		async addLayer(id, e) {
			var self = this;
			if (self.doc.properties.layers.indexOf(id) === -1) {
				self.doc.properties.layers.push(id);
				var thisAvailableLayer = await self.availablelayers.filter(function(item, i){
					if (item._id === id) {
						ind = i;
					} 
					return item._id === id
				})[0];
				var thisLayer = await self.layers.filter(function(item, i){
					return item._id === id
				})[0];
				if (!thisLayer) {
					self.layers.push(thisAvailableLayer);
				}
				if (ind) {
					self.availablelayers.splice(ind, 1);
				}
				
				if (!self.lyr[id]) {
					self.lyr[id] = self.loadLayer(thisAvailableLayer);
					self.lyr[id].options.interactive = true;
				}
			}
			if (self.lyr[id]) {
				self.map.addLayer(self.lyr[id]);
				var bounds = self.lyr[id].getBounds();
				self.map.fitBounds(bounds);
			}

		},
		removeLayer(id, e) {
			var self = this;
			self.doc.properties.layers.splice(self.doc.properties.layers.indexOf(id), 1);
			var ind = null;
			var thisLayer = self.layers.filter(function(item, i){
				if (item._id === id) {
					ind = i;
				} 
				return item._id === id
			})[0];
			console.log(thisLayer, ind)
			var thisAvailableLayer = self.availablelayers.filter(function(item, i){
				return item._id === id;
			})[0]
			if (ind) {
				self.layers.splice(ind, 1);
			} else {
				console.log('wtaf')
			}
			if (thisLayer && !thisAvailableLayer) {
				self.availablelayers.push(thisLayer);
			//- } else if (!thisLayer && thisAvailableLayer) {
			} else {
				console.log(thisAvailableLayer)
				//- console.log('wtaf')
			}

			if (self.doc.properties.layers && self.doc.properties.layers.length === 0) {
				var bounds = self.dataLayer.getBounds();
				self.map.fitBounds(bounds)
			}
			self.lyr[id].remove()
		},
		changeLayers(id, e) {
			var self = this;
			if (e.target.checked) {
				self.addLayer(id, e)
			} else {
				self.removeLayer(id, e)
			}
		},
		setXmlId(e){
			var self = this;
			var ind = parseInt(e.target.value, 10);
			self.newDoc.xmlid = self.gpo.packages[ind].packageId;
			self.newDoc.chind = (parseInt(self.gpo.packages[ind].congress, 10) - 1);
			self.newDoc.chtitle = self.gpo.packages[ind].title;
			console.log(self.newDoc)
		},
		filterGpo(e) {
			var self = this;
			if (e.target.value === '') {
				return self.getGpo();
			}
			var gpo = self.gpo.packages;
			gpo = gpo.filter(function(g){
				return new RegExp(e.target.value).test(g.title)
			})
			console.log(gpo)
			if (gpo && gpo.length > 0) {
				self.gpo.packages = gpo;
			}
		},
		changeDocType(e) {
			e.preventDefault()
			
			var self = this;
			console.log(e.target.value)
			var ind = parseInt(e.target.value, 10);
			self.newDoc.tiind = ind;
		},
		changePlaceType(e) {
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
				$.getJSON(url).then(async function(json){
					await console.log(json)
					self.newDoc.placetype = type;
					self.newDoc.tempGeo = await json.features;
					if (type === 'Nation' && self.newDoc.tiind === 0) {
						self.newDoc.tempGeo = [self.newDoc.tempGeo[0]];
						self.getGpo();
					}
					console.log(self.newDoc.tempGeo)
				})
				.catch((err)=>console.log(err))
			}
			
		},
		changePlaceNew(e) {
			e.preventDefault()
			var self = this;
			console.log(e.target.value)
			var ind = parseInt(e.target.value, 10);
			console.log(ind)
			self.newDoc.place = (isNaN(ind) || !self.newDoc.tempGeo[ind] ? (!self.newDoc.tempGeo[self.newDoc.tempGeo.length-1] ? null : self.newDoc.tempGeo.length-1) : ind )
		},
		submitZip(e) {
			var self = this;
			$.post('/pu/getgeo/'+null+'/'+null+'/'+self.modal.zip+'')
			.then(function(href){
				window.location.href = href
			})
		},
		handleLocationOutcome(geolocation, pos) {
			var self = this;
			console.log(geolocation)
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
		changeDiff(e) {
			var self = this;
			console.log(e.target.value)
			self.dfi = (!isNaN(parseInt(e.target.value, 10)) ? parseInt(e.target.value, 10) : null);
		},
		navigateTo: function(url){
			window.location.href = url;
		},
		deleteEntry(doc, e) {
			e.preventDefault()
			console.log(doc)
			$.post('/api/deleteentry/'+doc._id+'').then(function(res){
				console.log(res)
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
		accordion(n, ind, e) {
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
		parseBool: function(item) {
			if (!item) return false;
			return true;
		},
		toggleExport: function() {
			this.export = !this.export;
		},
		getHTML: function(type, str) {
			var self = this;
			var span = document.createElement(type);
			span.innerHTML = str;
			return span.outerHTML;
		},

		dPathAttr: function() {
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
		widthRectAttr: function(plus,type){
			var nw = this.getSize(type).nw;
			return nw - ((self.thickness + plus) * 2);
		},
		heightRectAttr: function(plus,type){
			var nh = this.getSize(type).nh;
			return nh - ((self.thickness + plus) * 2);
		},
		panZoom: function(){
			var self = this;
			//console.log(self.map)
			if (self.map && self.latlng) {
				$.post('/panzoom/'+self.latlng.lat+'/'+self.latlng.lng+'/'+self.map.getZoom()+'', function(result){
				})
			}
			
		},
		importCsv: function(e){

			var self = this;
			var file = document.getElementById('importcsv').files[0];//e.target.files[0];
			var reader = new FileReader();
			
			reader.onloadend = function(e) {
				var fd = new FormData();

				fd.append("csv", file);
				
				var uploadurl = '/api/importcsv/'+(!self.doc || self.doc === '' ? self.data[self.dindex]._id : self.doc._id )+'/csv';
				$.ajax({
					url: uploadurl,
					type: 'POST',
					data: fd,
					processData: false,
					contentType: false,
					success: function(response) { 
						self.doc = response;
						window.location.reload(true)
					}
					
				})
			}
			reader.readAsDataURL(file)
			
		},
		submitForm: function(ind){
			$('#form_'+ind+'').submit()
		},
		parseObj: function(obj) {
			if (!obj) return '';
			return obj;
		},
		toggleEdit: function(ind) {
			var self = this;
			this.edit = (!this.edit ? ind : null);
		},
		checkNameValidity(type, aSearchTerm, aMsg, event) {
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
					console.log(result, res)
					self.avail = (result === 'Available')
				})
			}
		},
		initSig() {
			var self = this;
			self.type = 'draw';
			document.getElementById('viewer').scrollIntoView();

		},
		setSigData(i, val, ts, can) {
			var self = this;
			
			Vue.set(self.can, parseInt(i,10), can)
			console.log(self.ts, ts)
			if (!Array.isArray(self.ts)) {
				self.ts = [];
			}
			Vue.set(self.ts, 0, ts)
		},
		updateSignature(index, url) {
			Vue.set(this.signatureDataUris, 0, url);
		},
		signatureToBlob(cb) {
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
		saveSignature(){
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
		activateMap(){
			var self = this;
			var mapActive = self.mapActive;
			var mapEdit = self.mapEdit;
			if (!mapActive) {
				//- if (self.map) self.setView(self.map.getLatLng());
				// TODO admin only for certain things?
				//- console.log(self.dataLayer)
				if (self.loggedin && self.loggedin !== '' && self.pu && self.pu !== '' && self.pu.properties.admin && self.dataLayer._latlngs && self.dataLayer._latlngs.length < 2) {
					//- console.log(self.dataLayer)
					//- self.dataLayer.enableEdit();
					self.mapEdit = !mapEdit;
				}
				document.getElementById('viewer').scrollIntoView();
			} else {
				//- if (self.map) self.setView(self.map.getLatLng());
				// TODO admin only for certain things?
				if (self.loggedin && self.loggedin !== '' && self.pu && self.pu !== '' && self.pu.properties.admin && typeof self.dataLayer.disableEdit === 'function') {
					self.dataLayer.disableEdit();
					self.mapEdit = !mapEdit;
				}

				document.getElementById('inputs').scrollIntoView();
			}
			self.mapActive = !mapActive;
			if (self.mapActive) {
				$('.slidedown').slideUp(100);

			}
		},
		
		addMapBlob() {
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
		handleFile: function(dindex, index) {
			var self = this;
			self.dindex = dindex;
			self.file = document.getElementById('media_'+index).files[0];
			self.processImage(index);
		},
		processJson(){
			var self = this;
			var dataurl = null;
			var file = self.file;
			if (!file) return;
			console.log(file)
			// TODO validate json type somehow before upload
			var reader = new FileReader();
			reader.onloadend = function(e) {
			//- reader.addEventListener("load", function () {
				var fd = new FormData();
				var blob = this.result;
				console.log(blob)
				fd.append("json", file);
				fd.append('_csrf', '#{csrfToken}');

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
		getCoordInds(latlngs, latlng) {
			
		},
		latlngsToArr(latlngs, cll){
			if (!Array.isArray(latlngs)) {
				return;
			}
			return latlngs.map(function(latlng, h){
				if (!Array.isArray(latlng)) {
					self.h = null;
					return [latlng.lng,latlng.lat];
				} else {
					if (latlng[0].lat && (latlng[0].lat !== latlng[latlng.length-1].lat || latlng[0].lng !== latlng[latlng.length-1].lng)) {
						latlng.push(latlng[0])
					}
					return latlng.map(function(ll, i){
						if (!Array.isArray(ll)) {
							if (ll.lat === cll.lat && ll.lng === cli.lng) {
								self.h = h;
								self.i = i;
								self.lvl = 'hi'
							}
							return [ll.lng,ll.lat]

						} else {
							if (ll[0].lat && (ll[0].lat !== ll[ll.length-1].lat || ll[0].lng !== ll[ll.length-1].lng)) {
								ll.push(ll[0])
							}
							return ll.map(function(l, j) {
								if (!Array.isArray(l)) {
									if (l.lat === cll.lat && l.lng === cll.lng) {
										self.h = h;
										self.i = i;
										self.j = j;
										self.lvl = 'hij'
									}
									return [l.lng,l.lat]

								} else {
									if (l[0].lat && (l[0].lat !== l[l.length-1].lat || l[0].lng !== l[l.length-1].lng)) {
										l.push(l[0])
									}
									return l.map(function(k, m){
										if (!Array.isArray(k)) {
											if (k.lat === cll.lat && k.lng === cll.lng) {
												self.h = h;
												self.i = i;
												self.j = j;
												self.m = m;
												self.lvl = 'hijm';
											}
											return [k.lng,k.lat]
										} else {
											console.log('giant array')
										}
									})
								}
							})
						}
					})
				}
				
			});
		},
		handleGeoJson(e){
			var self = this;
			self.file = 
				//document.getElementById('lyr_'+doc._id)
				e.target.files[0];
			self.processJson()
		},
		getLayers(id) {
			//- self.lyr[item._id]
			var self = this;
			$.get('/api/geointersect/'+id+'', function(res){
				if (res.length === 1 && res[0]._id === self.doc._id) {
					$.get('/')
				}
				console.log(res)
			})
		},
		styleOf(feature, type) {
			var self = this;
			var cind = self.doc.properties.layers.indexOf(feature._id);
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
		coordsToLatLng(coords) { // (Array[, Boolean]) -> LatLng
			return new L.LatLng(coords[1], coords[0]);
		},
		coordsToLatLngs(coords, levelsDeep, coordsToLatLng) { // (Array[, Number, Function]) -> Array
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
		isPointCoords(ll) {
			if (ll.length === 2 && !Array.isArray(ll[0])) {
				//- console.log('l 1')
				return true
			//- } else {
			} else if (ll[0][0] && ll[0].length === 2 && !Array.isArray(ll[0][0])) {
				//- console.log(ll)
				//- console.log('l 2')
				return true
			} else if (ll[0][0][0] && ll[0][0].length === 2 && !Array.isArray(ll[0][0][0])) {
				//- console.log('l 3')
				return true
			} else {
				return false;
			}
		},
		isPointLatlng(ll) {
			if (!Number.isNaN(parseInt(ll.lat, 10))) {
				return true
			} else {
				return false
			} 
			//- if (ll[0] && !isNaN(parseInt(ll[0].lat, 10))) {
			//- 	return true
			//- } else if (ll[0][0] && !isNaN(parseInt(ll[0][0].lat, 10))) {
			//- 	return true
			//- } else {
			//- 	return false;
			//- }
		},
		filterViewerList(ll1, ll2, feature, keys, vals, buf) {
			var self = this;
			//- self.cZF = (self.map.getZoom() + self.zfactor)
			var latlng = ll2;
			//- var buf = L.circle(latlng, { radius: (140 * self.cZF) }).addTo(self.map);
			$.get('/publishers/esta/json/json_'+feature._id+'.json')
			.then(async function(json){
				if (json.features){
					self.geo = await keys.map(function(key){
						var match = null;
						if (vals._layers && vals._layers[key]._latlng) {
							for (var j = 0; j < json.features.length; j++) {
								if (match) break;
								var jf = json.features[j];
								if (vals._layers[key]._latlng.lat === jf.geometry.coordinates[1] && vals._layers[key]._latlng.lng === jf.geometry.coordinates[0]) {
										match = jf
								} else {
								}
							}
						} else {
							//- console.log('oops')
							//- console.log(vals)
							//- console.log(json)
							if (vals._latlngs && vals._latlngs[key]) {
								for (var j = 0; j < json.features.length; j++) {
									if (match) break;
									var jf = json.features[j];
									if (key === j) {
										match = jf //vals._latlngs[key]
									}
								}
							}
							
						}
						if (match) return match;
					})
					.filter(function(ft, j){
						//- console.log(ft)
						if (self.isPointCoords(ft.geometry.coordinates)) {
							//TODO: Add as layer, then get bounds, then get center
							var rx = ft.geometry.coordinates.reverse();
							var center = L.latLng(rx) 
							latlng = center;
							return ll1.contains(center);
						} else {
							var bf = L.geoJSON(ft, {
								style: function (feature) {
									return {color: 'tomato'};
								}
							}).addTo(self.map);
							var l1 = bf.getBounds();
							var contains = (l1.contains(latlng));
							if (contains) {
								ll1 = l1
								self.buf = bf;
							} else {
								bf.remove()

								//- console.log(latlng)
							}
							return contains;
						}
					})
				}
				if (self.geo && self.geo.length > 0) {
					//- console.log(self.geo)
					if (ll1._southWest) {
						self.map.fitBounds(ll1);
					} 
					//- self.map.panTo(latlng);
					self.lMarker.setLatLng(latlng);
					self.map.panTo(latlng);
					if (self.geo.length > 0) {
						self.viewerList = true;
					} else {
						self.viewerList = false;
					}
				} else {
					console.log('wtaf')
					//- buf.remove();

				}
				buf.remove();

			})
			.catch(function(err){
				console.log(err)
			})
		},
		//- arrayEqArray(arr1, arr2)
		setView(feature, latlng){
			var self = this;
			if (self.buf) self.buf.remove();
			self.cZF = (self.map.getZoom() + self.zfactor)
			var buf = L.circle(latlng, { radius: (140 * self.cZF) }).addTo(self.map);
			var ll1 = buf.getBounds();
			var ll2 = latlng;
			var keys;
			var vals;
			if (!self.dataLayer._layers && self.lyr[feature._id]) {
				if (!self.lyr[feature._id]._layers) {
					keys = Array.from(Array(self.lyr[feature._id]._latlngs.length).keys())
				} else {
					keys = Object.keys(self.lyr[feature._id]._layers)
				}
				vals = self.lyr[feature._id];
				//- console.log(feature, vals)
			} else {
				vals = self.dataLayer;
				keys = (!vals || !vals._layers ? Array.from(Array(self.dataLayer._latlngs.length).keys()) : Object.keys(vals._layers));
				//- console.log(keys)
			}
			self.filterViewerList(ll1, ll2, feature, keys, vals, buf)
			
			
		},
		//- /* get features contained within a given map Polygon and time range*/
		//- containArr(mod, fts) {
		//- 	var self = this, features;
		//- 	var g1 = (!coords[0] || !Array.isArray(coords[0]))
		//- 	return self.data.sort( /* ensure data sorted by time range */
		//- 		function(a,b){return a.properties.time.end < b.properties.time.end}
		//- 	).filter(function(feature){ /*ret documents with overlapping geotime*/
		//- 		var g2 = self.rxArr(feature.geometry.coordinates);
		//- 		return (self.containGeo(g1, g2)); 
		//- 	});
		//- }/*end get features contained within a map polygon and time range */,
		//- /*begin map geometry contains-checker*/
		//- containGeo(cd1, cd2) { /* does cd1 contain cd2 ? Boolean */
		//- 	var self = this, cZF = (self.position.zoom + self.zfactor), center;
		//- 	if (!self.map) return;
		//- 	if (!isNaN(cd1[0])) {
		//- 		center = L.latLng(cd1);
		//- 	} else {
		//- 		center = L.latLngBounds(cd1).getCenter();
		//- 	}
		//- 	var buf = L.circle(center, { radius: 1400 * cZF }).addTo(self.map);
		//- 	var ll1 = buf.getBounds(),
		//- 	ll2 = (!isNaN(cd2[0]) ? /*Point*/cd2 : /*Polygon*/L.latLngBounds(cd2) ); 
		//- 	buf.remove();
		//- 	return ll1.contains(ll2); 
		//- }/*end does cd1 contain cd2 Bool*/,
		loadLayer(item) {
			var self = this;
			if (self.isPointCoords(item.geometry.coordinates)) {
				console.log('is point')
				return L.GeoJSON.geometryToLayer(item, {
					style: function(feature) {
						return self.styleOf(feature, feature.geometry.type)
					},
					pointToLayer: function(feature, latlng) {
						//- console.log(feature, latlng);
						var circle = new L.CircleMarker(latlng, self.styleOf(feature, feature.geometry.type))
							//- .on('click', function(){
							//- 	return self.setView(feature, latlng)
							//- });
						//- console.log(circle)
						//- L.GeoJSON.coordsToLatLng(feature.geometry.coordinates, false)
				
						return circle;
					}
				})
			} else {
				//- console.log('is not point')
				//- console.log(item)
				//- return L.GeoJSON.geometryToLayer(item, {
				var ljson = L.GeoJSON.geometryToLayer(item)
				//- , {
				//- //- var geojson = L.GeoJSON(item, {
				//- //- return L.geoJson(item, {
				//- 	//- style: function(feature) {
				//- 	//- 	console.log(self.styleOf(feature, feature.geometry.type))
				//- 	//- 	return self.styleOf(feature, feature.geometry.type)
				//- 	//- }
				//- 	//- ,
				//- 	onEachFeature: function(feature, layer){
				//- 		//- console.log(feature,layer)
				//- 		//- var tt = L.control({position: 'topleft'});
				//- 		//- console.log(tt)
				//- 		//- var div = L.DomUtil.create('div', 'tt', 'tt');//L.Draggable();
				//- 		//- var keys = Object.keys(feature.properties);
				//- 		//- var row = '';
				//- 		//- for (var i in keys) {
				//- 		//- 	var div = `<p><strong>${keys[i]}: </strong>${feature.properties[keys[i]]}</p>`
				//- 		//- 	//- div.innerHTML = 
				//- 		//- 	row += div;
				//- 		//- 
				//- 		//- }
				//- 		//- var text = `<div class="row module">
				//- 		//- 	<div class="tb-10-m0">
				//- 		//- 		${row}
				//- 		//- 	</div>
				//- 		//- </div>
				//- 		//- `;
				//- 		//- var center = layer.getBounds().getCenter();
				//- 		//- //- console.log(center)
				//- 		//- //- L.DomUtil.setPosition(div, center);
				//- 		//- //- tt.onAdd = function(map) {
				//- 		//- //- 
				//- 		//- //- }
				//- 		//- //- console.log(tt)
				//- 		//- //- tt.addTo(layer);
				//- 		//- //- var popup = L.popup()
				//- 		//- //- 		.setLatLng(center)
				//- 		//- //- 		.setContent(div)
				//- 		//- //- 		.openOn(self.map);
				//- 		//- layer.bindPopup(text)
				//- 	}
				//- 
				//- });
				ljson.setStyle(self.styleOf(item, item.geometry.type))
				return ljson;
			}
			
		},
		layerToDataLayer(dataLayer) {
			var self = this;
			var keys = Object.keys(dataLayer._layers)
			self.latlngs = [keys.map(function(key){
				if (dataLayer._layers[parseInt(key, 10)]._latlng) {
					return L.latLng([dataLayer._layers[parseInt(key, 10)]._latlng.lat, dataLayer._layers[parseInt(key, 10)]._latlng.lng])//.wrap();
				} else {
					console.log('bleh')
					console.log(dataLayer._layers[parseInt(key, 10)]);

				}
			})]
		},
		onSwapImageLoad(e){
			
		},
		getEvictionLab() {
			$.post('/utahcourts')
			.then((result)=>{
				console.log(result);
			})
			.catch((err)=>console.log(err))
		},
		async changeCensusJurisdiction(e){
			var self = this;
			if (self.censusLoad) {
				self.censusLoad.placetype = e.target.value;
				$.post('/censusload/'+self.censusLoad.placetype)
				.then(async function(result){
					//- console.log(JSON.parse(result).layers[0].fields)
					console.log(result)
					var variables = JSON.parse(result).variables
					var keys = Object.keys(variables)
					self.censusLoad.cats = 
					//- await JSON.parse(result).layers[0].fields.map(function(field){
					//- 	return field.name;
					//- })
					keys//- keys.map(function(k){
					//- 	return variables[k].concept
					//- })
					//- Object.keys(JSON.parse(result).layers[0].fields)
					//- JSON.parse(result).variables.map(function(fd){
					//- 	return fd.concept;
					//- })
				})
				.catch(function(err){
					console.log(err)
				})
			}
		},
		async changeCensusData(e){
			var self = this;
			//- self.map.removeLayer(self.censusLayer);
			var code = e.target.value;
			var keys = Object.keys(self.lyr);
			var filterkeys = keys.filter(function(lr){
				return !isNaN(parseInt(lr, 10))
			})
			filterkeys.forEach(function(lr){
				return self.map.removeLayer(self.lyr[lr])
			})
			self.placetypes.forEach(function(bound){
				if (self.lyr[bound.ind]) {
					self.map.removeLayer(self.lyr[bound.ind])
				}
			})
			if (!code) {
				self.censusLoad.placetype = null;
			}
			else if (!self.lyr[code]) {
				
				var hoverStyle = {
				"fillOpacity": 0.5
				};
				var mapBounds = self.map.getBounds();
				//- var crs = self.map.options.crs;
				//- var nwLatLng = mapBounds.getNorthWest();
				//- var seLatLng = mapBounds.getSouthEast();
				//- var topLeft = self.map.latLngToLayerPoint(nwLatLng);
				//- var bottomRight = self.map.latLngToLayerPoint(seLatLng);
				//- $.post('/censusload/'+)
				$.post('/census/'+self.censusLoad.placetype+'/'+encodeURIComponent(self.censusLoad.cat)+'')//+tableid+'/'+state+'')
				.then(function(result){
					//- console.log(JSON.parse(result))
					self.censusData = JSON.parse(result).features;
					var colors = self.c;//['tomato', '#191970', '#F5FFFA', '#1E90FF', '#ADFF2F', '#FF7F50']
					
					self.censusData.forEach(async function(item, i){
						var pop = item.attributes.POP100;
						var color = (
							pop < 5000 ? colors[0] :
							(
								pop >= 5000 && pop < 10000 ? colors[1] :
								(
									pop >= 10000 && pop < 25000 ? colors[2] :
									(
										pop >= 25000 && pop < 50000 ? colors[3] :
										(
											pop >= 50000 ? colors[4] : '#ffffff'
										)
									)
								)
							)
						);
						var style = {
						"clickable": true,
						"color": "#00D",
						"fillColor": color,//colors[i],
						"weight": 1.0,
						"opacity": 0.3,
						"fillOpacity": 0.2
						};
						//- console.log(item)
						var it = {geometry: {}, properties:{}};
						it.geometry.coordinates = [item.geometry.rings];
						it.geometry.type = 'MultiPolygon';
						it.properties = item.attributes;
						it.properties.name = item.attributes.name;
						it.type = 'Feature';
						//- console.log(it)
						if (it.geometry.coordinates) {
							
							self.lyr[code] = self.loadLayer(it);
							self.lyr[code].setStyle(style)
							await self.map.addLayer(self.lyr[code]);
							var bounds = self.lyr[code].getBounds();
							self.map.fitBounds(bounds);
							//- self.lyr[item.attributes.OBJECTID].remove()
						}
					})
				})
				.catch(function(err){
					console.log(err)
				})							
			} else {
				self.boundary = code;
				self.map.addLayer(self.lyr[code]);
				var bounds = self.lyr[code].getBounds();
				self.map.fitBounds(bounds);
			}
		},
		async changeCensus(e){
			var self = this;
			//- self.map.removeLayer(self.censusLayer);
			var code = e.target.value;
			var keys = Object.keys(self.lyr);
			var filterkeys = keys.filter(function(lr){
				return !isNaN(parseInt(lr, 10))
			})
			filterkeys.forEach(function(lr){
				return self.map.removeLayer(self.lyr[lr])
			})
			self.boundaries.forEach(function(bound){
				if (self.lyr[bound.code]) {
					self.map.removeLayer(self.lyr[bound.code])
				}
			})
			if (!code) {
				self.boundary = null;
			}
			else if (!self.lyr[code]) {
				var style = {
				"clickable": true,
				"color": "#00D",
				"fillColor": "#00D",
				"weight": 1.0,
				"opacity": 0.3,
				"fillOpacity": 0.2
				};
				var hoverStyle = {
				"fillOpacity": 0.5
				};
				var mapBounds = self.map.getBounds();
				var crs = self.map.options.crs;
				var nwLatLng = mapBounds.getNorthWest();
				var seLatLng = mapBounds.getSouthEast();
				var topLeft = self.map.latLngToLayerPoint(nwLatLng);
				var bottomRight = self.map.latLngToLayerPoint(seLatLng);
				$.post('/census/'+code+'/')//+tableid+'/'+state+'')
				.then(function(result){
					//- console.log(JSON.parse(result))
					self.censusData = JSON.parse(result).results;
					var colors = self.c;//['tomato', '#191970', '#F5FFFA', '#1E90FF', '#ADFF2F', '#FF7F50']

					self.censusData.forEach(async function(item, i){
						console.log(item)
						var it = {geometry: {}, properties:{}};
						it.geometry.coordinates = [item.geometry.rings];
						it.geometry.type = 'MultiPolygon';
						it.properties = item.attributes;
						it.properties.name = item.attributes.name;
						it.type = 'Feature';
						console.log(it)
						if (it.geometry.coordinates) {
							
							self.lyr[item.attributes.OBJECTID] = self.loadLayer(it);
							self.lyr[item.attributes.OBJECTID].setStyle({fillColor: self.c[i]})
							await self.map.addLayer(self.lyr[item.attributes.OBJECTID]);
							//- self.lyr[item.attributes.OBJECTID].remove()
						}
					})
				})
				.catch(function(err){
					console.log(err)
				})							
			} else {
				self.boundary = code;
				self.map.addLayer(self.lyr[code]);
				var bounds = self.lyr[code].getBounds();
				self.map.fitBounds(bounds);
			}
			
		}
		 /*Leaflet requires reversed geo-coordinate (lat, lng)*/,
		async loadMap(cb) {
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
			self.tilelayer = L.tileLayer(self.baseMaps[self.base].url, {renderer: L.canvas({padding:0.5}), bounds: map.getBounds().pad(1000), attribution: self.baseMaps[self.base].attribution}).addTo(map);
			self.map = map;
			self.cZF = (18 - self.map.getZoom() + self.zfactor)
			if (!self.dataLayer && self.doc && self.doc !== '') {
				// generate geographic points from data
				var myRenderer = L.canvas({ padding: 0.5 });
				self.dataLayer = self.loadLayer(self.doc);
				
				self.dataLayer.bringToBack();
				self.dataLayer.setStyle({fillColor: 'var(--highlight)'})
				self.dataLayer.on('click', function(e){
					//- console.log(e)
					self.setView(self.doc, e.latlng)
				})
				self.dataLayer.bindTooltip(self.doc.properties.label, {interactive:true});
				//- self.dataLayer.on('click', function(){
				//- 	self.dataLayer.openTooltip();
				//- })
				self.map.addLayer(self.dataLayer);
				if (self.dataLayer._bounds) {
					//- console.log(self.dataLayer._latlngs)
					self.latlngs = self.dataLayer.getLatLngs();
				} else if (self.dataLayer._layers) {
					self.layerToDataLayer(self.dataLayer)
				}
				var colors = self.c;//['tomato', '#191970', '#F5FFFA', '#1E90FF', '#ADFF2F', '#FF7F50']
				if (self.doc.properties.title.str !== 'Geography' && self.layers && self.layers.length && typeof self.dataLayer.disableEdit === 'function') {
					self.dataLayer.disableEdit();
					self.dataLayer.options.interactive = false;
					self.mapEdit = false;
					await self.layers.forEach(async function(item, i){
						self.lyr[item._id] = self.loadLayer(item);
						self.lyr[item._id].setStyle({fillColor: self.c[i]});
						self.lyr[item._id].bindTooltip(item.properties.label, {interactive:true});
						self.lyr[item._id].on('click', function(e){
							self.setView(item, e.latlng)
							self.lyr[item._id].openTooltip();
						})
						await self.map.addLayer(self.lyr[item._id]);
						// removed from map, but stored as variable to enable again
						//- self.lyr[item._id].remove()
					})
					if (self.availablelayers && self.availablelayers.length > 0) {
						await self.availablelayers.forEach(async function(item, i){
							if (self.doc.properties.layers.indexOf(item._id) === -1) {
								self.lyr[item._id] = self.loadLayer(item);
								self.lyr[item._id].setStyle({fillColor: self.c[i]});
								self.lyr[item._id].bindTooltip(item.properties.label, {interactive:true});
								self.lyr[item._id].on('click', function(e){
									self.setView(item, e.latlng)
									self.lyr[item._id].openTooltip();
								})
								await self.map.addLayer(self.lyr[item._id]);
								// removed from map, but stored as variable to enable again
								self.lyr[item._id].remove()
							}
						})
					}
				} 
				//- if (self.doc.properties.title.str !== 'Geography' && self.boundary) {
				//- 	$.post('/census/'+self.boundary).then(function(json){
				//- 		self.lyr[self.boundary] = self.loadLayer(json);
				//- 		await self.map.addLayer(self.lyr[self.boundary]);
				//- 		self.lyr[self.boundary].remove()
				//- 	})
				//- 	.catch(function(err){
				//- 		console.log(err)
				//- 	})
				//- }
				//- self.dataLayer.on('dragend', function(e){
				//- 	var latlngs = [];
				//- 	console.log(e.target.getLatLngs())
				//- 	e.target.getLatLngs().forEach(function(latlng){
				//- 		console.log(latlng)
				//- 		if (latlng) {
				//- 			latlng.forEach(function(ll){
				//- 				console.log(ll)
				//- 				latlngs.push([ll.lng,ll.lat])
				//- 			})
				//- 			latlngs.push([latlng[0].lng, latlng[0].lat])
				//- 		}
				//- 	})
				//- 	self.doc.geometry.coordinates = latlngs
				//- })
				self.map.on('editable:vertex:rawclick', function(e){
					self.layers.forEach(function(item, i){
						if (item._id !== e.layer._id) {
							//- item.disableEdit();
						} else {
							//- item.enableEdit();
							//- self.mapEdit = true;
						}
					})
				})
				self.map.on('editable:editing', function (e) {
					e.layer.setStyle({color: 'DarkRed'});
				});
				self.map.on('editable:vertex:dragstart', async function(e){
					var cll = e.vertex.latlng.__vertex.latlng;
					var dll = self.dataLayer.getLatLngs();
					var lvl = 0;
					var p = 0;
					var dl;
					var lll = self.dataLayer.getLatLngs();
					self.latlngs = lll;
				})
				self.map.on('editable:vertex:dragend', function(e){
					console.log(e)
					var cll = e.vertex.latlng.__vertex.latlng;
					var dll = self.dataLayer.getLatLngs();
					var lvl = 0;
					var p = 0;
					var dl;
					self.latlngs = dll;
					self.doc.geometry.coordinates = self.latlngsToArr(dll, cll);
				})
				var coords;
				if (!self.latlngs && self.isPointLatlng(self.latlngs)) {
					if (self.dataLayer._layers) {
						self.layerToDataLayer(self.dataLayer)
					} else {
						self.latlngs = //L.CRS.wrapLatLng(
							self.dataLayer.getLatLngs()
						//)
						
					}
					latlng = L.latLngBounds(self.latlngs).getCenter()
				}
				if (self.latlngs && self.latlngs[0] && self.latlngs[0][0]) {
					latlng = //L.CRS.wrapLatLngBounds(
						(!self.latlngs[0][0][0] || !self.latlngs[0][0][0].lat ? L.latLngBounds(self.latlngs) : L.latLngBounds(self.latlngs[0]) ).getCenter() 
					//)
				} else if (typeof self.dataLayer.getLatLngs === 'function'){
					self.latlngs = self.dataLayer.getLatLngs()
					latlng = L.latLngBounds(self.latlngs).getCenter()
				} else if (self.latlng && self.latlng !== '') {
					latlng = self.latlng
				} else {
					console.log(self.latlng)
				}
				var mapEdit = self.mapEdit;
				//- if (self.map) self.setView(self.map.getLatLng());
				// TODO admin only for certain things?
				//- if (self.loggedin && self.loggedin !== '' && self.pu && self.pu !== '' && self.pu.properties.admin && self.dataLayer._latlngs.length < 2) {
				//- 	self.dataLayer.enableEdit();
				//- 	self.mapEdit = true;
				//- }
				self.lMarker = L.marker(latlng, {draggable: true}).addTo(self.map);
				self.map.panTo(latlng);
				//- self.setView()
				cb(latlng)

			} else {
				cb(null)
			// console.log('when?')
			}
		},
		getClip() { 
			var self = this;
			if (self.btn) {// make central clipping svg d value reactive
			var wW = ( !self.wWidth ? window.innerWidth : self.wWidth ), 
			wH = ( !self.wHeight ? window.innerHeight : self.wHeight ), 
			pW = ( !self.pWidth ? ( wW * (self.res?0.75:0.5) ) : self.pWidth ), 
			pH = ( !self.pHeight ? (wH * (self.res?0.75:0.5) ) : self.pHeight ), 
			r = self.btn.r, cRc = (r * 0.5523), cRr = 0.81, 
			sY = (isNaN(self.btn.y)?(wH*(self.res?0.75:0.5)):self.btn.y);
			var str =`M${wW},${wH}H0V0h${wW}V${wH}z 
			M${(wW - pW) + r},${sY}c0-${cRc}-${(cRc * cRr)}-${r}-${r}-${r}
				c-${cRc},0-${r},${(cRc * cRr)}-${r},${r} 
			c0,${cRc},${(cRc * cRr)},${r},${r},${r}
				C${(wW - pW) + cRc},${(sY+r)},${(wW - pW)+r},${(sY + cRc)},
				${((wW - pW) + r)},${sY}z`
			return str; }
		},
		sliderImg(int){
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
});
