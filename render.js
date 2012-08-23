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
 * 'myComponent' -> '[component=myComponent]'
 * 'myComponent#asdf' -> '[componet=myComponent]#asdf'
 * etc
 *
 * If a DOM element has a '$z' object on it, that object
 * is provided.
 *
 */
$z.main = function(componentSelector) {
  
  if (!componentSelector)
    componentSelector = '*';
  
  var parts = componentSelector.split(' ');
  var outparts = [];
  for (var i = 0; i < parts.length; i++) {
    var subparts = parts[i].split('#');
    outparts.push((subparts[0] != '' && subparts[0] != '*' ? '[component=' + subparts[0] + ']' : '[component]') + (subparts[1] ? '#' + subparts[1] : ''));
  }

  var selection = $(outparts.join(' '));
  
  for (var i = 0; i < selection.length; i++) {
    if (selection[i].$z)
      selection[i] = selection[i].$z;
  }
  
  if (selection.length == 1 && componentSelector != '*')
    return selection[0];
  else
    return selection;
}


/*
 * $z.log, $z.dir
 * Console log function existence wrappers
 * 
 */
$z.log = $z.dir = function(){}
if (typeof console !== 'undefined') {
  $z.log = console.log || $z.log;
  $z.dir = console.dir || $z.dir;
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
$z.render = function(structure, options, complete) {
  var $$ = this.render.Buffer();
  
  //no options
  if (arguments.length == 2) {
    complete = options;
    options = null;
  }
  
  //if complete is a node, assume injection
  if (complete.nodeType) {
    var node = complete;
    complete = function() {
      node.appendChild($$);
    }
  }
  
  //require
  if (typeof structure == 'string')
    require([structure], function(structure) {
      $z.render.renderItem(structure, options, $$.write, complete);
    });
  //standard render
  else
    return $z.render.renderItem(structure, options, $$.write, function() {
      var items = parseItems($$);
      if (items.length == 1)
        items = items[0];
      complete($$, items);
    });
}

/*
 * $z.render.renderItem
 * Renders the given structure / structure item
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
  
  //template or structure function
  if (typeof structure == 'function' && !structure.template)
    return this.renderItem(structure(options), write, complete);
  
  //Direct forms:
  //html string
  if (typeof structure == 'string') {
    write(structure);
    complete();
  }

  //structure array
  else if (structure instanceof Array)
    return this.renderArray(structure, {}, write, complete);

  //component (*static and dynamic components purely indicated by a 'template' property)
  else if (structure.template) {
    
    options = options || {};
    
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
    options = {};
    if (structure.id)
      options.id = structure.id;
    if (structure.type)
      options.type= structure.type;
    
    var exclude = ['component', 'id', 'type', 'options'];
    for (var p in structure)
      if (exclude.indexOf(p) == -1)
        options[p] = structure[p];
    
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
  return component.type || capitalCase(($z.getModuleId(component) || '').split('/'));
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
if (client)
$z.render.Buffer = function() {
  var buffer = document.createDocumentFragment();
  buffer.write = function($$) {
    if (typeof $$ == 'string') {
      var _$$ = document.createElement('div');
      _$$.innerHTML = $$;
      for (var i = 0; i < _$$.childNodes.length; i++)
        buffer.appendChild(_$$.childNodes[i]);
    }
    else
      buffer.appendChild($$);
  }
  return buffer;
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
    if (i == structure.length)
      complete();
    $z.render.renderItem(structure[i++], options, write, next);
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
  
  (component.load || function(options, complete) { complete(); })(options, function() {
    
    self.renderComponentTemplate(component, options, write, function() {
      
      // Apply css
      if (component.css)
        css.add(typeof component.css == 'function' ? component.css(options) : component.css);
      
      // Run piping
      if (component.pipe)
        options = component.pipe(options) || options;
      
      complete(options);
      
    });
  });
}

$z.render.renderDynamicComponent = function(component, options, write, complete) {

  var $$ = [];
    
  $z.render.renderStaticComponent(component, options, function(_$$) {
    //intercept write to build up the element array for attachment
    for (var i = 0; i < _$$.childNodes.length; i++)
      $$.push(_$$.childNodes[i]);
    
    write(_$$);
    
  }, function(options) {
    if (typeof component.attach == 'function' && !component.attach.attach)
      component.attach($$, options);
      
    else if (component.attach && component.attach.attach)
      component.attach.attach($$, options);
      
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
  
  var firstTag = html.match(/^\s*<\w+/);
  if (firstTag)
    return html.substr(0, firstTag[0].length) + attributes + html.substr(firstTag[0].length);
  else if (attributes != '') {
    $z.log(html);
    throw '$z.labelComponent: Unable to match first tag of template to add component id and type. Ensure the template defines at least one master HTML element itself.';
  }
  else
    return html;
}

$z.render.renderComponentTemplate = function(component, options, write, complete) {
  // Render the template
  var html = typeof component.template == 'function' ? component.template(options) : component.template;
  
  html = $z.render.labelComponent(html, options);
  
  // Find all instances of '{`regionName`}'
  var regions = html.match(/\{\`\w+\`\}/g);
  
  //map the region replacements into placeholder divs to pick up
  if (regions)
    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];
      var regionName = region.substr(2, region.length - 4);
      regions[i] = regionName;
      delete region;
      html = html.replace(region, '<div region-placeholder=' + regionName + '></div>');
    }
  
  //render into temporary buffer
  var $$ = $z.render.Buffer();
  $$.write(html);
    
  //do region replacements
  if (regions) {
    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];
      var regionNode;
      for (var i = 0; i < $$.childNodes.length; i++) {
        var node = $$.childNodes[i];
        if (node.getAttribute && node.getAttribute('region-placeholder') == region) {
          regionNode = node;
          break;
        }
        var matches = $('[region-placeholder=' + region + ']', node);
        if (matches.length > 0) {
          regionNode = matches[0];
          break;
        }
      }
      
      //create region buffer
      var region$$ = $z.render.Buffer();
      
      var regionStructure = component[region];
      if (!regionStructure) {
        regionStructure = options[region];
        delete options[region];
      }
      if (typeof regionStructure == 'function' && !regionStructure.template)
        regionStructure = regionStructure.call(component, options);
      
      $z.render.renderItem(regionStructure, options, region$$.write, function() {});
      
      regionNode.parentNode.insertBefore(region$$, regionNode);
      regionNode.parentNode.removeChild(regionNode);
    }
  }
    
  write($$);
  
  complete();
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
  //find the current context
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

$z.Page = {
  template: '{`body`}'
};

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
  
  if (el.getAttribute && typeof el.getAttribute('component') === 'string' && typeof el.$z == 'object' && el.$z !== null)
    return el.$z;

  if (!el.previousSibling && el.parentNode == document.body)
    return;
  
  return $z.getComponent(el.previousSibling || el.parentNode);
}


return $z;
}));