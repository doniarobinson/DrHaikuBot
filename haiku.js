// on Heroku, use environment variables; if on localhost, use config-private file that does not get deployed
var configfile = (process.env.consumer_key === undefined) ? './config-private.js' : './config.js';
var config = require(configfile);

var request = require('superagent');
var randomWords = require('random-words');
var Twit = require('twit');
var T = new Twit(config);

const myId = 'DrHaikuBot';
//const myId = 'doniamaebot';

// Setting up a user stream
var stream = T.stream('user');



// Promise
var getWords = function(word) {
  return new Promise(function(resolve, reject) {
    var queryParam = ["ml", "rel_bgb", "rel_bga", "rel_trg"];

    var randIndex = 0;

    // if phrase is only one word, can choose a random query type
    if (word.indexOf('+') < 0) {
      randIndex = Math.floor(Math.random() * queryParam.length);
    }

    console.log("Query parameter: " + queryParam[randIndex]);

    var wordUrl = "http://api.datamuse.com/words?" + queryParam[randIndex] + "=" + word + "&md=sp&v=enwiki";
    console.log(wordUrl);
     
    request
      .get(wordUrl)
      .end(function(worderror, wordresult) {
        if (wordresult) {
          resolve(wordresult.body);
        } else {
          reject(worderror);
        }
      });
    });
}

function shuffle(arr) {
    var i,
        j,
        temp;
    for (i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;    
};

function hasNumber(myString) {
  return /\d/.test(myString);
}

var writeHaiku = function(wordList) {
  let currentSyllables = [5,7,5];
  let h=0;

  let i = 0;
  let wordSyllables = 0;
  let result = "";

  for (var j=0; j<currentSyllables.length; j++) {
    while (currentSyllables[h] > 0) {
      wordSyllables = wordList[i].numSyllables;

      if ((wordSyllables <= currentSyllables[h]) && (!hasNumber(wordList[i]))) {
        result += wordList[i].word + " ";
        currentSyllables[h] -= wordSyllables;
      }
      i++;
    }
    h++;
    result += "\n";
  }

  return result;
}

function tweetMessage(filename,tweettext) {

    T.postMediaChunked({
      //file_path: filename
    }, function(err, data, response) {

        //var idstring = data.media_id_string;
        var params = {
          status: tweettext,
          //media_ids: [idstring]
        };

        T.post('statuses/update', params, function(twittererror, tweet, twitterresponse) {
          if (twitterresponse) {
            if (twittererror) {
              console.log('Twitter returned this error: ', twittererror);
            }
            else {
              console.log('Tweet was posted');
            }
          }
        });
    });
}

var haiku = function(word) {
  getWords(word)
    .then(function (words) {
      let wordsArray = Array.from(words);
      let shuffledArray = shuffle(wordsArray);
      let tweetText = word + " #haiku\n\n" + writeHaiku(shuffledArray);
      console.log(tweetText);
      tweetMessage('',tweetText);
    })
    .catch(function (error) {
      console.log("Error: " + error.message);
    });
};

function main() {
  try {
    let randomHaikuTopic = randomWords();
    console.log(randomHaikuTopic);
    haiku(randomHaikuTopic);
  }
  catch (e) {
    console.log(e);
  }
}

// post immediately
main();

// then post every 2 hours
setInterval(function() {
  main();
}, 2*60*60*1000);


// Now looking for tweet events
// See: https://dev.twitter.com/streaming/userstreams
stream.on('tweet', tweetEvent);

// Here a tweet event is triggered!
function tweetEvent(tweet) {

  // If we wanted to write a file out
  // to look more closely at the data
  // var fs = require('fs');
  // var json = JSON.stringify(tweet,null,2);
  console.log(JSON.stringify(tweet,null,2));
  // fs.writeFile("tweet.json", json, output);

  // Who is this in reply to?
  var reply_to = tweet.in_reply_to_screen_name;
  // Who sent the tweet?
  var name = tweet.user.screen_name;
  // What is the text?
  var txt = tweet.text;
  // If we want the conversation thread
  var id = tweet.id_str;

  // Ok, if this was in reply to me
  // Tweets by me show up here too
  if (reply_to === myId) {

    // Get rid of the @ mention

    txt = txt.substring(txt.indexOf(' ') + 1);
    txt = txt.replace(/ /g,'+');
    console.log(txt);

    // Start a reply back to the sender
    var replyText = '@' + name + ' ';

  getWords(txt)
    .then(function (words) {
      let wordsArray = Array.from(words);
      let shuffledArray = shuffle(wordsArray);
      replyText += txt.replace(/\+/g,' ') + " #haiku\n\n" + writeHaiku(shuffledArray);
      console.log(replyText);
      
//      tweetMessage('',tweetText);
      // Post that tweet
      T.post('statuses/update', { status: replyText, in_reply_to_status_id: id}, tweeted);

      // Make sure it worked!
      function tweeted(err, reply) {
        if (err) {
          console.log(err.message);
        } else {
          console.log('Tweeted: ' + reply.text);
        }
      }

    })
    .catch(function (error) {
      console.log("Error: " + error.message);
    });

  }
}