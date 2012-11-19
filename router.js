define(['zoe', './zest-render'], function(zoe, $z) {
  var qs;
  if (!client && requirejs.nodeRequire)
    qs = requirejs.nodeRequire('querystring');
    
  var client = typeof window != 'undefined';

  var router = {
    routes: {}
  };
  
  /* loading pages not handled by router, but by a deferred render.
   * this involves getting the client-side progressive rendering to work based on a render-waitdelay threshold.
   *
   */
  
  /* client router */
  if (client) {
    var push_state = !!(window.history && history.pushState);
    if (push_state)
      window.onpopstate = function(state) {
        router.render(window.location.pathname);
      }
    
    router.curUrl = window.location.pathname;
    
    router.render = function(url, complete) {
      complete = complete || function(){}
      // don't render if we're on the same page
      if (url == router.curUrl)
        return complete();
      
      //check route against routers
      var req = router.route(url);
      //do redirects
      if (req.redirect)
        return router.render(req.redirect, complete);
      
      //if not a route in the app, go to url
      if (!req.route) {
        window.location = url;
        return complete(req);
      }
      
      //render the route
      req.options.global = $z._global;
      req.options.global.setTitle = function(title) {
        document.title = title;
      }
      
      if (typeof req.route == 'string') {
        requirejs([req.route], function(routeComponent) {
          $z.dispose(document.body);
          $z.render(routeComponent, req.options, document.body, function() {
            complete(req);
          });
          router.curUrl = url;
        });
      }
      else {
        $z.dispose(document.body);
        $z.render(req.route, req.options, document.body, function() {
          complete(req);
        });
        router.curUrl = url;
      }
    }
    router.go = function(url, complete) {
      router.render(url, function(route) {
        if (route && route.route)
          router.push(route.options._url);
        if (complete)
          complete();
      });
    }
    router.push = function(url) {
      if (push_state) {
        router.curUrl = url;
        history.pushState(null, null, url);
      }
    }
  }
  
  router.addRoutes = function(routes) {
    zoe.extend(router.routes, routes, 'REPLACE');
  }
  
  
  var unescape = function(str) {
    return client ? decodeURIComponent(str) : qs.unescape(str);
  }
  var escape = function(str) {
    return client ? encodeURIComponent(str) : qs.escape(str);
  }
  
  /*
   * Parse a url down into:
   * 
   *  url (url),
   *  query (?...),
   *  parts (/../../.., unescaped),
   *  queryParts (?..&..&..),
   *  queryParams (?a=..&b=.., unescaped)
   */
  var Url = function(url) {
    this.url = url;
    this.query = null;
    
    var queryStringIndex = url.indexOf('?');
    if (queryStringIndex != -1) {
      this.query = url.substr(queryStringIndex + 1);
      this.queryParts = url.substr(queryStringIndex + 1).split('&');
      url = url.substr(0, queryStringIndex);
      
      //parse parts into query params where '=' exists
      this.queryParams = {};
      for (var i = 0; i < this.queryParts.length; i++) {
        var match = this.queryParts[i].match(/([^&=]+)=([^&]+)/);
        if (!match) continue;
        
        var key = match[1];
        var value = match[2] || '';
        if (!key) continue;
        
        key = unescape(key);
        value = unescape(value);
        
        if (this.queryParams[key]) {
          this.queryParams[key] = this.queryParams[key] instanceof Array ? this.queryParams[key] : [this.queryParams[key]];
          this.queryParams[key].push(value);
        }
        else
          this.queryParams[key] = value;
      }
    }
    
    this.parts = url.split('/');
    for (var i = 0; i < this.parts.length; i++)
      this.parts[i] = unescape(this.parts[i]);
    return this;
  }
  
  var routeCache = {};
  var Route = function(route) {
    if (routeCache[route])
      return routeCache[route];
    
    routeCache[route] = this;
    
    Url.call(this, route);
    
    //create each part matching regular expression and sparse param array
    this.partMatch = [];
    this.glob = false;
    this.params = [];
    for (var i = 0; i < this.parts.length; i++) {
      var param;
      if ((param = this.parts[i].match(paramMatch))) {
        //parameter -> always accept
        this.partMatch[i] = /.*/;
        this.params[i] = param[1];
        
        //glob on last part
        if (param[1].substr(-1) == '*' && i == this.parts.length - 1) {
          this.params[i] = param[1].substr(0, param[1].length - 1);
          this.glob = true;
        }
      }
      else {
        //text match -> need exact
        this.partMatch[i] = new RegExp('^' + this.parts[i] + '$');
      }
    }
  }
  
  var paramMatch = /^{([^}]+)}$/;
  Route.prototype.match = function(url) {
    var options = {};
    
    var pUrl = new Url(url);
    
    if (pUrl.parts.length < this.parts.length)
      return null;
    
    //if the lengths dont match and there's no globbing, then fail
    if (pUrl.parts.length > this.parts.length && !this.glob)
      return null;
    
    //loop main '/' parts to check match
    for (var i = 0; i < this.parts.length; i++) {
      // check match
      if (this.partMatch[i].test(pUrl.parts[i])) {
        if (i == this.parts.length - 1 && this.glob) {
          //matched up to here, now a match all -> success
          options[this.params[i]] = pUrl.parts.splice(i).join('/');
          break;
        }
        //store param if necessary
        else if (this.params[i])
          options[this.params[i]] = pUrl.parts[i];
      }
      else
        return null;
    }
    
    //add query param data
    options._query = pUrl.queryParams;
    options._queryString = pUrl.query;
    
    return options;
  }
  
  Route.prototype.sub = function(options) {
    //given data, populate the url
    var urlParts = [];
    
    //populate params
    for (var i = 0; i < this.parts.length; i++) {
      if (this.params[i]) {
        if (options[this.params[i]] === undefined)
          throw 'Cant sub url, no data for: ' + this.params[i];
        
        urlParts.push(options[this.params[i]]);
      }
      else {
        urlParts.push(this.parts[i]);
      }
    }
    
    var url = urlParts.join('/');
    
    //add query string
    if (typeof options._queryString == 'string')
      url += '?' + options._queryString;
      
    return url;
  }
  
  
  /*
  Returns:
    route.route
    route.redirect
    
    route.options
    route.options._route
    route.options._url
    route.options._query
    route.options._queryString
  */
  router.route = function(url, redirect) {
    var routeObj = {};
    
    if (redirect === undefined)
      redirect = true;
    
    for (var route in this.routes) {
      var alias = route.substr(0, 1) == '@';
      if (alias)
        route = route.substr(1);
      var pRoute = new Route(route);
      
      //check for route match
      if ((routeObj.options = pRoute.match(url))) {
        //alias -> internally reparse
        if (alias) {
          //sub and reparse
          var url = new Route(this.routes['@' + route]).sub(routeObj.options);
          return router.route(url, false);
        }
        //not alias -> we're there
        else {
          routeObj.route = this.routes[route];
          routeObj.options._url = url;
          routeObj.options._route = route;
          return routeObj;
        }
      }
      //check for alias -> 301 redirect
      else if (redirect && alias) {
        if ((routeObj.options = new Route(this.routes['@' + route]).match(url))) {
          routeObj.redirect = pRoute.sub(routeObj.options);
          return routeObj;
        }
      }
      //no match -> on to the next
    }
    
    routeObj.options = {
      _url: url
    };
    
    return routeObj;
  }
  
  return router;
});
