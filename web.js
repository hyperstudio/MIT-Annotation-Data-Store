// Setup
var application_root = __dirname,
	config = require("./config"),
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose'),
	lessMiddleware = require('less-middleware'),
	jwt = require('jwt-simple'),
	secret = config.secret,
	app = express();

// Authentication
function tokenOK (req, res, next) {
	try {
		var decoded = jwt.decode(req.header('x-annotator-auth-token'), secret);
		if (inWindow(decoded)) {
			console.log("Token in time window");
		} 
		else {
			console.log("Token not in in time window.");
		} 
		next();
	} catch (err) {
        console.log("Error decoding token:");
		console.log(err);
		return res.send("There was a problem with your authentication token");
	}
};

function inWindow (decoded, next) {
	var issuedAt = decoded.issuedAt; 
	var ttl = decoded.ttl; 
	var issuedSeconds = new Date(issuedAt) / 1000; 
	var nowSeconds = new Date().getTime() / 1000;	
	var diff = ((nowSeconds - issuedSeconds)); 
	var result = (ttl - diff); console.log("Time left on token: about " + Math.floor(result/(60*60)) + " hours.");
 	return ((result > 0) ? true : false);
}

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

// DB
mongoose.connect(config.mongodb.live);

// config
app.configure(function () {
  // app.use(tokenOK);
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
    consumer: { type: String, default: config.consumer },
    annotator_schema_version: { type: String, required: false, default: config.api.version },
    created: { type: Date, default: Date.now() },
    updated: { type: Date, default: Date.now() },
    user: { type: String, required: false },
    username: { type: String, required: false },
    text: { type: String, required: false },         
    quote: { type: String, required: false },    
    uri: { type: String, required: false },
    uuid: { type: String, required: false },
    groups: [String],           
    subgroups: [String],           
    ranges: [Ranges],
    tags: [String],
    permissions: {
	    read: [String],
	    admin: [String],
	    update: [String],
	    delete: [String]
	}
});

Annotation.pre('save', function(next) {
  this.id = this._id;
  next();
});

var AnnotationModel = mongoose.model('Annotation', Annotation);

// REST API root route
app.get('/api', function (req, res) {
  res.send('Annotations API is running');
});

// Search annotations
// Auth: Token required to search
app.get('/api/search', tokenOK, function (req, res) {
	var query = AnnotationModel.find({'uri': req.query.uri }); 

	if (req.query.mode === 'user') {
		query.where('user').equals(req.query.user);
	}
	else if (req.query.mode === 'group') {
    	query.where('subgroups').in(req.query.subgroups);
		query.$where('this.permissions.read.length === 0');
	}
	else if (req.query.mode === 'class') {
    	query.where('groups').in(req.query.groups);
		query.$where('this.permissions.read.length === 0');
	}
	else if (req.query.mode === 'admin') {
		// No conditions.
	}

	if (req.query.sidebar) {
	    // console.log("Sidebar request: "+ JSON.stringify(req.query));
		query.exec(function (err, annotations) {
		  if (!err) {
		    return res.send(annotations);
		  } else {
		    return console.log(err);
		  }
		});
	}
	else {
	    // console.log("Non-sidebar request: "+ JSON.stringify(req.query));
		query.exec(function (err, annotations) {
		  if (!err) {
		    return res.send({'rows': annotations });
		  } else {
		    return console.log(err);
		  }
		});
	}
	// if (req.query.permissions[read]) {};
});

// GET to READ
// List annotations
// Auth: Anyone can see all annotations (no check for token)
// Why?
app.get('/api/annotations', tokenOK, function (req, res) {
  return AnnotationModel.find(function (err, annotations) {
	if (!err) {
	  return res.send(annotations);
	} else {
	  return console.log(err);
	}
  });
});

// Single annotation
// Auth: Anyone can see a single annotation (no check for token)
// Why?
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
// Auth: Token required to post an annotation
app.post('/api/annotations', tokenOK, function (req, res) {
  var annotation;
  console.log("POST: ");
  console.log(req.body);
  annotation = new AnnotationModel({
    user: req.body.user,
    username: req.body.username,
    consumer: "annotationstudio.mit.edu",
    annotator_schema_version: req.body.annotator_schema_version,
    created: Date.now(),
    updated: Date.now(),
    text: req.body.text,
    uri: req.body.uri,
    quote: req.body.quote,
    tags: req.body.tags,
    groups: req.body.groups,
    subgroups: req.body.subgroups,
    uuid: req.body.uuid,
    ranges: req.body.ranges,
    permissions: req.body.permissions
  });
  // console.log(annotation.permissions.read);

  annotation.save(function (err) {
    if (!err) {
      return console.log("Created annotation with uuid: "+ req.body.uuid);
    } else {
      return console.log(err);
    }
  });
  annotation.id = annotation._id;
  return res.send(annotation);
});

// PUT to UPDATE
// Bulk update: we won't really be doing this will we?
// Auth: Token required to update all annotations
// Permissions: users can update only their own annotations (handled by annotator)
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

// Single update: This is much more likely
// Auth: Token required to update one annotation
// Permissions: users can update only their own annotations (handled by annotator)
app.put('/api/annotations/:id', tokenOK, function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    annotation._id = req.body._id;
    annotation.id = req.body._id;
    annotation.user = req.body.user;
    annotation.username = req.body.username;
    annotation.consumer = req.body.consumer;
    annotation.annotator_schema_version = req.body.annotator_schema_version;
    annotation.created = req.body.created;
    annotation.updated = Date.now();
    annotation.text = req.body.text;
    annotation.uri = req.body.uri;
    annotation.quote = req.body.quote;
    annotation.tags = req.body.tags;
    annotation.groups = req.body.groups;
    annotation.subgroups = req.body.subgroups;
    annotation.uuid = req.body.uuid;
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
// Auth: Token required to delete all annotations
// NOTE: Can't think of a good use case -- commenting out. jF 09/06/2010
// Permissions: user can delete only own annotations (handled by annotator)
// app.delete('/api/annotations', tokenOK, function (req, res) {
//   AnnotationModel.remove(function (err) {
//     if (!err) {
//       console.log("removed");
//       return res.send('');
//     } else {
//       console.log(err);
//     }
//   });
// });


// Remove a single annotation
// Auth: Token required to delete one annotation
// Permissions: user can delete only own annotations (handled by annotator)
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
