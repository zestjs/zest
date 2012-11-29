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
    _implement: [zoe.Constructor],
    
    _extend: {
      'options': 'APPEND',
      'type': 'REPLACE',
      'pipe': zoe.fn.executeReduce(function(){ return {} }, function(out1, out2) {
        return zoe.extend(out1, out2, {
          '*': 'REPLACE',
          'global': 'APPEND'
        });
      }),
      'load': zoe.extend.makeChain('ASYNC')
    },

    _integrate: function(def) {
      if (def.construct || def.prototype)
        this.attach = this.attach || function(els, o) {
          return new this(o, els);
        }
    },
    
    construct: function(els, o) {
      this.o = o;
    },
    
    prototype: {
      $: $z && $z.$,
      $z: $z && $z.$z,
      dispose: zoe.fn()
    }
  };
}));