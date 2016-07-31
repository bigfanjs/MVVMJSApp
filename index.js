const
	express = require('express'),
	bodyParser = require('body-parser'),
	blogs = require('./routes'),
	logger = require('morgan'),
	serveFavicon = require('serve-favicon'),
	app = express();

app.set('PORT', process.env.PORT || 8080);

app.use(serveFavicon(__dirname + '/client/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(express.static( __dirname + '/client'));

app.get('/api/blogs', blogs.find);
app.post('/api/blogs', blogs.create);
app.delete('/api/blogs/:id', blogs.delete);
app.put('/api/blogs/:id', blogs.update);

app.listen( app.get('PORT') );
console.log('server listening on port: ' + app.get('PORT') );