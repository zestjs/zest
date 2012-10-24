define(['require-css/normalize'], function(normalize) {
  
  if (typeof window == 'undefined')
    return;
  
  var injectAPI = {};
  
  var stylesheet = document.createElement('style');
  var head = document.getElementsByTagName('head')[0];
  head.appendChild(stylesheet);
  
  var getStyle, setStyle;
  
  if (stylesheet.styleSheet) {
    var styleSheet = stylesheet.styleSheet;
    getStyle = function() {
      return styleSheet.cssText;
    }
    setStyle = function(css) {
      styleSheet.cssText = css;
    }
  }
  else {
    getStyle = function() {
      return stylesheet.innerHTML;
    }
    setStyle = function(css) {
      stylesheet.innerHTML = css;
    }
  }
  
  //track injections for removal with an index
  injectAPI.index = {};
  //stored by index.index, index.length
  
  //public API methods
  var _baseUrl = require.toUrl('.');
  injectAPI.set = function(instanceId, css, baseUrl) {
    //normalize css from the given baseUrl to the current page pathname
    if (baseUrl) {
      if (baseUrl == true)
        baseUrl = _baseUrl;
      var pathname = window.location.pathname.split('/');
      pathname.pop();
      pathname = pathname.join('/') + '/';

      //make base url absolute
      baseUrl = '/' + normalize.convertURIBase(baseUrl, pathname, '/');
      
      css = normalize(css, baseUrl, baseUrl);
    }
    
    var curCSS = getStyle();
    
    var def;
    if ((def = injectAPI.index[instanceId])) {
      //if already there, only update existing
      //update index for new css
      for (var c in injectAPI.index)
        if (injectAPI.index[c].index > def.index)
          injectAPI.index[c].index -= (def.length - css.length)
      
      curCSS = curCSS.substr(0, def.index) + css + curCSS.substr(def.index + def.length);
      def.length = css.length;
    }
    
    else {
      //update the index
      injectAPI.index[instanceId] = {
        index: curCSS.length,
        length: css.length
      };
      curCSS += css;
    }
    
    setStyle(curCSS);
  }
  
  injectAPI.get = function(instanceId) {
    var curCSS = getStyle();
    
    if (!instanceId)
      return curCSS;
    
    var def;
    //if already there, so we can get
    if ((def = injectAPI.index[instanceId]))
      return curCSS.substr(def.index, def.length);
    else
      return null;
  }
  
  injectAPI.clear = function(instanceId) {
    injectAPI.set(instanceId, '');
    delete injectAPI.index[instanceId];
  }
  
  return injectAPI;
});