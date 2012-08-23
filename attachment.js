/*
 * $z.attach
 * Used for attaching components as if they were generated client-side after a server render.
 * It is the client helper for the $z.render function on the server.
 *
 * Usage:
 * $z.attach(componentLoadFunction, {..options..});
 *
 * componentLoadFunction is a function that allows a callback to act on the loaded component (a wrapper for a require function).
 *
 * The assumption is made that the $$ for the component can be calculated from stepping back
 * from the script it is executed in until it finds the first non-attached 'component' attribute.
 *
 * The component 'attach' method is then called with $$ and options as parameters.
 *
 * 
 */


/*
 * attachment by id
 *
 * $z.attach('id', [], def, options)
 * $z.attach('id', '', options)
 *
 * 
 * 
 */

$z = typeof $z != 'undefined' ? $z : function() { return $z.main.apply($z, arguments) };
$z.attach = function(deps, def, options) {
  //basic attachment variation
  if (typeof deps === 'string') {
    deps = [deps];
    options = def;
    def = function(c) { return c; }
  }
  
  options = options || {};
  
  var scriptNode = Array.prototype.pop.call(document.getElementsByTagName('script'));
  var prevNode = scriptNode;
  
  var $$ = [];
  while (prevNode = prevNode.previousSibling) {
    $$.unshift(prevNode);
    if (prevNode.nodeType == 1 && prevNode.getAttribute('component') && !prevNode.$z)
      break;
  }
  scriptNode.parentNode.removeChild(scriptNode);
  
  $z.attach.attachments.push({
    $$: $$,
    options: $$,
    component: null
  });
  var index = $z.attach.attachments.length - 1;
  requirejs(deps, function() {
    var com = def.apply(null, arguments);
    $z.attach.attachments[index].component = com;
    $z.attach.doAttach();
  });
}
$z.attach.attachments = [];
$z.attach.curAttach = 0;

$z.attach.doAttach = function() {
  while (this.attachments[this.curAttach] && this.attachments[this.curAttach].component) {
    var item = this.attachments[this.curAttach];
    item.component.attach.call(item.component, item.$$, item.options);
    this.curAttach++;
  }  
}