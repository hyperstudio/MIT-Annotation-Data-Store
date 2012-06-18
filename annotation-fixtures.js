jQuery.post("/api/annotations", {
  "user": "jamiefolsom",
  "updated": Date.now(),
  "links": [
    {
      "href": "http://annotateit.org/annotations/CTN4CZ9UTdGboC8jYeXX4g", 
      "type": "text/html", 
      "rel": "alternate"
    }
  ], 
  "tags": [ 
  {
	"name": "Nantucket"
  },
  {
	"name": "Sailor"
  },
  {
	"name": "Ship"
  }
  ], 
  "quote": "streets and avenues\u2014north, east, south, and west. Yet here they all unite. Tell me, does the magnetic virtue of the needles of the compasses of all those ships attract them thither?\n\nOnce more. Say you are in the country; in some high land of lakes. Ta", 
  "ranges": [
    {
      "start": "/div/div/p[2]", 
      "end": "/div/div/p[2]", 
      "startOffset": 2612, 
      "endOffset": 2865
    }, 
    {
      "start": "/div/div/p[2]", 
      "end": "/div/div/p[2]", 
      "startOffset": 2610, 
      "endOffset": 2860
    }
  ], 
  "permissions": {
    "read": [
      6, "group:__world__"
    ], 
    "admin": [
      6, ""
	], 
    "update": [
      6, ""
	], 
    "delete": [
      6, ""
	]
  }, 
  "created": Date.now(), 
  "uri": "http://blooming-samurai-2296.herokuapp.com/collections/3/documents/3", 
  "text": "asdf", 
  "consumer": "annotationstudio"
}, function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});

// OR
$.ajax({'type': 'DELETE', "url": "http://localhost:5000/api/annotations"}).done(function(data, textStatus, jqXHR) { 
    console.log("Delete response:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});
