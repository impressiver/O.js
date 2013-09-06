define(['proto'],
function ( Proto ) {
  "use strict";

  var Reactor;

  Reactor = {
    options: {
      events: {
        'new': function ( e, instance ) {
          console.log('REACTOR ON NEW', arguments, this);
          this.onNew();
        }
      }
    },

    prototype: Object.create( Object.prototype, {
      onNew: {
        value: function( options ) {
          if( !this.has('__reactor__') ) {
            Object.defineProperty( this, '__reactor__', {
              value: {},
              writable: true
            });
          }

          console.log("REACT", options, this);
        },
        enumerable: true
      }
    })
  };

  Proto.Mixins.Reactor = Reactor;
  return Reactor;
});