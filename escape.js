 //routes resolve to pages
//$z.App should me in Main
define(function() {
  //arguments after mode are passed as successive arguments to the escape function
  var esc = function(text, mode) {
    var args = Array.prototype.splice.call(arguments, 2, arguments.length - 2);
    return esc[mode](args.unshift(text));
  }
  //useful for css sizes etc. Suffix allows for dimensions eg px
  esc.num = function(text, suffix, nanValue) {
    var num = parseFloat(text);
    if (isNaN(num))
      return nanValue || '';
    else
      return num + '' + suffix;
  }
  
  //html attributes
  esc.attr = function(attr) {
    return attr
      .replace(/</g, '&lt;')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  //text only
  esc.text = function(test) {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  //filtered html
  esc.html = function(html, allowedTags) {
    allowedTags = allowedTags || ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'a', 'table', 'tr', 'td', 'tbody', 'thead', 'section', 'strong', 'em', 'blockquote', 'img', 'hr', 'br'];
    
    //loop through all html tags, and escape non-allowed
    var index;
    var openingTag = /<[^\s><\/]+/g;
    var closingTag = /<\/[^\s><\/]+/g;
    while ((match = openingTag.exec(html))) {
      //if not an allowed tag, escape
      if (allowedTags.indexOf(match[0].substr(1)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
    }
    while ((match = closingTag.exec(html)))
      if (allowedTags.indexOf(match[0].substr(2)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
    return html;
  }
  
  return esc;
});