var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose');

var lessMiddleware = require('less-middleware');

// Authentication
// var marginAuth = require('margin-auth');
var jwt = require('jwt-simple');
var secret = 'secretgoeshere';
function tokenOK (req, res, next) {
	try {
		var decoded = jwt.decode(req.header('x-annotator-auth-token'), secret);
		// Test when issued: could be used to determine whether login needed
		var issuedAt = decoded.issuedAt;
		console.log("Issued: " + issuedAt);

		// Test when issued: could be used to determine what's visible/editable
		var ttl = decoded.ttl;
		console.log("Time to live: " + ttl);

		// Test user: could be used to determine what's visible/editable
		var userId = decoded.userId;
		console.log("User: " + userId);

		// Test user: would be used to determine what's visible/editable
		var consumer = decoded.consumerKey;
		console.log("App: " + consumer);
		next();
	} catch (err) {
        console.log("Token decode error");
		console.log(err);
		return res.send("There was a problem with your authentication token");
	}
}

var app = express.createServer();

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Location');
    res.header('Access-Control-Allow-Headers', 'Content-Length, Content-Type, X-Annotator-Auth-Token, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Max-Age', '86400');
      
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

// database
// local
// mongoose.connect('mongodb://localhost/annotationdb');
// staging
mongoose.connect('mongodb://heroku_app5176464:1e86dpt7qi3folobb3t63kqrlq@ds033907.mongolab.com:33907/heroku_app5176464');

// config
app.configure(function () {
//  app.use(auth);
  app.use(allowCrossDomain);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(lessMiddleware({
      src: __dirname + '/public',
      compress: true
  }));

  app.use(express.static(path.join(application_root, "public")));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

var Schema = mongoose.Schema; //Schema.ObjectId

// Schemas
var Ranges = new Schema({
    start: { type: String, required: true },
    end: { type: String, required: true},
    startOffset: { type: Number, required: false },
    endOffset: { type: Number, required: false }
});

// Annotation Model
var Annotation = new Schema({
	id: { type: String, required: false },
    consumer: { type: String, default: "annotationstudio" },
    annotator_schema_version: { type: String, required: true, default: "v1.0" },
    created: { type: String, default: Date.now() },
    updated: { type: String, default: Date.now() },
    user: { type: String, required: false },
    text: { type: String, required: false },         
    quote: { type: String, required: false },    
    uri: { type: String, required: false },           
    ranges: [Ranges],
    tags: [String],
    permissions: [Permissions],
});

Annotation.pre('save', function(next) {
  this.id = this._id;
  next();
});

var Permissions = new Schema({
    read: [],
    admin: [],
    update: [],
    delete: []
});

var AnnotationModel = mongoose.model('Annotation', Annotation);

// REST api
// root
app.get('/api', function (req, res) {
  res.send('Annotations API is running');
});

// Search annotations
app.get('/api/search', tokenOK, function (req, res) {
  return AnnotationModel.find({'uri': req.query.uri }, function (err, annotations) {
    if (!err) {
      return res.send({'rows': annotations });
    } else {
      return console.log(err);
    }
  });
});

// GET to READ
// List annotations
// Authentication: Anyone can see all annotations (no check for token)
app.get('/api/annotations', function (req, res) {
  return AnnotationModel.find(function (err, annotations) {
	if (!err) {
	  return res.send(annotations);
	} else {
	  return console.log(err);
	}
  });
});

// Single annotation
// Authentication: Anyone can see a single annotation (no check for token)
app.get('/api/annotations/:id', tokenOK, function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    if (!err) {
      return res.send(annotation);
    } else {
      return console.log(err);
    }
  });
});

// POST to CREATE
// Authentication: Token required to post an annotation
app.post('/api/annotations', tokenOK, function (req, res) {
  var annotation;
  console.log("POST: ");
  console.log(req.body);
  annotation = new AnnotationModel({
    user: req.body.user,
    consumer: "annotationstudio.org",
    annotator_schema_version: req.body.annotator_schema_version,
    created: Date.now(),
    updated: Date.now(),
    text: req.body.text,
    uri: req.body.uri,
    quote: req.body.quote,
    tags: req.body.tags,
    ranges: req.body.ranges,
    permissions: req.body.permissions
  });
  annotation.save(function (err) {
    if (!err) {
      return console.log("created");
    } else {
      return console.log(err);
    }
  });
  annotation.id = annotation._id;
  return res.send(annotation);
});

// PUT to UPDATE
// Bulk update
// Won't really be doing this will we?
// Authentication: Token required to update all annotations
app.put('/api/annotations', tokenOK, function (req, res) {
    var i, len = 0;
    console.log("is Array req.body.annotations");
    console.log(Array.isArray(req.body.annotations));
    console.log("PUT: (annotations)");
    console.log(req.body.annotations);
    if (Array.isArray(req.body.annotations)) {
        len = req.body.annotations.length;
    }
    for (i = 0; i < len; i++) {
        console.log("UPDATE annotation by id:");
        for (var id in req.body.annotations[i]) {
            console.log(id);
        }
        AnnotationModel.update({ "_id": id }, req.body.annotations[i][id], function (err, numAffected) {
            if (err) {
                console.log("Error on update");
                console.log(err);
            } else {
                console.log("updated num: " + numAffected);
            }
        });
    }
    return res.send(req.body.annotations);
});

// Single update
// This is much more likely
// Authentication: Token required to update one annotation
app.put('/api/annotations/:id', tokenOK, function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    annotation._id = req.body._id;
    annotation.id = req.body._id;
    annotation.user = req.body.user;
    annotation.consumer = req.body.consumer;
    annotation.annotator_schema_version = req.body.annotator_schema_version;
    annotation.updated = Date.now();
    annotation.text = req.body.text;
    annotation.uri = req.body.uri;
    annotation.quote = req.body.quote;
    annotation.tags = req.body.tags;
    annotation.ranges = req.body.ranges;
    annotation.permissions = req.body.permissions;

    return annotation.save(function (err) {
      if (!err) {
        console.log("updated");
      } else {
        console.log(err);
      }
      return res.send(annotation);
    });
  });
});

// DELETE to DESTROY
// Bulk destroy all annotations
// Authentication: Token required to delete all annotations
app.delete('/api/annotations', tokenOK, function (req, res) {
  AnnotationModel.remove(function (err) {
    if (!err) {
      console.log("removed");
      return res.send('');
    } else {
      console.log(err);
    }
  });
});

// remove a single annotation
// Authentication: Token required to delete one annotation
app.delete('/api/annotations/:id', tokenOK, function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    return annotation.remove(function (err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
      }
    });
  });
});

// launch server
var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
