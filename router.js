define(['./zest-render'], function($z) {
  var qs;
  if (!client && requirejs.nodeRequire)
    qs = requirejs.nodeRequire('querystring');
    
  var client = typeof window != 'undefined';

  var router = {};
  
  /* client router */
  if (client) {
    var push_state = !!(window.history && history.pushState);
    if (push_state)
      window.onpopstate = function(state) {
        router.render(window.location.pathname);
      }
    
    router.curUrl = window.location.pathname;
    
    router.add = function(routes) {
    }
    
    router.render = function(url) {
      // don't render if we're on the same page
      if (url == this.curUrl)
        return;
      
      //  first check for defined transitions
      var fromData = this.constructor.getRoute({ url: this.curUrl, method: 'GET' });
      var toData = this.constructor.getRoute({ url: url, method: 'GET' });
      
      if (transition && this.transition(fromData, toData)) {
        this.curUrl = url;
        return true;
      }
      
      //check route against routers
      var routeData = this.constructor.getRoute(toData);
      
      routeData.global = $z._global;
      routeData.global.setTitle = function(title) {
        document.title = title;
      }
      
      if (routeData) {
        requirejs([routeData.route], function() {
          $z.dispose(document.body);
          $z.render(routeData.route, routeData, document.body);
        });
        this.curUrl = url;
        return true;
      }
      
      //if not a route in the app, go to url
      window.location = url;
    }
    router.route = function(url) {
      if (this.render(url))
        this.push(url);
    }
    router.push = function(url) {
      if (push_state) {
        this.curUrl = url;
        history.pushState(null, null, url);
      }
    }
  }
  
  router.parse = function(routes, req) {
    if (req.method != 'GET')
      return req;
    req.options = req.options || {};
    
    for (var route in routes) {
      var patternParts = route.split('/');
      var urlParts = req.url.split('/');
      
      //detect the query param (?{test})
      var patternQuery = null;
      var urlQuery = null;
      var _last = patternParts[patternParts.length - 1];
      var _queryIndex = _last.indexOf('?');
      if (_queryIndex >= 0) {
        patternQuery = _last.substr(_queryIndex + 2, _last.length - (_queryIndex + 2) - 1); //?{obj_name}
        patternParts[patternParts.length - 1] = _last.substr(0, _queryIndex);
      }
      _last = urlParts[urlParts.length - 1];
      _queryIndex = _last.indexOf('?');
      if (_queryIndex >= 0) {
        urlQuery = _last.substr(_queryIndex + 1);
        urlParts[urlParts.length - 1] = _last.substr(0, _queryIndex);
      }
      else if (patternQuery)
        continue;
      
      var checkCnt = urlParts.length;
      
      if (patternParts[patternParts.length - 1] == '*') {
        checkCnt = patternParts.length - 1;
        if (urlParts.length < checkCnt)
          continue;
      }
      else if (patternParts.length != checkCnt)
        continue;
      
      var routing = true;
      for (var i = 0; i < checkCnt; i++) {
        //url matches pattern
        if (urlParts[i] == patternParts[i])
          continue;
        
        //pattern variable
        else if (patternParts[i].substr(0, 1) == '{' && patternParts[i].substr(patternParts[i].length - 1, 1) == '}') {
          var curParam = patternParts[i].substr(1, patternParts[i].length - 2);
          req.options[curParam] = urlParts[i];
        }
        
        //no match
        else {
          routing = false;
          break;
        }
      }
      
      if (routing) {
        //deconstruct query params
        var queryParams = {};
        urlQuery = urlQuery.split('&');
        for (var i = 0; i < urlQuery.length; i++) {
          var match = urlQuery[i].match(/([^&=]+)=([^&]+)/);
          if (!match) continue;
          
          var key = match[1];
          var value = match[2] || '';
          if (!key) continue;
          
          value = client ? decodeURIComponent(value) : qs.unescape(value);
          
          if (queryParams[key]) {
            queryParams[key] = queryParams[key] instanceof Array ? queryParams[key] : [queryParams[key]];
            queryParams[key].push(value);
          }
          else
            queryParams[key] = value;
        }
        
        req.options[patternQuery] = queryParams;
        req.route = routes[route];
        return;
      }
    }
  }
  
  return router;
});
