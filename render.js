/*
 * ZestJS
 *
 * Core component render system corresponding to the AMD-Components render specification
 *
 * Can be used as a global, but AMD loading is preferable.
 *
 * AMD Dependencies:
 *   selector
 *   - a path that maps to a selector engine (eg jQuery).
 *     f not specified, 'require-selector' should be the default. This will check for native
 *     querySelectorAll support and conditionally load Sizzle if necessary.
 *   css
 *   - the path to 'require-css'
 *
 * Parts of the render function here are shared with the server-render process, used
 * by zest-server. Non-shared functions are preceded by an if (client) check.
 *
 * Defines:
 *   $z - as a selector through $z.main
 *   $z.render
 *   $z.log
 *
 *   $z.getContext
 *   $z.getModuleId
 *   $z.Page
 *   $z.getComponent
 *   
 *
 * $z.render is the primary function defined.
 *
 * For more information read http://zestjs.org/docs#render
 * or continue reading the source here.
 * 
 */

//allow this to be loaded as an amd or global
(function (root, factory) {
  // AMD. Register as an anonymous module.
  if (typeof define === 'function' && define.amd)
    define(['selector', 'css'], factory);
  // Browser globals
  else
    //define module fallbacks for (basic) globals support
    root.$z = factory(
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
}(this, function ($, css) {
  
var client = typeof window !== 'undefined' && typeof window.location !== 'undefined';

var z = typeof $z !== 'undefined' ? $z : null;
$z = function(){ return $z.main.apply(this, arguments); }
if (z)
  if (z.extend)
    z.overwrite($z, z);
  else
    z.attach = $z.attach; 

  

/*
 * $z.main
 * Function called when using $z() as a function.
 *
 * Convenience method provided is a 'component selector'
 *
 */
$z.main = function(selector, context) {
  return $z.$z(selector, context);
};

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

$z.$z = function(componentSelector, context) {
  
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
    
  //if we're at the last depth
  if (firstPart == componentSelector) {
    for (var i = 0; i < matches.length; i++)
      if (typeof matches[i].$zid == 'number')
        matches[i] = $z._components[matches[i].$zid];
        
    if (matches.length == 1 && !asList)
      return matches[0];
    else
      return matches;
  }
  
  //run through matches, creating array of element arrays for matches
  var allMatches = [];
  var com;
  for (var i = 0; i < matches.length; i++) {
    if (typeof matches[i].$zid == 'number' && (com = $z._components[matches[i].$zid]))
      allMatches = allMatches.concat(com.$$);
    else
      allMatches.push(matches[i]);
  }
  
  //run next level selector on this
  return $z(componentSelector.substr(firstPart.length + 1), allMatches);
  
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
 * $z.log, $z.dir
 * Console log function existence wrappers
 * 
 */

$z.log = $z.dir = function(){}
if (typeof console !== 'undefined') {
  if (console.log)
    $z.log = function(str) {
      console.log(str);
    }
  if (console.dir)
    $z.dir = function(str) {
      console.dir(str);
    }
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
  //no options or complete
  if (arguments.length == 3) {
    if (typeof container == 'function') {
      complete = container;
      container = options;
      options = null;
    }
  }
  if (container.length)
    container = container[0];
  
  complete = complete || function(){};
  
  options = options || {};
  options.global = options.global || $z._global;
  
  var $$ = $z.render.Buffer();
  
  var _complete = function() {
    var _c = $z.render.Buffer(container);
    _c.write($$);
    complete();
  }
  
  //require
  if (typeof structure == 'string')
    require([structure], function(structure) {
      $z.render.renderItem(structure, options, $$.write, _complete);
    });
  //standard render
  else
    return $z.render.renderItem(structure, options, $$.write, _complete);
}

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
  options.global = options.global || {};
  
  //template or structure function
  if (typeof structure == 'function' && !structure.template)
    return this.renderItem(structure(options), { global: options.global }, write, complete);
  
  //Direct forms:
  //html string
  if (typeof structure == 'string') {
    write(structure);
    complete();
  }

  //structure array
  else if (structure instanceof Array)
    return this.renderArray(structure, { global: options.global }, write, complete);

  //component (*static and dynamic components purely indicated by a 'template' property)
  else if (structure.template) {
    
    //dynamic component
    if (structure.attach) {
      //"component" attribute on dynamics
      options.type = options.type || structure.type || $z.render.getComponentType(structure);
      options.id = options.id || structure.id;
      return this.renderDynamicComponent(structure, options, write, complete);
    }
    
    //static component
    else {
      //no "component" attribute on statics
      delete options.type;
      options.id = options.id || structure.id;
      return this.renderStaticComponent(structure, options, write, complete);
    }
  }

  //structure item
  else if (structure.component) {
    options = { global: options.global };
    if (structure.id)
      options.id = structure.id;
    if (structure.type)
      options.type= structure.type;
    
    var exclude = ['component', 'id', 'type', 'options'];
    for (var p in structure)
      if (exclude.indexOf(p) == -1)
        options[p] = structure[p];
    
    //nb require structure.component
    return this.renderItem(structure.component, options, write, complete);
  }
  else {
    $z.dir(structure);
    console.log('Unrecognised structure item for render.');
    throw 'Unrecognised structure item for render.';
  }
}

var capitalCase = function(arr) {
  for (var i = 0; i < arr.length; i++)
    arr[i] = arr[i].substr(0, 1).toUpperCase() + arr[i].substr(1);
  return arr.join('');
}
$z.render.getComponentType = function(component) {
  if (component.type)
    return component.type;
  
  var moduleId = $z.getModuleId(component) || '';
  
  if (moduleId.substr(0, 3) == 'cs!')
    moduleId = moduleId.substr(3);
  return capitalCase(moduleId.split('/'));
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
    $z.render.renderItem(structure[i++], options, write, function() {
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
$z.render.renderStaticComponent = function(component, options, write, complete) {
  //add default options to options
  if (component.options)
    for (var o in component.options)
      options[o] = options[o] !== undefined ? options[o] : component.options[o];
  
  var self = this;
  
  var next = function() {
    self.renderComponentTemplate(component, options, write, function() {
      //nb work out how to do get css baseUrl for mapping
      var baseUrl = undefined;
      
      // Apply css
      if (component.css)
        css.add(typeof component.css == 'function' ? component.css(options) : component.css/*, baseUrl*/);
      
      complete(options);
      
    });
  }
  
  if (component.load)
    component.load(options, next);
  else
    next();
}

$z._components = [];

$z.render.renderDynamicComponent = function(component, options, write, complete) {

  var $$ = [];
  var tmpBuf = $z.render.Buffer();
  
  $z.render.renderStaticComponent(component, options, function(_$$) {
    //intercept write to build up the element array for attachment
    tmpBuf.write(_$$);
    
    for (var i = 0; i < tmpBuf.container.childNodes.length; i++)
      $$.push(tmpBuf.container.childNodes[i]);
    
    write(tmpBuf);
    
  }, function(options) {
    
    var global = options.global;
    var _options = options;
    
    // run piping
    options = component.pipe ? component.pipe(options) || {} : {};
    
    options.global = global;
    
    $$[0].$zid = $z._components.length;
    
    // NB need to handle attach as string and loading the attach! variation to do the attachment
    if (typeof component.attach == 'function' && !component.attach.attach)
      $z._components[$$[0].$zid] = component.attach($$, options);
      
    else if (component.attach && component.attach.attach)
      $z._components[$$[0].$zid] = component.attach.attach($$, options);
    
    complete();
    
  });
  
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
 
if (client)
var _div = document.createElement('div');
$z.render.Buffer = function(container) {
  var buffer = {};
  buffer.container = container || document.createElement('div');
  buffer.write = function($$) {
    // html string
    if (typeof $$ == 'string') {
      _div.innerHTML = $$;
      buffer.write({
        write: true,
        container: _div
      });
    }
    // another buffer (assumed to have its container out the dom as in a hidden buffer - so container not used)
    else if ($$.write) {
      while ($$.container.childNodes.length > 0)
        buffer.container.appendChild($$.container.childNodes[0]);
    }
    // dom element
    else if ($$.nodeType) {
      buffer.container.appendChild($$);
    }
    // array of elements
    else if ($$.length) {
      for (var i = 0; i < $$.length; i++)
        buffer.container.appendChild($$[i]);
    }
  }
  return buffer;
}

$z.render.renderComponentTemplate = function(component, options, write, complete) {
  // Render the template
  var html = typeof component.template == 'function' ? component.template(options) : component.template;
  
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
      var placeholderTag = 'span'
      if (formerTag)
        placeholderTag = formerTag[2] || formerTag[3] || 'span';
        
      console.log(placeholderTag);
      
      html = html.replace(region, '<' + placeholderTag + ' style="display: none;" region-placeholder=' + regionName + '></' + placeholderTag + '>');
      delete region;
    }
  
  // render into temporary buffer
  var $$ = $z.render.Buffer();
  $$.write(html);
  
  var regionNodes = {};
  
  // pickup region placeholders
  if (regions)
    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];
      var regionNode;
      for (var j = 0; j < $$.container.childNodes.length; j++) {
        var node = $$.container.childNodes[j];
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
  write($$);
  
  // do region rendering
  if (!regions) {
    complete();
    return;
  }
    
  var completedRegions = 0;
  for (var i = 0; i < regions.length; i++)
    (function(region, regionNode) {
      var regionStructure = component[region] || options[region];
      
      delete options.id;
      delete options.type;
      
      if (typeof regionStructure == 'function' && !regionStructure.template)
        regionStructure = regionStructure.call(component, options);
      
      //possible recursive templating? probably not
      $z.render.renderItem(regionStructure, options, function($$) {
        var _$$ = $z.render.Buffer();
        _$$.write($$);
        while (_$$.container.childNodes.length > 0)
          regionNode.parentNode.insertBefore(_$$.container.childNodes[0], regionNode);
          
      }, function() {
        regionNode.parentNode.removeChild(regionNode);
        
        // detect completion
        completedRegions++;
        if (completedRegions == regions.length)
          complete();
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

var context;
$z.getContext = function(obj) {
  if (!obj && context)
    return context;
  obj = obj || this;
  if (require && require.s && require.s.contexts)
    for (var c in require.s.contexts)
      for (var curId in require.s.contexts[c].defined)
        if (require.s.contexts[c].defined[curId] === obj)
          return obj == this ? context = c : c;
}
$z.getModuleId = function(module, definitionMatching) {
  // find the current context
  var context = this.getContext();

  var moduleId = null;
  
  if (context) {
    for (var curId in require.s.contexts[context].defined) {
      var curMod = require.s.contexts[context].defined[curId];
      if (curMod === module && curMod != null)
        moduleId = curId;
      else if (definitionMatching && curMod && curMod._definition === module)
        moduleId = curId;
    }
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
    if (components[i] && components[i].dispose && !components[i]._disposed) {
      components[i].dispose(true);
      components[i]._disposed = true;
    }
    var cIndex = $z._components.indexOf(components[i]);
    if (cIndex >= 0)
      $z._components[$z._components.indexOf(components[i])] = undefined; //dereference component
  }
  
  for (var i = els.length - 1; i >= 0; i--)
    if (els[i].parentNode)
      els[i].parentNode.removeChild(els[i]);
}

return $z;
}));