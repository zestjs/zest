/*
 * Zest JS
 * zestjs.org  
 * 
 */
define(['require', 'selector', './instance-css'], function(require, $, css) {
  
  var $z = function() { return $z.main.apply(this, arguments); }
  
  //make a global
  this.$z = $z;
  
  //component store
  $z._components = {};
  
  //global render option
  $z._global = null;
  
  var client = typeof window != 'undefined';
  
  //main rendering code and helpers
  
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
  $z.main = $z.$z = function(componentSelector, context) {
  
    componentSelector = componentSelector || '*';
    context = context || this.$$ || document.body;
    
    var asList = componentSelector.substr(componentSelector.length - 2, 2) == '[]';
    if (asList)
      componentSelector = componentSelector.substr(0, componentSelector.length - 2);
    
    var firstPart = componentSelector.substr(0, componentSelector.indexOf(' ')) || componentSelector;
    
    var subparts = firstPart.split('#');
    var firstSelector = (subparts[0] != '' && subparts[0] != '*' ? '[component=' + subparts[0] + ']' : '[component]') +
      (subparts[1] ? '#' + subparts[1] : '');
    
    var matches = $z.$(firstSelector, context);
    
    var outMatches = [];
    //if we're at the last depth
    if (firstPart == componentSelector) {
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].$zid)
          outMatches[i] = $z._components[matches[i].$zid];
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
    var com;
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].$zid && (com = $z._components[matches[i].$zid]))
        allMatches = allMatches.concat(com.$$);
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
   * $z.render(renderable, options, wrapperNode)
   * or
   * $z.render(renderable, wrapperNode)
   *
   *
   * Client encapsulation of the client and server shared function - $z.renderItem
   *
   * Adds the 'write' function corresponding to the DOM, as well as supporting
   * client requiring and returning instance information.
   *
   * Usage:
   *
   *  $z.render(structure, options, wrapperNode)
   *
   * Structure can be -
   *  - Requires string
   *  - Dynamic or static component
   *  - Structure item
   *  - Template function
   *  - Array of structure
   *  - Dynamic structure function
   *
   * Options are optional
   *
   */
  if (!client) $z.render = {}; else
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
      var _c = $z.render.Buffer(container);
      _c.write($$);
      complete();
    }
    
    $z.render.renderItem({
      structure: structure,
      options: options
    }, $$.write, function() {
      $z.render.Buffer(container.length ? container[0] : container).write($$);
      if (complete)
        complete();
    });
  }
  
  $z._components = $z._components || {};
  if (client)
    $z._nextComponentId = 1;
  
  /*
   * $z.render.renderItem
   * Renders the given structure / structure item
   *
   * global options now supported and passed down. options.global.
   *
   * NB: all $z.render.* functions not to be used directly!
   *
   * Usage:
   * $z.render(structure, options, write, complete);
   *
   * Write is called as the render completes each sequential structure part.
   * Complete is called at the end.
   *
   * Render function written asynchronously in order to be share the code for both asynchronous rendering
   * on the server and synchronous rendering on the client.
   *
   * On the client, the write function is passed a DOM element buffer in the form of a document fragment
   * On the server, the write function is passed a string of html
   *
   * On both the client and server, this function is wrapped by a '$z.render'
   * function which should be used directly instead of this one.
   *
   * INPUTS::
   * 
   * Direct Forms
   * -HTML string
   * -Component constructor / Component object (function / object with a 'template property)
   * -structure array (array)
   * -structure item = component object
   *
   * Function Forms
   * -template
   * -structure function
   * 
   */
  $z.render.renderItem = function(structure, options, write, complete) {
    if (complete === undefined) {
      complete = write;
      write = options;
      options = null;
    }
    if (complete === undefined)
      complete = function() {}
    
    if (typeof structure == 'undefined') {
      complete();
      return;
    }
    
    options = options || {};
    
    //template or structure function
    if (typeof structure == 'function' && !structure.template) {
      options.global = options.global || {};
      if (structure.length == 2) {
        var self = this;
        structure(options, function(output) {
          self.renderItem(output, { global: options.global}, write, complete);
        });
        return;
      }
      else
        return this.renderItem(structure(options), { global: options.global}, write, complete);
    }
    
    //Direct forms:
    //html string
    if (typeof structure == 'string') {
      write(structure);
      complete();
    }
  
    //structure array
    else if (structure instanceof Array)
      return this.renderArray(structure, { global: options.global || {} }, write, complete);
  
    //component (components purely indicated by a 'template' property)
    else if (structure.template) {
      //"component" attribute on dynamics
      //dynamic components need a type
      options.type = options.type || structure.type; 
      //and an id (null = dont add id)
      if (options.id === undefined) {
        options.id = (structure.options && structure.options.id !== undefined) ? structure.options.id : ('z' + ($z._nextComponentId++ || options.global._nextComponentId++));
      }
      
      return this.renderComponent(structure, options, write, complete);
    }
  
    //structure item
    else if (structure.structure) {
      var _options = $z.extend({}, structure.options || {});
      _options.global = options.global || _options.global || {};
      var self = this;
      if (typeof structure.structure == 'string') {
        require([structure.structure], function(_structure) {
          self.renderItem(_structure, _options, write, complete);
        });
        return null;
      }
      else
        return this.renderItem(structure.structure, _options, write, complete);
    }
    else {
      $z.dir(structure);
      throw 'Unrecognised structure item for render.';
    }
  }
  
  /*
   * Array rendering::
   *
   * $z.render.renderArray(structureArray, write, complete);
   *
   * each item is individually rendered, then the DOM elements are concatenated together.
   *
   */
  if (client)
  $z.render.renderArray = function(structure, options, write, complete) {
    var i = 0;
    var next = function() {
      if (i == structure.length) {
        complete();
        return;
      }
      $z.render.renderItem(structure[i++], i == structure.length - 1 ? options : $z.extend({}, options), write, function() {
        next();
      });
    }
    next();
  }
  
  
  /*
   * Component Rendering::
   *
   * Component rendering relies on the following properties:
   * {
   *   //default options, provided to functions below
   *   options: {
   *   },
   *
   *   //template function OR HTML string
   *   //child replacements denoted by "{`regionName`}"
   *   template: function(options) {
   *     return '<div>{`content`}</div>';
   *   },
   *
   *   id: '', //unique id for this component in this page. uniqueness checks not included.
   *   type: '', //type name for component
   *
   *   //any regions defined by the template are then checked for
   *   //renderable structures themselves
   *   content: {any renderable structure}
   *
   *   css: CSS string / function(o) {
   *     return '#' + o.id + ' { color: red; }';
   *   },
   *
   *   load: function(o, complete) {
   *     //perform any preloading
   *   },
   *
   *   pipe: function(o) {
   *     //prepare the options for the client attachment
   *     //returns the options to be sent
   *   },
   *
   *   //AMD-loaded module or function to use for attachment
   *   //if a module, that module should define an attach function property itself
   *   //the attach function takes parameters: $$, options
   *   //where $$ is the array of DOM elements, options is the piped options
   *   attach: {} / function
   * }
   *
   * Component render process:
   * - Compile in the default options
   * - Run the load function, and await the callback
   * - Parse the template into HTML and add the labelling
   * - Find the regions of the form '{`regionName`}' in the template
   * - Render the regions into their template locations
   * - Add CSS if provided
   * - Execute pipe function to determine attachment options
   * - Provide attachment if necessary
   *
   */
  
  $z.render.renderComponent = function(component, options, write, complete) {
    //add default options to options
    if (component.options)
      for (var option in component.options) {
        if (options[option] === undefined)
          options[option] = component.options[option];
      }
    
    var self = this;
    
    var render = function() {
      if (options.type === undefined)
        options.type = '';
      
      self.renderComponentTemplate(component, options, write, function($$) {
        var moduleId = $z.getModuleId(component);
        
        // Apply instance css
        var cssId;
        if (component.css && client && options.id)
          css.set(options.id, typeof component.css == 'function' ? component.css(options) : component.css, moduleId ? require.toUrl(moduleId) : true);
        
        // on client, component render returns element list
        if (component.attach)
          $z.render.renderAttach(component, options, $$ ? $$ : write, complete);
        else
          complete();
      });
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
  
  $z.render.renderAttach = function(component, options, $$, complete) {
    // run attachment
    var _options = component.pipe ? component.pipe(options) || {} : {};
    
    _options.global = options.global;
    $$[0].$zid = options.id;
    
    if (typeof component.attach === 'string') {
      var moduleId = $z.getModuleId(component);
      
      // a relative path method for attach moduleIds
      if (component.attach.substr(0, 1) == '.')
        component.attach = moduleId + '../' + component.attach;
      
      require([component.attach], function(attachComponent) {
        $z.render.renderAttach(component, options, write, complete);
      });
    }
    else {
      if (typeof component.attach == 'function' && !component.attach.attach)
        $z._components[options.id] = component.attach($$, _options);
        
      else if (component.attach && component.attach.attach)
        $z._components[options.id] = component.attach.attach($$, _options);
        
      complete();
    }
  }
  
  
  /*
   * $z.render.labelComponent
   *
   * Given the component html, label the master element
   * The master element is taken to be the first DOM element in the component template
   *
   * The labelling takes the form:
   *
   * "<div>"
   *  ->
   * "<div component='component-type-name' id='component-id'>"
   *
   * If no id is provided, the id attribute is not set.
   * If no type is provided, then the 'component' attribute is set but empty.
   *
   */
  $z.render.labelComponent = function(html, options) {
    var attributes = '';
    if (options.type != null)
      attributes += ' component' + (options.type !== '' ? '="' + options.type + '"' : '');
    
    if (options.id != null)
      attributes += ' id="' + options.id + '"';
      
    //clear space at the beginning of the html to avoid unnecessary text nodes
    html = html.replace(/^\s*/, '');
    
    var firstTag = html.match(/<\w+/);
    if (firstTag)
      return html.substr(0, firstTag[0].length) + attributes + html.substr(firstTag[0].length);
    else if (attributes != '') {
      $z.log(html);
      throw '$z.labelComponent: Unable to match first tag of template to add component id and type. Ensure the template defines at least one master HTML element itself.';
    }
    else
      return html;
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
   
  if (client)
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
  
  $z.render.renderComponentTemplate = function(component, options, write, complete) {
    // Render the template
    var html = typeof component.template == 'function' ? component.template(options) : component.template;
    
    // Create element array for complete on client
    var $$;
    
    //if its a page template, don't bother with labelling
    //if (!$z.inherits(component, $z.Page))
    html = $z.render.labelComponent(html, options);
    
    // Find all instances of '{`regionName`}'
    var regions = html.match(/\{\`\w+\`\}/g);
    
    // map the region replacements into placeholder divs to pick up
    if (regions)
      for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        var regionName = region.substr(2, region.length - 4);
        regions[i] = regionName;
        
        //check if there is a tag before the current one, and copy its type if there is
        var formerTag = html.match(new RegExp('(<\/(\\w*)[^>]*>|<(\\w*)[^>]*\/>)\\s*' + region));
        formerTag = (formerTag && (formerTag[2] || formerTag[3])) || 'span';
        
        var parentTag = html.match(new RegExp('<(\\w*)[^>]*>\\s*' + region));
        parentTag = (parentTag && parentTag[1]) || 'div';
        
        var placeholderTag = formerTag || 'span';
        
        if (parentTag == 'tbody')
          placeholderTag = 'tr';
          
        html = html.replace(region, '<' + placeholderTag + ' style="display: none;" region-placeholder=' + regionName + '></' + placeholderTag + '>');
        delete region;
      }
    
    // render into temporary buffer
    var buffer = $z.render.Buffer();
    buffer.write(html);
    
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
        var regionStructure = component[region] || options[region];
        
        // check if the region is flat in $$
        var regionIndex = $$.indexOf(regionNode);
        
        //copy the options for the region rendering
        if (typeof regionStructure == 'function' && !regionStructure.template)
          regionStructure = regionStructure.call(component, $z.extend({}, options, { id: 'IGNORE', type: 'IGNORE' }));
        
        //possible recursive templating? probably not
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
    
    // immediately write into outer buffer. dom references are maintained as region renders.
    //write($$);
    
    //complete();
  }

  /*
   * Helper functions
   * 
   */
  //first get the current context by finding selector
  if (!requirejs.s)
    throw 'Unable to read RequireJS contexts!';
  
  $z._requireContext = null;
  var modules;
  findContext: for (var c in requirejs.s.contexts) {
    modules = requirejs.s.contexts[c].defined;
    for (var curId in modules)
      if (modules[curId] == $) {
        $z._requireContext = c;
        break findContext;
      }
  }
  
  if (!$z._requireContext)
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
    
    if (el.getAttribute && typeof el.getAttribute('component') === 'string')
      return $z._components[el.$zid];
  
    if (!el.previousSibling && el.parentNode == document.body)
      return;
    
    //back track up components
    var prevNode = el;
    var com;
    while (prevNode = prevNode.previousSibling) {
      //if its a component, return if we fall under its cover
      if (typeof prevNode.$zid == 'number' && (com = $z._components[prevNode.$zid]))
        for (var i = 0; i < com.$$.length; i++)
          if (com.$$[i] == el)
            return com;
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
      //static css clearing
      if (typeof component.nodeType == 'number' && component.id)
        $z.css.clear(component.id);
      //dynamic css and register clearing
      else
        for (var id in $z._components) {
          //remove component
          if ($z._components[id] == component) {
            //remove instance css (css requires are a manual disposal if desired)
            $z.css.clear(id);
            delete $z._components[id];
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

