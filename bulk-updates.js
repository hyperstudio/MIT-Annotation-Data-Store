jQuery.get("/api/annotation", function(data, textStatus, jqXHR) { 
    var ids = [];
    console.log("product ids:"); 
    $.each(data, function () {
        ids.push(this._id);
    });
    console.dir(ids);
    // 0: "4f3cc9189760db17520000e6"
    // 1: "4f3cc91f9760db17520000f0"
    // 2: "4f3cc9279760db17520000fb"
    // 3: "4f3cc92f9760db1752000105"
});

/* 
boilerplate for bulk update, replace null with product object

jQuery.ajax({
    url: "/api/annotation", 
    type: "PUT",
    data: { 
        "annotation": [
            { 
              "4f3cc9189760db17520000e6" : null
            },
            { 
              "4f3cc91f9760db17520000f0" : null
            },
            { 
              "4f3cc9279760db17520000fb" : null
            },
            { 
              "4f3cc92f9760db1752000105" : null
            },
        ]
    },
    success: function(data, textStatus, jqXHR) { 
        console.log("PUT resposne:"); 
        console.dir(data); 
        console.log(textStatus); 
        console.dir(jqXHR); 
    }
});

*/

jQuery.ajax({
    url: "/api/annotation", 
    type: "PUT",
    data: { 
        "annotation": [
            { 
              "4f3cc9189760db17520000e6" :   {
                  "title": "My Awesome T-shirt - UPDATED",  
                  "description": "All about the details. Of course it's black.",  
                  "images": [  
                    {  
                      "kind": "thumbnail",  
                      "url": "images/annotation/1234/main.jpg"  
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
                          "url": "images/annotation/1234/thumbnail.jpg"  
                        },
                        {  
                          "kind": "catalog",  
                          "url": "images/annotation/1234/black.jpg"  
                        }  
                      ],  
                      "sizes": [  
                        {  
                          "size": "S",  
                          "available": 10,  
                          "sku": "CAT-1234-Blk-S",  
                          "price": 29.99  
                        },
                        {
                          "size": "M",  
                          "available": 7,  
                          "sku": "CAT-1234-Blk-M",  
                          "price": 19.99  
                        }  
                      ]  
                    }  
                  ],
                  "catalogs": [
                      { "name": "Apparel" }
                  ]  
                }
            },
            { 
              "4f3cc91f9760db17520000f0" :   {
                  "title": "My Other T-shirt - UPDATED",  
                  "description": "All about the details. Almost as nice as my Awesome T-Shirt",  
                  "images": [  
                    {  
                      "kind": "thumbnail",  
                      "url": "images/annotation/1235/main.jpg"  
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
                          "url": "images/annotation/1235/thumbnail.jpg"  
                        },
                        {  
                          "kind": "catalog",  
                          "url": "images/annotation/1235/blue.jpg"  
                        }  
                      ],  
                      "sizes": [  
                        {  
                          "size": "S",  
                          "available": 8,  
                          "sku": "CAT-1235-Blu-S",  
                          "price": 19.99  
                        },
                        {
                          "size": "M",  
                          "available": 9,  
                          "sku": "CAT-1235-Blu-M",  
                          "price": 29.99  
                        },
                        {
                          "size": "L",  
                          "available": 12,  
                          "sku": "CAT-1235-Blu-L",  
                          "price": 39.99  
                        }  
                      ]  
                    }  
                  ],
                  "catalogs": [
                      { "name": "Apparel" }
                  ]  
                }
            },
            { 
              "4f3cc9279760db17520000fb" :   {
                  "title": "My Gray T-shirt - UPDATED",  
                  "description": "All about the details. Not too much color here, just gray.",  
                  "images": [  
                    {  
                      "kind": "thumbnail",  
                      "url": "images/annotation/1236/main.jpg"  
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
                          "url": "images/annotation/1236/thumbnail.jpg"  
                        },
                        {  
                          "kind": "catalog",  
                          "url": "images/annotation/1236/gray.jpg"  
                        }  
                      ],  
                      "sizes": [  
                        {  
                          "size": "S",  
                          "available": 25,  
                          "sku": "CAT-1236-Gra-S",  
                          "price": 14.99  
                        },
                        {
                          "size": "L",  
                          "available": 16,  
                          "sku": "CAT-1236-Gra-L",  
                          "price": 24.99  
                        }  
                      ]  
                    }  
                  ],
                  "catalogs": [
                      { "name": "Apparel" }
                  ]  
                }
            },
            { 
              "4f3cc92f9760db1752000105" :   {
                  "title": "My Red Hot T-shirt - UPDATED",  
                  "description": "All about the details. Red Hot T, get 'em while they're hot.",  
                  "images": [  
                    {  
                      "kind": "thumbnail",  
                      "url": "images/annotation/1237/main.jpg"  
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
                          "url": "images/annotation/1237/thumbnails/red.jpg"  
                        },
                        {  
                          "kind": "catalog",  
                          "url": "images/annotation/1237/red.jpg"  
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
                          "url": "images/annotation/1237/thumbnails/white.jpg"  
                        },
                        {  
                          "kind": "catalog",  
                          "url": "images/annotation/1237/white.jpg"  
                        }  
                      ],  
                      "sizes": [  
                        {  
                          "size": "M",  
                          "available": 7,  
                          "sku": "CAT-1237-Whi-M",  
                          "price": 9.99  
                        },
                        {
                          "size": "L",  
                          "available": 8,  
                          "sku": "CAT-1237-Whi-L",  
                          "price": 21.99  
                        }  
                      ]  
                    }  
                  ],
                  "catalogs": [
                      { "name": "Apparel" }
                  ]  
                }
            }
        ]
    },
    success: function(data, textStatus, jqXHR) { 
        console.log("PUT resposne:"); 
        console.dir(data); 
        console.log(textStatus); 
        console.dir(jqXHR); 
    }
});