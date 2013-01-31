/*
 * ZestJS Render, com build plugin
 *
 * Used during builds to include the render component attachment properties.
 *
 */

define(function() {

  var attachRegEx = /(["']?)attach(["']?)\s*[=\:]\s*["']([^'"\s]+)["']/;

  var buildContext = requirejs.s.contexts._;

  var resourceLoad = requirejs.onResourceLoad;
  requirejs.onResourceLoad = function(context, map, depArray) {
    if (context != buildContext)
      return resourceLoad.call(this, context, map, depArray);

    // note css
    if (map.prefix == 'require-css/css' || map.prefix == 'require-less/less') {
      if (requirejs.onZestAttachResource)
        requirejs.onZestAttachResource(map.id);
      return resourceLoad.call(this, context, map, depArray);
    }

    // load file and detect if it has an attachment module - if so, add it in
    var fileUrl;
    if (!map.prefix)
      fileUrl = requirejs.toUrl(map.id + '.js');
    else if (map.prefix == 'require-coffee/cs')
      fileUrl = requirejs.toUrl(map.name + '.coffee');
    
    if (!fileUrl)
      return resourceLoad.call(this, context, map, depArray);

    var contents;

    if (!requirejs._cachedRawText[fileUrl]) {
      if (!fs.existsSync(fileUrl))
        return resourceLoad.call(this, context, map, depArray);
      contents = requirejs._cachedRawText[fileUrl] = fs.readFileSync(fileUrl) + '';
    }
    else
      contents = requirejs._cachedRawText[fileUrl];

    if (!contents)
      return resourceLoad.call(this, context, map, depArray);

    var attachMatch = contents.match(attachRegEx);
    if (attachMatch) {
      // include the attachment in the build
      var attachId = context.makeModuleMap(attachMatch[3], map, true, true).id;
      
      // in case of bad detection, fail gracefully
      if (attachId.indexOf('!') != -1 || fs.existsSync(requirejs.toUrl(attachId))) {

        if (requirejs.onZestAttachResource)
          requirejs.onZestAttachResource(attachId);

        requirejs([attachId]);
      }

      resourceLoad.call(this, context, map, depArray);
    }
    else
      resourceLoad.call(this, context, map, depArray);
  }

  return {
    load: function(name, req, load) {
      load();
    }
  };
});
