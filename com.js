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

    // load file and detect if it has an attachment module - if so, add it in
    var fileUrl;
    if (!map.prefix)
      fileUrl = requirejs.toUrl(map.id + '.js');
    else if (map.prefix == 'require-coffee/cs')
      fileUrl = requirejs.toUrl(map.name + '.coffee');
    
    if (!fileUrl)
      return resourceLoad.call(this, context, map, depArray);

    var contents;

    if (!requirejs._cachedFileContents[fileUrl]) {
      if (!fs.existsSync(fileUrl))
        return resourceLoad.call(this, context, map, depArray);
      contents = requirejs._cachedFileContents[fileUrl] = fs.readFileSync(fileUrl) + '';
    }
    else
      contents = requirejs._cachedFileContents[fileUrl];

    if (!contents)
      return resourceLoad.call(this, context, map, depArray);

    var attachMatch = contents.match(attachRegEx);
    if (attachMatch) {
      callbackCnt++;

      // include the attachment in the build
      var attachId = context.makeModuleMap(attachMatch[3], map, true, true).id;
      req([attachId], function() {
        resourceLoad.call(this, context, map, depArray);
      });
    }
    else
      resourceLoad.call(this, context, map, depArray);
  }
});
