jQuery.post("/api/annotations", {
  "title": "My Awesome T-shirt",  
  "description": "All about the details. Of course it's black.",  
  "images": [  
    {  
      "kind": "thumbnail",  
      "url": "images/annotations/1234/main.jpg"  
    }  
  ],  
  "categories": [  
      { "name": "Clothes" },
      { "name": "Shirts" } 
  ],  
  "style": "1234",  
  "variants": [  
    {  
      "color": "Black",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/annotations/1234/thumbnail.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/annotations/1234/black.jpg"  
        }  
      ],  
      "sizes": [  
        {  
          "size": "S",  
          "available": 10,  
          "sku": "CAT-1234-Blk-S",  
          "price": 99.99  
        },
        {
          "size": "M",  
          "available": 7,  
          "sku": "CAT-1234-Blk-M",  
          "price": 109.99  
        }  
      ]  
    }  
  ],
  "catalogs": [
      { "name": "Apparel" }
  ]  
}, function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});

// ---

jQuery.post("/api/annotations", {
  "title": "My Other T-shirt",  
  "description": "All about the details. Almost as nice as my Awesome T-Shirt",  
  "images": [  
    {  
      "kind": "thumbnail",  
      "url": "images/annotations/1235/main.jpg"  
    }  
  ],  
  "categories": [  
      { "name": "Clothes" },
      { "name": "Shirts" } 
  ],  
  "style": "1235",  
  "variants": [  
    {  
      "color": "Blue",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/annotations/1235/thumbnail.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/annotations/1235/blue.jpg"  
        }  
      ],  
      "sizes": [  
        {  
          "size": "S",  
          "available": 8,  
          "sku": "CAT-1235-Blu-S",  
          "price": 79.99  
        },
        {
          "size": "M",  
          "available": 9,  
          "sku": "CAT-1235-Blu-M",  
          "price": 89.99  
        },
        {
          "size": "L",  
          "available": 12,  
          "sku": "CAT-1235-Blu-L",  
          "price": 99.99  
        }  
      ]  
    }  
  ],
  "catalogs": [
      { "name": "Apparel" }
  ]  
}, function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});

// ---

jQuery.post("/api/annotations", {
  "title": "My Gray T-shirt",  
  "description": "All about the details. Not too much color here, just gray.",  
  "images": [  
    {  
      "kind": "thumbnail",  
      "url": "images/annotations/1236/main.jpg"  
    }  
  ],  
  "categories": [  
      { "name": "Clothes" },
      { "name": "Shirts" } 
  ],  
  "style": "1236",  
  "variants": [  
    {  
      "color": "Gray",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/annotations/1236/thumbnail.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/annotations/1236/gray.jpg"  
        }  
      ],  
      "sizes": [  
        {  
          "size": "S",  
          "available": 25,  
          "sku": "CAT-1236-Gra-S",  
          "price": 19.99  
        },
        {
          "size": "L",  
          "available": 16,  
          "sku": "CAT-1236-Gra-L",  
          "price": 29.99  
        }  
      ]  
    }  
  ],
  "catalogs": [
      { "name": "Apparel" }
  ]  
}, function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});

// ---

jQuery.post("/api/annotations", {
  "title": "My Red Hot T-shirt",  
  "description": "All about the details. Red Hot T, get 'em while they're hot.",  
  "images": [  
    {  
      "kind": "thumbnail",  
      "url": "images/annotations/1237/main.jpg"  
    }  
  ],  
  "categories": [  
      { "name": "Clothes" },
      { "name": "Shirts" } 
  ],  
  "style": "1237",  
  "variants": [  
    {  
      "color": "Red",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/annotations/1237/thumbnails/red.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/annotations/1237/red.jpg"  
        }  
      ],  
      "sizes": [  
        {  
          "size": "S",  
          "available": 25,  
          "sku": "CAT-1237-Red-S",  
          "price": 19.99  
        },
        {
          "size": "L",  
          "available": 16,  
          "sku": "CAT-1237-Red-L",  
          "price": 29.99  
        }  
      ]  
    },
    {  
      "color": "White",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/annotations/1237/thumbnails/white.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/annotations/1237/white.jpg"  
        }  
      ],  
      "sizes": [  
        {  
          "size": "M",  
          "available": 7,  
          "sku": "CAT-1237-Whi-M",  
          "price": 18.99  
        },
        {
          "size": "L",  
          "available": 8,  
          "sku": "CAT-1237-Whi-L",  
          "price": 27.99  
        }  
      ]  
    }  
  ],
  "catalogs": [
      { "name": "Apparel" }
  ]  
}, function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR); 
});