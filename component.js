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
    _implement: [zoe.Constructor, zoe.InstanceEvents],
    
    _extend: {
      'options': 'DAPPEND',
      'className': function(a, b) {
        return (a && b) ? (a + ' ' + b) : (a || b || '');
      },
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
          else if (fn === true)
            return args[0];
        }
        return o;
      }),
      'load': zoe.extend.makeChain('ASYNC'),
      attach: zoe.extend.REPLACE
    },

    _integrate: function(def) {
      if (def.construct || def.prototype) {
        var self = this;
        this.attach = this.attach || function(el, o, register) {
          if (!register)
            return new self(el, o);

          // helper for attachment-only components to also be registered
          if (!el.getAttribute('component'))
            el.setAttribute('component', '');
          el.id = el.id || $z._nextComponentId++;

          return ($z._components[el.id] = new self(el, o));
        }
      }
    },

    _built: function() {
      if (!this.render)
        this.pipe = this.pipe || true;
    },
    
    construct: function(el, o, system) {
      this.el = el;
      this.o = o;
    },
    
    prototype: {
      $: $z && $z.$,
      $z: $z && $z.select
    }
  };
}));
