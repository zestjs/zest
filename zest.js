define(['./zest-render', './router', './escape', './component'], function($z, router, escape, Component) {
  //component adds zoe onto $z
  $z.Component = Component;
  $z.router = router;
  $z.esc = escape;
  return $z;
});