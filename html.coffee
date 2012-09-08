define ['zest', 'require'], ($z, require) ->
  options:
    cssStream: ''
    title: undefined
    onTitle: (setTitle) ->
      setTitle ''
    requireConfig: {}
    appId: ''
    attachScript: """
      $z=typeof $z!='undefined'?$z:function(){return $z.main.apply($z,arguments)};$z.attach=function(a,b,c){if(typeof a==='string'){a=
      [a];c=b;b=function(a){return a}}c=c||{};var d=Array.prototype.pop.call(document.getElementsByTagName('script'));var e=d;var f=[]
      ;while(e=e.previousSibling){f.unshift(e);if(e.nodeType==1&&e.getAttribute('component')&&!e.$z)break}d.parentNode.removeChild(d);
      c.$$=f;if(c.global)for(var g in c.global)$z.attach.global[g]=c.global[g];c.global=$z.attach.global;$z.attach.attachments.push({
      $$:f,options:c,component:null});var h=$z.attach.attachments.length-1;requirejs(a,function(){var a=b.apply(null,arguments);$z
      .attach.attachments[h].component=a;$z.attach.doAttach()})};$z.attach.attachments=[];$z.attach.curAttach=0;$z.attach.global={};$z
      .attach.doAttach=function(){while(this.attachments[this.curAttach]&&this.attachments[this.curAttach].component){var a=this.
      attachments[this.curAttach];a.component.attach.call(a.component,a.$$,a.options);this.curAttach++}}
    """
  
  template: (o) -> """
    <!doctype html>
    <html>
    <head>
      <meta charset='utf-8'>
      <script type='text/javascript'>
        var require = #{ JSON.stringify(o.requireConfig) };
        #{ o.attachScript }
      </script>
      <script type='text/javascript' src='#{ o.requireConfig.baseUrl }/require.js'></script>
      <link rel='stylesheet' type='text/css' href='#{ o.cssStream }'></link>
      <script type='text/javascript'>
        require(['#{ o.appId }'], function(app) { new app(); });
      </script>
      {`head`}
    </head>
    <body>{`body`}</body>
    </html>
  """
  
  head: (o) ->
    template: (o) -> """
      <title>#{o.title}</title>
    """
  
    load: (_o, done) ->
      if (o.title)
        _o.title = o.title
        return done()
        
      o.onTitle (title) ->
        _o.title = title
        done()
  
  