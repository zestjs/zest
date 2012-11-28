/*
 * Main Zest bundle
 * Includes the render, escape, component and zoe parts.
 *
 * To just load rendering on its own, use 'zest/zest-render'.
 * 
 * $z.Component is dependent on the inheritance framework ZOE (~6KB).
 * A bundle excluding this could be used to implement a different inheritance framework.
 *
 * http://zestjs.org
 * 
 */
define(['zoe', 'is!browser?./zest-render', './escape', './component'], function(zoe, $z, escape, Component) {
  $z = $z || {};
  //component adds zoe onto $z
  $z.Component = Component;
  $z.esc = escape;
  if (!$z.fn)
    zoe.extend($z, zoe);
  return $z;
});