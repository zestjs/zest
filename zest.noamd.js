
/*
 * Zest JS
 * zestjs.org  
 * 
 */

(function($, root) {
  
  var config = typeof module != 'undefined' && module.config();
  
  var typeAttr = (typeof config != 'undefined' && config.typeAttribute) || 'component';
  
  var $z = function() { return $z.main.apply(this, arguments); }
  
  //make a global
  this.$z = $z;
  
  //component store
  $z._controllers = {};
  $z._elements = {};
  
  //global render option
  $z._global = null;
  
  /*
   * Component selector
   *
   * Allows for selecting hierarchies of components, separated by spaces
   *
   * Id and type selection can be made for example:
   *
   * #component-3 Picture
   *
   * Will give all components of type Picture inside the component of id picture3
   *
   *
   * When multiple components are returned, an array is provided
   * When a single component is found, the direct component is provided.
   *
   * As with the contextual selector, context can be a container or array of consecutive dom nodes.
   * In the case of a container, selection is made excluding the container, but
   * for a list of dom nodes, the items themselves are included in the selection root.
   * 
   * Ocassionally, one would expect to get a list of items, but it may turn out to only
   * be one when there is only one item. For ease of coding it can be useful to still get
   * this single item back in an array. To specify this, simply provide the suffix "[]" to the
   * selector.
   *
   * If no selector is provided, all components are returned.
   * If no context is provided, this.$$ is checked, followed by document.
   *
   * This allows for contextual component selection with
   *
   * component.$z = $z.$z
   * 
   */
  $z.main = $z.$z = function(componentSelector, context, elementsOnly) {
  
    componentSelector = componentSelector || '*';
    context = context || this.$$ || document.body;
    
    var asList = componentSelector.substr(componentSelector.length - 2, 2) == '[]';
    if (asList)
      componentSelector = componentSelector.substr(0, componentSelector.length - 2);
    
    var firstPart = componentSelector.substr(0, componentSelector.indexOf(' ')) || componentSelector;
    
    var subparts = firstPart.split('#');
    var firstSelector = (subparts[0] != '' && subparts[0] != '*' ? '[' + typeAttr + '=' + subparts[0] + ']' : '[' + typeAttr + ']') +
      (subparts[1] ? '#' + subparts[1] : '');
    
    var matches = $z.$(firstSelector, context);
    
    var outMatches = [];
    var els;
    //if we're at the last depth
    if (firstPart == componentSelector) {
      for (var i = 0; i < matches.length; i++) {
        if (els = $z._elements[matches[i].id])
          outMatches[i] = (!elementsOnly && $z._controllers[matches[i].id]) || els;
        else
          outMatches[i] = matches[i];
      }
      
      if (matches.length == 1 && !asList)
        return outMatches[0];
      else
        return outMatches;
    }
    
    //run through matches, creating array of element arrays for matches
    var allMatches = [];
    for (var i = 0; i < matches.length; i++) {
      if (els = $z._elements[matches[i].id])
        allMatches = allMatches.concat(els);
      else
        allMatches.push(matches[i]);
    }
    
    //run next level selector on this
    return $z.$z(componentSelector.substr(firstPart.length + 1), allMatches);
  }
  
  /*
   * Contextual selector
   *
   * this.$$ is used as the context if not provided
   *
   * allowing for:
   *
   * component.$ = $z.$
   *
   * giving contextual selection
   *
   * context as array includes array items in selection.
   * context as a container excludes the container itself (standard selection).
   *
   */
  $z.$ = function(selector, context) {
    
    context = context || this.$$ || document;
    
    if (context.nodeType)
      return $(selector, context);
    
    matches = $(selector, context[0].parentNode);
    var filtered;
    if (matches instanceof NodeList)
      filtered = [];
    else
      filtered = $(''); //empty selector
    
    for (var i = 0; i < matches.length; i++) {
      var parent = matches[i];
      outer:
      while (parent && parent != document.body) {
        for (var j = 0; j < context.length; j++)
          if (context[j] == parent) {
            filtered.push(matches[i]);
            break outer;
          }
        parent = parent.parentNode;
      }
    }
    
    return filtered;
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
    if (typeof container == 'function') {
      complete = container;
      container = options;
      options = {};
    }
    
    options = options || {};
    options.global = options.global || $z._global;

    var $$ = $z.render.Buffer();
    
    var _complete = function() {
      $z.render.Buffer(container.length ? container[0] : container).write($$);
      if (complete)
        complete();
    }
    
    // the only time a string is a moduleId
    if (typeof structure == 'string') {
      require([structure], function(structure) {
        $z.render.renderItem(structure, options, $$.write, _complete)
      });
    }
    else
      $z.render.renderItem(structure, options, $$.write, _complete);
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
    
    // string templates
    if (typeof structure == 'string')
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
      self.renderItem(structure[i++], { global: options.global }, write, function() {
        next();
      });
    }
    next();
  }
  
  // passing component allows the region to be checked from the component first
  $z.render.renderTemplate = function(template, component, options, write, complete) {
    var $$;
    
    // Find all instances of '{`regionName`}'
    var regions = template.match(/\{\`\w+\`\}/g);
    
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
          
        template = template.replace(region, '<' + placeholderTag + ' style="display: none;" region-placeholder=' + regionName + '></' + placeholderTag + '>');
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
            var matches = $('[region-placeholder=' + region + ']', node);
            if (matches.length > 0) {
              regionNode = matches[0];
              break;
            }
          }
        }
        
        regionNodes[region] = regionNode;
      }
    
    // then render into the body
    $$ = buffer.toArray();
    write(buffer);
    
    // do region rendering
    if (!regions)
      return complete($$);

    var completedRegions = 0;
    for (var i = 0; i < regions.length; i++)
      (function(region, regionNode) {
        var regionStructure = (component && component[region]) || options[region];
        
        // check if the region is flat in $$
        var regionIndex = $$.indexOf(regionNode);
        
        $z.render.renderItem(regionStructure, options, function(_$$) {
          var buffer = $z.render.Buffer();
          buffer.write(_$$);
          if (buffer.container)
            while (buffer.container.childNodes.length > 0) {
              if (regionIndex != -1)
                $$.splice(regionIndex, 0, buffer.container.childNodes[0]);
              regionNode.parentNode.insertBefore(buffer.container.childNodes[0], regionNode);          
            }
        }, function() {
          regionNode.parentNode.removeChild(regionNode);
          if (regionIndex != -1)
            $$.splice(regionIndex, 1);
          
          // detect completion
          completedRegions++;
          if (completedRegions == regions.length)
            complete($$);
        });
        
      })(regions[i], regionNodes[regions[i]]);
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
      
      options.type = options.type || component.type;
      
      // attach vars:
      // piped options - calculated after labelling
      var _options;
      
      var _id = options.id;
      var _type = options.type;
      
      delete options.id;
      delete options.type;
      
      var renderAttach = function($$) {
        
        // label component if labels provided
        if (_id) {
          if ($z._elements[_id])
            throw 'Id ' + _id + ' already defined!';
          $$[0].id = _id;
        }
        if (_type) {
          if (!$$[0].getAttribute(typeAttr))
            $$[0].setAttribute(typeAttr, _type);
        }
        
        if (!component.attach)
          return complete();
        
        // attachment
        
        // enforce labelling
        if (_id === undefined) {
          _id = 'z' + $z._nextComponentId++;
          if ($z._elements[_id])
            throw 'Id ' + _id + ' already has an attachment defined!';
          $$[0].id = _id;
        }
        if (_type === undefined) {
          if (!$$[0].getAttribute(typeAttr))
            $$[0].setAttribute(typeAttr, (_type = ''));
        }
          
        $z._elements[_id] = $$;
        
        var _options = component.pipe ? component.pipe(options) || {} : {};
        _options.global = options.global;
        
        var registerController = function(controller) {
          if (!controller)
            return complete();
          
          var dispose = controller.dispose;
          
          if (!dispose || (dispose && !controller.dispose.length && !dispose.fns)) {
            controller.dispose = function(system) {
              if (!system)
                return $z.dispose($$);
              if (dispose)
                dispose();
            }
          }
            
          $z._controllers[_id] = controller;
            
          complete();
        }
        
        if (typeof component.attach === 'string') {
          var attachId = component.attach;
          
          // relative module ids
          var moduleId = $z.getModuleId(component);
          if (moduleId) {
            // create the module map for the component
            var parentMap = requireContext.makeModuleMap(moduleId, null, false, false);
            // normalize the attachment id
            attachId = requireContext.makeModuleMap(attachId, parentMap, false, true).id;
          }
          
          require([attachId], function(attachment) {
            registerController(attachment(_options, $$));
          });
        }
        else
          registerController(component.attach(_options, $$));
      }
      
      // check if the render is a functional
      if (typeof component.render == 'function' && !component.render.render && component.render.length == 1) {
        var structure = component.render(options);
        // check if we have a template
        if (typeof structure == 'string')
          self.renderTemplate(structure, component, options, write, renderAttach);
        else
          self.renderItem(structure, { global: options.global }, write, renderAttach);
      }
      else
        self.renderItem(component.render, options, write, renderAttach);
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
    buffer.write = function($$) {
      // html string
      if (typeof $$ == 'string') {
        var firstTag = $$.match(/<(\w*)[^>]*>/);
        firstTag = (firstTag && firstTag[1]) || 'div';
        var _container = document.createElement(getContainerTag(firstTag));
        _container.innerHTML = $$;
        buffer.write({
          write: true,
          container: _container
        });
      }
      // another buffer (assumed to have its container out the dom as in a hidden buffer - so container not used)
      else if ($$.write) {
        if (!buffer.container && $$.container.childNodes[0]) {
          var firstTag = ($$.container.childNodes[0].tagName || 'span').toLowerCase();
          buffer.container = document.createElement(getContainerTag(firstTag));
        }
        while ($$.container.childNodes.length > 0)
          buffer.container.appendChild($$.container.childNodes[0]);
      }
      // dom element
      else if ($$.nodeType) {
        buffer.container = buffer.container || document.createElement(getContainerTag($$.tagName.toLowerCase()));
        buffer.container.appendChild($$);
      }
      // array of elements
      else if ($$.length) {
        if (!buffer.container && $$[0]) {
          buffer.container = document.createElement($$[0].tagName.toLowerCase());
        }
        for (var i = 0; i < $$.length; i++)
          buffer.container.appendChild($$[i]);
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
  
    var requireContext = null;
    var modules;
    findContext: for (var c in requirejs.s.contexts) {
      modules = requirejs.s.contexts[c].defined;
      for (var curId in modules)
        if (modules[curId] == $) {
          requireContext = c;
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
   * $z.getComponent
   * Given any html element, find the component responsible for its management
   */
  $z.getComponent = function(el) {
    if (el.nodeType !== 1) {
      if (typeof el[0] == 'object' && el[0] !== null) {
        if (el[0].nodeType !== 1)
          return null;
      
        el = el[0];
      }
    }
    
    if ($z._controllers[el.id])
      return $z._controllers[el.id];
  
    if (!el.previousSibling && el.parentNode == document.body)
      return;
    
    //back track up components
    var prevNode = el;
    var com;
    while (prevNode = prevNode.previousSibling) {
      //if its a component, return if we fall under its cover
      if ($z._controllers[prevNode.id]) {
        var com = $z._elements[prevNode.id];
        for (var i = 0; i < com.length; i++)
          if (com[i] == el)
            return $z._controllers[prevNode.id];
      }
    }
    
    //if not, go up to the parent node
    return $z.getComponent(el.parentNode);
  }
  
  /*
   * $z.dispose
   *
   * Given a dom element or array of dom elements, disposes of all components and sub components on those elements
   *
   * Removes the dom elements entirely
   *
   */
  
  $z.dispose = function(els) {
    if (els.nodeType)
      els = els.childNodes;
    
    //find all components and run disposal hooks
    var components = $z('*[]', els);
    for (var i = 0; i < components.length; i++) {
      var component = components[i];
      //dynamic disposal
      if (component && component.dispose && !component._disposed) {
        component.dispose(true);
        component._disposed = true;
      }
      //dynamic css and register clearing
      for (var id in $z._controllers) {
        //remove component
        if ($z._controllers[id] == component) {
          delete $z._controllers[id];
          delete $z._elements[id];
          break;
        }
      }
      for (var id in $z._elements) {
        if ($z._elements[id] == component) {
          delete $z._elements[id];
          break;
        }
      }
    }
    
    //then remove the html elements
    for (var i = els.length - 1; i >= 0; i--)
      if (els[i].parentNode)
        els[i].parentNode.removeChild(els[i]);
  }
  
  return $z;
})(window.jQuery || document.querySelectorAll, window);

/*
 * ZOE
 * Zest Object Extension
 * http://github.com/zestjs/zoe
 *
 * A natural JavaScript extension-based inheritance model.
 *
 * Can be used on its own, but primarily created for use
 * as part of the zestjs web framework.
 * (http://zestjs.org)
 *
 * Read the full documentation at
 * http://zestjs.org/docs/zoe
 * 
 */
(function(zoe) {

/*
 * zoe.log, zoe.dir
 * Console log function existence wrappers
 * 
 */
zoe.log = zoe.dir = function(){};
if (typeof console !== 'undefined') {
  if (console.log)
    zoe.log = function(str, type) { console.log(str); }
  if (console.dir)
    zoe.dir = function(obj, type) { console.dir(obj); }
}


/*
 * zoe.fn
 * Function composition and execution
 * http://zestjs.org/docs/zoe#zoe.fn
 *
 * Usage:
 *   zoe.fn(executionFunction, [initialFunctions]);
 *   zoe.fn(executionFunction);
 *   zoe.fn([initialFunctions]);
 * 
 * [initialFunctions]: an array of the inital functions to be provided (optional)
 * executionFunction: the main execution function to handle function execution and output (optional)
 *    when no executionFunction is provided, defaults to zoe.fn.LAST_DEFINED
 *
 * output: a function instance of a zoe.fn 'function chain', with the following public properties:
 *   on: function(f), used to add new functions to the list of functions
 *   off: function(f), used to remove functions from the list of functions
 *   first: function(f), used to add a new function at the beginning of the list of functions
 *   bind: function(self), used to permanently bind this instance to the given 'this' reference
 *         when passed the value `undefined`, binding will revert to natural function binding
 * 
 */

var zoe_fn = zoe.fn = function(run, fns) {
  if (run instanceof Array) {
    fns = run;
    run = null;
  }
  
  var instance = function() {
    //http://zestjs.org/docs/zoe#zoe.fn
    return instance.run(instance._this || this, Array.prototype.splice.call(arguments, 0), instance.fns);
  }
  
  instance.constructor = zoe_fn;
  
  instance.fns = fns || [];
  instance.run = (typeof run == 'string' ? zoe_fn[run] : run) || zoe_fn.LAST_DEFINED;
  
  instance.on = on;
  instance.off = off;
  instance.first = first;
  
  instance._this = undefined;
  instance.bind = bind;
  
  return instance;
}

var bind = function(_this) {
  this._this = _this;
  return this;
}
var on = function(fn) {
  this.fns.push(fn);
  return this;
}
var off = function(fn) {
  if (!fn) {
    this.fns = [];
    return;
  }
  for (var i = 0; i < this.fns.length; i++)
    if (this.fns[i] == fn) {
      this.fns.splice(i, 1);
      return;
    }
}
var first = function(fn) {
  this.fns = [fn].concat(this.fns);
  return this;
}

/* zoe.fn.executeReduce
 * 
 * A helper function in building synchronous composition functions
 * takes a "reduce" function to amalgamating synchronous outputs into a
 * single output
 *
 * Usage:
 *   zoe.fn.executeReduce(startVal, function(out1, out2) {
 *     return reducedOutput;
 *   });
 *
 */
zoe_fn.executeReduce = function(startVal, reduce) {
  if (reduce === undefined) {
    reduce = startVal;
    startVal = undefined;
  }
  return function(self, args, fns) {
    var output = startVal;
    for (var i = 0; i < fns.length; i++)
      output = reduce(output, fns[i].apply(self, args));
    return output;
  }
}

/*
 * zoe.fn.LAST_DEFINED
 * http://zestjs.org/docs/zoe#zoe.fn.LAST_DEFINED
 *
 * Executes all functions in the chain, returning the last non-undefined
 * output.
 *
 */
var l = zoe_fn.LAST_DEFINED = zoe_fn.executeReduce(function(out1, out2) {
  return out2 !== undefined ? out2 : out1;
});

/*
 * zoe.fn.STOP_DEFINED
 * http://zestjs.org/docs/zoe#zoe.fn.STOP_DEFINED
 *
 * Runs the execution of fns, until one function returns
 * a non-undefined output.
 * Then no further functions are executed.
 * 
 */
zoe_fn.STOP_DEFINED = function STOP_DEFINED(self, args, fns) {
  var output;
  for (var i = 0; i < fns.length; i++) {
    output = fns[i].apply(self, args);
    if (output !== undefined)
      return output;
  }
  return output;
}
/*
 * zoe.fn.COMPOSE
 *
 * Output of each function is the input to the next function
 *
 */
zoe_fn.COMPOSE = function COMPOSE(self, args, fns) {
  if (fns.length == 0)
    return;
  var output = fns[0].apply(self, args);
  for (var i = 1; i < fns.length; i++)
    output = fns[i].call(self, output);
  return output;
}
/*
 * zoe.fn.ASYNC
 * http://zestjs.org/docs/zoe#zoe.fn.ASYNC
 *
 * Allows for the creation of an asynchronous step function, with the
 * last argument to each successive function being the 'next' callback
 * into the next function or final completion.
 *
 */
zoe_fn.ASYNC = zoe_fn.ASYNC_NEXT = function ASYNC_NEXT(self, args, fns) {
  var i = 0;
  var complete;
  if (typeof args[args.length - 1] == 'function')
    complete = args.pop();
  var makeNext = function(i) {
    return function() {
      if (fns[i])
        fns[i].apply(self, args.concat([makeNext(i + 1)]));
      else if (complete)
        complete();
    }
  }
  return makeNext(0)();
}

/*
 * zoe.fn.ASYNC_SIM
 * http://zestjs.org/docs/zoe#zoe.fn.ASYNC_SIM
 *
 * Parallel asynchronous step functions.
 */
zoe_fn.ASYNC_SIM = function ASYNC_SIM(self, args, fns) {
  var completed = 0;
  var complete;
  if (typeof args[args.length - 1] == 'function')
    complete = args.pop();
  for (var i = 0; i < fns.length; i++)
    fns[i].apply(self, args.concat([function() {
      if (++completed == fns.length)
        complete();
    }]));
}

/*
 * zoe.on
 * http://zestjs.org/docs/zoe#zoe.on
 *
 * Shorthand for converting any function to a chain
 * Effectively duck punching using zoe.fn, but if the
 * function is already a zoe.fn, it is just added to the
 * list (using less memory than recursive duck punching)
 *
 * Usage:
 *
 * zoe.on(obj, methodName, fn);
 *
 * obj: the object with a function property
 * methodName: the function name on the object
 * fn: the function to hook into the given function
 *
 *
 * The corresponding zoe.off method works as with zoe.fn() off.
 *
 */
zoe.on = function(obj, name, f) {
  var val = obj[name];
  if (!val || val.constructor != zoe_fn || val.run != zoe_fn.LAST_DEFINED)
    obj[name] = zoe_fn(val ? [val] : []);
  obj[name].on(f);
}
zoe.off = function(obj, name, f) {
  if (obj[name].constructor == zoe_fn)
    return obj[name].off(f);
}



/*
 * zoe.extend
 * http://zestjs.org/docs/zoe#zoe.extend
 *
 * Extend obj A by merging properties from obj B
 * A flexible rules mechanism allows for advanced merging functions
 *
 * Usage:
 *
 * zoe.extend(objA, objB, [rules,]);
 *
 * objA: the object to modify (the host object)
 * objB: the object with the new properties to add (the extending object)
 * rules: a rule function or object map.
 *        typically rule functions are constant functions located at zoe.extend.RULE
 *        for convenience, these can also be referenced by a rule string, 'RULE'
 * 
 */
//also allows multiple extension: extend(a, b, c, d, e, rule). But then rule must be specified.
var zoe_extend = zoe.extend = function extend(a, b, rule) {
  var _arguments = arguments;
  if (_arguments.length > 2)
    rule = _arguments[_arguments.length - 1];
  
  var ruleObj;
  if (typeof rule == 'object') {
    ruleObj = rule;
    rule = void 0;
  }
  
  for (var p in b)
    if (!b.hasOwnProperty || b.hasOwnProperty(p)) {
      var v = b[p];
      var out;
      
      var pLength = p.length;
      var firstUnderscores = p.substr(0, 2) == '__';
      var lastUnderscores = p.substr(pLength - 2, 2) == '__';
      
      //a fancy (minifies better) way of setting the underscore rules to the appropriate extend function
      var underscoreRule = (firstUnderscores && !lastUnderscores && (p = p.substr(2)) && zoe_extend.APPEND)
        || (!firstUnderscores && lastUnderscores && (p = p.substr(0, pLength - 2)) && zoe_extend.PREPEND)
        || (firstUnderscores && lastUnderscores && (p = p.substr(2, pLength - 4)) && zoe_extend.REPLACE);
      
      //apply the right rule function
      var curRule = (underscoreRule || rule || (ruleObj && (ruleObj[p] || ruleObj['*'])) || zoe_extend.DEFINE);
      
      //allow rules to be strings
      if (typeof curRule == 'string')
        curRule = zoe_extend[curRule];
      
      try {
        out = curRule(a[p], v, ruleObj && zoe_extend.deriveRules(ruleObj, p));
      }
      catch (er) {
        zoe.dir(a);
        zoe.dir(b);
        zoe.dir(zoe_extend.deriveRules(rule, p));
        zoe.log('zoe.extend: "' + p + '" override error. \n ->' + (er.message || er));
      }
      if (out !== undefined)
        a[p] = out;
    }
    
  //multiple extension
  if (_arguments.length > 3) {
    var args = [a];
    args.concat(Array.prototype.splice.call(_arguments, 2, _arguments.length - 3, _arguments.length - 3));
    args.push(rule);
    $z.extend.apply(this, args);
  }
  
  return a;
}

zoe_extend.EXTEND = zoe_extend;
zoe_extend.DEFINE = function DEFINE(a, b) {
  if (a !== undefined)
    throw 'No override specified.';
  else
    return b;
}
var r = zoe_extend.REPLACE = function REPLACE(a, b) {
  if (b !== undefined)
    return b;
  else
    return a;
}
zoe_extend.FILL = function FILL(a, b) {
  if (a === undefined)
    return b;
  else
    return a;
}
var i = zoe_extend.IGNORE = function IGNORE(a, b) {}
var is_obj = function(obj) {
  return obj != null && obj.constructor == Object;
}
var is_fn = function(obj) {
  return typeof obj == 'function';
}
var is_str = function(obj) {
  return typeof obj == 'string';
}
var is_arr = function(obj) {
  return obj instanceof Array;
}
zoe_extend.APPEND = function APPEND(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, zoe_extend(rules || {}, {'*': 'REPLACE'}, 'FILL'));
  else if (is_fn(b))
    return zoe_extend.CHAIN(a, b);
  else if (is_str(b))
    return zoe_extend.STR_APPEND(a, b);
  else if (is_arr(b))
    return zoe_extend.ARR_APPEND(a, b);
  else
    return b;
}
zoe_extend.PREPEND = function PREPEND(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, zoe_extend(rules || {}, {'*': 'FILL'}, 'FILL'));
  else if (is_fn(b))
    return zoe_extend.CHAIN_FIRST(a, b);
  else if (is_str(b))
    return zoe_extend.STR_PREPEND(a, b);
  else if (is_arr(b))
    return zoe_extend.ARR_PREPEND(a, b);
  else
    return a === undefined ? b : a;
}
zoe_extend.DAPPEND = function DAPPEND(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, zoe_extend(rules || {}, {'*': 'DAPPEND'}, 'FILL'));
  else if (is_fn(b))
    return zoe_extend.CHAIN(a, b);
  else if (is_arr(b))
    return zoe_extend.ARR_APPEND(a, b);
  else
    return b;
}
zoe_extend.DPREPEND = function DPREPEND(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, zoe_extend(rules || {}, {'*': 'DPREPEND'}, 'FILL'));
  else if (is_fn(b))
    return zoe_extend.CHAIN_FIRST(a, b);
  else if (is_arr(b))
    return zoe_extend.ARR_PREPEND(a, b);
  else
    return a !== undefined ? a : b;
}
zoe_extend.DREPLACE = function DREPLACE(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, zoe_extend(rules || {}, {'*': 'DREPLACE'}, 'FILL'));
  else
    return b;
}
zoe_extend.DFILL = function DFILL(a, b, rules) {
  if (is_obj(b))
    return zoe_extend(a || {}, b, 'DFILL');
  else
    return typeof a == 'undefined' ? b : a;
}
zoe_extend.ARR_APPEND = function ARR_APPEND(a, b) {
  return (a || []).concat(b);
}
zoe_extend.ARR_PREPEND = function ARR_PREPEND(a, b) {
  return b.concat(a || []);
}
zoe_extend.STR_APPEND = function STR_APPEND(a, b) {
  return a ? a + b : b;
}
zoe_extend.STR_PREPEND = function STR_PREPEND(a, b) {
  return b + a;
}


/*
 create a rule for a property object from a rules object
 eg rules = { 'prototype.init': zoe.extend.APPEND, '*.init': zoe.extend.REPLACE, '*.*': zoe.extend.REPLACE }
 
 then deriveRule(rules, 'prototype') == { 'init': zoe.extend.APPEND, 'init': zoe.extend.REPLACE, '*.*': zoe.extend.REPLACE }
*/
zoe_extend.deriveRules = function(rules, p) {
  var newRules = {};
  
  for (var r in rules) {
    if (r == '*.*') {
      newRules['*.*'] = rules[r];
      continue;
    }
    
    if (r == '*')
      continue;
    
    var parts = r.split('.');
    if (parts[0] == p || parts[0] == '*')
      newRules[parts.splice(1).join('.')] = rules[r];
  }
  
  return newRules;
}
/*
 * zoe.extend.makeChain
 *
 * Creates a zoe.extend rule that will automatically
 * combine functions with the given execution function
 *
 * Usage:
 *   zoe.extend.makeChain(EXECUTION_FUNCTION [, first]);
 *
 * When the 'first' parameter is provided, this creates
 * a reverse chain putting the new items at the beginning of the
 * function list to be executed.
 *
 * The 'ignoreExecution' property exists to check if we want to
 * override the execution function on the chain if one already exists.
 *
 * zoe.extend.CHAIN is a weak extension rule as it will append to whatever
 * chain already exists on the host object, by setting this flag to true.
 *
 */

zoe_extend.makeChain = function(executionFunction, first) {
  if (typeof executionFunction == 'string')
    executionFunction = zoe_fn[executionFunction];
  return function(a, b) {
    if (!a || a.constructor != zoe_fn || a.run != executionFunction)
      a = zoe_fn(executionFunction, !a ? [] : [a]);
    
    if (first)
      a.first(b);
    else
      a.on(b);
    
    return a;
  }
}

// create the zoe.extend rules for the corresponding function chain methods.
zoe_extend.CHAIN = zoe_extend.makeChain(zoe_fn.LAST_DEFINED);
zoe_extend.CHAIN_FIRST = zoe_extend.makeChain(zoe_fn.LAST_DEFINED, true);
zoe_extend.CHAIN_STOP_DEFINED = zoe_extend.makeChain(zoe_fn.STOP_DEFINED);
zoe_extend.CHAIN_COMPOSE = zoe_extend.makeChain(zoe_fn.COMPOSE);



/*
 * zoe.create
 * http://zestjs.org/docs/zoe#zoe.create
 *
 * JavaScript object inheritance
 *
 * Usage:
 * 
 *   zoe.create(def)
 *   Creates a new instance of the class defined by def.
 *
 *   zoe.create([inherits], def)
 *   Creates a new instance of the class defined by def, with the given inheritance.
 *
 * zoe.create simply uses zoe.extend to copy the def into a new object.
 *
 * There are then 7 special optional properties on the definition object which will be picked
 * up when performing zoe.create. These properties allow for a natural but flexible class
 * inheritance model in JavaScript.
 * 
 *
 *   1. _base:
 *   
 *     A function that creates a new instance of the base object for extension.
 *
 *   2. _extend:
 *
 *     If an _extend property is provided, this property will be used as the zoe.extend rules specification.
 *
 *   3. _implement:
 *
 *     This acts in exactly the same way as calling zoe.create with an array of inheritors.
 *
 *   4. _reinherit:
 *
 *     Rarely used, merely a technical formality for flexibility in the diamond problem.
 *
 *   5. _make:
 *
 *     It may be necessary to have a function that does the creation of a definition, instead of just
 *     property extension.
 *
 *     In this case a make function can be provided:
 *
 *     _make = function(createDefinition, makeDefinition) {
 *     }
 *
 *     createDefinition is the primary definition provided into zoe.create.
 *
 *     makeDefinition is the definition currently being implemented from the _implement array, and is
 *     the same as the definition that would define the above _make function.
 *
 *     'this' is bound to the output object.
 *
 *   6. _integrate:
 *
 *     Integrate functions are the first hook on each inheritor. They run for all inheritors that
 *     are placed after the inheritor with the integrate hook.
 *     
 *     _integrate = function(makeDefinition, createDefinition) {
 *       //can check and modify the output object, accessed as 'this'
 *     }
 *     
 *     makeDefinition: the current definition being implemented
 *     createDefinition: the primary definition in zoe.create
 *     'this': is bound to the output object
 *     
 *     return value:
 *     In some rare cases, it can be necessary to perform some mapping of the definition object first.
 *     In this case, a derived definition object can be returned which will be used instead.
 *     The primary use case for this is to allow standard JavaScript constructors as _implement items
 *     when implementing zoe.constructor objects.
 *
 *   7. _built:
 *
 *     If an inheritor wants to apply some final changes to the object after all the other inheritors
 *     have completed, then a built function can make final modifications.
 *
 *     _built = function(createDefinition) {
 *     }
 *
 *
 *  NOTE: For the _integrate, _make and _built functions, these should never modify the definition objects,
 *        only the output object.
 */
zoe.create = function(inherits, definition) {
  definition = inheritCheck(inherits, definition);
  
  if (definition._definition)
    throw "Cannot use zoe.create on an instance of zoe.create";
  
  //find base definition (first base defined)
  var obj;
  implementLoop(definition, function(item) {
    if (item._base) {
      obj = item._base(definition);
      return true;
    }
  });
  obj = obj || {};
  
  obj._definition = definition;
    
  var _extend = {
    _extend: zoe_extend.IGNORE,
    _base: zoe_extend.IGNORE,
    _implement: zoe_extend.IGNORE,
    _reinherit: zoe_extend.IGNORE,
    _make: zoe_extend.IGNORE,
    _integrate: zoe_extend.IGNORE,
    _built: zoe_extend.IGNORE
  };
  
  //state variables
  var _inherited = [];
  var _built = zoe_fn();
  var _integrate = zoe_fn();
  
  _integrate._this = _built._this = obj;
  
  implementLoop(definition, function loop(def) {
    
    def = _integrate(def, definition) || def;
    
    if (def._integrate)
      _integrate.on(def._integrate);

    if (def._extend)
      zoe_extend(_extend, def._extend, 'REPLACE');
    
    zoe_extend(obj, def, _extend);
    
    if (def._make)
      def._make.call(obj, definition, def);
      
    if (def._built)
      _built.on(def._built);
      
    _inherited.push(def);
    
  }, function skip(def) {
    //diamond problem
    // - skip double inheritance by default, lowest inheritor always used
    // - 'reinherit' property can specify to always rerun the inheritance at each repeat
    return _inherited.indexOf(def) != -1 && !def._reinherit
  });
  
  _built(definition);
  
  return obj;
}
/*
 * implementLoop
 * Helper function to walk the implements of a definition
 *
 * First, 'skip' is run (if it exists). If it returns true, the current node
 * is skipped entirely and we move to the next sibling.
 *
 * Then 'loop' runs on each item in the implements stack, traversing from leaf to branch
 * left to right.
 * 
 * As the process goes, definitions with a "_definition" property in the implement
 * array are cleaned to be direct definitions.
 *
 */
var implementLoop = function(def, loop, skip) {
  skip = skip || function() {}
  if (def._implement)
    for (var i = 0, len = def._implement.length; i < len; i++) {
      var item = def._implement[i];
      if (!item) {
        zoe.dir(def);
        zoe.log('Implementor not defined!');
      }

      if (item._definition) {
        item = item._definition;
        //cleaning disabled to allow requirejs module tracing
        //def.implement[i] = item;
      }
      
      if (skip(item))
        continue;
      
      if (implementLoop(item, loop, skip))
        return true;
    }
  return loop(def);
}

/*
 * Helper to allow for flexible forms of
 *
 * zoe.implement([], {})
 * zoe.implement({})
 * zoe.implement([])
 *
 * All compiling into the definition
 *
 */
var inheritCheck = function(inherits, definition) {
  if (!(inherits instanceof Array)) {
    definition = inherits;
    inherits = [];
  }
  definition = definition || {};
  definition._implement = inherits.concat(definition._implement || []);
  return definition;
}

/*
 * zoe.inherits
 *
 * A utility function to determine if an object has inherited
 * the provided definition.
 *
 */
zoe.inherits = function(obj, def) {
  if (obj._definition)
    return zoe.inherits(obj._definition, def);
  if (def._definition)
    return zoe.inherits(obj, def._definition);
    
  var match = false;
  implementLoop(obj, function(item) {
    if (item === def) {
      match = true;
      return true;
    }
  });
  
  return match;
}



/*
 * zoe.Constructor
 * http://zestjs.org/docs/zoe#zoe.Constructor
 *
 * A base inheritor definition for zoe.create that allows for javascript prototype construction
 * such that we can create a class that can be instantiated with the new keyword.
 *
 * Usage:
 *
 *   var Obj = zoe.create([zoe.Constructor], {
 *     construct: function(args) {
 *     },
 *     prototype: {
 *       prototype: 'property'
 *     }
 *   });
 *
 *   var p = new Obj(args);
 *
 * In this way, zoe.create and zoe.Constructor provide a convenience method for
 * building up constructable prototypes with multiple inheritance through definition objects.
 *
 * Additionally, once zoe.Constructor has been implemented, standard JavaScript classes written
 * natively can also be extended by adding them into the zoe.create implement list after zoe.Constructor.
 *
 */
zoe.Constructor = {
  _base: function(def) {
    function Constructor() {
      // http://github.com/zestjs/zoe#zcreate
      Constructor.construct.apply(this, arguments);
    }
    return Constructor;
  },
  _extend: {
    prototype: zoe_extend,
    construct: zoe_extend.CHAIN
  },
  _integrate: function(def) {
    //the prototype property is skipped if it isn't an enumerable property
    //thus we run the extension manually in this case
    var getPropertyDescriptor = Object.getOwnPropertyDescriptor;
    if (getPropertyDescriptor) {
      var p = getPropertyDescriptor(def, 'prototype');
      if (p && !p.enumerable)
        zoe_extend(this.prototype, def.prototype, zoe_extend.deriveRules(this._extend, 'prototype'));
    }

    //allow for working with standard prototypal inheritance as well    
    if (typeof def == 'function' && !def._definition)
      return {
        construct: def.construct,
        prototype: def
      };
  },
  construct: function() {
    //ALL function chains on the prototype made into instance chains
    //this allows instance-level function chaining
    //important to ensure modifications not made to the underlying prototype
    for (var p in this) {
      var curProperty = this[p];
      if (curProperty && curProperty.constructor == zoe_fn) {
        this[p] = zoe_fn(curProperty.run, [curProperty]);
        this[p].bind(this);
      }
    }
  }
};

return zoe;
})($z);


(function(zoe, $z) {
  
  /*
   * Component
   * 
   * Creates a component with rendering or as attach-only
   *
   * The component is entirely rendered by $z.render.
   *
   * Attachment is triggered when a "$$" element array options parameter is provided to the constructor.
   * This is the consecutive DOM elements currently definining the rendered widget to attach.
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
   * construct: function() {
   *   this.$el.click(this.click);
   *   this.dispose.on(function() {
   *     this.$el.unbind('click', this.click);
   *   });
   * }
   * 
   * This is very important for removing memory leaks.
   *
   * The default '_unbind' property on the constructor automatically unbinds jquery events
   * when jQuery is bound to the contextual selector
   *
   */
  
  // only allow the first function to stop execution (used by dispose)
  zoe.fn.STOP_FIRST_DEFINED = function(self, args, fns) {
    var output = fns[0].apply(self, args);
    if (output !== 'undefined')
      return;
    for (var i = 1; i < fns.length; i++)
      fns[i].apply(self, args);
  }
  var Component = {
    _implement: [zoe.Constructor],
    
    _extend: {
      options: 'APPEND',
      type: 'REPLACE',
      pipe: 'CHAIN',
      load: zoe.extend.makeChain('ASYNC'),
      'prototype.dispose': zoe.extend.makeChain(zoe.fn.STOP_FIRST_DEFINED)
    },
    
    attach: function(o, els) {
      return new this(o, els);
    },
    
    construct: function(o, els) {
      if (!els)
        return $z.render(this.constructor, o, document.createDocumentFragment());
      this.o = o;
      this.$$ = els;
    },
    
    _unbind: true,
    prototype: {
      $: $z && $z.$,
      $z: $z && $z.$z,
      dispose: function(system) {
        //cut out and call $z.dispose to do the work, it will call this back with the system flag
        //basically, $z.dispose(el) is the right method.
        //   component.dispose(true) does 'extra' disposal.
        //   everything else is in $z.dispose, hence we revert to it by convenience
        if (!system) {
          $z.dispose(this.$$);
          return true;
        }        
        //automatically unbind jquery events on the elements
        if (this.constructor._unbind && $z.$.fn && $z.$.fn.jquery)
          this.$('*').unbind(); 
        delete this.$$;
      }
    } 
  };
  
  return Component;
})($z, $z);

 //routes resolve to pages
//$z.App should me in Main

// reference: https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet

// escaping of arbitrary css not provided

$z.esc = (function() {
  //arguments after mode are passed as successive arguments to the escape function
  var esc = function(text, mode) {
    var args = Array.prototype.splice.call(arguments, 2, arguments.length - 2);
    args.unshift(text);
    return esc[mode](args);
  }
  //useful for css sizes etc. Suffix allows for dimensions eg px
  esc.num = function(text, nanValue) {
    var num = parseFloat(text);
    if (isNaN(num))
      return nanValue;
    else
      return num + '';
  }
  
  //html attributes
  esc.attr = function(attr) {
    return attr
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  //html text only
  esc.htmlText = function(text) {
    return (text + '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  //quoted strings in javascript
  esc.strVar = function(str) {
    return (str + '')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/<\//, '<\\/'); //since </script> can be read through a string value
  }
  
  
  esc.cssAttr = function(attr) {
    return (attr + '')
      .replace(/;/g, '');
  }
  
  //json </script> attack
  esc.json = function(jsonStr) {
    return str.replace(/<\//, '<\\/');
  }
  
  //filtered html
  //tag and attribute filtering
  //unsafe attributes removed
  //all attributes escaped
  //url attributes escaped properly
  esc.html = function(html, allowedTags, allowedAttributes) {
    var urlAttributes = ['cite', 'href', 'poster', 'src'];
    //tag source: https://developer.mozilla.org/en-US/docs/HTML/Element
    allowedTags = allowedTags || ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'group', 'hr', 'i', 'img', 'input', 'ins', 'label', 'legend', 'li', 'map', 'mark', 'menu', 'meter', 'nav', 'nobr', 'noscript', 'ol', 'optgroup', 'option', 'p', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'video', 'wbr'];
    //attribute source: https://developer.mozilla.org/en-US/docs/HTML/Attributes
    allowedAttributes = allowedAttributes || ['align', 'alt', 'autocomplete', 'autofocus', 'autoplay', 'bgcolor', 'border', 'buffered', 'checked', 'cite', 'class', 'color', 'cols', 'colspan', 'contenteditable', 'contextmenu', 'controls', 'coords', 'datetime', 'default', 'dir', 'dirname', 'disabled', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'ismap', 'itemprop', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'min', 'multiple', 'name', 'open', 'optimum', 'pattern', 'ping', 'placeholder', 'poster', 'preload', 'pubdate', 'readonly', 'rel', 'required', 'reversed', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'span', 'src', 'srclang', 'start', 'step', 'summary', 'tabindex', 'target', 'title', 'type', 'usemap', 'value', 'width', 'wrap'];
    
    //loop through all html tags, and escape non-allowed
    var match;
    var openingTag = /<[^\s><\/]+/g;
    var closingTag = /<\/[^\s><\/]+/g;
    //match out whitespace, then attribute name, then attribute contents (with quote escaping), attribute contents optional
    //source - http://ad.hominem.org/log/2005/05/quoted_strings.php
    var attribute = /^\s*([^\s="'>]+)(=("([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'|[^\s>]*))?/;
    while ((match = openingTag.exec(html))) {
      //if not an allowed tag, escape
      if (allowedTags.indexOf(match[0].substr(1)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
      
      //if allowed, do attribute filter -> we rebuild the attributes entirely
      else {
        var escapedHtml = html.substr(0, match.index) + match[0];
        
        //store everything after the tag
        var tagStr = html.substr(match.index + match[0].length);
        var attr;
        
        //match out attributes
        while ((attr = attribute.exec(tagStr))) {
          var val;
          //update escaped tag attributes, if an allowed attribute
          if (allowedAttributes.indexOf(attr[1]) != -1) {
            var val = attr[6] !== undefined ? attr[6] : (attr[4] !== undefined ? attr[4] : (attr[3] !== undefined ? attr[3] : undefined));
            if (val !== undefined)
              escapedHtml += ' ' + attr[1] + '="' + (urlAttributes.indexOf(attr[1]) != -1 ? esc.url(val) : esc.attr(val)) + '"';
            else
              escapedHtml += ' ' + attr[1];
          }
          
          //cut out detected tag str for next match
          tagStr = tagStr.substr(attr.index + attr[0].length);
        }
        
        //no longer matching -> search for first instance of '>' or '/>', cut out everything inbetween and continue
        var tagClose = tagStr.match(/\s*\/?>/);
        
        //invalid html tag -> invalidate the remaining html
        if (!tagClose)
          return escapedHtml + '>';
        
        if (tagClose[1])
          escapedHtml += ' />';
        else
          escapedHtml += '>';
        
        //update the search index for searching for the next tag
        openingTag.lastIndex = escapedHtml.length;
        
        //update the html with the new escaped tag plus everything that came after
        html = escapedHtml + tagStr.substr(tagClose[0].length);
        
        //then keep searching for the next tag
      }
    }
    
    //escape any invalid closing tags
    while ((match = closingTag.exec(html)))
      if (allowedTags.indexOf(match[0].substr(2)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
    return html;
  }
  
  //url creation
  esc.uriComponent = function(uri) {
    return encodeURIComponent(uri);
  }
  
  //url escaping
  esc.url = function(url) {
    if (url.substr(0, 11) == 'javascript:')
      return 'javascript:void(0)';
    return url;
  }
  
  return esc;
})();