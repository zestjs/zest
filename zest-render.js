/*
 * Zest JS Rendering
 * zestjs.org
 *
 *
 * Provides the ZestJS Render Engine:
 * - $z.render
 * - $z.$ - the contextual component DOM selector
 * - $z.$z - the component selector
 * - $z.dispose
 *
 * Can be used as a global script, or in AMD.
 *
 * Read more about rendering at http://zestjs.org/docs
 * 
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['require', 'selector', 'module', './com!'], factory);
  else
    factory(null, window.$ || document.querySelectorAll, null);
}(this, function(req, $, module) {

  var config = module && module.config();
  
  var typeAttr = (config && config.typeAttribute) || 'component';
  
  var $z = function() { return $z.selectAll.apply(this, arguments); }
  
  //make a global
  if (!config || config.defineGlobal)
    this.$z = $z;
  
  //component store
  $z._components = {};
  
  //global render option
  $z._global = null;
  
  /*
   * Component selector
   * 
   * Standard DOM selector returning array of Zest controllers instead of DOM elements
   * where applicable.
   *
   * If no selector is provided, all components are returned.
   * If no context is provided, this is checked to see if it is a controller, followed by document.
   *
   * This allows for contextual component selection with:
   *
   * component.$z = $z.$z
   * 
   */
  $z.selectAll = function(componentSelector, context, callback, selectOne) {
    if (!componentSelector) {
      var matches = [];
      for (var c in $z._components)
        matches.push(c);
      return matches;
    }

    if (typeof context == 'function') {
      selectOne = callback;
      callback = context;
      context = undefined;
    }

    context = context || $z.getElement(this) || document;

    // run the standard selector
    var matches = $(componentSelector, context);

    if (selectOne)
      matches = matches[0] ? [matches[0]] : [];

    // clone the array because otherwise immutable
    var outMatches = [];

    // convert the matches into a list of components
    var callbackCnt = 0;
    for (var i = 0; i < matches.length; i++) {
      outMatches[i] = $z.getComponent(matches[i].id) || matches[i];

      // provide asynchronous callback support for loading components
      if (callback && outMatches[i].constructor == $z.fn) {
        callbackCnt++;
        //make an 'i' closure
        (function(i) {
          outMatches[i].on(function(controller) {
            callbackCnt--;
            outMatches[i] = controller;
            if (callbackCnt == 0)
              callback(outMatches);
          });
        })(i);
      }
    }

    if (callback && callbackCnt == 0)
      return callback(outMatches);
    else
      return selectOne ? outMatches[0] : outMatches;
  }

  $z.select = function(componentSelector, context, callback) {
    return $z.selectAll(componentSelector, context, callback, true);
  }
  
  /*
   * Contextual selector
   *
   * 'this' is used as the controller context if not provided
   *
   * allowing for:
   *
   * component.$ = $z.$
   *
   * giving contextual selection
   *
   * context can be single DOM element or array
   * when an array, context behaves as if contained in an imaginary parent
   * container, allowing selection of the array items themselves
   *
   */
  $z.$ = function(selector, context) {
    context = context || $z.getElement(this) || document;

    return $(selector, context);
  }
  
  /* 
   * $z.render
   *
   * Renders a renderable into the specified wrapper DOM element.
   *
   * Usage:
   *
   * $z.render(renderable, options, wrapperNode, complete)
   *
   * If a string is given it is assumed a moduleId.
   * This is the only time a string doesn't render.
   *
   * Options are optional
   * Complete callback is optional
   *
   */
  $z.render = function(structure, options, container, complete) {
    if (arguments.length == 2) {
      container = options;
      options = {};
    }
    if (typeof container == 'function') {
      complete = container;
      container = options;
      options = {};
    }
    container = container.length ? container[0] : container;
    options = options || {};
    options.global = options.global || $z._global;

    var els = $z.render.Buffer();
    
    var _complete = function() {
      $z.render.Buffer(container).write(els);
      // run init methods
      var components = $z('*', container);
      for (var i = 0; i < components.length; i++)
        if (components[i].constructor == $z.fn)
          components[i].on(function(com) {
            if (typeof com.init == 'function')
              com.init();
          });
        else if (typeof components[i].init == 'function')
          components[i].init();

      if (complete)
        complete.apply(this, arguments);
    }
    
    // the only time a string is a moduleId
    $z.render.renderItem(structure, options, els.write, _complete);
  }
  
  $z._nextComponentId = 1;
  
  $z.render.renderItem = function(structure, options, write, complete) {
    if (complete === undefined) {
      complete = write;
      write = options;
      options = null;
    }
    complete = complete || function() {}
    
    if (typeof structure == 'undefined' || structure == null)
      return complete();
    
    options = options || {};
    options.global = options.global || {};
    
    var self = this;
    
    if (typeof structure == 'undefined' || structure === null)
      return complete();

    // string templates
    else if (typeof structure == 'string')
      if (structure.substr(0, 1) == '@')
        req([structure.substr(1)], function(structure) {
          self.renderItem(structure, options, write, complete);
        });
      else
        self.renderTemplate(structure, null, options, write, complete);
    
    // dynamic template or structure function
    else if (typeof structure == 'function' && !structure.render) {
      // run structure function
      if (structure.length == 2)
        structure(options, function(structure) {
          self.renderItem(structure, { global: options.global }, write, complete);
        });
      else {
        structure = structure(options);
        
        // check if it is a template or not
        if (typeof structure == 'string')
          self.renderTemplate(structure, null, options, write, complete);
        else
        // otherwise just render
          self.renderItem(structure, { global: options.global }, write, complete);
      }
    }
  
    // structure array
    else if (structure instanceof Array)
      self.renderArray(structure, { global: options.global }, write, complete);
    
    // render component
    else if (structure.render)
      self.renderComponent(structure, options, write, complete);
    
    // empty render component
    else if ('render' in structure)
      return complete();
    
    else {
      $z.dir(structure);
      throw 'Unrecognised structure item for render.';
    }
  }
  
  $z.render.renderArray = function(structure, options, write, complete) {
    var i = 0;
    var self = this;
    var next = function() {
      if (i == structure.length) {
        complete();
        return;
      }
      self.renderItem(structure[i++], { global: options.global }, write, function(els) {
        next();
      });
    }
    next();
  }
  

  /*
   * Dotted get property function.
   *
   * eg 'my.property' from { my: { property: 'hello' } } returns 'hello'
   */
  var getProperty = function(name, obj) {
    var parts = name.split('.');
    if (parts.length > 1) {
      var curProperty = parts.shift();
      return obj[curProperty] ? getProperty(parts.join('.'), obj[curProperty]) : undefined;
    }
    else
      return obj[name];
  }

  // passing component allows the region to be checked from the component first
  $z.render.renderTemplate = function(template, component, options, write, complete) {
    var els;

    template = template.trim();
    
    // Find all instances of '{`regionName`}'
    var regions = template.match(/\{\`[\w\.]+\`\}|\{\[[\w\.]+\]\}/g);
    
    // map the region replacements into placeholder divs to pick up
    if (regions)
      for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        var regionName = region.substr(2, region.length - 4);
        regions[i] = regionName;
        
        //check if there is a tag before the current one, and copy its type if there is
        var formerTag = template.match(new RegExp('(<\/(\\w*)[^>]*>|<(\\w*)[^>]*\/>)\\s*' + region));
        formerTag = (formerTag && (formerTag[2] || formerTag[3])) || 'span';
        
        var parentTag = template.match(new RegExp('<(\\w*)[^>]*>\\s*' + region));
        parentTag = (parentTag && parentTag[1]) || 'div';
        
        var placeholderTag = formerTag || 'span';
        
        if (parentTag == 'tbody')
          placeholderTag = 'tr';
          
        template = template.replace(region, '<' + placeholderTag + ' style="display: none;" region-placeholder="' + regionName + '"></' + placeholderTag + '>');
        delete region;
      }
    
    // render into temporary buffer
    var buffer = $z.render.Buffer();
    buffer.write(template);
    
    var regionNodes = {};
    
    // pickup region placeholders
    if (regions)
      for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        var regionNode;
        for (var j = 0; j < buffer.container.childNodes.length; j++) {
          var node = buffer.container.childNodes[j];
          if (node.getAttribute && node.getAttribute('region-placeholder') == region) {
            regionNode = node;
            break;
          }
          if (node.nodeType == 1) {
            var matches = $('[region-placeholder="' + region + '"]', node);
            if (matches.length > 0) {
              regionNode = matches[0];
              break;
            }
          }
        }
        
        regionNodes[region] = regionNode;
      }
    
    // then render into the body
    els = buffer.toArray();
    write(buffer);
    
    // do region rendering
    if (!regions)
      return complete(els);

    var completedRegions = 0;

    var clone = function(o) {
      var _o = {};
      for (var p in o)
        _o[p] = o[p];
      return _o;
    }

    for (var i = 0; i < regions.length; i++)
      (function(region, regionNode) {
        var regionStructure = (component && getProperty(region, component)) || getProperty(region, options);
        
        // check if the region is flat in els
        var regionIndex = els.indexOf(regionNode);

        // clone the options if it is a render component
        // all other region forms are compatible with reference options in the region
        $z.render.renderItem(regionStructure, (regionStructure && regionStructure.render) ? clone(options) : options, function(_els) {
          var buffer = $z.render.Buffer();
          buffer.write(_els);
          if (buffer.container)
            while (buffer.container.childNodes.length > 0) {
              if (regionIndex != -1)
                els.splice(regionIndex++, 0, buffer.container.childNodes[0]);
              regionNode.parentNode.insertBefore(buffer.container.childNodes[0], regionNode);          
            }
        }, function() {
          regionNode.parentNode.removeChild(regionNode);
          if (regionIndex != -1)
            els.splice(regionIndex, 1);
          
          // detect completion
          completedRegions++;
          if (completedRegions == regions.length)
            complete(els);
        });
        
      })(regions[i], regionNodes[regions[i]]);
  }
  

  if ($z.fn)
    $z.fn.STOP_FIRST_DEFINED = $z.fn.STOP_FIRST_DEFINED || function(self, args, fns) {
      var output = fns[0].apply(self, args);
      if (output !== 'undefined')
        return;
      for (var i = 1; i < fns.length; i++)
        fns[i].apply(self, args);
    }

  $z.render.renderComponent = function(component, options, write, complete) {
    // populate default options
    if (component.options)
      for (var option in component.options) {
        if (options[option] === undefined)
          options[option] = component.options[option];
      }
    
    var self = this;
    
    var render = function() {

      // attach vars:
      // piped options - calculated after labelling
      var _options;
      
      var _id = options.id;
      var _type = component.type;
      var _class = (component.className || '') + (options.className && component.className ? ' ' + options.className : options.className || '');

      if (_id === undefined && (component.attach || component.style)) {
        _id = 'z' + $z._nextComponentId++;
        options.id = _id;
      }

      if ($z._components[_id])
        throw 'Id ' + _id + ' already has an attachment defined!';

      if (_type && _type.substr(0, 1).toUpperCase() != _type.substr(0, 1))
        throw 'Type names must always start with an uppercase letter.';
        
      delete options.id;
      delete options.type;
      
      var renderAttach = function(els) {
        var el = els && els[0];

        if (!el)
          return complete();

        // label component if labels provided
        if (_id) {
          if (el.id != _id && $z._components[_id])
            throw 'Id ' + _id + ' already defined!';
          el.id = _id;
        }
        if (_type) {
          if (!el.getAttribute(typeAttr))
            el.setAttribute(typeAttr, _type);
        }
        if (_class) {
          if (el.className)
            el.className += ' ' + _class;
          else
            el.className = _class;
        }


        // render style
        if (component.style) {
          var style = typeof component.style == 'function' ? component.style(options) : component.style;
          var styleNode = document.createElement('style');
          styleNode.type = 'text/css';
          styleNode.setAttribute('data-zid', _id);
          if (styleNode.styleSheet)
            styleNode.styleSheet.cssText = style;
          else
            styleNode.appendChild(document.createTextNode(style));
          el.parentNode.insertBefore(styleNode, el);
        }

        
        if (!component.attach)
          return complete();
        
        // enforce labelling
        if (_type === undefined) {
          if (!el.getAttribute(typeAttr)) {
            var moduleId = $z.getModuleId(component);
            if (moduleId) {
              _type = moduleId.split('/').pop();
              _type = _type[0].toUpperCase() + _type.substr(1);
            }
            else
              el.setAttribute(typeAttr, '');
          }
        }
        
        if (component.pipe === true)
          component.pipe = function(o) { return o }

        if (component.pipe instanceof Array) {
          var p = component.pipe;
          var _o = {};
          component.pipe = function(o) {
            for (var i = 0; i < p.length; i++)
              _o[p[i]] = o[p[i]];
            return _o;
          }
        }

        var _options = component.pipe ? component.pipe(options) || {} : null;
        if (_options)
          _options.global = options.global;
        
        var registerController = function(controllerFunction) {
          controller = new controllerFunction(els[0], _options || { global: options.global });

          if (!controller)
            return complete();
          
          var dispose = controller.dispose;

          // if we have zoe, use the STOP_FIRST_DEFINED chain
          if (dispose && $z.fn) {
              if (dispose.constructor == $z.fn && controller.hasOwnProperty && controller.hasOwnProperty(dispose))
              dispose.run = $z.fn.STOP_FIRST_DEFINED;
            else
              dispose = $z.fn([dispose], $z.fn.STOP_FIRST_DEFINED);
            dispose.first(function(system) {
              if (!system)
                return $z.dispose(els);
            });
            controller.dispose = dispose;
          }
          // no zoe -> create manually
          else {
            controller.dispose = function(system) {
              if (!system)
                return $z.dispose(els);
              if (dispose)
                dispose();
            }
          }
            
          $z._components[_id] = controller;
            
          complete(controller);
        }
        
        if (typeof component.attach === 'string') {
          var attachId = component.attach;
          
          // relative module ids
          var moduleId = $z.getModuleId(component);
          if (moduleId) {
            // if a coffeescript file, make the map without loading the 'cs!' plugin
            var isCoffee = false;
            if (attachId.substr(0, 3) == 'cs!') {
              isCoffee = true;
              attachId = attachId.substr(3);
            }
            // create the module map for the component
            var parentMap = requireContext.makeModuleMap(moduleId, null, false, false);
            // normalize the attachment id
            attachId = requireContext.makeModuleMap(attachId, parentMap, false, true).id;
            if (isCoffee)
              attachId = 'cs!' + attachId;
          }
          
          req([attachId], function(attachment) {
            registerController(attachment);
          });
        }
        else
          registerController(component.attach);
      }

      var renderFunctional = function(structure) {
        if (typeof structure == 'string' && structure.substr(0, 1) == '@') {
          req([structure.substr(1)], renderFunctional);
          return;
        }
        // functional
        if (typeof structure == 'function' && !structure.render && structure.length == 1) {
          structure = structure.call(component, options);
          if (typeof structure == 'string')
            self.renderTemplate(structure, component, options, write, renderAttach);
          else if (component.attach) {
              // dynamic compound component -> simple template shorthand
            component.main = structure;
            self.renderTemplate('<div>{[main]}</div>', component, options, write, renderAttach);
          }
          else
            self.renderItem(structure, { global: options.global }, write, renderAttach);
        }
        else if (typeof structure == 'string')
          self.renderTemplate(structure, component, options, write, renderAttach);
        else if (component.attach) {
          // dynamic compound component -> simple template shorthand
          component.main = structure;
          self.renderTemplate('<div>{[main]}</div>', component, options, write, renderAttach);
        }
        else
          self.renderItem(structure, options, write, renderAttach);
      }

      renderFunctional(component.render);
    }
    
    if (component.load) {
      if (component.load.length == 1) {
        component.load(options);
        render();
      }
      else
        component.load(options, render);
    }
    else
      render();
  }
  
  /*
   * $z.render.Buffer
   * Allows for generalising scripts to work both client and server side
   *
   * Usage:
   * var b = $z.render.Buffer();
   *
   * b.write(Node / HTML);
   *
   * s.write(b);
   *
   */
  
  //create a buffer for a container (hidden or in the dom)
  //can write another buffer, a dom element, or an element array
  
  var getContainerTag = function(tagName) {
   if (tagName == 'tr')
     return 'tbody'
   return 'div';
  }
   
  $z.render.Buffer = function(container) {
    if (container && container.constructor == $z.fn)
      throw 'Its a $z fn!';
    var buffer = {};
    buffer.container = container;
    buffer.toArray = function() {
      var a = [];
      for (var i = 0; i < this.container.childNodes.length; i++)
        a.push(this.container.childNodes[i]);
      return a;
    }
    buffer.write = function(els) {
      // html string
      if (typeof els == 'string') {
        var firstTag = els.match(/<(\w*)[^>]*>/);
        firstTag = (firstTag && firstTag[1]) || 'div';
        var _container = document.createElement(getContainerTag(firstTag));
        _container.innerHTML = els;
        buffer.write({
          write: true,
          container: _container
        });
      }
      // another buffer (assumed to have its container out the dom as in a hidden buffer - so container not used)
      else if (els.write) {
        if (!buffer.container && els.container.childNodes[0]) {
          var firstTag = (els.container.childNodes[0].tagName || 'span').toLowerCase();
          buffer.container = document.createElement(getContainerTag(firstTag));
        }
        while (els.container.childNodes.length > 0)
          buffer.container.appendChild(els.container.childNodes[0]);
      }
      // dom element
      else if (els.nodeType) {
        buffer.container = buffer.container || document.createElement(getContainerTag(els.tagName.toLowerCase()));
        buffer.container.appendChild(els);
      }
      // array of elements
      else if (els.length) {
        if (!buffer.container && els[0]) {
          buffer.container = document.createElement(els[0].tagName.toLowerCase());
        }
        for (var i = 0; i < els.length; i++)
          buffer.container.appendChild(els[i]);
      }
    }
    return buffer;
  }

  /*
   * Helper functions
   * 
   */
  //first get the current context by finding selector
  if (typeof requirejs != 'undefined') {
    // ensure selector module is defined
    var requireContext = null;
    var modules;
    findContext: for (var c in requirejs.s.contexts) {
      modules = requirejs.s.contexts[c].defined;
      for (var curId in modules)
        if (modules[curId] == $) {
          requireContext = requirejs.s.contexts[c];
          break findContext;
        }
    }
    
    if (!requireContext)
      throw 'Unable to detect RequireJS context.';
    
    $z.getModuleId = function(module, definitionMatching) {
      var moduleId;
      if (module == null)
        return moduleId;
      for (var curId in modules) {
        if (modules[curId] == module)
          moduleId = curId;
        else if (definitionMatching !== false && modules[curId] && module._definition == modules[curId])
          moduleId = curId;
      }
      return moduleId;
    }
  }
  

  /*
   * $z.getElement
   * Given any component id or controller instance object, return its DOM element
   */
  $z.getElement = function(com) {
    if (typeof com == 'string')
      return document.getElementById(com);
    if (com.el)
      return com.el;
    for (var id in $z._components)
      if ($z._components[id] == com)
        return document.getElementById(id);
  }

  /*
   * $z.getComponent
   * Given a master HTML element, find its controller
   * Also works given a component id arg
   */
  $z.getComponent = function(el) {
    if (typeof el == 'string') {
      var c = $z._components[el];
      if (c === true)
        c = $z._components[el] = $z.fn();
      return c;
    }

    var c = $z.getComponent(el.id);
    if (c)
      return c;
    
    return null;
  }
  
  /*
   * $z.dispose
   *
   * Given a dom element or array of elements, disposes of all components and sub components on the element
   *
   * Removes the dom element entirely
   *
   */
  
  var disposeComponent = function(component) {
    var notAttached = component.constructor == $z.fn;
    if (component && (component.dispose && !component._disposed) || notAttached) {
      if (!notAttached) {
        component.dispose(true);
        component._disposed = true;
      }
      for (var id in $z._components)
        if ($z._components[id] == component) {
          // remove any style tag
          var style = $('style[data-zid="' + id + '"]');
          if (style && style[0]) {
            style[0].parentNode.removeChild(style[0]);
          }
          if (notAttached)
            $z._components[id] = false;
          else
            delete $z._components[id];
          break;
        }
    }
  }

  $z.dispose = function(el) {
    if (typeof el == 'string')
      return $z.dispose($(el));
    if (!el.nodeType && el.length) {
      for (var i = el.length - 1; i >= 0; i--)
        $z.dispose(el[i]);
      return;
    }

    //add the element component itself if it is one
    if (el.id && $z._components[el.id])
      disposeComponent($z._components[el.id]);

    //find all components and run disposal hooks
    var components = $z('*', el);

    for (var i = 0; i < components.length; i++)
      disposeComponent(components[i]);
    
    //then remove the html elements
    if (el.parentNode)
      el.parentNode.removeChild(el);
  }
  
  return $z;
}));
