 //routes resolve to pages
//$z.App should me in Main
define(function() {
  var esc = function(text, mode) {
    return esc[mode](text);
  }
  esc.px = function(text) {
    var num = parseInt(text);
    return num + 'px';
  }
  esc.attr = function(attr) {
    return attr
      .replace(/</g, '&lt;')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  esc.html = function(html) {
    
  }
  esc.filter_html = function(html, tagFilter) {
    
  }
  return esc;
});