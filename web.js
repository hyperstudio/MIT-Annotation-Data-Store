// Setup
var application_root = __dirname,
    secret = process.env.SECRET,
    port = process.env.PORT,
    db = process.env.DB,
    consumer = process.env.CONSUMER,
    version = process.env.VERSION,
    path = require("path"),
    mongoose = require('mongoose'),
    lessMiddleware = require('less-middleware'),
    jwt = require('jwt-simple'),
    express = require("express"),
    app = express();

// CORS
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Location');
    res.header('Access-Control-Allow-Headers', 'Content-Length, Content-Type, X-Annotator-Auth-Token, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Max-Age', '86400');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    } else {
        next();
    }
};

// Schemas
var Schema = mongoose.Schema;

// Annotation Ranges
var Ranges = new Schema({
    start: {
        type: String,
        required: true
    },
    end: {
        type: String,
        required: true
    },
    startOffset: {
        type: Number,
        required: false
    },
    endOffset: {
        type: Number,
        required: false
    }
});

var Shape = new Schema({
    type: {
        type: String,
        required: true
    },
    geometry: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        width: {
            type: Number,
            required: true
        },
        height: {
            type: Number,
            required: true
        }
    }
});

// Annotation Model
var Annotation = new Schema({
    id: {
        type: String,
        required: false
    },
    annotator_schema_version: {
        type: String,
        required: false,
        default: version
    },
    created: {
        type: Date,
        default: Date.now()
    },
    updated: {
        type: Date,
        default: Date.now()
    },
    user: {
        type: String,
        required: false
    },
    username: {
        type: String,
        required: false
    },
    text: {
        type: String,
        required: false
    },
    quote: {
        type: String,
        required: false
    },
    uri: {
        type: String,
        required: false
    },
    src: {
        type: String,
        required: false
    },
    shapes: [Shape],
    uuid: {
        type: String,
        required: false
    },
    parentIndex: {
        type: String,
        required: false
    },
    groups: [String],
    subgroups: [String],
    ranges: [Ranges],
    tags: [String],
    permissions: {
        read: [String],
        admin: [String],
        update: [String],
        delete: [String]
    },
    annotation_categories: [Number],
    sort_position: {
      type: String,
      required: false
    }
});

var AnnotationModel = mongoose.model('Annotation', Annotation);

// DB
mongoose.connect(db);

// config
app.configure(function() {
    app.use(allowCrossDomain);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(lessMiddleware({
        src: __dirname + '/public',
        compress: true
    }));

    app.use(express.static(path.join(application_root, "public")));
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

Annotation.pre('save', function(next) {
    this.id = this._id;
    next();
});

// ROUTES
app.get('/api', function(req, res) {
    res.send('Annotations API is running');
});

// Search annotations
app.get('/api/search', tokenOK, function(req, res) {
    var query;
    var re = new RegExp(req.query.host, 'i');
    switch (req.query.context) {
      case 'document':
        query = AnnotationModel.find({
          'uri': req.query.uri.replace(/\/$/, '')
        });
        break;
      case 'dashboard':
        query = AnnotationModel.find();
        query.where('uri').regex(re);
        break;
      case 'public':
        query = AnnotationModel.find();
        var pattern = new RegExp("\/public\/(.+)$", 'i');
        var match = pattern.exec(req.query.uri.replace(/\/$/, ''));
        var slug = match[1];
        query.where('uri').regex(new RegExp(slug, "i"));
        break;
      case 'search':
        query = AnnotationModel.find();
        query.where('uri').regex(re);
        if (req.query.uri) {
            query.where('uri').equals(req.query.uri);
        }
        break;
    }

    switch (req.query.mode) {
        case 'user':
            query.where('user').equals(req.query.user);
            break;
        case 'group':
            query.where('subgroups'). in (req.query.subgroups);
            query.$where('this.permissions.read.length < 1');
            break;
        case 'class':
            query.where('groups'). in (req.query.groups);
            query.$where('this.permissions.read.length < 1');
            break;
        case 'admin':
            break;
    }

    if (req.query.tags) {
        query.where('tags'). in (req.query.tags.split(/[\s,]+/));
    }
    if (req.query.annotation_categories) {
        query.where('annotation_categories'). in (req.query.annotation_categories);
    }

    query.limit(req.query.limit);

    if (req.query.sidebar || req.query.context == "dashboard" || req.query.context == "search") {
      query.exec(function(err, annotations) {
        if (!err) {
          if (annotations.length > 0) {
            return res.send(annotations);
          }
          else {
            return res.send(204, 'Successfully deleted annotation.');
          }
        }
        else {
          return console.log(err);
        }
      });
    }
    else {
      query.exec(function(err, annotations) {
        if (!err) {
          // console.info(annotations);
          if (annotations.length > 0) {
            return res.send({
              'rows': annotations
            });
          }
          else {
            return res.send(204, 'Successfully deleted annotation.');
          }
        }
        else {
          return console.log(err);
        }
      });
    }
});


// List annotations
app.get('/api/annotations', tokenOK, function(req, res) {
    return AnnotationModel.find(function(err, annotations) {
        if (!err) {
            return res.send(annotations);
        } else {
            return console.log(err);
        }
    });
});

// Single annotation
app.get('/api/annotations/:id', tokenOK, function(req, res) {
    return AnnotationModel.findById(req.params.id, function(err, annotation) {
        if (!err) {
            return res.send(annotation);
        } else {
            return console.log(err);
        }
    });
});

// POST to CREATE
app.post('/api/annotations', tokenOK, function(req, res) {
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
        src: req.body.src,
        quote: req.body.quote,
        tags: req.body.tags,
        groups: req.body.groups,
        subgroups: req.body.subgroups,
        uuid: req.body.uuid,
        parentIndex: req.body.parentIndex,
        ranges: req.body.ranges,
        shapes: req.body.shapes,
        permissions: req.body.permissions,
        annotation_categories: req.body.annotation_categories,
        sort_position: req.body.sort_position
    });

    annotation.save(function(err) {
        if (!err) {
            return console.log("Created annotation with uuid: " + req.body.uuid);
        } else {
            return console.log(err);
        }
    });
    annotation.id = annotation._id;
    return res.send(annotation);
});

app.post('/api/annotations/positions', tokenOK, function(req, res) {
    for(annotation_id in req.body.sort_positions) {
        AnnotationModel.update({ uuid: annotation_id }, { $set: { sort_position: req.body.sort_positions[annotation_id] }}, function() { });
    }
    res.send('Positions have been updated');
});

// PUT to UPDATE
// Single update
app.put('/api/annotations/:id', tokenOK, function(req, res) {
    return AnnotationModel.findById(req.params.id, function(err, annotation) {
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
        annotation.url = req.body.url;
        annotation.shapes = req.body.shapes;
        annotation.quote = req.body.quote;
        annotation.tags = req.body.tags;
        annotation.groups = req.body.groups;
        annotation.subgroups = req.body.subgroups;
        annotation.uuid = req.body.uuid;
        annotation.parentIndex = req.body.parentIndex;
        annotation.ranges = req.body.ranges;
        annotation.permissions = req.body.permissions;
        annotation.annotation_categories = req.body.annotation_categories;
        annotation.sort_position = req.body.sort_position;

        return annotation.save(function(err) {
            if (!err) {
                console.log("updated");
            } else {
                console.log(err);
            }
            return res.send(annotation);
        });
    });
});

// Remove an annotation
app.delete('/api/annotations/:id', tokenOK, function(req, res) {
    return AnnotationModel.findById(req.params.id, function(err, annotation) {
        return annotation.remove(function(err) {
            if (!err) {
                console.log("removed");
                return res.send(204, 'Successfully deleted annotation.');
            } else {
                console.log(err);
            }
        });
    });
});

// Authentication
function tokenOK(req, res, next) {
    try {
        var decoded = jwt.decode(req.header('x-annotator-auth-token'), secret);
        if (inWindow(decoded)) {
            console.log("Token in time window");
        } else {
            console.log("Token not in in time window.");
        }
        next();
    } catch (err) {
        console.log("Error decoding token:");
        console.log(err);
        return res.send("There was a problem with your authentication token");
    }
};

function inWindow(decoded, next) {
    var issuedAt = decoded.issuedAt;
    var ttl = decoded.ttl;
    var issuedSeconds = new Date(issuedAt) / 1000;
    var nowSeconds = new Date().getTime() / 1000;
    var diff = ((nowSeconds - issuedSeconds));
    var result = (ttl - diff);
    console.log("Time left on token: about " + Math.floor(result / (60 * 60)) + " hours.");
    return ((result > 0) ? true : false);
}

// launch server
app.listen(port, function() {
    console.log("Listening on " + port);
});
