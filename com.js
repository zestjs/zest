/*
 * ZestJS Render, com build plugin
 *
 * Used during builds to include the render component attachment properties.
 *
 */
define({
  pluginBuilder: './com-build',
  load: function(name, req, load) {
    load();
  }
});
