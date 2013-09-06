define(['proto', 'ko'],
function ( Proto, ko ) {
  "use strict";

  var Observable, KO;

  function makeObservable( value ) {
    if( ko.isObservable(value) ) {
      return value;
    }

    if( Proto.Utils.isObject(value) ) {
      if( 'observable' in value ) {
        return value.observable;
      }

      var data = Proto.Utils.Objects.map( value, function( prop, val ) {
        return [ prop, makeObservable( val ) ];
      });

      return data;
    }

    if( Proto.Utils.isArray(value) ) {
      var data = value.map(function( item ) {
        return makeObservable( item );
      });

      return ko.observableArray( data );
    }

    return ko.observable(value);
  }

  function onChange (evt) {
    console.log("ON CHANGE", arguments, this);

    var args = Array.prototype.slice.call( arguments, 0 ),
        props = args[1];

    if( this.isA(Proto.Collection) && Proto.Utils.isArray(props) ) {
      if( evt === 'add' ) {
        var data = makeObservable( props );
        this.observable.records.push.apply(this.observable.records, data());
      }
      return;
    }

    Object.keys( props ).forEach(function (prop) {
      if( ko.isObservable(this.observable[prop]) ) {
        this.observable[prop](makeObservable(this[prop]));
      } else {
        this.observable[prop] = makeObservable(this[prop]);
      }
    }, this);

  }

  function createViewModel () {
    // console.log( "CREATE VIEW MODEL", this );

    var mapping = this.constructor.options.ko.mapping || {},
        data, viewModel;

    data = this.has( 'deflate' ) ? this.deflate() : this;

    viewModel = new KOViewModel( data, mapping );

    this.on( 'set', onChange );
    this.on( 'add', onChange );

    return viewModel;
  }



  function KOViewModel( data, mapping ) {
    // console.log( "New KO ViewModel", data, mapping );

    var props = Proto.Utils.Objects.map( data, function (prop, value) {
      if( mapping.ignore.indexOf(prop) !== -1 ) {
        return;
      }

      return [ prop, makeObservable(value) ];
    }, this);

    Proto.Utils.mixin( this, props );
    Object.defineProperty( this, 'unwrapped', {
      value: data,
      writable: true
    });
  }


  Observable = {
    options: {
      ko: {
        mapping: {
          ignore: ['observable', 'opts', '__ko__', '__events__', '__collection__', '__model__']
        }
      }
    },

    prototype: Object.create( Object.prototype, {
      observable: {
        get: function() {
          if( !this.has('__ko__') ) {
            Object.defineProperty( this, '__ko__', {
              value: {
                viewModel: undefined,
                events: {}
              },
              writable: true
            });

            this.__ko__.viewModel = createViewModel.call( this );
          }

          return this.__ko__.viewModel;
        },
        enumerable: true
      }
    })
  };

  KO = Object.create( Object.prototype, {
    Observable: {
      value: Observable,
      enumerable: true
    }
  });

  Proto.Mixins.KO = KO;
  return KO;
});