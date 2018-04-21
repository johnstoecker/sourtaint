var http = require('express');
// may not want to use this one...
// const imdb = require('imdb-api');
const _ = require('lodash');
const request = require('request');
var mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient

//Lets define a port we want to listen to
const PORT=5002;

//Create a server
const express = require('express');
const app = express();

app.get('/shows', (req, res) => {
  res.set({"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers" : "Origin, X-Requested-With, Content-Type, Accept"});
  console.log(req.query.name)
  db.collection('shows').find({Title: req.query.name}).toArray((err, result) => {
    if (err) return console.log("error" + err)
    if (result.length > 0) {
      res.send(result)
    } else {
      request('http://www.omdbapi.com/?apikey='+ process.env.API_KEY + '&t=' + req.query.name, (error, response, body) => {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body);
        mainObject = JSON.parse(body)
        totalSeasons = mainObject.totalSeasons
        console.log(totalSeasons)

        // getSeason = (season, callback) => {
        //   request('http://www.omdbapi.com/?apikey='+ process.env.API_KEY + '&t=' + req.query.name + '&season=1', (error, response, body) => {
        //     console.log('error:', error); // Print the error if one occurred
        //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        //     console.log('body:', body);
        //     callback(null, JSON.parse(body))
        //     // db.collection('shows').insertOne(JSON.parse(body), (err, data) => {
        //     // })
        //   });
        // }

        function getSeason(season){
            return new Promise(resolve => {
              console.log('getting season' + season)
              request('http://www.omdbapi.com/?apikey='+ process.env.API_KEY + '&t=' + req.query.name + '&season='+season, (error, response, body) => {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                // console.log('body:', body);
                // console.log("resolving with" + body)
                var json = JSON.parse(body)
                var ratingTotal = 0
                var numRatings = 0
                for (var k=0; k<json.Episodes.length; k++) {
                  var ep = json.Episodes[k]
                  ep.Season = season
                  ep.Episode = parseInt(ep.Episode)
                  if (ep.imdbRating) {
                    ratingTotal += parseFloat(ep.imdbRating)
                    numRatings++
                  }
                }
                if(_.max(_.map(json.Episodes, "Episode")) > json.Episodes.length+1) {
                  json.incomplete = true
                }
                json.SeasonRating = {Season: season, Rating: (ratingTotal)/numRatings }
                resolve(json)
                // db.collection('shows').insertOne(JSON.parse(body), (err, data) => {
                // })
              });

            })
        };
        // map over forEach since it returns
        var actions = []
        for(var i = 1; i <= totalSeasons; i++) {
          actions.push(getSeason(i))
        }

        // we now have a promises array and we want to wait for it
        var results = Promise.all(actions); // pass array of promises

        mainObject.Episodes = []
        mainObject.SeasonRatings = []
        results.then((data) => {// or just .then(console.log)
          for(var j=0; j<data.length; j++) {
            if (data[j].incomplete) {
              mainObject.incomplete = true
            }
            if (data[j].Episodes) {
              mainObject.SeasonRatings = mainObject.SeasonRatings.concat(data[j].SeasonRating)
              mainObject.Episodes = mainObject.Episodes.concat(data[j].Episodes)
            }
          }
          mainObject.Episodes = _.sortBy(mainObject.Episodes, ['Season', 'Episode'])
          res.send(mainObject)
        });

        //
        // db.collection('shows').insertOne(JSON.parse(body), (err, data) => {
        //   res.send(body)
        // })
      });


      // request('http://www.omdbapi.com/?apikey='+ process.env.API_KEY + '&t=' + req.query.name + '&season=1', (error, response, body) => {
      //   console.log('error:', error); // Print the error if one occurred
      //   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      //   console.log('body:', body);
      //   db.collection('shows').insertOne(JSON.parse(body), (err, data) => {
      //     res.send(body)
      //   })
      // });

    }
  })
  // imdb.get('The Toxic Avenger', {apiKey: process.env.API_KEY, timeout: 30000}).then((err, data) => {
  //   res.send(err)
  // }).catch(console.log);

  // imdb.getReq({ name: 'Firefly', Season: 1, opts: {apiKey: process.env.API_KEY, timeout: 30000} }).then(things => {
  //     console.log(things)
  //     res.send(things)
  // });


  // imdb.get('How I Met Your Mother', {apiKey: process.env.API_KEY}).then(things => {
  //     things.episodes().then(res.send);
  // });
})

// var db;
//
MongoClient.connect('mongodb://localhost:27017', (err, client) => {
  if (err) return console.log(err)
  db = client.db('mytestingdb');
  app.listen(PORT, () => {
    console.log("Server listening on: http://localhost:%s", PORT);
  })
})
