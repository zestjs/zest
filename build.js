/*
 * ZestJS Build Plugin
 *
 * Provides two build options for building any module.
 *
 * 1. Full render build: build!moduleId
 * 2. Attachment build: build!^moduleId
 *
 * Render Build 
 * - Builds in all dependencies, finding any render component dependencies.
 * - Render component dependencies with separate 'attach' modules have 
 *   these modules included as render builds as well.
 *
 * Attach Build - builds only attachments needed for server rendering including css
 * - Runs through all dependencies, finding any render components.
 * - Render components with separate 'attach' modules have these modules included
 *   as render builds, along with any css! and less! dependencies.
 * - Render components without separate 'attach' modules are directly included
 *   along with all their dependencies as render builds.
 *
 */
define(['module'], function(module) {

  if (!requirejs.s.contexts.build)
    throw 'Zest build plugin is only to be used in r.js builds.';

  var build = {};

  var buildContext, buildReq, renderReq, depMap;

  // if already have the contexts, just clear them
  if (requirejs.s.contexts.zestBuild && requirejs.s.contexts.zestRender) {
    buildContext = requirejs.s.contexts.zestBuild;
    renderReq = requirejs.s.contexts.zestRender.makeRequire(null, {
      enableBuildCallback: true,
      skipMap: false
    });
    buildReq = buildContext.makeRequire(null, {
      enableBuildCallback: true,
      skipMap: false
    });
    depMap = requirejs.onResourceLoad.depMap;
  }
  else {
    // create a new build context for separate tracing to happen
    // (must be called '_' to get non-evaluation of modules
    // and other nice r.js load goodness)
    buildContext = requirejs.s.newContext('_');

    // name it and put it in the right place
    buildContext.contextName = 'zestBuild';
    requirejs.s.contexts.zestBuild = buildContext;

    // clone the current config and add it to our build context
    var curConfig = requirejs.s.contexts._.config;
    var buildConfig = {};
    var renderConfig = {};
    for (var c in curConfig) {
      buildConfig[c] = curConfig[c];
      renderConfig[c] = curConfig[c];
    }
    delete buildConfig.context;
    buildContext.configure(buildConfig);

    // also create a context to load full render components in to read the 'attach' property
    // this is a fully-evaluating hidden context
    renderConfig.context = 'zestRender';
    renderReq = requirejs.config(renderConfig);

    // create the build context require function
    buildReq = buildContext.makeRequire(null, {
      enableBuildCallback: true,
      skipMap: false
    });

    // trace all dependencies for the build context
    depMap = {};
    var resourceLoad = requirejs.onResourceLoad;
    requirejs.onResourceLoad = function(context, map, depArray) {
      if (context != buildContext) {
        if (resourceLoad)
          resourceLoad(context, map, depArray);
        return;
      }
      // store dependency map
      //console.log('loaded trace dependency ' + map.id);
      depMap[map.id] = depArray;
    };
    requirejs.onResourceLoad.depMap = depMap;
  }

  build.normalize = function(name, normalize) {
    if (name.substr(0, 1) == '^')
      return '^' + normalize(name.substr(1));
    else
      return normalize(name);
  }

  
  build.load = function(moduleId, req, load, config) {
    var renderBuild = moduleId.substr(0, 1) != '^';
    if (!renderBuild)
      moduleId = moduleId.substr(1);
    buildLoad(moduleId, req, {}, {}, renderBuild, load);
  }

  var curContext = requirejs.s.contexts.build;

  var buildLoad = function(moduleId, req, renderCache, attachCache, renderBuild, done) {
    if (renderCache[moduleId] || (attachCache[moduleId] && !renderBuild))
      return done();

    //console.log('Building ' + moduleId + ' for ' + (renderBuild ? 'render.' : 'attach.'));

    // a load completion system
    var callbackCnt = 0;
    var callback = function() {
      callbackCnt--;
      if (callbackCnt == 0) {
        if (renderBuild)
          renderCache[moduleId] = true;
        else
          attachCache[moduleId] = true;
        done();
      }
    }

    if (moduleId.substr(0, 4) == 'com!')
      moduleId = 'zest/' + moduleId;

    // this is for the upcoming buildReq call
    callbackCnt++;

    // load the full component in a render build
    if (renderBuild) {
      //console.log('full render load of ' + moduleId);
      callbackCnt++;
      req([moduleId], callback);
    }

    // load the module to trace all its dependencies
    // note that we don't actually evaluate the module
    // also this trace is in a separate context so 
    // we dont add anything to the build doing this
    buildReq([moduleId], function() {
      // get dependency array
      var deps = depMap[moduleId.substr(0, 3) == 'cs!' ? moduleId.substr(3) : moduleId];

      // check if the module is a marked render component for build separation
      var parentMap = curContext.makeModuleMap(moduleId, null);
      if (parentMap.prefix == 'zest/com') {
        
        // get the traced dependency list
        deps = depMap[parentMap.name.substr(0, 3) == 'cs!' ? parentMap.name.substr(3) : parentMap.name];

        // load the render component in the loading hidden context
        callbackCnt++;
        renderReq([parentMap.name], function(component) {
          if (!component.render)
            throw 'com! is only used on render components.';

          parentMap = curContext.makeModuleMap(parentMap.name, null, true, false);

          // include any separate attach module as a render build
          if (typeof component.attach == 'string') {
            var attachMap = curContext.makeModuleMap(component.attach, parentMap, false, true);
            callbackCnt++;
            //console.log('adding attachment ' + attachMap.prefix + '!' + attachMap.name);
            buildLoad(attachMap.prefix + '!' + attachMap.name, req, renderCache, attachCache, true, callback);
          }

          // add any style dependencies to the build if an attach build
          if (!renderBuild)
            for (var i = 0; i < deps.length; i++) {
              var dep = deps[i];

              if (dep.prefix == 'require-css/css' || dep.prefix == 'require-less/less') {
                // redo the map to ensure normalized
                dep = buildContext.makeModuleMap(dep.originalName, parentMap, false, true);
                //console.log('adding style ' + dep.id);
                callbackCnt++;
                req([dep.id], callback);
                continue;
              }
            }

          callback();
        });
      }

      // include all dependencies as the same build type
      for (var i = 0; i < deps.length; i++) {
        var dep = deps[i];

        // redo the map if a plugin to ensure normalized
        if (dep.prefix) {
          if (dep.prefix == 'zest/com') {
            dep = buildContext.makeModuleMap(dep.name, parentMap, false, true);
            dep.prefix = 'zest/com';
            dep.id = dep.prefix + '!' + dep.name;
          }
          else
            dep = buildContext.makeModuleMap(dep.originalName, dep.parentMap, false, true);
        }

        callbackCnt++;
        //console.log('build load for ' + dep.id);
        buildLoad(dep.id, req, renderCache, attachCache, renderBuild, callback);
      }

      callback();
    });
  }
  
  return build;
});
