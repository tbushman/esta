var express = require('express');
var csrf = require('csurf');
var cors = require('cors');
var marked = require('marked');
var favicon = require('serve-favicon');
var session = require('express-session');
var MongoDBStore = require('connect-mongo')(session);
var path = require('path');
var dotenv = require('dotenv');
var mongoose = require('mongoose');
var promise = require('bluebird');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var HtmlDocx = require('html-docx-js');
var fs = require('fs');
var url = require('url');
var multer = require('multer');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var Publisher = require('./models/publishers');
var Content = require('./models/content');
var publishers = path.join(__dirname, '/../..');
var spawn = require('child_process').exec;
var routes = require('./routes/index');

mongoose.Promise = promise;
dotenv.load();
var parseForm = bodyParser.urlencoded({ extended: false });
var parseJSONBody = bodyParser.json();
var parseBody = [parseJSONBody, parseForm];
var upload = multer();

var csrfProtection = csrf({ cookie: true });

var app = express();
app.locals.appTitle = 'Ordinancer';
app.locals.appURL = (process.env.NODE_ENV === 'production' ? 'ta.bli.sh' : 'localhost:'+process.env.PORT+'')
app.locals.moment = require('moment');
app.locals.pug = require('pug');
marked.setOptions({
  gfm: true,
  tables: true
});
app.locals.$ = require('jquery');
app.locals.md = marked;

app.use(cors());

app.use(function(req, res, next) {
		res.set({
			'Access-Control-Allow-Origin' : req.headers.origin,
			'Access-Control-Allow-Methods' : 'GET, POST, HEAD, OPTIONS',
			'Access-Control-Allow-Headers' : 'Cache-Control, Origin, Content-Type, Accept',
			'Access-Control-Allow-Credentials' : true
		});

		//app.use(helmet.noCache({}));

		next();
});
passport.use(new LocalStrategy(Publisher.authenticate()));
passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_OAUTH_CLIENTID,
	clientSecret: process.env.GOOGLE_OAUTH_SECRET,
	callbackURL: (process.env.NODE_ENV === 'production' ? process.env.GOOGLE_CALLBACK_URL : process.env.GOOGLE_CALLBACK_URL_DEV)
	//,passReqToCallback: true
	},
	function(accessToken, refreshToken, profile, done) {
		console.log(accessToken, refreshToken, profile)
		Publisher.find({}, function(err, data){
			if (err) {
				return done(err)
			}
			Publisher.findOne({ 'google.oauthID': profile.id }, function(err, user) {
				if(err) {
					console.log(err);  // handle errors!
				}
				//console.log(profile, user)
				if (!err && user !== null) {
					done(null, user);
				} else {
					/*Publisher.findOne({_id: req.session.userId}, function(err, pu){
						if (err) {
							console.log(err)
						}
						if (!pu) {*/
							//console.log(accessToken, refreshToken)
							user = new Publisher({
								userindex: data.length,
								username: profile.name.givenName,
								email: profile.emails[0].value,
								admin: true,
								avatar: profile.photos[0].value,
								gaaccess: accessToken,
								garefresh: refreshToken,
								google: {
									oauthID: profile.id,
									name: profile.displayName,
									created: Date.now()
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
						/*} else {
							Publisher.findOneAndUpdate({_id: req.session.userId}, {$set:{gaaccess: accessToken, garefresh: refreshToken, 'google.oauthID': profile.id, 'google.name': profile.displayName, 'google.created': Date.now()}}, {safe:true, new:true}, function(err, pu){
								if (err) {
									console.log(err)
								}
								done(null, pu)
							})*/
						//}
					//})
					
				}
			});
		})
		
	}
));

var store = new MongoDBStore(
	{
		mongooseConnection: mongoose.connection,
		uri: 'mongodb://localhost/session_ordinancer',
		collection: 'mySessions'
	}
);
store.on('error', function(error, next){
	next(error)
});

var sess = {
	secret: process.env.SECRET,
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false,
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../../pu/publishers')));
app.use('/publishers', express.static(path.join(__dirname, '../../pu/publishers')));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));
app.use(session(sess));
app.use( passport.initialize());
app.use( passport.session());

// serialize and deserialize
passport.serializeUser(function(user, done) {
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
	Publisher.findOne({_id: id}, function(err, user){

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
app.get(/^(\/|\/register$|\/login$|\/api\/new|\/api\/editcontent)/, csrfProtection);
// ensure multer parses before csrf
app.post(/^(\/register$|\/login$|\/api\/editcontent)/, upload.array(), parseBody, csrfProtection);
app.post(/^(\/diff)/, upload.array(), parseBody);
//app.post(/^(\/api\/uploadmedia)/, parseBody)
app.post(/^(\/api\/export)/, upload.array(), parseBody);
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var outputPath = url.parse(req.url).pathname;
	console.log(outputPath)
	var err = new Error('Not Found');
	err.status = 404;
	return next(err);
});

app.use(function (err, req, res) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

var uri = process.env.DEVDB;

var promise = mongoose.connect(uri, {useNewUrlParser: true}/*, {authMechanism: 'ScramSHA1'}*/);
/*promise.then(function(db){
	db.on('error', console.error.bind(console, 'connection error:'));
});*/
var db = mongoose.connection;
db.once('error', console.error.bind(console, 'connection error:'));
module.exports = app;
