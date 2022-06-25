var express = require('express');
var csrf = require('csurf');
var cors = require('cors');
var marked = require('marked');
var favicon = require('serve-favicon');
var session = require('express-session');
var dotenv = require('dotenv');
var MongoDBStore = require('connect-mongodb-session')(session);
var path = require('path');
var mongoose = require('mongoose');
var promise = require('bluebird');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// var HtmlDocx = require('html-docx-js');
var fs = require('fs');
var url = require('url');
var multer = require('multer');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var SlackStrategy = require('passport-slack').Strategy;
// var GoogleStrategy = require('passport-google-oauth2').Strategy;
// var Publisher = require('./models/publishers');
// var Content = require('./models/content');
// const { Publisher, Content, Diffs, Signature } = require('./models/index.js');
const { Publisher, PublisherTest } = require('./models/index.js');
const config = require('./config/index.js');
const testenv = config.testenv;
const PublisherDB = (!testenv ? Publisher : PublisherTest);
var publishers = path.join(__dirname, '/../..');
var spawn = require('child_process').exec;
var routes = require('./routes/index');

mongoose.Promise = promise;
dotenv.load();
var parseForm = bodyParser.urlencoded({ extended: false });
var parseJSONBody = bodyParser.json();
var parseBody = [parseJSONBody, parseForm];
var upload = multer({limits:{ fieldSize: 25 * 1024 * 1024 }});

var csrfProtection = csrf({ cookie: true });

var app = express();
if (app.get('env') === 'production') {
	app.enable('trust proxy');
	app.set('trust proxy', true); // trust first proxy	
	app.use(cors());
	app.options('*', cors({origin: '/bli\.sh$/'}));
	app.use(function(req, res, next) {
		app.locals.env = process.env.NODE_ENV
		app.locals.appURL = (process.env.NODE_ENV === 'production' ? 'esta.bli.sh' : 'localhost:'+process.env.PORT+'')

		app.disable('x-powered-by');
		app.disable('Strict-Transport-Security');
		//app.disable('Access-Control-Allow-Credentials');
		res.cookie('site', 'cookie', {sameSite: 'None', secure: true});
		res.set({
			'Access-Control-Allow-Origin' : '*',
			'Access-Control-Allow-Methods' : 'GET, POST, HEAD, OPTIONS',
			'Access-Control-Allow-Headers' : 'Cache-Control, Origin, Content-Type, Accept, Set-Cookie',
			'Access-Control-Allow-Credentials' : true,
		});

		// app.use(helmet.noCache({}));

		next();
	});
	
}

passport.use(new LocalStrategy(PublisherDB.authenticate()));
passport.use(new SlackStrategy({
	clientID: process.env.SLACK_CLIENT_ID,
	clientSecret: process.env.SLACK_CLIENT_SECRET
	//,
	// callbackURL: (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV)
	// passReqToCallback: true
},
function(accessToken, refreshToken, profile, done) {
	// console.log(accessToken, refreshToken, profile)
	PublisherDB.find({}, function(err, data){
		if (err) {
			return done(err)
		}
		PublisherDB.findOne({ 'slack.oauthID': profile.user.id }, function(err, user) {
			if(err) {
				console.log(err);  // handle errors!
			}
			//console.log(profile, user)
			if (!err && user !== null) {
				done(null, user);
			} else {
				PublisherDB.findOne({'properties.givenName': profile.user.name, email: profile.user.email}, function(err, user) {
					if (err) {
						console.log(err);
					}
					if (!err && user !== null) {
						PublisherDB.findOneAndUpdate({_id: user._id}, {$set:{'slack.oauthID': profile.user.id}}, {new:true,safe:true}, function(err, pu){
							if (err) {
								console.log(err)
							}
							done(null, pu);
						})
						
					} else {
						user = new PublisherDB({
							sig: [],
							username: profile.displayName.replace(/\s/g, '_'),
							email: profile.user.email,
							slack: {
								oauthID: profile.user.id,
								created: Date.now()
							},
							properties: {
								avatar: profile.user.image_32,
								admin: (profile.team.domain === 'saltlakedsa'),
								givenName: profile.user.name,
								time: {
									begin: new Date(),
									end: new Date()
								}
							}
						});
						user.save(function(err) {
							if(err) {
								console.log(err);  // handle errors!
							} else {
								console.log("saving user ...");
								done(null, user);
							}
						});
					}
					
					
				})
				
			}
		});
	})
	
}));

app.locals.appTitle = 'esta.bli.sh';
app.locals.moment = require('moment');
app.locals.pug = require('pug');
marked.setOptions({
  gfm: true,
  tables: true
});
app.locals.$ = require('jquery');
app.locals.md = marked;



// passport.use(new GoogleStrategy({
// 	clientID: process.env.GOOGLE_OAUTH_CLIENTID,
// 	clientSecret: process.env.GOOGLE_OAUTH_SECRET,
// 	callbackURL: (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV)
// 	//,passReqToCallback: true
// 	},
// 	function(accessToken, refreshToken, profile, done) {
// 		console.log(accessToken, refreshToken, profile)
// 		PublisherDB.find({}, function(err, data){
// 			if (err) {
// 				return done(err)
// 			}
// 			PublisherDB.findOne({ 'google.oauthID': profile.id }, function(err, user) {
// 				if(err) {
// 					console.log(err);  // handle errors!
// 				}
// 				//console.log(profile, user)
// 				if (!err && user !== null) {
// 					done(null, user);
// 				} else {
// 					/*PublisherDB.findOne({_id: req.session.userId}, function(err, pu){
// 						if (err) {
// 							console.log(err)
// 						}
// 						if (!pu) {*/
// 							//console.log(accessToken, refreshToken)
// 							user = new PublisherDB({
// 								userindex: data.length,
// 								username: profile.name.givenName,
// 								email: profile.emails[0].value,
// 								admin: true,
// 								avatar: profile.photos[0].value,
// 								gaaccess: accessToken,
// 								garefresh: refreshToken,
// 								google: {
// 									oauthID: profile.id,
// 									name: profile.displayName,
// 									created: Date.now()
// 								}
// 							});
// 							user.save(function(err) {
// 								if(err) {
// 									console.log(err);  // handle errors!
// 								} else {
// 									console.log("saving user ...");
// 									done(null, user);
// 								}
// 							});
// 						/*} else {
// 							PublisherDB.findOneAndUpdate({_id: req.session.userId}, {$set:{gaaccess: accessToken, garefresh: refreshToken, 'google.oauthID': profile.id, 'google.name': profile.displayName, 'google.created': Date.now()}}, {safe:true, new:true}, function(err, pu){
// 								if (err) {
// 									console.log(err)
// 								}
// 								done(null, pu)
// 							})*/
// 						//}
// 					//})
// 
// 				}
// 			});
// 		})
// 
// 	}
// ));




var store = new MongoDBStore(
	{
		mongooseConnection: mongoose.connection,
		uri: process.env.DEVDB,
		collection: 'estaSession',
		autoRemove: 'interval',     
		autoRemoveInterval: 3600
	}
);
store.on('error', function(error){
	console.log(error)
});

var sess = {
	secret: process.env.SECRET,
	name: 'nodecookie',
	resave: true,
	saveUninitialized: true,
	store: store,
  cookie: { maxAge: 180 * 60 * 1000 }
}
/*app.use(function(req, res){
	res.set({'Content-Type': 'application/xhtml+xml'})
})*/
var pug = require('pug-runtime');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cookieParser(sess.secret));
app.use(session(sess));
app.use( passport.initialize());
app.use( passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../../pu/publishers')));
app.use('/publishers', express.static(path.join(__dirname, '../../pu/publishers')));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

// serialize and deserialize
passport.serializeUser(function(user, done) {
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
	PublisherDB.findOne({_id: id}, function(err, user){

		if(!err) {
			done(null, user);
		} else {
			done(err, null);
		}
	});
});
if (app.get('env') === 'production') {
	app.set('trust proxy', 1)
}

app.use(function (req, res, next) {
	//console.log(res.getHeader('Content-Type'))
	
  res.locals.session = req.session;
  next();
});

// function csrfCookie

app.get(/^(\/|\/register$|\/login$|\/api\/new|\/api\/editcontent|\/sig\/editprofile)/, csrfProtection);
// ensure multer parses before csrf
app.post(/^(\/register$|\/login$|\/api\/editcontent|\/sig\/editprofile)/, upload.array(), parseBody, csrfProtection);
app.post(/^(\/diff)/, upload.array(), parseBody);
//app.post(/^(\/api\/uploadmedia)/, parseBody)
app.post(/^(\/api\/export)/, upload.array(), parseBody);
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	res.status(404).send('Not Found');
});

app.use(function (err, req, res) {
	res.status(err.status || 500).send({
		message: err.message,
		error: err.status
	})
});

var uri = process.env.DEVDB;
// if (mongoose.connection.readyState === 0) {
const promise = async () => {
	return await new mongoose.connect(uri, { 
		useNewUrlParser: true, 
		useUnifiedTopology: true,
		useFindAndModify: false 
	})
};
	promise().then(function(){
		console.log('connected esta')
		// db.on('error', 
		// console.error.bind(console, 'connection error:')
	//);
	})
	.catch(function(err){
		console.log(err);
        console.log('MongoDB connection unsuccessful');
	});
// }

// var db = mongoose.connection;
// db.once('error', console.error.bind(console, 'connection error:'));
module.exports = app;
