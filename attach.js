/*
 * ZestJS Attach!
 *
 * Lazy attachment
 *
 * Requirejs loader plugin to generate attach-variations of a component
 * that exclude the template and structuring to allow for client-side
 * progressive enhancement only.
 *
 * Attach! is only to be called on an object that has an 'attach' function.
 * 
 */
var r = require;
define(['require', 'zest', 'http'], function(require, $z, http) {
  var attach = {};
  
  //for attaching modules loaded by plugins, we need to provide
  //a parser so attach can understand where to load the module source code
  attach.parsers = {
    'cs': function(name, req, loadSourceCode, config) {
      var load = function() {};
      load.fromText = function(name, code) {
        loadSourceCode(code.substr(14, code.indexOf('//@ sourceURL=') - 32));
      }
      var pReq = function() {};
      pReq.toUrl = require.toUrl;
      require(['cs'], function(cs) {
        cs.load(name, pReq, load, config);
      });
    }
  };
  
  //two definition cases:
  //1: we're inside the 'attach' context -> load modules here and generate attachments relative to them using attach.generateAttachments
  //   zest is taken from inside the context too when using the generate attachments
  //2: we're outside the 'attach' context -> create the 'attach' context, and use the sub-generate attachments when doing stuff.
  //   we do this by calling attach.req('attach').generate... 
  
  //determine the current context
  var contextName = $z._requireContext;
  if (contextName == 'attach') {
    attach.req = require;
  }
  else {
    var config = $z.extend({}, requirejs.s.contexts[contextName].config, 'DREPLACE');
    //construct a hidden context for inspecting modules without adding them to the build
    config.context = 'attach';
    config.config['is/is'] = config.config['is/is'] || {};
    config.config['is/is'].render = false;
    attach.req = requirejs.config(config);
    
    //dependency map - moduleid against its dependency ids
    //attach.depMap = {};
    
    //track all loads in the 'attach' context for dependency tracking
    /* var oldLoad = requirejs.onResourceLoad;     
    requirejs.onResourceLoad = function(context, map, depArray) {
      if (context == requirejs.s.contexts.attach) {
        var deps = [];
        for (var i = 0; i < depArray.length; i++)
          deps.push(depArray[i].originalName);
        attach.depMap[map.name] = attach.depMap[map.name] || deps;
      }
      if (oldLoad)
        oldLoad.apply(this, arguments);
    } */
  }
  
  
  //build maps
  if (require.isBuild) {
    //store generated attach code for mixed attachment
    var buildCode = {};
    //store the attach module name for separated attachment
    var buildRequire = {};
  }
  
  attach.load = function(name, req, load, config) {
    //if already loaded, or provided in the build, provide the full module
    if (req.defined(name) || req.specified(name)) {
      req([name], function(component) {
        load(component);
      });
      return;
    }
    
    //create the attachment in the hidden context
    attach.createAttachment(name, function(attachDef) {
      var attachCode = 'define(' + JSON.stringify(attachDef.requires) + ', function(' + attachDef.dependencies.join(', ') + ') {\n' +
        'return ' + attachDef.definition + ';\n' +
      '});'
      
      //Hold on to the transformed text if a build.
      if (config.isBuild) {
        buildCode[name] = attachCode;
        load();
        return;
      }
      
      //otherwise load this generated attachment
      load.fromText(name + '.attach', attachCode);
      req([name + '.attach'], load);
    });
  }
  
  attach.write = function(pluginName, moduleName, write) {
    
    //separate attach module - just write a loader
    if (buildRequire[moduleName]) {
      write('define([' + pluginName + '!' + moduleName + '], [\'' + buildRequire[moduleName] + '\'], function(attachment){ \n' +
        'return attachment; \n' + 
      '});');
    }
    //specially generated attach code - write the code in
    else if (buildCode[moduleName]) {
      write.asModule(pluginName + '!' + moduleName, buildCode[moduleName]);
    }
    
  }
  
  /*
   * createAttachment
   *
   * Given a component moduleId, load the component in a hidden context, load the source code and generate the attachment
   *
   * Returns the deconstructed definition form:
   *
   * {
   *   requires: [],
   *   dependencies: [],
   *   definition: ""
   * }
   *
   * The source code is purely used to trace the dependencies and their names correctly.
   *
   */
  attach.createAttachment = function(componentModuleId, complete) {
    
    var generateAttachment = function(innerAttach, component, defineCode) {
      var requires, deps;
      
      //extract out the require dependencies from the code
      var def;
      eval('var define = function(_reqs, _def) { requires = _reqs; def = _def }; define.amd = true; ' + defineCode);
      deps = def.toString().match(/function\s*[^ \(]*\(([^\)]+)\)/)[1].match(/[^,\s]+/g);
      
      //build up the dependencies as closures
      var closures = [];
  
      for (var i = 0; i < requires.length; i++) {
        if (requires[i].substr(0, 3) == 'is!' && requires[i].indexOf(':') != -1)
          throw 'Cannot use \'else\' is!render includes (\':\') with lazy attachment.';
        
        if (requires[i].substr(0, 10) != 'is!render?' || requires[i].substr(0, 11) == 'is!~render?') {
          //add dependencies excluding the render! dependencies
          //instant callback
          attach.req([requires[i]], function(mod) {
            closures.push([mod, deps[i]]);
          });
        }
        else {
          //exclude render closures
          attach.req([requires[i]], function(mod) {
            //should be instant callback as already loaded
            closures.push([mod, 'undefined']);
          });
          requires.splice(i, 1);
          deps.splice(i, 1);
          i--;
        }
      }
      
      //reason being that innerAttach has inner-scoped $z from main define require
      var def = innerAttach.serializeComponent(component, requires, deps, closures);
      
      return {
        definition: def,
        requires: requires,
        dependencies: deps
      };
    }
    
    attach.req(['is'], function(is) {
      
      //uniquely define the null objects to allow capturing
      is.empty = function() {
        return {};
      }
      
      //load the module in the hidden context
      attach.req([componentModuleId, 'zest/attach'], function(component, att) {
      
        //not lazy attachment - throw error
        if (typeof component.attach != 'function') {
          $z.log(componentModuleId);
          throw 'Attach! lazy attachment generation only applies to components with an "attach" function.';
        }
        
        /* if (config.quickattach) {
          req([name], load);
          return;
        } */
        
        //check if we need to use a parser
        var parser = false;
        for (var p in attach.parsers) {
          if (componentModuleId.substr(0, p.length + 1) == p + '!') {
            parser = true;
            attach.parsers[p](componentModuleId.substr(p.length + 1), attach.req, function(code) {
              complete(generateAttachment(att, component, code));
            }, config);
          }
        }
        //otherwise load from file normally
        if (!parser)
          http.get(require.toUrl(componentModuleId), function(code) {
            complete(generateAttachment(att, component, code));
          });
      });
    });
    
  }
  
  attach.toAbsModuleId = function(attachId, parentId) {
    
    attachId = req.normalize(attachId, paremtId);
    
    //convert to url
    if (attachId.substr(attachId.length - 3, 3) != '.js')
      attachId += '.js';
  
    return attachId;
  }
  
  attach.serializeComponent = function(component, requires, deps, closures, exclude) {
    
    var def = component._definition || component;
    requires = requires || [];
    deps = deps || [];
    closures = closures || [];
    exclude = (exclude !== undefined) ? exclude : true;
    
    //build up exclusion list
    if (exclude) {
      var ignore = ['type', 'id', 'css', 'options', 'template', 'pipe', 'attachExclusions', 'load'].concat(component.attachExclusions || []);
      
      var regions = (typeof component.template == 'function' ? component.template.toString() : component.template || '').match(/\{\`\w+\`\}/g);
      if (regions)
        for (var i = 0; i < regions.length; i++)
          ignore.push(regions[i].substr(2, regions[i].length - 4));
            
      //remove the exclusion items
      var ignored = {};
      for (var i = 0; i < ignore.length; i++) {
        if (def[ignore[i]] !== undefined) {
          ignored[ignore[i]] = def[ignore[i]]
          delete def[ignore[i]];
        }
      }
    }
    
    //run through inheritance, replacing attachments in requires
    if (def._implement) {
      var inheritors = [
        [$z, '$z'],
        [$z.Component._definition, '$z.Component'],
        [$z.Component, '$z.Component'],
        [$z.InstanceChains, '$z.InstanceChains'],
        [$z.extend, '$z.extend'],
        [$z.extend.REPLACE, '$z.extend.REPLACE'],
        [$z.extend.IGNORE, '$z.extend.IGNORE'],
        [$z.extend.DEFINE, '$z.extend.DEFINE'],
        [$z.extend.FILL, '$z.extend.FILL'],
        [$z.extend.CHAIN_AFTER, '$z.extend.CHAIN_AFTER'],
        [$z.extend.CHAIN_BEFORE, '$z.extend.CHAIN_BEFORE'],
        [$z.extend.ARR_APPEND, '$z.extend.ARR_APPEND'],
        [$z.extend.ARR_PREPEND, '$z.extend.ARR_PREPEND'],
        [$z.extend.STR_APPEND, '$z.extend.STR_APPEND'],
        [$z.extend.STR_PREPEND, '$z.extend.STR_PREPEND'],
        [$z.Pop, '$z.Pop']
      ];
      
      closures = closures.concat(inheritors);
      
      outer: for (var i = 0; i < def._implement.length; i++) {
        
        var imp = def._implement[i];
        
        //ignore inheritors
        for (var j = 0; j < inheritors.length; j++)
          if (imp == inheritors[j][0] || imp._definition == inheritors[j][0])
            continue outer;
        
        if (typeof imp.attach == 'string') {
          //separate attachment          
          //check if the implementor is a dependency and if so replace with the attach moduleId
          for (var j = 0; j < deps.length; j++)
            for (var k = 0; k < closures.length; k++)
              if (closures[k][1] == deps[j] && closures[k][0] == imp)
                requires[j] = attach.toAbsModuleId(imp.attach, requires[j]);
        }
        else if (typeof imp.attach == 'function') {
          //lazy mixed attachment -> replace the implementor in the serialization with 'attach!'
          for (var j = 0; j < closures.length; j++)
            if (closures[j][0] == imp)
              for (var k = 0; k < deps.length; k++)
                if (deps[k] == closures[j][1])
                  requires[k] = 'zest/attach!' + requires[k];
        }
      }
    }
    
    var serialize = function(key, value) {
      //use the placeholder string '<@expression>...</@expression>' to indicate closures
      //these get replaced at the end
      for (var i = 0; i < closures.length; i++) {
        if (key == 'test') {
          //console.log(closures[i][0]);
        }
        if (closures[i][0] === value) {
          if (closures[i][1] == 'undefined')
            return;
            
          return '<@expression>' + closures[i][1] + '</@expression>';
        }
      }
    
      //check if the value is a defined module
      /* var moduleId = $z.getModuleId(value);
      
      if (moduleId) {
        
        requires.push(moduleId);
        
        //seek the first $d# var name not used in the closure
        var i = 1;
        while (closures['$d' + i])
          i++;
          
        var depName = '$d' + i;
        closures[depName] = value;
        deps.push(depName);
        return '<@expression>' + depName + '</@expression>';
      } */
      
      //zest component
      //provide full deconstruction
      if (value && value._definition)
        //perform the serialization here
        return '<@expression>$z.create(' + attach.serializeComponent(value._definition, requires, deps, closures, false) + ')</@expression>';
      
      //function syntax to remove quotes at the end
      if (typeof value === 'function')
        return '<@expression>' + value.toString() + '</@expression>';
      
      return value;      
    }
    
    var serialStr = JSON.stringify(def, serialize, 2);
    
    //add back the ignored items (so we can still use this component)
    for (var p in ignored)
      def[p] = ignored[p];
    
    var expressions = serialStr.match(/"<@expression>[\s\S]*?<\/@expression>"/g);
    
    for (var i = 0; i < expressions.length; i++) {
      var replacement = expressions[i].substr(14, expressions[i].length - 29)
        .replace(/\\'/g, '\'')
        .replace(/\\"/g, '"')
        .replace(/([^\\])\\f/g, '$1\f')
        .replace(/([^\\])\\b/g, '$1\b')
        .replace(/([^\\])\\n/g, '$1\n')
        .replace(/([^\\])\\t/g, '$1\t')
        .replace(/([^\\])\\r/g, '$1\r')
        .replace(/\\\\/g, '\\')
        .replace(/\$/g,'$$$$');
      serialStr = serialStr.replace(expressions[i], replacement);
    }
    
    //for zest components, we provide a 'deconstruction' (_definition exists)
    if (def !== component)
      return '$z.create(' + serialStr + ')';
    else
      return serialStr;
  }
  
  return attach;
});
