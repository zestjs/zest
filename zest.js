/*
 * Main Zest bundle
 * Includes the render, escape and component parts.
 *
 * For a minimal bundle, can just use the zest-render or make a custom
 * bundle including the escape or router optionally.
 *
 * $z.Component is dependent on the inheritance framework ZOE (~6KB).
 * A bundle excluding this could be used to implement a different inheritance framework.
 * 
 */
define(['zoe', 'is!browser?./zest-render', './escape', './component'], function(zoe, $z, escape, Component) {
  var $z = $z || {};
  //component adds zoe onto $z
  $z.Component = Component;
  $z.esc = escape;
  if (!$z.fn)
    zoe.extend($z, zoe);
  return $z;
});