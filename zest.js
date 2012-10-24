define(['./zest-render', './router', './escape', './component', './instance-css'], function($z, router, escape, Component, css) {
  //component adds zoe onto $z
  $z.Component = Component;
  $z.router = router;
  $z.esc = escape;
  $z.css = css;
  return $z;
});