import { Meteor } from 'meteor/meteor';
import { SpotifyWebApi } from 'meteor/xinranxiao:spotify-web-api';

// Playlists = new Mongo.Collection('playlists');

Meteor.startup(() => {
  ServiceConfiguration.configurations.update(
    { "service": "spotify" },
    {
      $set: {
        "clientId": Meteor.settings.spotifyClientId,
        "secret": Meteor.settings.spotifySecret
      }
    },
    { upsert: true }
  );
});

Meteor.methods({
  getPlaylists: function() {
    var spotifyApi = new SpotifyWebApi()
    var response = spotifyApi.getUserPlaylists(Meteor.user().services.spotify.id, {limit: 50})

    if (checkTokenRefreshed(response, spotifyApi)) {
      var response = spotifyApi.getUserPlaylists(Meteor.user().services.spotify.id, {limit: 50})
    }
    // console.log(response);
    return response.data.body.items
  },

  insertPlaylists: function(newPlaylists){
    // console.log(newPlaylists);
    newPlaylists.forEach(function(playlist){
      if (Playlists.findOne({userId: Meteor.userId(), spotifyId: playlist.id})){
       return;
      } else {
        var playlistId = Playlists.insert({
          userId: Meteor.userId(),
          spotifyId: playlist.id,
          name: playlist.name,
          trackCount: playlist.tracks.total,
          ownerId: playlist.owner.id,
        });
        // Meteor.call('findTracks', playlistId)
      }
    });
    var usersPlaylists = Playlists.find({userId: Meteor.userId()}).fetch();
    return usersPlaylists
  },

  findTracks: function (playlistId) {
    var playlist = Playlists.findOne(playlistId)
    var spotifyApi = new SpotifyWebApi()
    var response = spotifyApi.getPlaylistTracks(playlist.ownerId, playlist.spotifyId, {})
    if (checkTokenRefreshed(response, spotifyApi)) {
      var response = spotifyApi.getPlaylistTracks(playlist.ownerId, playlist.spotifyId, {})
    }
    var trackObjects = response.data.body.items
    Meteor.call('insertTracks', trackObjects, playlistId)
  },

  insertTracks: function (trackObjects, playlistId) {
    trackObjects.forEach(function(trackObject){
      var track = trackObject.track;
      var artistObjects = []
      track.artists.forEach(function(artist){
        artistObjects.push({name: artist.name, spotifyId: artist.id})
      });
      Tracks.insert({
        userId: Meteor.userId(),
        name: track.name,
        artists: artistObjects,
        spotifyId: track.id,
        playlistId: playlistId,
      });
    });
  }

});

var checkTokenRefreshed = function(response, api) {
  if (response.error && response.error.statusCode === 401) {
    api.refreshAndUpdateAccessToken();
    return true;
  } else {
    return false;
  }
};
