// jQuery snippets used in the console to use the REST api created with app.js

// CREATE

jQuery.post("/api/products", {
  "title": "My Awesome T-shirt",  
  "description": "All about the details. Of course it's black.",  
  "images": [  
    {  
      "kind": "thumbnail",  
      "url": "images/products/1234/main.jpg"  
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
          "url": "images/products/1234/thumbnail.jpg"  
        },
        {  
          "kind": "catalog",  
          "url": "images/products/1234/black.jpg"  
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

// generated a product document with automatically assigned ID, e.g. 4f34734d21289c1c28000007 


// READ

jQuery.get("/api/products/", function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); 
    console.dir(data); 
    console.log(textStatus); 
    console.dir(jqXHR); 
});

jQuery.get("/api/products/4f34734d21289c1c28000007", function(data, textStatus, jqXHR) { 
    console.log("Post resposne:"); 
    console.dir(data); 
    console.log(textStatus); 
    console.dir(jqXHR); 
});

// UPDATE

jQuery.ajax({
    url: "/api/products/4f34734d21289c1c28000007", 
    type: "PUT",
    data: {
      "title": "My Awesome T-shirt",  
      "description": "All about the details. Of course it's black, and longsleeve.",  
      "images": [  
        {  
          "kind": "thumbnail",  
          "url": "images/products/1234/main.jpg"  
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
              "kind": "zoom",  
              "url": "images/products/1234/zoom.jpg"  
            }
          ],  
          "sizes": [  
            {  
              "size": "L",  
              "available": 77,  
              "sku": "CAT-1234-Blk-L",  
              "price": 99.99  
            }
          ]  
        }  
      ],
      "catalogs": [
          { "name": "Apparel" }
      ]  
    }, 
    success: function(data, textStatus, jqXHR) { 
        console.log("PUT resposne:"); 
        console.dir(data); 
        console.log(textStatus); 
        console.dir(jqXHR); 
    }
});

// Delete

jQuery.ajax({url: "/api/products/4f34734d21289c1c28000007", type: "DELETE", success: function(data, textStatus, jqXHR) { console.dir(data); }});
