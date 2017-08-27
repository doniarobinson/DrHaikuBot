// on Heroku, use environment variables; if on localhost, use config-private file that does not get deployed
var configfile = (process.env.consumer_key === undefined) ? './config-private.js' : './config.js';
var config = require(configfile);

var request = require('superagent');
var randomWords = require('random-words');
var Twit = require('twit');
var T = new Twit(config);

// Promise
var getWords = function(word) {
  return new Promise(function(resolve, reject) {
    var queryParam = ["ml", "rel_bgb", "rel_bga", "rel_trg"];
    const randIndex = Math.floor(Math.random() * queryParam.length);

    console.log("Query parameter: " + queryParam[randIndex]);

    var wordUrl = "http://api.datamuse.com/words?" + queryParam[randIndex] + "=" + word + "&md=sp&v=enwiki";
     
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

var writeHaiku = function(wordList) {
  let currentSyllables = [5,7,5];
  let h=0;

  let i = 0;
  let wordSyllables = 0;
  let result = "";

  for (var j=0; j<currentSyllables.length; j++) {
    while (currentSyllables[h] > 0) {
      wordSyllables = wordList[i].numSyllables;

      if (wordSyllables <= currentSyllables[h]) {
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


// post immediately
try {
  let randomHaikuTopic = randomWords();
  console.log(randomHaikuTopic);
  haiku(randomHaikuTopic);
}
catch (e) {
  console.log(e);
}

// then post every hour
setInterval(function() {
  try {
    let randomHaikuTopic = randomWords();
    console.log(randomHaikuTopic);
    haiku(randomHaikuTopic);
  }
  catch (e) {
    console.log(e);
  }
}, 1*60*60*1000);