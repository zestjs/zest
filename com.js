/*
 * ZestJS Render, com! plugin
 *
 * Indicates a render component for build branching
 *
 */
define({
  load: function(name, req, load) {
    req([name], function(component) {
      if (req.isBrowser && !component.render)
        throw 'com! is only used on render components.';
      load(component);
    });
  }
});
