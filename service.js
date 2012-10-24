//by default, $... excluded from 'is' build as assumed as a server path

//service wrapper for JSON service requests to work both client & server side
define(['is!client?ajax:$zest-server/request'], function(request) {
  return {
    send: function(method, url, headers, data, callback) {
      //headers argument optional
      if (typeof headers == 'function') {
        errback = callback;
        callback = headers;
        headers = {};
      }
      //data optional
      if (typeof data == 'function') {
        callback = data;
        data = undefined; //(JSON.stringify(undefined) = undefined)
      }
      callback = callback || function() {}
      
      var _headers = {};
      for (var header in headers)
        _headers[header] = headers[header];
      
      _headers.contentType = 'application/json; charset=utf-8';
      _headers.accept = 'application/json';
      
      request.send(method, url, _headers, JSON.stringify(data), function(data) {
        callback(JSON.parse(data));
      }, function(err) {
        callback(null, err);
      });
    },
    post: function(url, headers, data, callback) {
      this.send('POST', url, headers, data, callback);
    },
    get: function(url, headers, callback) {
      this.send('GET', url, headers, null, callback);
    }
  };
});