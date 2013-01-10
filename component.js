/*
 * Zest Component Inheritor
 *
 * Can be used as AMD or global.
 *
 * When used as a global, must be included after 'zoe.js' and 'zest-render.js'.
 *
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['zoe', 'is!browser?./zest-render'], factory);
  else
    root.$z.Component = factory($z, $z);
}(this, function(zoe, $z) {
  /*
   * Component
   * 
   * Creates a component with rendering or as attach-only
   *
   * The component is entirely rendered by $z.render.
   *
   * Read more at http://zestjs.org/docs#$z.Component
   *
   */
  return {
    _implement: [zoe.Constructor, zoe.InstanceChains],
    
    _extend: {
      'options': 'DAPPEND',
      'type': 'REPLACE',
      'pipe': zoe.extend.makeChain(function(self, args, fns) {
        var o = {};
        var p = [];
        for (var i = 0, len = fns.length; i < len; i++) {
          var fn = fns[i];
          if (typeof fn == 'function')
            zoe.extend(o, fn.apply(self, args), {
              '*': 'REPLACE',
              'global': 'APPEND'
            });
          else if (fn instanceof Array)
            for (var j = 0; j < fn.length; j++)
              o[fn[j]] = args[0][fn[j]];
        }
        return o;
      }),
      'class': function(a, b) {
        a = a || '';
        if (a instanceof Array)
          a = a.join(' ');
        if (b instanceof Array)
          b = b.join(' ');
        return a + b;
      },
      'load': zoe.extend.makeChain('ASYNC')
    },

    _integrate: function(def) {
      if (def.construct || def.prototype)
        this.attach = this.attach || function(el, o) {
          return new this(el, o);
        }
    },
    
    construct: function(el, o) {
      this.o = o;
    },
    
    prototype: {
      $: $z && $z.$,
      $z: $z && $z.select
    }
  };
}));
