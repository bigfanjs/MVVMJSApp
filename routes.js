'use strict';

const Blog = require('./models/myBlog');

exports.find = function ( req, res ) {
	Blog.find(( err, docs ) => {
		docs.forEach(doc => {
			console.log('Received a GET request for _id: ' + doc._id);
		});
		res.send( docs );
	});
};

exports.create = function ( req, res ) {
	let blog = new Blog(req.body);
	for ( let key in req.body ) {
		console.log(key + ': ' + req.body[ key ]);
	}
	blog.save(( err, doc ) => {
		res.send( doc );
	});
};

exports.delete = function ( req, res ) {
	console.log('Received a DELETE request for _id: ' + req.params.id);
	Blog.remove({ _id: req.params.id }, function ( err ) {
		if ( err ) throw err;
		res.send({ _id: req.params.id });
	});
};

exports.update = function ( req, res ) {
	console.log('Received an UPDATE request for _id: ' + req.params.id);
	Blog.update({ _id: req.params.id }, req.body, function ( err ) {
		if ( err ) throw err;

		res.send({ _id: req.params.id });
	});
};