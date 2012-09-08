/*
 * ZestJS
 * zestjs.org
 * 
 * Zest Object Model
 * Used by Zest Component for component inheritance
 *
 * Defines primary object methods:
 * $z.extend
 * $z.create
 *
 * $z.creator
 * $z.functional
 * $z.fn
 * $z.constructor
 *
 * $z.Options
 * $z.InstanceChains
 * $z.Pop
 *
 *
 * NB: get rid of slashing?
 * 
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals
    root.$z = factory();
  }
}(this, function () {

var z = typeof $z !== 'undefined' ? $z : null;

$z = function(){ return $z.main.apply(this, arguments); }

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
 * $z.extend
 * See: http://www.zestjs.org/docs/#extend
 *
 * Extend obj A by merging properties from obj B
 *
 * Also provides derived helper functions:
 *   $z.overwrite
 *   $z.underwrite
 *   $z.append
 *   $z.prepend
 *
 * Without any parameters, $z.extend does a straight merge, but will throw an
 * error as soon as there is a property name clash and need for an override.
 *
 * Overrides are dealt with based on override rules given by a rules object
 * passed into the extend function.
 *
 * Usage::
 *
 * $z.extend(objA, objB, [rules,] [slashing]);
 *
 *
 * Rules Specification::
 *
 * The rules object specifies how to deal with overrides.
 * - The key of the rules object is the property name to apply the rule to.
 * - The value of the rules object is the override function to apply.
 *
 * If not provided, rules are taken from the '_extend' property of the
 * first object.
 *
 * eg:
 * rules: {
 *   'options': $z.extend.APPEND,
 *   '()': $z.extend.CHAIN,
 *   'options.load': $z.extend.CHAIN
 * }
 *
 * Rule Keys
 *
 *  Inner object rules can be specified with the use of a dot.
 *  eg 'subObject.property'
 *  When doing deep extends, rules are derived at each successive object
 *  level.
 *   
 *  Wildcards
 *  - Using '*' as a property name will apply the rule to all properties on the
 *     object
 *  - Using '*.*' as a property name will apply the rule to all properties,
 *    at all depths on the object
 *  - Property type wildcards can also be used to specify default rules based
 *    on the type of value being added.
 *    These are:
 *    '{}' - object
 *    '[]' - array
 *    '()' - function
 *    '"' - string
 *    '!' - boolean
 *    '#' - number
 *  - The order of priority at any level is a matching for the exact property
 *    name, followed by the type wildcard, followed by the level wildcard (*), 
 *    followed by the all-level wildcard (*.*)
 *
 * Override Functions
 *
 *   These functions simply specify what to do when overriding an existing value.
 *   
 *   They are all of the form:
 *
 *   override = function(propertyAValue, propertyBValue, [rules]) {
 *     return newValue;
 *   };
 *
 *   The rules object is provided for use by objects, and is derived to match the
 *   current depth (replacing 'object.subObject.property' with
 *   'subObject.property' etc).
 *
 * Provided Override Functions
 *
 * $z.extend provides a number of override functions to use. These are:
 *
 *   $z.extend.REPLACE
 *   -direct replace, by reference for objects and functions
 * 
 *   $z.extend.FILL
 *   -does not replace at all. leaves the existing value.
 *   -This method effectively 'fills in' any properties which aren't already
 *    defined.
 *
 *   $z.extend.IGNORE
 *   -completely leaves the property out of the extension process
 * 
 *   $z.extend.CHAIN_AFTER
 *   -when overriding a function with another function, the functions are chained
 *    together to run one after the other
 *   -if the existing property is an instance of $z.fn, it is ammended, otherwise
 *    it is wrapped with the $z.fn functionality before being ammended
 * 
 *   $z.extend.CHAIN_BEFORE
 *   -just as with CHAIN_AFTER but with the reverse execution order
 * 
 *   $z.extend.APPEND
 *   -initiates an extend between two properties, based on the following -
 *   -when given two functions, merge them so that the functions get chained with
 *    CHAIN_AFTER
 *   -when given two sub objects, the sub objects are extended
 *   -any other types are replaced
 *   -rules for the sub-object extends can be specified as a parameter to the
 *    function. Thus allowing for shallow or deep merges as needed.
 *    eg
 *
 *    $z.extend(objA, objB, { '*.*': $z.extend.APPEND });
 * 
 *   $z.extend.PREPEND
 *   -similarly to $z.extend.APPEND
 *
 *   $z.extend.STR_APPEND
 *   $z.extend.STR_PREPEND
 *   $z.extend.ARR_APPEND
 *   $z.extend.ARR_PREPEND
 *   all as expected
 *   
 *
 *
 * Slash Notation::
 *
 * Sometimes it can be easier to use a slash notation to specify overrides,
 * instead of manually typing rules.
 * By default, this notation is enabled for extends. If using variable names
 * that contain '__', opt out of this with a 'false' slashing parameter.
 *
 * eg:
 * $z.extend(obj, { 
 *   __subObject: {
 *     ...
 *   }
 * }, true);
 *
 * Slashing is taken as the highest priority override over any other rules.
 *
 * Slashing applies the APPEND, PREPEND or REPLACE override, depending on the
 * notation.
 *
 * __propertyName will apply an APPEND 
 * propertyName__ will apply PREPEND
 * __propertyName__ will apply REPLACE
 *
 * It will thus chain functions together, and append or prepend objects, while
 * replacing all other types.
 *
 *
 *
 * Helper Functions::
 *
 * To enforce an override for all property types, you could write:
 *
 * $z.extend(a, b, {'*': $z.extend.REPLACE});
 *
 * To make this easier to write, helper functions have been provided.
 *
 * These are:
 * $z.replace
 * $z.fill
 * $z.append
 * $z.prepend
 *
 * They effectively mean: "apply the given override for all properties"
 *
 *
 * Future feature: mapping rules, with wildcards.
 * Eg:
 * $z.extend({}, {sub: {..}}, {'sub.%': '%'})
 */


var e = $z.extend = function extend(a, b, rules, slashing) {
  if (a == undefined)
    a = {};
    
  rules = checkRules(rules, a);
  slashing = checkSlashing(rules, slashing);
  
  //NB adjust so that '_extend' only gets changed at the end
  
  for (var p in b)
    if ((b.hasOwnProperty && b.hasOwnProperty(p)) || !b.hasOwnProperty) {
      
      var v = b[p], out, rule;
      
      type = e.getType(v);
      
      //lookup the override rule for this property (modifies the property for slashing)
      rule = e.getRule(p, type, rules, slashing);
      
      try {
        out = rule.override(a[rule.p], v, type == 'object' ? e.deriveRules(rules, rule.p) : null, slashing);
      }
      catch (er) {
        $z.dir(a);
        $z.dir(b);
        console.log('$z.extend: "' + rule.p + '" override error. \n ->' + (er.message || er));
      }
      
      if (out !== undefined)
        a[rule.p] = out;
    }
  
  return a;
}

var checkRules = function(rules, objA) {
  return (typeof rules == 'object' && rules !== null) ? rules : (objA && objA._extend ? objA._extend : {});
}
var checkSlashing = function(rules, slashing) {
  return typeof rules == 'boolean' ? rules : (slashing === undefined ? true : slashing);
}
var buildChain = function(f) {
  if (f === undefined)
    f = $z.fn();
  if (f.constructor !== $z.fn)
    f = $z.fn([f]);
  return f;
}
var overrides = [
  function DEFINE(a, b) {
    if (a !== undefined)
      throw 'No override specified.';
    else
      return b;
  },
  function REPLACE(a, b) {
    if (b !== undefined)
      return b;
    else
      return a;
  },
  function FILL(a, b) {
    if (a === undefined)
      return b;
    else
      return a;
  },
  function IGNORE(a, b) {},
  function CHAIN_AFTER(a, b) {
    a = buildChain(a);
    a.after(b);
    return a;
  },
  function CHAIN_BEFORE(a, b) {
    a = buildChain(a)
    a.before(b);
    return a;
  },
  function ARR_APPEND(a, b) {
    a = a || [];
    return a.concat(b);
  },
  function ARR_PREPEND(a, b) {
    return b.concat(a || []);
  },
  function STR_APPEND(a, b) {
    return a ? a + b : b;
  },
  function STR_PREPEND(a, b) {
    return b + a;
  }
];
for (var i = 0; i < overrides.length; i++)
  e[overrides[i].name] = overrides[i];
e.CHAIN = e.CHAIN_AFTER;

e.make = function(_rules) {
  return function(a, b, rules, slashing) {
    rules = checkRules(rules, a);
    slashing = checkSlashing(rules, slashing);
    e(rules, _rules, { '*': e.FILL });
    return e(a, b, rules, slashing);
  }
}

$z.overwrite = e.make({ '*': e.REPLACE });
$z.underwrite = e.make({ '*': e.FILL });
$z.deepOverwrite = e.make({ '*': e.REPLACE, '{}': $z.deepOverwrite });
$z.deepUnderwrite = e.make({ '*': e.FILL, '{}': $z.deepUnderwrite });

$z.copy = function(obj) {
  return e({}, obj);
}
$z.deepCopy = function(a, b) {
  if (arguments.length == 1) {
    b = a;
    a = {};
  }
  return e(a || {}, b, {
    '*': e.REPLACE,
    '{}': $z.deepCopy
  });
}

var typeWildcards = {
  'object': '{}',
  'function': '()',
  'array': '[]',
  'string': '"',
  'number': '#',
  'boolean': '!'
  
  //'null': '',
  //'undefined': ''
  //'misc': '', //misc is any other object prototypes (including date)
};
e.getType = function(v) {
  var type = typeof v;
  if (v === null)
    type = 'null';
  else if (v instanceof Array)
    type = 'array';
  else if (type == 'object' && v.constructor !== Object)
    type = 'misc';
  return type;
};
e.getRule = function(p, type, rules, slashing) {
  //check slashing - prioritised over rules
  if (slashing) {
    var override = undefined;
    var firstSlash = p.substr(0, 2) == '__';
    var lastSlash = p.substr(p.length - 2) == '__';
    if (firstSlash && !lastSlash) {
      override = e.REPLACE;
      if (type == 'function')
        override = e.CHAIN_AFTER;
      if (type == 'object')
        override = $z.overwrite;
      if (type == 'array')
        override = e.ARR_APPEND;
      if (type == 'string')
        override = e.STR_APPEND;
      p = p.substr(2);
    }
    else if (!firstSlash && lastSlash) {
      override = e.FILL;
      if (type == 'function')
        override = e.CHAIN_BEFORE;
      if (type == 'object')
        override = $z.underwrite;
      if (type == 'array')
        override = e.ARR_PREPEND;
      if (type == 'string')
        override = e.STR_PREPEND;
      p = p.substr(0, p.length - 2);
    }
    else if (firstSlash && lastSlash) {
      rule = e.REPLACE;
      p = p.substr(2, p.length - 4);
    }
    if (override !== undefined)
      return {
        override: override,
        p: p
      };
  }
  
  var wildcard, allWildcard, typeWildcard;
  var typeMatch 
  var output = {
    p: p,
    override: undefined
  };
  
  for (var r in rules) {
    //only valid rules are rules without a '.'
    if (r.indexOf('.') != -1)
      continue;
    
    //if it is an exact match - return directly
    if (p == r) {
      output.override = rules[r];
      return output;
    }
    
    //store wildcard rules
    if (r == '*')
      wildcard = rules[r];
    if (r == '*.*')
      allWildcard = rules[r];
    
    //do type checks
    if (type == 'undefined' || type == 'null')
      continue;
    
    if (r == typeWildcards[type])
      typeWildcard = rules[r];
  }
  
  //do final wildcard checking
  output.override = output.override || typeWildcard || allWildcard || wildcard;

  if (output.override === undefined)
    output.override = e.DEFINE;
  
  return output;
}

/*
 create a rule for a property object from a rules object
 eg rules = { 'prototype.init': $z.extend.APPEND, '*.init': $z.extend.REPLACE, '*.*': $z.extend.REPLACE }
 
 then deriveRule(rules, 'prototype') == { 'init': $z.extend.APPEND, 'init': $z.extend.REPLACE, '*.*': $z.extend.REPLACE }
*/
$z.extend.deriveRules = function(rules, p) {
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
 * $z.create
 * Implement a definition onto a new base object.
 *
 * Usage:
 * $z.create(def)
 * $z.create([inherits], def)
 * 
 * At it's core, $z.create just applies $z.extend, which in turn checks the "_extend" property
 * for amalgamation rules.
 *
 * The base object is taken to be an empty object. If a 'base' property is provided by any definition in the
 * inheritance chain, that is used as the base object generator function.
 *
 * $z.create provides an 'implement' property for multiple inheritance
 *
 * The following special object properties allow for dynamic builds:
 * make - a function to build the object dynamically
 * integrate - a function to build the object dynamically for each successive implement
 * built - a function to post-process the object after implementation
 * 
 * The definition is stored on obj._definition, allowing for sub-inheritance.
 *
 * Each of the "implement" array items is implemented in order from left to right in the array.
 *
 * Each successive implementation follows the implementation rules below:
 *
 * Implementation Specification::
 *
 * {
 *   //definition management::
 *   implement: [], //array of multiple implementors, in order from right to left
 *
 *   //build management::
 *   //generator for base object to start from. defaults to {}
 *   base: function() {}
 *   //rare flag indicating if this should be rebuilt for multiple integrations onto the same object
 *   //allows for specifying how to deal with the diamond problem
 *   reinherit: false,
 *   //run for build, allows dynamic property definitions
 *   make: function(primaryDef, curDef) {
 *     this.customProperty = customValue;
 *   },
 *   //runs before every implement, allowing implementation management
 *   integrate: function(curDef, primaryDef) {
 *     return newDef; //can return a new definition to override curDef
 *   },
 *   //runs on full implement inheritance completion, for post-processing
 *   built: function() {
 *     this.ready = true;
 *   }
 * }
 *
 * NB despite these being the initial inspiration, none of these functions respect extension rules or slashing!
 *
 * Note that when implementing, the definitions in [] are untouched,
 *  while the definition provided in {}, will have its "implement"
 *  ammended to include the full inheritance for use in $z.implement.
 * 
 */

$z.create = function(inherits, definition) {
  definition = inheritCheck(inherits, definition);
  
  if (definition._definition)
    throw 'You can only implement new definitions. Use the inherits syntax to extend other definitions.';
  
  //find base definition (first base defined)
  var obj;
  implementLoop(definition, function(item) {
    if (item.base) {
      obj = item.base(definition);
      return true;
    }
  });
  obj = obj || {};
  
  obj._definition = definition;
    
  obj._extend = {
    _extend: e,
    '_extend.*': e.REPLACE,
    
    base: e.IGNORE,
    implement: e.IGNORE,
    make: e.IGNORE,
    integrate: e.IGNORE,
    built: e.IGNORE
  };
  
  //state variables
  var _inherited = [];
  var _integrate = [];
  var _built = [];
  
  implementLoop(definition, function loop(def) {
    
    for (var i = 0; i < _integrate.length; i++)
      def = _integrate[i].call(obj, def, definition) || def;
    
    if (def.integrate)
      _integrate.push(def.integrate);
    
    $z.extend(obj, def, true);
  
    if (def.make)
      def.make.call(obj, definition, def);
      
    if (def.built)
      _built.push(def.built);
      
    _inherited.push(def);
    
  }, function skip(def) {
    //diamond problem
    // - skip double inheritance by default, lowest inheritor always used
    // - 'reinherit' property can specify to always rerun the inheritance at each repeat
    if (_inherited.indexOf(def) != -1)
      if (def.reinherit !== true)
        return true;
  });
  
  for (var i = 0; i < _built.length; i++)
    _built[i].call(obj, definition);
  
  delete obj._extend;
  
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
  if (def.implement)
    for (var i = 0, len = def.implement.length; i < len; i++) {
      var item = def.implement[i];
      if (!item) {
        $z.dir(def);
        console.log('Implementor not defined!');
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
 * $z.implement([], {})
 * $z.implement({})
 * $z.implement([])
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
  definition.implement = inherits.concat(definition.implement || []);
  return definition;
}

/*
 * Check if the given implemented object inherits certain definitions
 *
 */
$z.inherits = function(obj, def) {
  if (obj._definition)
    return $z.inherits(obj._definition, def);
  if (def._definition)
    return $z.inherits(obj, def._definition);
    
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
 * $z.creator
 * An easy shorthand for objects that are expected to be extended.
 *
 * Usage:
 * var p = $z.create({ baseDefinition })
 *
 * The saving is that instead of having to write:
 *
 * var s = $z.create([baseDefinition], { newDefinition] })
 *
 * Just write - 
 *  var s = p({ newDefinition })
 * or
 *  var s = p([additionalImplements], { newDefinition })
 *
 * The implementor can still be implemented like any other definition:
 *
 * Implementors shouldn't be used directly themselves, only implemented.
 * It is purely a function with a _definition property.
 *
 */
$z.creator = function(implementorDef) {
  var creator = function(inherits, def) {
    def = inheritCheck(inherits, def);
    def.implement = [implementorDef].concat(def.implement);
    return $z.create(def);
  }
  creator._definition = implementorDef;
  return creator;
}

/*
 * $z.functional
 * Function-object make functions
 *
 * Just like $z.constructor, except for functions instead of objects.
 *
 * The function itself that is returned corresponds to running the 'main'
 * function on the prototype.
 *
 * Note prototype inheritance is feigned here, by merely copying the prototype.
 *
 * Usage:
 * var q = $z.create([
 *   $z.functional
 * ], {
 *   construct: function() {
 *     console.log('creating a q functional');
 *   },
 *   prototype: {
 *     main: function(arg) {
 *       console.log('running the q functional instance');
 *     },
 *     method: function() {
 *       console.log('running a method on p!');
 *     }
 *   }
 * });
 * 
 * Then to create an "instance" use:
 * var p = q();
 *
 * Then run the function normally as:
 * p();
 * p.method();
 *
 * This will then execute the 'main' chain.
 *
 * To keep track of the current function scope, a '_this'
 * variable is set on the funtion for each run, and
 * deleted afterwards.
 *
 * This saves having to play with argument splicing.
 *
 */
$z.functional = {
  _extend: {
    'prototype.main': e.CHAIN,
    construct: e.CHAIN,
    prototype: e
  },
  base: function() {
    function instantiator() {
      function f() {
        // http://www.zestjs.org/docs#functional
        if (!f.main)
          return;
        f._this = this;
        var output = f.main.apply(f, arguments);
        delete f._this;
        return output;
      }
      if (instantiator.prototype)
        $z.extend(f, instantiator.prototype);
      f.constructor = instantiator;
      if (instantiator.construct)
        instantiator.construct.apply(f, arguments);
      return f;
    }
    return instantiator;
  }
};

/*
 * $z.fn
 * Creates function chains under various reduction functions
 * Example:
 *   var f = $z.fn();
 *   f.on(function() { return 'hello world'; });
 *   f.on(function() { console.log('another function'); });
 *   console.log(f());
 *
 * var f = $z.fn($z.fn.LAST_DEFINED);
 *
 * For LAST_DEFINED and STOP_DEFINED, the output of the previous function
 * is added as the last function argument.
 * 
 * var f = $z.fn([startFunc]);
 *
 * NB binding:
 *
 * pass method allows custom scope and arg binding
 * bind method allows for scope fixing
 *
 * var s = $z.fn();
 * s.bind(newThis);
 *
 * s.bind(undefined); //undoes binding to standard func again!
 *   
 * See: http://www.zestjs.org/docs/#fn
 *
 */
//could possibly allow a second function argument to explicitly
//specify the function to go before or after!
//could also allow function labels for easier debugging

var buildOnce =  function(fn) {
  return function() {
    var output = fn.apply(this, arguments);
    if (output === null)
      return undefined;
    for (var i = 0; i < this.fns.length; i++)
      if (this.fns[i] == func) {
        this.fns.splice(i, 1);
        break;
      }
    return output;
  }
};
var createRunFunction = function(reduce, startVal) {
  return function() {
    var output = startVal;
    var args = Array.prototype.splice.call(arguments, 0);
    for (var i = 0; i < this.fns.length; i++)
      output = reduce(output, this.fns[i].apply(this._this, output === undefined ? args : Array.prototype.concat.call(args, [output])));
    return output;
  };
}

$z.fn = $z.create({
  _extend: {
    prototype: e
  },
  base: $z.functional.base,
  construct: function(o) {
    this.fns = o instanceof Array ? o : [];
    this.run = typeof o == 'function' ? o : $z.fn.LAST_DEFINED;
    this.constructor = $z.fn;
    this.on = this.after;
    this.once = this.onceAfter;
  },
  prototype: {
    main: function() {
      if (this.scope !== undefined)
        this._this = this.scope;
  
      if (this.fns.length == 0)
        return undefined;
      
      var output = this.run.apply(this, arguments);
      
      return output;
    },
    remove: function(fn) {
      if (!fn) {
        this.fns = [];
        return;
      }
      for (var i = 0; i < this.fns.length; i++)
        if (this.fns[i] == fn) {
          this.fns.splice(i, 1);
          return;
        }
    },
    before: function(fn) {
      this.fns = [fn].concat(this.fns);
      return this;
    },
    after: function(fn) {
      this.fns.push(fn);
      return this;
    },
    onceAfter: function(fn) {
      this.after(buildOnce(fn));
    },
    onceBefore: function(fn) {
      this.before(buildOnce(fn));
    },
    pass: function(scope, args) {
      var self = this;
      return function() {
        if (self.fns.length == 0)
          return undefined;
        
        self._this = scope;
        self.main.apply(self, args.concat(Array.prototype.splice.call(arguments, 0)));
        
        return output;
      }
    }
  },
  
  //execution functions
  createRunFunction: createRunFunction,
  LAST_DEFINED: createRunFunction(function(out1, out2) {
    return out2 !== undefined ? out2 : out1;
  }, undefined),
  STOP_DEFINED: function() {
    var args = Array.prototype.splice.call(arguments, 0);
    for (var i = 0; i < this.fns.length; i++) {
      var output = this.fns[i].apply(this._this, Array.prototype.concat.call(args, [output]));
      if (output !== undefined)
        return output;
    }
    return undefined;
  },
  // f.on(function(arg, next) { next() }); f(arg, complete);
  NEXT: function() {
    var args = Array.prototype.splice.call(arguments, 0);
    
    var self = this;
    var i = 0;
    var makeNext = function(i) {
      return function() {
        if (self.fns[i])
          self.fns[i].apply(self._this, args.concat([makeNext(i + 1)]));
      }
    }
    return makeNext(0)();
  },
  AND: createRunFunction(function(out1, out2) {
    return out1 && out2;
  }, true),
  OR: createRunFunction(function(out1, out2) {
    return out1 || out2;
  }, false)
});

/*
 * $z.on
 *
 * Shorthand for converting any function to a chain
 *
 * Usage:
 *
 * var obj = { sayHi: function() {} }
 * 
 * $z.on(obj, 'sayHi', function() {
 * });
 *
 * Which is identical to:
 * obj.sayHi = $z.fn(obj.sayHi);
 * obj.sayHi.on(function() {
 * });
 *
 */
$z.on = function(obj, name, f) {
  obj[name] = $z.fn([obj[name]]).on(f);
}
$z.remove = function(obj, name, f) {
  if (obj[name].constructor == $z.fn)
    obj[name].remove(f);
}


/*
 * $z.constructor
 *
 * A base definition for $z.implement that allows for javascript prototype construction
 * such that we can create a class that can be instantiated with the new keyword.
 * 
 * Read more about this inheritance model at www.zestjs.org/docs#constructor
 *
 */
$z.constructor = $z.creator({
  base: function() {
    function constructor() {
      // http://www.zestjs.com/docs#constructor
      return constructor.construct.apply(this, arguments);
    }
    constructor.construct = $z.fn();
    return constructor;
  },
  _extend: {
    prototype: e,
    construct: e.CHAIN
  },
  integrate: function(def) {
    //the prototype property is skipped if it isn't an enumerable property
    //thus we run the extension manually in this case
    if (Object.getOwnPropertyDescriptor) {
      var p = Object.getOwnPropertyDescriptor(def, 'prototype');
      if (p && !p.enumerable)
        $z.extend(this.prototype, def.prototype, $z.extend.deriveRules(this._extend, 'prototype'));
    }
      
    //allow for working with standard prototypal inheritance as well
    if (typeof def == 'function' && !(def._definition || def.implement || def.base || def.make || def.integrate || def.built))
      return {
        construct: def,
        prototype: def.prototype
      };
  }
});


/*
 * $z.InstanceChains
 * Allows the specification of function chains bound to the instance instead of the prototype
 *
 * Usage:
 * instanceChains: ['click']
 *
 * etc.
 * Array will auto append based on property rules.
 *
 * The instance functions are also automatically bound to this component, so that
 * they become portable beyond the component object (eg for eventing)
 *
 */
$z.InstanceChains = {
  _extend: {
    instanceChains: $z.extend.ARR_APPEND
  },
  integrate: function(def) {
    this.instanceChains = this.instanceChains || [];
    //any slashed properties on the prototype are added as instance chains automatically
    if (def.prototype) {
      for (var p in def.prototype)
        if (p.substr(0, 2) == '__' && p.substr(p.length - 2, 2) != '__') {
          if (this.instanceChains.indexOf(p.substr(2)) == -1)
            this.instanceChains.push(p.substr(2))
        }
        else if (p.substr(p.length -2, 2) == '__' && p.substr(0, 2) != '__') {
          if (this.instanceChains.indexOf(p.substr(0, p.length - 2)) == -1)
            this.instanceChains.push(p.substr(0, p.length - 2));
        }
    }
    
    for (var i = 0; i < this.instanceChains.length; i++)
      this._extend['prototype.' + this.instanceChains[i]] = $z.extend.CHAIN;
  },
  construct: function() {
    if (this.constructor.instanceChains)
    for (var i = 0; i < this.constructor.instanceChains.length; i++) {
      var instanceFunc = this.constructor.instanceChains[i];
      if (this[instanceFunc] !== undefined)
        this[instanceFunc] = $z.fn([this[instanceFunc]]);
      else
        this[instanceFunc] = $z.fn();
      this[instanceFunc].scope = this;
    }
  }
}

/*
 * $z.Options
 *
 * Provides a 'default options' object on the constructor
 * Options will be added with defaults in the preconstructor
 *
 * An optional 'mixin' option allows for options to be mixed in
 * to the instance on construction completion.
 *
 * $z.constructor({
 *   //default options::
 *   options: {
 *     value: 'test'
 *   },
 *   mixin: true, //opt into instance options mixin
 * });
 *
 */
$z.Options = {
  _extend: {
    'options': $z.extend,
    'options.*': $z.extend.REPLACE,
    'mixin': $z.extend.REPLACE
  },
  options: {},
  built: function() {
    //allow no argument constructors to have default {} argument
    var constructFunc = this.construct;
    this.construct = function() {
      if (arguments.length == 0)
        constructFunc.apply(this, [{}]);
      else
        constructFunc.apply(this, arguments);
    }
    
    //add mixin if necessary
    //added on built to ensure a complete post-constructor
    //mixin based on the prototype extension rules
    if (this.mixin) {
      var self = this;
      this.construct.on(function(options) {
        $z.extend(this, options, $z.extend.deriveRules(self._extend, 'prototype'));
      });
    }
  },
  construct__: function(options) {
    $z.underwrite(options, this.constructor.options);
  }
};

/*
 * $z.Pop
 * Allows for separating prototype layers
 * Useful when using the debugger to inspect prototype methods in a cleaner way
 *  as you can see the prototype chains
 *
 */
$z.Pop = {
  make: function() {
    function F(){}
    F.prototype = this.prototype;
    this.prototype = new F();
  }
};

if (z)
  $z.overwrite($z, z);

return $z;
}));