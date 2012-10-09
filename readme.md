Zest JS Readme
Guy Bedford
2011
-ids
  
  All components have a type and id.
  
  Of the form::
  
  <div component id="z1" />
  
  <div component=Button id='z#' />
  
  <div component=ZestCoreButton id=id />
  
  The id is a unique id provided at the options or structure levels. If not set it is blank. When set, it populates the id attribute
  on the element.
  
  -The type is automatically ammended onto the component template (on the first tag found in the rendered template).
   If the first tag already has a component name, we throw an error.
   The type name is capitalized, taken from the requires name if none is defined, otherwise it is just blank.
  -The id is either set through options.id, or the structure. When not set it is just blank.

- dynamic css

  With require-css as a CSS API, we can now separate the concerns between dynamic css, static anonymous css and static defined css.
  
  1) Dynamic CSS
  
    This is used where the css is unique for each instance.
    
    {
      CSS: function(options) {
        return css;
      }
    }
    
    The css is thus generated for each instance. This is only for instance creation.
    In this case, it would most likely use the class and id attributes.
    
    The CSS is run through the API based on the instance unique id as a handle.
  
  2) Static Anonymous CSS (buffered, and shared)
  
    This is used where you're too lazy to create a separate CSS file.    
    
    Write at the top of the file::
    
      css.set('my/unique/identifier', '...')
      
    Alternatively::
    
    {
      css: '...'
    }
    
    In this case, the css is seen as static.
    It is run through the API based on the generic component type as a handle
    
    built: function() {
      css.set(this.getType(), this.css);
      delete this.css;
    }
    construct: function(options) {
      css.set(this.id, this.constructor.CSS(options));
    }
  
  3) Static Defined CSS
  
    require('css!a-css-file', ...)
    
    As usual.
    
  BUILDING
   
    We drop the full parse into a <style> tag in the head, or it is built already into a link tag.