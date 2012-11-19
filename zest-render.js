/*
 * Zest JS
 * zestjs.org  
 * 
 */
define(['require', 'selector', 'module'], function(require, $, module) {
  
  var config = module.config();
  
  var typeAttr = (config && config.typeAttribute) || 'component';
  
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
          
          if (!dispose || (dispose && !controller._ownDispose && dispose.length == 0 && !dispose.fns)) {
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
            registerController(attachment($$, _options));
          });
        }
        else
          registerController(component.attach($$, _options));
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
  if (!requirejs.s)
    throw 'Unable to read RequireJS contexts!';
  
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
});

