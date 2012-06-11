var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose');

var app = express.createServer();

// database

mongoose.connect('mongodb://localhost/annotationdb');

// config

app.configure(function () {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
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

var Tags = new Schema({
    name: String
});

// Annotation Model
// TODO:
// Validation issues with dates, and with user string
var Annotation = new Schema({
    id: Schema.ObjectId,
    consumer: { type: String, default: "annotationstudio" },
    annotator_schema_version: { type: String, required: true, default: "v1.0" },
//    created: { type: Date, default: Date.now },
//    updated: { type: Date, default: Date.now },
    user: { type: String, required: true },
    text: { type: String, required: true },         
    quote: { type: String, required: true },    
    uri: { type: String, required: true },           
    ranges: [Ranges],
    tags: [Tags]
    //    permissions: [Permissions],
});

/*
var Permissions = new Schema({
    read: ,
    admin: ,
    update: ,
    delete: 
});

var People = new Schema({
    user: User,
    group: String,
});
*/


/* OLD
var Annotation = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    style: { type: String, unique: true },
    images: [Images],
    categories: [Categories],
    catalogs: [Catalogs],
    variants: [Variants],
    modified: { type: Date, default: Date.now }
});
*/

// validation
/*
Annotation.path('title').validate(function (v) {
    console.log("validate title");
    console.log(v);
    return v.length > 10 && v.length < 70;
});

Annotation.path('style').validate(function (v) {
    console.log("validate style");
    console.log(v);
    return v.length < 40;
}, 'Annotation style attribute is should be less than 40 characters');

Annotation.path('description').validate(function (v) {
    console.log("validate description");
    console.log(v);
    return v.length > 10;
}, 'Annotation description should be more than 10 characters');
*/

var AnnotationModel = mongoose.model('Annotation', Annotation);

// REST api
app.get('/api', function (req, res) {
  res.send('Annotations API is running');
});

// POST to CREATE
app.post('/api/annotations', function (req, res) {
  var annotation;
  console.log("POST: ");
  console.log(req.body);
  annotation = new AnnotationModel({
    consumer: req.body.consumer,
    annotator_schema_version: req.body.annotator_schema_version,
    updated: Date.now,
    text: req.body.text,
    uri: req.body.uri,
    quote: req.body.quote,
    tags: req.body.tags,
    ranges: req.body.ranges,
  });
  annotation.save(function (err) {
    if (!err) {
      return console.log("created");
    } else {
      return console.log(err);
    }
  });
  return res.send(annotation);
});

// PUT to UPDATE

// Bulk update
app.put('/api/annotations', function (req, res) {
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
app.put('/api/annotations/:id', function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    annotation.consumer = req.body.consumer;
    annotation.annotator_schema_version = req.body.annotator_schema_version;
    annotation.updated = Date.now;
    annotation.text = req.body.text;
    annotation.uri = req.body.uri;
    annotation.quote = req.body.quote;
    annotation.tags = req.body.tags;
    annotation.ranges = req.body.ranges;

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

// GET to READ

// List annotations
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
app.get('/api/annotations/:id', function (req, res) {
  return AnnotationModel.findById(req.params.id, function (err, annotation) {
    if (!err) {
      return res.send(annotation);
    } else {
      return console.log(err);
    }
  });
});

// DELETE to DESTROY

// Bulk destroy all annotations
app.delete('/api/annotations', function (req, res) {
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
app.delete('/api/annotations/:id', function (req, res) {
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

app.listen(4242);
console.log('> http server has started on port 4242');
