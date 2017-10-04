(function() {

var BASE_ENDPOINT = 'https://riipen.mediacore.tv';
var AUTH = 'riipenchallenge@mediacore.com:riipenchallenge';
var AUTOPLAY = true;

// Fetch the given resource from the API and decode the response body as JSON.
// Uses XMLHttpRequest2, may need changes to support IE<11
function fetchResource(path, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', BASE_ENDPOINT + path)

  // Doesn't appear to be required, but send Basic Auth header anyways
  xhr.setRequestHeader('Authorization', 'Basic ' + btoa(AUTH));

  xhr.onload = function() {
    if(xhr.status == 200) {
      var data = JSON.parse(xhr.responseText);
      callback(null, data);
    } else {
      callback(new Error('Failed to load, HTTP code ' + xhr.status));
    }
  }
  xhr.onerror = function() {
      callback(new Error('Failed to load URL: ' + BASE_ENDPOINT + path));
  }
  xhr.send();
}

// Represents a list of videos that can be moved forward or backward
function Playlist() {
  this.urls = [];
  this.index = 0;
}

// Initializes the list of URLs in the Playlist by fetching them from the API
Playlist.prototype.load = function(callback) {
  var urls = this.urls;

  fetchResource('/api2/media', function(err, data) {
    if(err) {
      return displayError('Error loading media playlist: ' + err.message);
    }

    for(i=0; i<data.items.length; i++) {
      // construct URL for fetching all video details along with the embed code
      var item = data.items[i];
      var itemURL = item.links.self + '?joins=embedcode';

      urls.push(itemURL);
    }

    clearError();
    callback();
  });
}

// Fetches the current video URL
Playlist.prototype.current = function(callback) {
  return this.urls[this.index];
}

// Advances to the next video in the Playlist, wrapping around at the end
Playlist.prototype.forward = function(callback) {
  var count = this.urls.length;
  this.index = (this.index + 1) % count;
}

// Go to the previous video in the Playlist, wrapping around at the beginning
Playlist.prototype.back = function(callback) {
  var count = this.urls.length;
  this.index = (((this.index - 1) % count) + count) % count;
}

// Represents the video player. Loads videos as iframe embed codes into a
// container div, and displays the title and description.
function Video(containerElement) {
  this.titleDiv = containerElement.querySelector('.video_player__title');
  this.descriptionDiv = containerElement.querySelector('.video_player__description');
  this.videoDiv = containerElement.querySelector('.video_player__video');
}

// Load the details of a video URL from the API and display it in the container.
// Returns a playerjs.Player instance to the callback to control the video player.
Video.prototype.load = function(url, callback) {
  if(typeof url === 'undefined') { return; }
  var self = this;

  fetchResource(url, function(err, data) {
    if(err) {
      return displayError('Error loading video:' + err.message);
    }

    var title = data.title;
    var description = data.description_plain;
    var embedcode = data.joins.embedcode.html;

    // Update the DOM elements with video details and embedded player
    self.titleDiv.innerText = title;
    self.descriptionDiv.innerText = description;
    self.videoDiv.innerHTML = embedcode;
    var iframe = self.videoDiv.querySelector('iframe');

    var player = playerjs.Player(iframe);

    clearError();
    callback(player);
  });
}

// Displays an error message
function displayError(err) {
  var div = document.querySelector('#error');
  div.innerText = err;
  div.className = 'error error--visible';
}

// Clears any existing error message and hides the box
function clearError() {
  var div = document.querySelector('#error');
  div.innerText = '';
  div.className = 'error';
}

function initialize() {
  var playlist = new Playlist();
  var playerContainer = document.getElementById('player');
  var video = new Video(playerContainer);

  var setupAutoPlay = function(player) {
    if(!AUTOPLAY) { return; }

    // Automatically play the video
    player.on('ready', function() {
      player.play();

      // Advance to next video when finished
      player.on('ended', function() {
        playlist.forward();
        video.load(playlist.current(), setupAutoPlay);
      });
    });
  };

  playlist.load(function() {

    // Play the first video
    video.load(playlist.current(), setupAutoPlay);

    // When skip button is clicked, play the next video
    playerContainer.querySelector('.video_player__skip').addEventListener('click', function() {
      playlist.forward();
      video.load(playlist.current(), setupAutoPlay);
    }, false);

    // When back button is clicked, play the previous video
    document.querySelector('.video_player__back').addEventListener('click', function() {
      playlist.back();
      video.load(playlist.current(), setupAutoPlay);
    }, false);

  });
}

window.addEventListener('load', initialize, false);

})();
