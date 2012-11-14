/*
 * Main Zest bundle
 * Includes the render, router, escape and component parts.
 *
 * For a minimal bundle, can just use the zest-render or make a custom
 * bundle including the escape or router optionally.
 *
 * $z.Component is dependent on the inheritance framework ZOE (~6KB).
 * A bundle excluding this could be used to implement a different inheritance framework.
 * 
 */

define(['./zest-render', './router', './escape', './component'], function($z, router, escape, Component) {
  //component adds zoe onto $z
  $z.Component = Component;
  $z.router = router;
  $z.esc = escape;
  return $z;
});