#  MIT Annotation Data Store
Data Store and RESTful web API for Annotation Studio, compatible with OKFN Annotator. See: https://github.com/okfn/annotator

##  Derivation
### An alternative to OKFN annotator-store
https://github.com/okfn/annotator-store

## Setup
### Using Heroku
+ Create a heroku app `heroku apps:create $appname`
+ Add the Heroku add-on MongoLab `heroku addons:add mongolab`
+ Get MongoLab configuration settings `heroku config:pull`
+ Edit the file named `.env` replace the word `MONGOLAB_URI` with `DB`
+ Tell Heroku about your environment:

    ```heroku config:add `cat .env` ```

### Using OpenShift

    rhc app create APP_NAME nodejs mongodb-2.2 --env SECRET=YOUR_SECRET_KEY CONSUMER=YOUR_CONSUMER_KEY --from-code=https://github.com/ryanj/MIT-Annotation-Data-Store.git

## Dependencies
### OKFN Annotator
https://github.com/okfn/annotator/

## Other
See package.json (NOTE: you will need the versions of node and npm specified in that package file).

## Installation
See https://github.com/hyperstudio/MIT-Annotation-Data-Store/wiki/Installation

## Author
- Lab: MIT HyperStudio
- http://hyperstudio.mit.edu/
- Developer: Jamie Folsom
- jfolsom@mit.edu

## License
GPL2
&copy; MIT 2013
