/*
 * Zest JS
 * zestjs.org
 *
 *  -InstanceChains
 *  -Options
 *  -Pop
 *  -Component
 *  -Regions
 *  
 * 
 */
//allow this to be loaded as an amd or global
(function (root, factory) {
  // AMD. Register as an anonymous module.
  if (typeof define === 'function' && define.amd)
    define(['module', './render', './object', 'selector', 'css'], factory);
  // Browser globals
  else
    root.$z = factory({
      config: function() {}
    }, null, null,
        window.jQuery || window.$ || function(selector, context) {
      return context.querySelectorAll(selector);
    }, {
      add: function(css) {
        if (this.stylesheet === undefined) {
          this.stylesheet = document.createElement('style');
          this.stylesheet.setAttribute('type', 'text/css');
          document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
        }
        this.stylesheet.innerHTML += css;
      }
    });
}(this, function (module, render, object, $, css) {
if (object && render) {
  $z = object;
  $z = $z.overwrite($z, render);
}

var client = typeof window !== 'undefined' && typeof window.location !== 'undefined';
 
 
 //routes resolve to pages
//$z.App should me in Main

var checkPattern = function(reqData, pattern) {
  patternParts = pattern.split('/');
  
  reqData.parts = reqData.parts || reqData.url.split('/');
  
  var checkCnt = reqData.parts.length;
  
  if (patternParts[patternParts.length - 1] == '*') {
    checkCnt = patternParts.length - 1;
    if (reqData.parts.length < checkCnt)
      return;
  }
  else if (patternParts.length != checkCnt)
    return;
  
  for (var i = 0; i < checkCnt; i++) {
    //url matches pattern
    if (reqData.parts[i] == patternParts[i])
      continue;
    
    //pattern variable
    else if (patternParts[i].substr(0, 1) == '{' && patternParts[i].substr(patternParts[i].length - 1, 1) == '}') {
      var curParam = patternParts[i].substr(1, patternParts[i].length - 2);
      reqData[curParam] = reqData.parts[i];
    }
    
    //no match
    else
      return false;
  }
  
  return true;
}

$z.service = {
  NONE: {
    post: function(url, data, callback) {
      if (callback)
        callback();
    },
    get: function(url, data, callback) {
      if (callback)
        callback;
    }
  },
  HTTP: {
    post: function(url, data, callback) {
      if (typeof data == 'function') {
        callback = data;
        data = {};
      }
      callback = callback || function(){}
      $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(data) {
          callback(data);
        },
        error: function(err) {
          callback(err, true);
        }
      });
    },
    get: function(url, data, callback) {
      if (typeof data == 'function') {
        callback = data;
        data = {};
      }
      callback = callback || function(){}
      $.ajax({
        url: url,
        type: 'GET',
        contentType: 'charset=utf-8',
        dataType: 'json',
        success: function(data) {
          callback(data);
        },
        error: function(err) {
          callback(err, true);
        }
      });      
    }
  }
};

$z.App = {
  implement: [$z.constructor],
  _extend: {
    routes: $z.overwrite
  },
  
  routes: {},
  
  getRoute: function(reqData) {
    if (reqData.method != 'GET')
      return false;
    //check route against routers
    for (var route in this.routes) {
      if (checkPattern(reqData, route)) {
        if (typeof this.routes[route] == 'string') {
          reqData.route = this.routes[route];
          return reqData;
        }
      }
    }
    return false;
  },
  
  construct: function(o) {
    $z.app = this;
    this.push_state = !!(window.history && history.pushState);
    this.curUrl = window.location.pathname;
    this.transition = $z.fn($z.fn.OR); //keyed by from matrix
    var self = this;
    if (this.push_state)
      window.onpopstate = function(state) {
        self.render(window.location.pathname);
      }
  },
  prototype: {
    render: function(url, transition) {
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
      
      routeData.global = $z.attach.global;
      routeData.global.setTitle = function(title) {
        document.title = title;
      }
      
      if (routeData) {
        require([routeData.route], function() {
          $z.dispose(document.body);
          $z.render(routeData.route, routeData, document.body);
        });
        this.curUrl = url;
        return true;
      }
      
      //if not a route in the app, go to url
      window.location = url;
    },
    go: function(url) {
      if (this.render(url))
        this.push(url);
    },
    push: function(url) {
      if (this.push_state) {
        this.curUrl = url;
        history.pushState(null, null, url);
      }
    }
  }
}
 
/*
 * $z.Component
 * Creates a component with rendering or as attach-only
 *
 * The component is entirely rendered by $z.render.
 *
 * Attachment::
 *
 * Attachment is triggered when a "$$" element array options parameter is provided to the constructor.
 * This is the consecutive DOM elements currently definining the rendered widget to attach.
 *
 * Attachment::
 *
 * Components attach based on the options.attach specification.
 *
 * Example:
 *
 *  options.attach = {
 *    Component: '#[component]$', //dollar sign indicates only finding components directly inside this region
 *    $element: '#an-element',
 *    region: '.a-region'
 *  }
 *
 * If there is more than one match, an error is thrown.
 *
 * The DOM element being attached is then checked to see if it is a component or dynamic region
 * (featuring a 'component' or 'region' attribute)
 * If it is a component, it is attached from its $z property
 * If it is a region, it is dynamically built from the region wrapper.
 *
 * The notation of $element, region (small letter) and Component (capital) is a highly recommended convention.
 * There is no consequence for failing to follow this though.
 *
 *
 * Disposal::
 *
 * The dispose method is automatically appended with functionality to remove the
 * html elements generated by the template from the DOM.
 *
 * If the component adds any other DOM elements, it must include their removal
 * in a dispose hook.
 *
 * *More importantly, ALL events registered by the component should be manuallly
 * removed by a dispose method.
 *
 * Suggested syntax (with jQuery as an example):
 *
 * functionInstances: ['click'], //ensures that the click event is bound to this and unique to this
 * construct: function() {
 *   this.$el.click(this.click);
 *   this.dispose.on(function() {
 *     this.$el.unbind('click', this.click);
 *   });
 * }
 * 
 * This is very important for removing memory leaks.
 * 
 *
 * NB Never use a pre-constructor override with the Create functionality. This could
 *    interfere with having all creation logic handled by the template and structure
 *    methods.
 *
 */

var dynamic = false;
$z.Component = $z.creator({
  
  implement: [$z.constructor, /*$z.Options, */$z.InstanceChains, $z.Pop],
  
  _extend: {
    type: $z.extend.REPLACE,
    pipe: $z.extend.CHAIN,
    template: $z.extend.REPLACE,
    construct: $z.extend.CHAIN,
    options: $z.overwrite,
    prototype: $z.extend,
    css: function(a, b) {
      
      if (a === undefined)
        return b;
      
      var funcify = function(str) {
        return function() {
          return str;
        }
      }
      if (typeof a != 'function' && typeof b != 'function')
        return a + b;
      
      
      if (typeof a == 'string')
        a = funcify(a);
      if (typeof b == 'string')
        b = funcify(b);
        
      if (!a.run) {
        var _a = a;
        a = $z.fn($z.fn.createRunFunction(function(a, b) {
          return a + b;
        }, ''));
        a.on(_a);
      }
      
      a.on(b);
    },
    attachExclusions: $z.extend.ARR_APPEND,
    attachInclusions: $z.extend.ARR_APPEND,
    'prototype.dispose': $z.extend.CHAIN
  },
  
  attach: function($$, options) {
    options.$$ = $$;
    new this(options);
  },
  
  make: function() {
    dynamic = false;
  },
  integrate: function(def) {
    if (dynamic)
      return;

    if (def.construct || def.dynamic === true)
      dynamic = true;
      
    if (def.prototype)
      for (p in def.prototype) {
        dynamic = true;
        return;
      }
  },
  built: function() {
    if (!dynamic)
      delete this.attach;
  },
  
  construct: function(options) {
    if (!options.$$)
      throw 'No template defined for component creation.';

    this.$$ = options.$$;
    delete options.$$;
    
    this.$$[0].$z = this;
  },
  prototype: {
    $: function(selector) {
      var matches = $(selector, this.$$[0].parentNode);
      
      var filtered;
      if (matches instanceof NodeList)
        filtered = [];
      else
        filtered = $(''); //empty selector
      
      for (var i = 0; i < matches.length; i++) {
        var ownerComponent = $z.getComponent(matches[i]);
        if (ownerComponent == this)
          filtered.push(matches[i]);
      }
      return filtered;
    },
    $z: function(selector) {
      return $z(selector, this.$$);
    },
    dispose: function() {
      
      //clear subcomponents
      var subcomponents = this.$z();
      for (var i = 0; i < subcomponents.length; i++) {
        //ensure we avoid duplicate subcomponent disposal
        if (subcomponents[i].$$)
          subcomponents[i].dispose();
      }
      
      delete this.$$[0].$z;
      
      var parent = this.$$[0].parentNode;
      for (var i = 0; i < this.$$.length; i++)
        parent.removeChild(this.$$[i]);
      
      delete this.$$;
    }
  }
});


/*
 * parseItems
 * Private region function to convert a list of DOM nodes into a list of high-level region structure.
 *
 * $$ = 
 *  <div>
 *    just some html
 *  </div>
 *  <div component>
 *  </div>
 *  <h1>still the above component</h1>
 *  <div>some more html</div>
 *
 * Gets converted as
 * [[DOMArray], Component, [DOMArray]]
 *
 */

var parseItems = function($$) {
  var items = [];
  var DOMbuffer = [];
  for (var i = 0; i < $$.length; i++) {
    var z = $$[i].$z;
    if (z !== undefined) {
      if (DOMbuffer.length > 0) {
        items.push(DOMbuffer);
        DOMbuffer = [];
      }
      items.push(z);
    }
    else
      DOMbuffer.push($$[i]);
  }
  if (DOMbuffer.length > 0)
    items.push(DOMbuffer)
  return items;  
}

/*
 * addItems
 * Private function to insert the given item list at the given index on the region
 * Expects to be called bound to the region
 */
var addItems = function(items, index) {
  
  if (index === undefined)
    index = this.length - 1;
    
  //first, copy out all the items after index
  var shifted = [];
  for (var i = index; i < this.length; i++)
    shifted.push(this[i]);
  
  //copy in new items
  for (var i = 0; i < items.length; i++)
    this[index + i]  = items[i];
  
  //finally copy back shifted items
  for (var i = 0; i < shifted.length; i++)
    this[index + items.length + i] = shifted[i];
  
  this.length += items.length;
}

return $z;

}));

