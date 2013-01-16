/*
 * ZestJS Escaping Library
 *
 * Can be used as an AMD or global.
 * If using as a global, assumes that 'zest-render.js' is already loaded.
 *
 *
 * Read more on escaping functions at 
 * http://zestjs.org/docs#Default%20Options%20and%20Escaping
 *
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(factory);
  else
    root.$z.esc = factory();
}(this, function() {

  //arguments after mode are passed as successive arguments to the escape function
  var esc = function(text, mode) {
    var args = Array.prototype.splice.call(arguments, 2, arguments.length - 2);
    args.unshift(text);
    return esc[mode].apply(esc, args);
  }
  //useful for css sizes etc. Suffix allows for dimensions eg px
  esc.num = function(text, nanValue) {
    var num = parseFloat(text);
    if (isNaN(num))
      return nanValue || 0;
    else
      return num + '';
  }
  
  //html attributes
  esc.attr = function(attr) {
    return (attr + '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  //html text only
  esc.htmlText = function(text) {
    return (text + '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  
  esc.cssAttr = function(attr) {
    return (attr + '')
      .replace(/"/g, '&quot;')
      .replace(/{/g, '')
      .replace(/}/g, '')
      .replace(/:/g, '')
      .replace(/;/g, '');
  }
  
  //filtered html
  //tag and attribute filtering
  //unsafe attributes removed
  //all attributes escaped
  //url attributes escaped properly
  esc.html = function(html, allowedTags, allowedAttributes) {
    var urlAttributes = ['cite', 'href', 'poster', 'src'];
    //tag source: https://developer.mozilla.org/en-US/docs/HTML/Element
    allowedTags = allowedTags || ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'group', 'hr', 'i', 'img', 'input', 'ins', 'label', 'legend', 'li', 'map', 'mark', 'menu', 'meter', 'nav', 'nobr', 'noscript', 'ol', 'optgroup', 'option', 'p', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'video', 'wbr'];
    //attribute source: https://developer.mozilla.org/en-US/docs/HTML/Attributes
    allowedAttributes = allowedAttributes || ['align', 'alt', 'autocomplete', 'autofocus', 'autoplay', 'bgcolor', 'border', 'buffered', 'checked', 'cite', 'class', 'color', 'cols', 'colspan', 'contenteditable', 'contextmenu', 'controls', 'coords', 'datetime', 'default', 'dir', 'dirname', 'disabled', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'ismap', 'itemprop', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'min', 'multiple', 'name', 'open', 'optimum', 'pattern', 'ping', 'placeholder', 'poster', 'preload', 'pubdate', 'readonly', 'rel', 'required', 'reversed', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'span', 'src', 'srclang', 'start', 'step', 'summary', 'tabindex', 'target', 'title', 'type', 'usemap', 'value', 'width', 'wrap'];
    
    //loop through all html tags, and escape non-allowed
    var match;
    var openingTag = /<[^\s><\/]+/g;
    var closingTag = /<\/[^\s><\/]+/g;
    //match out whitespace, then attribute name, then attribute contents (with quote escaping), attribute contents optional
    //source - http://ad.hominem.org/log/2005/05/quoted_strings.php
    var attribute = /^\s*([^\s="'>]+)(=("([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'|[^\s>]*))?/;
    while ((match = openingTag.exec(html))) {
      //if not an allowed tag, escape
      if (allowedTags.indexOf(match[0].substr(1)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
      
      //if allowed, do attribute filter -> we rebuild the attributes entirely
      else {
        var escapedHtml = html.substr(0, match.index) + match[0];
        
        //store everything after the tag
        var tagStr = html.substr(match.index + match[0].length);
        var attr;
        
        //match out attributes
        while ((attr = attribute.exec(tagStr))) {
          var val;
          //update escaped tag attributes, if an allowed attribute
          if (allowedAttributes.indexOf(attr[1]) != -1) {
            var val = attr[6] !== undefined ? attr[6] : (attr[4] !== undefined ? attr[4] : (attr[3] !== undefined ? attr[3] : undefined));
            if (val !== undefined)
              escapedHtml += ' ' + attr[1] + '="' + (urlAttributes.indexOf(attr[1]) != -1 ? esc.url(val) : esc.attr(val)) + '"';
            else
              escapedHtml += ' ' + attr[1];
          }
          
          //cut out detected tag str for next match
          tagStr = tagStr.substr(attr.index + attr[0].length);
        }
        
        //no longer matching -> search for first instance of '>' or '/>', cut out everything inbetween and continue
        var tagClose = tagStr.match(/\s*\/?>/);
        
        //invalid html tag -> invalidate the remaining html
        if (!tagClose)
          return escapedHtml + '>';
        
        if (tagClose[1])
          escapedHtml += ' />';
        else
          escapedHtml += '>';
        
        //update the search index for searching for the next tag
        openingTag.lastIndex = escapedHtml.length;
        
        //update the html with the new escaped tag plus everything that came after
        html = escapedHtml + tagStr.substr(tagClose[0].length);
        
        //then keep searching for the next tag
      }
    }
    
    //escape any invalid closing tags
    while ((match = closingTag.exec(html)))
      if (allowedTags.indexOf(match[0].substr(2)) == -1)
        html = html.substr(0, match.index) + '&lt;' + html.substr(match.index + 1);
    return html;
  }
  
  //url creation
  esc.uriComponent = function(uri) {
    return encodeURIComponent(uri);
  }
  
  //url escaping
  esc.url = function(url) {
    if (url.substr(0, 11) == 'javascript:')
      return 'javascript:void(0)';
    return encodeURI(url);
  }
  
  return esc;
}));