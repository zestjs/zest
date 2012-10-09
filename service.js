define(['ajax'], function(ajax) {
  return {
    post: function(url, data, callback) {
      if (typeof data == 'function') {
        callback = data;
        data = {};
      }
      callback = callback || function(){}
      ajax.post(url, JSON.stringify(data), {
        contentType: 'application/json; charset=utf-8',
        accept: 'application/json',
      }, function(data) {
        callback(JSON.parse(data));
      }, function(err) {
        callback(err, true);
      });
    },
    get: function(url, data, callback) {
      if (typeof data == 'function') {
        callback = data;
        data = {};
      }
      callback = callback || function(){}
      ajax.get(url, {
        contentType: 'charset=utf-8',
        accept: 'application/json'
      }, function(data) {
        callback(JSON.parse(data));
      }, function(err) {
        callback(err, true);
      });
    }
  };
});