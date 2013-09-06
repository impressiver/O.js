define(['jquery', 'when'],
function($, when) {
  "use strict";

  // TODO: (IW) Be consistent w/ 'attribute' and 'property'.

  var Utils, Mixins, Events, Proto, ProtoArray, Store, Model, Collection,
      undefined = void 0,

      __max = Math.max,
      __min = Math.min,

      __array = [],
      __slice = [].slice,
      __indexOf = [].indexOf,

      // TODO: (IW) Reduce this by generating util fns
      __isPrimitive = function( obj ) {
        return obj === undefined || obj === null || /^(string|boolean|number)$/.test(typeof obj);
      },
      __isObject = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object Object]';
      },
      __isArray = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object Array]';
      },
      __isFunction = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object Function]';
      },
      __isArguments = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object Arguments]';
      },
      __isNumber = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object Number]';
      },
      __isString = function( obj ) {
        return Object.prototype.toString.call( obj ) === '[object String]';
      },
      __isUndefined = function( obj ) {
        return obj === void 0;
      },
      __isNaN = function( obj ) {
        return __isNumber( obj ) && obj !== +obj;
      },
      __isEmpty = function( obj ) {
        return (__isUndefined(obj) || obj === null)
            || ((__isArray(obj) || __isString(obj)) && (obj.length === 0))
            || (__isObject(obj) && Object.keys(obj).length === 0);
      },

      __copy = function( obj ) {
        var copy, args;

        if( __isString(obj) ) {
          return ['', obj].join('');
        }

        if( __isNumber(obj) ) {
          return 0+obj;
        }

        if( __isArray(obj) || __isArguments(obj) ) {
          return __slice.call( obj, 0 );
        }

        if( __isObject(obj) ) {
          return __mixin.call( {}, obj );
        }

        if( __isFunction(obj) ) {
          console.log("COPY FUNCTION?", obj);
          // throw Error( "Not implemented. Wasn't sure what the use case would be." );
        }

        return obj;
      },

      // TODO: (IW) Rename me
      __thread = function( path ) {
        var obj = this,
            tail = obj,
            // TODO: (IW) Make this smarter (fn args could have dots in them)
            props = path.split( '.' ),
            isFn = /\((.*)\)$/,
            match, args;

        try {
          props.forEach(function( prop ) {
            // Descend into functions applying any parsed args
            if( (match = isFn.exec(prop)) ) {
              prop = prop.slice( 0, match.index );

              // TODO: (IW) Args won't work like this, they need to be pulled
              // as props from the current `tail`.
              // (e.g. `args = args.map(fn (arg){... return thread.call(tail, arg); })`)
              args = !__isEmpty( match[1] ) ? match[1].split( /\s*,\s*/ ) : [];

              // Throw an error for now...
              if( args ) {
                throw new Error( "Not implemented yet. Threaded fn args don't work yet." );
              }

              // Set the tail to the return value of the function
              tail = tail[prop].apply( tail, args );
            } else {
              // Regular ol' property, just descend and continue.
              tail = tail[prop];
            }
          });
        } catch (e) {
          console.log( "Error following property thread", e.stack, obj, tail, props );
          return undefined;
        }

        return tail;
      },

      __ownProps = function ( obj ) {
        var descs = {};

        Object.getOwnPropertyNames(obj).forEach(function(propName) {
          descs[propName] = Object.getOwnPropertyDescriptor(obj, propName);
        });

        return descs;
      },

      __defineProps = function ( objDefs, protoDefs ) {
        var dest = this;

        if( !__isEmpty(objDefs) ) {
          Object.defineProperties( dest, objDefs );
        }

        // Convenience to allow a single call to define both class and instance
        // properties.
        // TODO: (IW) Detect if `obj` is an instance and throw an error
        if( !__isEmpty(protoDefs) ) {
          if( __isUndefined(dest.prototype) ) {
            dest.prototype = Object.create( Object.prototype, protoDefs );
          } else {
            Object.defineProperties( dest.prototype, protoDefs );
          }
        }

        return dest;
      },

      __mixin = function() {
        var dest = this,
            args = __slice.call( arguments, 0 ),
            deep = (args.length > 1 && (typeof args[args.length - 1] === 'boolean')) ? args.pop() : false,
            mixins = args,
            exclude = ['length', 'arguments', 'caller'],
            newProps = {},
            mixin, proto;

        if( [window, document].indexOf(dest) !== -1 ) {
          var name = dest.constructor ? dest.constructor.name : dest.toString();
          throw new Error( "No way. It's not a good idea to mix properties into `" + name + "`." );
        }

        if( !mixins.length ) {
          return dest;
        }

        mixins.forEach(function( mixin ) {
          if( undefined === mixin ) {
            return;
          }

          var propDesc, destDesc;

          Object.getOwnPropertyNames( mixin ).forEach(function( propName ) {
            if( exclude.indexOf(propName) !== -1 ) {
              // console.log( 'PROP EXCLUDED', dest.name, propName );
              return;
            }

            propDesc = Object.getOwnPropertyDescriptor( mixin, propName );
            destDesc = undefined;

            // if( deep && propDesc.value ) {
            //   propDesc.value = __copy( propDesc.value );
            // }

            if( Object.prototype.hasOwnProperty.call(dest, propName) ) {
              destDesc = Object.getOwnPropertyDescriptor( dest, propName );

              if( !destDesc.writable ) {
                // console.log( 'DEST PROP NOT WRITABLE', dest.name, propName, destDesc );
                return;
              }

              if( 'value' in propDesc ) {
                if( propDesc.value === undefined ) {
                  // console.log( 'PROP UNDEFINED', dest.name, propName, propDesc );
                  return;
                }

                if( deep && ((typeof propDesc.value) === (typeof destDesc.value)) && (__isObject(propDesc.value)) ) {
                  // console.log("DEEEEEEEEEEP", dest, propName, propDesc, __isEmpty(propDesc.value));
                  __mixin.call( destDesc.value, propDesc.value, deep );
                  return;
                }
              }
            }

            // Make sure copied prototypes are writable
            if( propName === 'prototype' ) {
              propDesc.writable = true;
            }

            Object.defineProperty( dest, propName, propDesc );
          });
        });

        return dest;
      },

      __extend = function( parent, exclude ) {
        var child = this,
            exclude = exclude || [],
            props = {},
            mixin;

        // Make sure excluded properties don't make it onto the child
        exclude.push('options', 'prototype', 'length', 'arguments', 'caller');
        Object.getOwnPropertyNames( parent ).forEach(function (propName) {
          if( exclude.indexOf(propName) !== -1 ) {
            return;
          }
          props[propName] = Object.getOwnPropertyDescriptor( parent, propName );
        });

        mixin = Object.create( null, props );
        __mixin.call( child, mixin );

        child.super = parent;

        child.prototype = Object.create( parent.prototype, {
          constructor: {
            value: child,
            writable: true
          }
        });

        return child;
      },

      __bind = function( fn, ctx ){
        var args = __slice.call( arguments, 1 );

        if( Function.prototype.bind ) {
          return fn.bind.apply( fn, args );
        }

        args.shift();

        return function() {
          var args = args.concat( __slice.call(arguments, 0) );
          return fn.apply( ctx, args );
        };
      },

      __once = function( fn ) {
        var ran = false, memo;
        return function() {
          if (ran) {
            return memo;
          }
          ran = true;
          memo = fn.apply( this, arguments );
          fn = null;
          return memo;
        };
      };


  // ==========================================================================
  // Utils
  // --------------------------------------------------------------------------

  Utils = (function() {

    Utils = Object.create( Object, {
      isProto: {
        value: function( obj ) {
          return obj instanceof Proto;
        },
        enumerable: true
      },

      copy: {
        value: function( obj ) {
          if( !__isObject(obj) || !obj.constructor ) {
            return __copy( obj );
          }

          var copy = obj.constructor.new ? obj.constructor.new() : new obj.constructor();
          __mixin.call( copy, obj, true );

          return copy;
        },
        enumerable: true
      },

      define: {
        value: function() {
          var args = __slice.call(arguments, 0);
          return __defineProps.apply( (args.length === 1) ? {} : args.shift(), args );
        },
        enumerable: true
      },

      extend: {
        value: function() {
          var args = __slice.call(arguments, 0);
          return __extend.apply( args.shift(), args );
        },
        enumerable: true
      },

      mixin: {
        value: function() {
          // TODO: (IW) Confusing to have to add 'true' when calling mixin. Make it automatic?
          var args = __slice.call( arguments, 0 ),
              dest = args.shift();
          return __mixin.apply( dest, args );
        },
        enumerable: true
      },

      /**
       * Return a copy of the arguments array, optionally converting common
       * overloaded signatures into an expected format.
       *
       * @param {array} Native arguments array
       * @param {string} format Optional expected format for the leading arg(s).
       * @return {array|undefined} A mutated copy of the provided arguments.
       */
      args: {
        value: function( array, format ) {
          var args = this.copy( array ),
              obj = {},
              tail, props, i, len, prop;

          if( __isUndefined(args) ) {
            return undefined;
          }

          if( __isUndefined(format) ) {
            return args;
          }

          if( format === 'array' ) {
            if( !__isArray(args[0]) ) {
              if( __isEmpty(args[0]) ) {
                args[0] = [];
              } else {
                args[0] = [args[0]];
              }
            }
          }

          if( format === 'object' ) {
            // Walk dot notation strings, building a shell object
            if( __isString(args[0]) ) {
              props = args.shift().split( '.' );
              tail = obj;

              for( i = 0, len = props.length; i < len, prop = props[i]; ++i ) {
                if( i === (len - 1) ) {
                  break;
                }

                tail[prop] = {};
                tail = tail[prop];
              };

              tail[prop] = args.shift();
              args.unshift( obj );
            }
          }

          return args;
        },
        enumerable: true
      },

      encoder: {
        value: function( format ) {
          var encoder = Utils.Encoders[ format ];

          if( !encoder ) {
            throw new Error('No encoder registered for "' + format + '"');
          }

          return encoder;
        },
        enumerable: true
      },

      compare: {
        value: function( a, b ) {
          var aVal = Proto.Utils.has(a, 'valueOf') ? a.valueOf() : a,
              bVal = Proto.Utils.has(b, 'valueOf') ? b.valueOf() : b;

          return (aVal > bVal) ? 1 : (aVal < bVal) ? -1 : 0;
        }
      },

      RE: {
        value: {},
        writable: true
      },

      Objects: {
        value: {},
        writable: true
      },

      Strings: {
        value: {},
        writable: true
      },

      Encoders: {
        value: {},
        writable: true
      }
    });


    Utils.RE = {
      ISO_8601: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?/i,

      ish: function( pattern, options ) {
        return new RegExp( '\\s*(?:' + pattern + ')\\s*', options );
      }
    };


    Utils.Objects = Object.create( Object.prototype, {
      thread: {
        value: function ( obj, path ) {
          return __thread.call( obj, path );
        },
        enumerable: true
      },

      // TODO: (IW) Reserved in ECMA6
      is: {
        value: function( obj, ctr ) {
          return (obj instanceof ctr);
        }
      },

      has: {
        value: function( obj, path ) {
          var props = path.split( '.' ),
              tail = obj;

          return __thread.call( obj, path ) !== undefined;
        }
      },

      hasOwn: {
        value: function( obj, prop ) {
          if( prop.indexOf('.') !== -1 ) {
            throw new Error( 'Dot-notation not supported when checking direct properties. Maybe you meant "Proto.Utils.has( obj, \'' + prop + '\')".' );
          }

          return Object.prototype.hasOwnProperty.call( obj, prop );
        }
      },

      map: {
        value: function ( obj, callback, ctx ) {
          var mapped = {},
              ctx = ctx || obj;

          if ( !__isObject(obj) ) {
            return mapped;
          }

          if ( !__isFunction(callback) ) {
            callback = function( key, val ) {
              return [ key, val ];
            };
          }

          Object.keys( obj ).forEach(function (key) {
            var transmuted = callback.apply( ctx, [key, obj[key]] );

            if ( transmuted && transmuted.length ) {
              mapped[ transmuted[0] || key ] = transmuted[ 1 ];
            }
          });

          return mapped;
        },
        enumerable: true
      },

      prune: {
        value: function( obj ) {
          var clean = __copy(obj);

          for( var i in clean ) {
            if ( !clean.hasOwnProperty(i) ){
              continue;
            }

            if ( __isEmpty(clean[i]) ) {
              delete clean[i];
            }
          }

          return clean;
        },
        enumerable: true
      }
    });


    Utils.Strings = Object.create( Object.prototype, {
      pluralize: {
        value: function( str ) {
          // TODO: (IW) Extremely naiive. Fix this.
          console.log('pluralize', str, str.replace(/s?$/i, 's'));
          return str.replace(/s?$/i, 's');
        }
      }
    });


    Utils.Encoders = Object.create( Object.prototype, {
      JS: {
        value: Object.create( Object.prototype, {
          encode: {
            value: function( src ) {
              return src.deflate ? src.deflate() : src;
            },
            writable: true,
            enumerable: true
          },

          decode: {
            value: function( src ) {
              var obj = __copy( src );

              Object.keys( obj ).forEach(function (prop) {
                // Parse ISO-8601 dates
                if( Proto.Utils.RE.ISO_8601.test(obj[prop]) ) {
                  obj[prop] = new Date( obj[prop] );
                }
              }, this);

              return obj;
            },
            writable: true,
            enumerable: true
          }
        }),
        enumerable: true
      },

      JSON: {
        value: Object.create( Object.prototype, {
          encode: {
            value: function( src ) {
              return window.JSON.stringify( src );
            },
            writable: true,
            enumerable: true
          },

          decode: {
            value: function( src ) {
              // First convert the JSON string to JS
              var obj = window.JSON.parse( src );
              // Then process the JS object
              obj = Utils.Encoders.JS.decode( obj );

              return obj;
            },
            writable: true,
            enumerable: true
          }
        }),
        enumerable: true
      }
    });


    // TODO: (IW) Clean this up
    __mixin.call( Utils, {
      isPrimitive: __isPrimitive,
      isObject: __isObject,
      isArray: __isArray,
      isNumber: __isNumber,
      isString: __isString,
      isFunction: __isFunction,
      isArguments: __isArguments,
      isUndefined: __isUndefined,
      isNaN: __isNaN,

      isEmpty: __isEmpty,

      bind: __bind
    });

    return Utils;
  })();


  // ==========================================================================
  // Mixins
  // --------------------------------------------------------------------------

  Mixins = (function() {
    Mixins = Object.create( Object.prototype );

    return Mixins;
  })();


  // ==========================================================================
  // Events Mixin
  // --------------------------------------------------------------------------
  // Mostly jacked from Spine.js until I have a reason to make something
  // different.
  // TODO: (IW) Make the entire event system work w/ promises?

  Events = (function() {

    // Helper function to set up instance properties on-demand
    var evnts = function() {
      var args = __slice.call( arguments, 0 );

      if( !this.hasOwnProperty('__events__') ) {
        if( !args.length ) {
          return undefined;
        }

        Object.defineProperty( this, '__events__', {
          value: {
            callbacks: {}
          }
        });
      }

      if( args.length === 1 ) {
        this.__events__.callbacks = args[0];
      }

      return this.__events__.callbacks;
    };


    /*** Class Properties ***/

    Events = Object.create( null, {
      events: {
        value: {
          callbacks: {}
        }
      },

      on: {
        value: function(ev, callback) {
          var calls, evs, name, _i, _len;

          evs = ev.split(' ');
          calls = (this.events.hasOwnProperty('callbacks') && this.events.callbacks) || (this.events.callbacks = {});
          for (_i = 0, _len = evs.length; _i < _len; _i++) {
            name = evs[_i];
            if( !calls[name] ) {
              calls[name] = [];
            }
            calls[name].push(callback);
          }

          return this;
        }
      },
      off: {
        value: function(ev, callback) {
          var cb, evs, i, list, name, _i, _j, _len, _len1, _ref;

          if (arguments.length === 0) {
            this.events.callbacks = {};
            return this;
          }
          if (!ev) {
            return this;
          }
          evs = ev.split(' ');
          for (_i = 0, _len = evs.length; _i < _len; _i++) {
            name = evs[_i];
            list = (_ref = this.events.callbacks) !== null ? _ref[name] : void 0;
            if (!list) {
              continue;
            }
            if (!callback) {
              delete this.events.callbacks[name];
              continue;
            }
            for (i = _j = 0, _len1 = list.length; _j < _len1; i = ++_j) {
              cb = list[i];
              if ( cb !== callback ) {
                continue;
              }
              list = list.slice();
              list.splice(i, 1);
              this.events.callbacks[name] = list;
              break;
            }
          }

          return this;
        }
      },
      one: {
        value: function(ev, callback) {
          var handler;

          return this.on(ev, handler = function() {
            this.off(ev, handler);
            return callback.apply(this, arguments);
          });
        }
      },
      trigger: {
        value: function() {
          var args, callback, ev, list, _i, _len, _ref;

          args = __slice.call(arguments, 0);
          ev = args[0];
          list = this.events.hasOwnProperty('callbacks') && ((_ref = this.events.callbacks) !== null ? _ref[ev] : void 0);
          if (!list) {
            return;
          }
          for (_i = 0, _len = list.length; _i < _len; _i++) {
            callback = list[_i];
            if (callback.apply(this, args) === false) {
              break;
            }
          }

          return true;
        }
      },
      listenTo: {
        value: function(obj, ev, callback) {
          obj.on(ev, callback);
          if ( !this.listeningTo ) {
            this.listeningTo = [];
          }
          this.listeningTo.push(obj);

          return this;
        }
      },
      listenToOnce: {
        value: function(obj, ev, callback) {
          var listeningToOnce;

          listeningToOnce = this.listeningToOnce || (this.listeningToOnce = []);
          listeningToOnce.push(obj);
          obj.one(ev, function() {
            var idx;

            idx = listeningToOnce.indexOf(obj);
            if (idx !== -1) {
              listeningToOnce.splice(idx, 1);
            }
            return callback.apply(this, arguments);
          });

          return this;
        }
      },
      stopListening: {
        value: function(obj, ev, callback) {
          var idx, listeningTo, retain, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;

          if (arguments.length === 0) {
            retain = [];
            _ref = [this.listeningTo, this.listeningToOnce];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              listeningTo = _ref[_i];
              if (!listeningTo) {
                continue;
              }
              for (_j = 0, _len1 = listeningTo.length; _j < _len1; _j++) {
                obj = listeningTo[_j];
                if ( __indexOf.call(retain, obj) >= 0 ) {
                  continue;
                }
                obj.off();
                retain.push(obj);
              }
            }
            this.listeningTo = void 0;
            this.listeningToOnce = void 0;
            return void 0;
          } else if (obj) {
            if (ev) {
              obj.off(ev, callback);
            }
            if (!ev) {
              obj.off();
            }
            _ref1 = [this.listeningTo, this.listeningToOnce];
            _results = [];
            for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
              listeningTo = _ref1[_k];
              if (!listeningTo) {
                continue;
              }
              idx = listeningTo.indexOf(obj);
              if (idx !== -1) {
                _results.push(listeningTo.splice(idx, 1));
              } else {
                _results.push(void 0);
              }
            }

            return _results;
          }
        }
      },

      prototype: {
        value: Object.create( null ),
        writable: true
      }
    });


    /*** Instance Properties ***/

    Object.defineProperties( Events.prototype, {
      on: {
        value: function(ev, callback) {
          var calls, evs, name, _i, _len;

          evs = ev.split(' ');
          calls = evnts.call( this ) || evnts.call( this, {} );
          for (_i = 0, _len = evs.length; _i < _len; _i++) {
            name = evs[_i];
            if( !calls[name] ) {
              calls[name] = [];
            }
            calls[name].push(callback);
          }

          return this;
        }
      },
      off: {
        value: function(ev, callback) {
          var cb, evs, i, list, name, calls, _i, _j, _len, _len1, _ref;

          if (arguments.length === 0) {
            evnts.call( this, {} );
            return this;
          }
          if (!ev) {
            return this;
          }
          evs = ev.split(' ');
          calls = evnts.call( this );
          for (_i = 0, _len = evs.length; _i < _len; _i++) {
            name = evs[_i];
            list = __isEmpty(calls) ? undefined : calls[name];
            if (!list) {
              continue;
            }
            if (!callback) {
              delete calls[name];
              continue;
            }
            for (i = _j = 0, _len1 = list.length; _j < _len1; i = ++_j) {
              cb = list[i];
              if ( cb !== callback ) {
                continue;
              }
              list = list.slice();
              list.splice(i, 1);
              calls[name] = list;
              break;
            }
          }

          return this;
        }
      },
      one: {
        value: function(ev, callback) {
          var handler;

          return this.on(ev, handler = function() {
            this.off(ev, handler);
            return callback.apply(this, arguments);
          });
        }
      },
      trigger: {
        value: function() {
          var args, callback, ev, calls, list, _i, _len, _ref;

          args = __slice.call(arguments, 0);
          ev = args[0];
          calls = evnts.call( this );
          list = __isEmpty(calls) ? undefined : calls[ev];
          if (!list) {
            return;
          }
          for (_i = 0, _len = list.length; _i < _len; _i++) {
            callback = list[_i];
            if (callback.apply(this, args) === false) {
              break;
            }
          }

          return true;
        }
      },
      listenTo: {
        value: function(obj, ev, callback) {
          obj.on(ev, callback);
          if ( !this.listeningTo ) {
            this.listeningTo = [];
          }
          this.listeningTo.push(obj);

          return this;
        }
      },
      listenToOnce: {
        value: function(obj, ev, callback) {
          var listeningToOnce;

          listeningToOnce = this.listeningToOnce || (this.listeningToOnce = []);
          listeningToOnce.push(obj);
          obj.one(ev, function() {
            var idx;

            idx = listeningToOnce.indexOf(obj);
            if (idx !== -1) {
              listeningToOnce.splice(idx, 1);
            }
            return callback.apply(this, arguments);
          });

          return this;
        }
      },
      stopListening: {
        value: function(obj, ev, callback) {
          var idx, listeningTo, retain, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results;

          if (arguments.length === 0) {
            retain = [];
            _ref = [this.listeningTo, this.listeningToOnce];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              listeningTo = _ref[_i];
              if (!listeningTo) {
                continue;
              }
              for (_j = 0, _len1 = listeningTo.length; _j < _len1; _j++) {
                obj = listeningTo[_j];
                if ( __indexOf.call(retain, obj) >= 0 ) {
                  continue;
                }
                obj.off();
                retain.push(obj);
              }
            }
            this.listeningTo = void 0;
            this.listeningToOnce = void 0;
            return void 0;
          } else if (obj) {
            if (ev) {
              obj.off(ev, callback);
            }
            if (!ev) {
              obj.off();
            }
            _ref1 = [this.listeningTo, this.listeningToOnce];
            _results = [];
            for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
              listeningTo = _ref1[_k];
              if (!listeningTo) {
                continue;
              }
              idx = listeningTo.indexOf(obj);
              if (idx !== -1) {
                _results.push(listeningTo.splice(idx, 1));
              } else {
                _results.push(void 0);
              }
            }

            return _results;
          }
        }
      }
    });

    return Events;
  })();


  // ==========================================================================
  // Proto
  // --------------------------------------------------------------------------

  var classProps, protoProps;

  /*** Proto Class Props ***/

  classProps = {
    meta: {
      value: {},
      writable: true
    },

    options: {
      value: {},
      writable: true
    },

    opts: {
      value: function( options ) {
        // Flatten and return all options in the prototype chain as a single object
        if( __isUndefined(options) || options === true ) {
          return this.has('super.opts') ? __mixin.call( {}, this.super.opts(), this.options, true ) : __mixin.call( {}, this.options, true );
        }

        // Return a subset of options (e.g. `MyModel.opts( 'events' )` )
        if( __isString(options) && arguments.length === 1 ) {
          return Proto.Utils.Objects.thread( this.opts(), options );
        }

        // Set options
        if( !this.hasOwn('options') ) {
          Object.defineProperty( this, 'options', {
            value: {},
            writable: true
          });
        }

        // Merge new options with existing class-level options
        var args = Utils.args( arguments, 'object' );
        __mixin.call( this.options, args[0], true );

        return this;
      }
    },

    construct: {
      // TODO: (IW) Replace ctx w/ `this`, and call via `Proto.construct.apply( this, arguments )`
      value: function( ctx, args, constructor ) {
        var self = constructor || ctx.constructor;

        // Return singleton instance if it exists
        // if( self.singleton === true && self.has('meta.instance') ) {
        //   return self.meta.instance;
        // }

        // Check if the constructor was called directly, and if so create a
        // new instance and assign it to ctx. This is a convenience that
        // makes the following equivalent:
        // `var p = Person( opts )`     <-- Conveniently handled here
        // `var p = new Person( opts )` <-- Oldskool constructor functions
        // `var p = Person.new( opts )` <-- Nuskool Object.create
        //
        // TODO: (IW) Make sure this works outside the browser
        // if( __isUndefined( ctx ) || !ctx.is(constructor) || (!ctx.prototype && (ctx.constructor === window.constructor)) ) {
        if( __isUndefined( ctx ) || !ctx.is(constructor) ) {

          // If the only arg is an instance of this class, return the instance
          if( args.length === 1 && Object.getPrototypeOf(args[0]) === self.prototype ) {
            return args[0];
          }

          // Otherwise return a new instance of the class
          return self.new.apply( self, args );
        }

        // Recurse up the prototype tree, calling the 'super' class
        // constructor w/ the new instance as the context (`this`)
        if( self && self.super ) {
          self.super.apply( ctx, args );
        }
      }
    },

    "new": {
      value: function( ) {
        var instance = Object.create( this.prototype );

        if ( instance.constructor ) {
          instance.constructor.apply( instance, arguments );
        }

        return instance;
      }
    },

    is: {
      value: function( obj ) {
        return this instanceof obj;
      }
    },

    // TODO: (IW) Pull these helpers out into a util mixin

    has: {
      value: function( path ) {
        var props = path.split( '.' ),
            tail = this;

        return props.every(function( prop ) {
          if( !(prop in tail) ) {
            return false;
          }
          tail = tail[prop];
          return true;
        });
      }
    },

    hasOwn: {
      value: function( prop ) {
        if( prop.indexOf('.') !== -1 ) {
          throw new Error( 'Dot-notation not supported when checking direct properties. Maybe you meant "ProtoObj.has(\'' + prop + '\')".' );
        }

        return this.hasOwnProperty( prop );
      }
    },

    map: {
      value: function( callback, ctx ) {
        return Utils.Objects.map( this, callback, ctx );
      }
    },

    bind: {
      value: function( callback ) {
        return __bind( callback, this );
      }
    },

    define: {
      value: function() {
        var args = Proto.Utils.args( arguments, 'object' );

        return __defineProps.apply( this, args );
      }
    },

    mixin: {
      value: function() {
        // TODO: (IW) Confusing to have to add 'true' when calling mixin. Make it automatic?
        return __mixin.apply( this, arguments );
      }
    },

    extend: {
      value: function( constructor, classDefs, protoDefs ) {
        var ignore = ['abstract'],
            Subclass, buckets;

        // TODO: (IW) Figure out a way to name the Subclass after the fact.
        // Right now, if you don't pass in a constructor, the subclass
        // will always be named 'ProtoObject' in the console. Very confusing.
        if( typeof constructor === 'function' ) {
          Subclass = constructor;
        } else {
          classDefs = constructor;
          constructor = undefined;

          Subclass = (function() {
            var ProtoObject;
            function ProtoObject( options ) {
              var self;
              if ( (self = Proto.construct(this, arguments, ProtoObject)) && self ) {
                return self;
              }

              this.constructor.trigger( 'new', this );
            }
            return ProtoObject;
          })();
        }

        // Extend class, ignoring properties that shouldn't be copied over
        // TODO: (IW) Find all capitalized props and add to ignore automatically
        buckets = ['Utils', 'Mixins', 'Models', 'Collections', 'Stores', 'Views', 'Array', 'Model', 'Collection', 'Store', 'DOM', 'View'];
        ignore = ignore.concat( buckets );

        __extend.call( Subclass, this, ignore );

        if( classDefs ) {
          // TODO: (IW) HACK! Figure out how to overwrite 'Subclass.name'
          // It defaults to the constructor fn name and (seemingly) cannot be
          // changed
          if( classDefs.name ) {
            if( !Subclass.hasOwn('meta') ) {
              Object.defineProperty( Subclass, 'meta', {
                value: {},
                writable: true
              });
            }

            Subclass.meta.name = classDefs.name;
            // delete classDefs.name;
          }

          // Faster than __mixin, since we expect a property definitions object
          Object.defineProperties( Subclass, classDefs );
        }

        if( protoDefs ) {
          Object.defineProperties( Subclass.prototype, protoDefs );
        }

        return Subclass;
      },
      writable: true
    },

    classname: {
      get: function() {
        return (this.meta && this.meta.name) ? this.meta.name : this.name;
      },
      set: function( name ) {
        if( !this.hasOwn( 'meta') ) {
          Object.defineProperty( this, 'meta', {
            value: this.meta || {},
            writable: true
          });
        }
        this.meta.name = name;

        return this.meta.name;
      }
    }
  };


  /*** Proto Instance Props ***/

  protoProps = {
    opts: {
      value: function( options ) {
        if( __isUndefined(options) || options === true ) {
          return this.has('proto.opts') ? __mixin.call( {}, this.proto.opts(), this.constructor.opts(), this.options, true ) : __mixin.call( {}, this.constructor.opts(), this.options, true );
        }

        // Return a subset of options (e.g. `model.opts( 'some.nested.property' )` )
        if( __isString(options) && arguments.length === 1 ) {
          return Proto.Utils.Objects.thread( this.opts(), options );
        }

        // Set options
        if( !this.hasOwn('options') ) {
          Object.defineProperty( this, 'options', {
            value: {},
            writable: true
          });
        }

        var args = Utils.args( arguments, 'object' );
        __mixin.call( this.options, args[0], true );

        return this;
      }
    },

    clone: {
      value: function() {
        return Object.create( this );
      },
      writable: true
    },

    is: {
      value: function( obj ) {
        return this instanceof obj;
      }
    },

    has: {
      value: function( path ) {
        var props = path.split( '.' ),
            tail = this;

        return props.every(function( prop ) {
          if( !(prop in tail) ) {
            return false;
          }
          tail = tail[prop];
          return true;
        });
      }
    },

    hasOwn: {
      value: function( prop ) {
        if( prop.indexOf('.') !== -1 ) {
          throw new Error( 'Dot-notation not supported when checking direct properties. Maybe you meant "protoObj.has(\'' + prop + '\')".' );
        }

        return this.hasOwnProperty( prop );
      }
    },

    thread: {
      value: function() {
        return __thread.apply( this, arguments );
      }
    },

    // as: {
    //   value: function( obj ) {
    //     var clone = obj.clone ? obj.clone() : __copy( obj );
    //   }
    // },

    to: {
      value: function ( format ) {
        var encoder = this.opts('encoders')[ format ] || Utils.encoder( format ),
            data = this.deflate({format: format});

        return encoder.encode( this );
      }
    },

    from: {
      value: function ( format, src ) {
        var encoder = this.opts('encoders')[ format ] || Utils.encoder( format ),
            obj = encoder.decode( src );

        this.mixin( obj );
        return this;
      }
    },

    deflate: {
      value: function() {
        var props = {};

        Object.keys( this ).forEach( function(prop) {
          props[prop] = this[prop];
        }, this);

        return props;
      },
      writable: true
    },

    bind: {
      value: function( callback ) {
        return __bind( callback, this );
      }
    },

    define: {
      value: function( propDefs ) {
        var args = Proto.Utils.args( arguments, 'object' );
        // Restrict arguments to one set of property definitions, since this
        // was called at the prototype level
        return __defineProps.call( this, args[0] );
      }
    },

    mixin: {
      value: function() {
        // TODO: (IW) Confusing to have to add 'true' when calling mixin. Make it automatic?
        return __mixin.apply( this, arguments );
      }
    },

    proto: {
      get: function() {
        return Object.getPrototypeOf(this);
      }
    },

    // Convenience to make it easier for those coming from traditional OOP
    class: {
      get: function() {
        return this.constructor;
      }
    },

    toString: {
      value: function() {
        return '[proto ' + this.constructor.classname + ']';
      },
      writable: true
    },

    valueOf: {
      value: function() {
        return this.deflate();
      },
      writable: true
    }
  };


  Proto = (function() {
    // __extend.call( Proto, Object );
    __mixin.call( Proto, Events, true );

    // Class properties
    Object.defineProperties( Proto, classProps );
    // Instance properties
    Object.defineProperties( Proto.prototype, protoProps );


    /*** Containers ***/

    // Extra buckets for namespacing
    Object.defineProperties( Proto, {

      Utils: {
        value: Utils,
        writable: true
      },

      Mixins: {
        value: Mixins,
        writable: true
      },

      Models: {
        value: {},
        writable: true
      },

      Collections: {
        value: {},
        writable: true
      },

      Stores: {
        value: {},
        writable: true
      }
    });


    // Constructor
    function Proto( options ) {
      var self;

      if( this.constructor.abstract === true ) {
        throw new Error( 'Cannot instantiate abstract class ' + this.constructor.name );
      }

      // When calling `Proto(obj)` directly, return a Protoized copy of the argument.
      // e.g. `var hasThing = Proto(obj).has('thing');`
      if( !this.prototype && (this.constructor === window.constructor) ) {
        if( arguments.length === 1 && __isObject(arguments[0]) ) {
          // TODO: (IW) Make this more generic by just mixing in the props?
          return Proto.new().mixin( arguments[0] );
        }
      }


      // Return singleton instance if it exists
      if( this.constructor.singleton === true && this.constructor.has('meta.instance') ) {
        return this.constructor.meta.instance;
      }

      // TODO: (IW) Trying to be clever and confuse jshint, should do this in a
      // way that jshint approves.
      if ( (self = Proto.construct(this, arguments, Proto)) && self ) {
        return self;
      }

      if( __isObject(options) ) {
        this.opts( options );
      }

      // Save the first instance of a singleton to use next time
      if( this.constructor.singleton === true && !this.constructor.has('meta.instance') ) {
        this.constructor.meta.instance = this;
      }
    }

    return Proto;
  })();


  // TODO: (IW) Experimental - DO NOT USE
  ProtoArray = (function() {
    // TODO: (IW) Get an Events class that extends Array for ProtoArray to extend from
    __extend.call( ProtoArray, Array );
    __mixin.call( ProtoArray, Events, true );

    // Class properties
    Object.defineProperties( ProtoArray, classProps );
    // Instance properties
    Object.defineProperties( ProtoArray.prototype, protoProps );


    // Constructor
    function ProtoArray() {
      var args = __slice.call( arguments, 0 ),
          options, self;

      if( args.length && __isObject(args[args.length - 1]) ) {
        options = args.pop();
        this.opts( options );
      }

      // Call Proto constructor to init constructor chain
      if( (self = Proto.construct(this, args, ProtoArray)) && self ) {
        return self;
      }
    }

    return ProtoArray;
  })();


  // ==========================================================================
  // Store (persistence abstraction: AJAX, LocalStorage, etc.)
  // --------------------------------------------------------------------------

  Store = (function() {
    var Queue, Ajax;

    // Abstract Base Storage API
    // -------------------------

    __extend.call( Store, Proto );

    // Class properties
    Object.defineProperties( Store, {
      abstract: {
        value: true
      },

      options: {
        value: {
          encoder: undefined
        },
        writable: true
      }
    });

    // Instance properties
    Object.defineProperties( Store.prototype, {

      perform: {
        value: function( action, obj, options ) {
          throw Error('Not Implemented');
        },
        writable: true
      },

      abort: {
        value: function( obj, options ) {
          throw Error('Not Implemented');
        },
        writable: true
      },

    });

    function Store( options ) {
      var self;

      if ( (self = Proto.construct(this, arguments, Store)) && self ) {
        return self;
      }
    }


    // Default AJAX Storage Adapter
    // ----------------------------

    __extend.call( Ajax, Store, ['abstract'] );

    // Class properties
    Object.defineProperties( Ajax, {
      options: {
        value: {
          encoder: undefined,
          baseUrl: '/api',
          methods: {
            read: 'GET',
            create: 'POST',
            update: 'PUT',
            destroy: 'DELETE'
          },
          ajax: $.ajax,
          events: {}
        },
        writable: true
      }
    });

    // Instance properties
    Object.defineProperties( Ajax.prototype, {
      queue: {
        value: []
      },

      promise: {
        value: undefined,
        writable: true
      },

      perform: {
        value: function( action, obj, options ) {
          // console.log("PERFORM", arguments, this, this.opts());

          if( this.promise && this.promise.inspect().state === 'pending' ) {
            return this.enqueue.apply( this, arguments );
          }

          var opts = this.opts(),
              method = options.type || opts.methods[action],
              ajaxOpts = __mixin.call({
                method: method
                // context: obj
              }, options, true ),
              promise;

          if( !__isEmpty(opts.encoder) ) {
            ajaxOpts = opts.encoder.encode( ajaxOpts );
          }

          this.trigger( 'perform', action, obj, ajaxOpts );

          // TODO: (IW) This promise isn't being resolved w/ the jQuery
          // ajax args. Figure out why.
          promise = this.xhr( ajaxOpts ).then(
            this.bind(function (res) {
              if( !__isEmpty(opts.encoder) ) {
                res = opts.encoder.decode( res );
              }

              var callback = this.opts('events.success');
              if( __isFunction(callback) ) {
                callback.call( this, 'perform', 'success', res, ajaxOpts );
              }

              this.trigger( 'perform', 'success', res, ajaxOpts );
              return res;
            }),
            this.bind(function (error) {
              console.log("PERFORM FAIL", arguments);
              var callback = this.opts('events.fail');
              if( __isFunction(callback) ) {
                callback.call( this, 'perform', 'fail', error, ajaxOpts );
              }

              this.trigger( 'perform', 'fail', error, ajaxOpts );
              return error;
            }),
            this.bind(function (data) {
              var callback = this.opts('events.progress');
              if( __isFunction(callback) ) {
                callback.call( this, 'perform', 'progress', data, ajaxOpts );
              }

              this.trigger( 'perform', 'progress', data, ajaxOpts );
              return data;
            })
          ).otherwise(function (error) {
            console.log("PERFORM ERROR", error);
            console.error(error.stack);
          });

          promise.ensure( this.bind(function() {
            // console.log("ENSURE", this.queue, this.promise.inspect(), this);
            this.dequeue();
          }));

          this.promise = promise;

          return promise;
        },
        enumerable: true,
        writable: true
      },

      abort: {
        value: function( promise ) {
          console.log("AJAX ABORT", this.promise);

          if( this.has( 'promise.xhr' ) ) {
            this.promise.xhr.abort();
          }

          this.trigger( 'abort', this.promise.xhr );
          return this;
        },
        writable: true
      },

      enqueue: {
        value: function() {
          console.log("ENQUEUE", arguments, this.queue.length, this);

          var args = __slice.call( arguments, 0 ),
              deferred = when.defer(),
              resolver = deferred.resolver,
              promise = deferred.promise,
              obj = {
                args: args,
                resolver: resolver
              };

          this.queue.push( obj );
          // this.trigger( 'enqueue', obj );
          return promise;
        }
      },

      dequeue: {
        value: function() {
          if( !this.queue.length ) {
            return;
          }

          console.log("DEQUEUE", arguments, this.queue.length, this);

          var obj = this.queue.shift(),
              resolver = obj.resolver,
              args = obj.args,
              promise;

          // this.trigger( 'dequeue', obj );
          promise = this.perform.apply( this, args );
          promise.then( resolver.resolve, resolver.reject, resolver.progress );
          return promise;
        }
      },

      xhr: {
        value: function( ajaxOptions ) {
          // Wrap the request in a when.js promise
          var ajaxOpts = __mixin.call( {}, ajaxOptions, true ),
              ajax = this.opts( 'ajax' ),
              deferred = when.defer(),
              resolver = deferred.resolver,
              promise = deferred.promise,
              xhr;

          xhr = ajax( ajaxOpts )
            .done(function ( data, status, xhr ) {
              console.log( "AJAX DONE", arguments, this );
              var args = Utils.args( arguments );

              // var idProp = this.constructor.opts('props.uid'),
              //     location, uid;

              // data = data || {};

              // // If the server-generated uid is not in the result, check the 'Location' redirect header
              // if( !data[idProp] ) {
              //   var location = req.getResponseHeader('Location'),
              //       uid = parseInt(location.split('/').pop(), 10);

              //   if( uid === undefined || __isNaN(uid) ) {
              //     console.log( "Unable to parse uid from 'Location' header", location, uid );
              //   }

              //   this[idProp] = uid;
              // }

              // // If there's still no uid, not sure what to do.
              // if( this.isNew ) {
              //   throw Error( 'Unable to extract unique id (model.' + idProp + ') from response.' );
              // }




              resolver.resolve.apply( resolver, args );
            })
            .fail( resolver.reject )
            .always( function() {
              // console.log("AJAX ALWAYS", arguments);
            });

          // TODO: (IW) Hack to expose a way to ref/abort a request
          Object.defineProperty( promise, 'xhr', {value: xhr} );
          Object.defineProperty( promise, 'abort', {
            value: this.bind(function() {
              return this.abort( promise );
            })
          });

          return promise;
        }
      }
    });

    function Ajax( options ) {
      var self;

      if( (self = Proto.construct(this, arguments, Ajax)) && self ) {
        return self;
      }

      if( !this.opts('ajax') ) {
        throw new Error('An XHR object must be provided (options.ajax).');
      }
    }

    Store.Ajax = Ajax;
    return Store;
  })();


  // ==========================================================================
  // Model
  // --------------------------------------------------------------------------

  Model = (function() {
    __extend.call( Model, Proto );

    // Class properties
    Object.defineProperties( Model, {
      abstract: {
        value: true
      },

      options: {
        value: {
          path: '/api',
          store: undefined,
          props: {
            uid: 'id'
          },
          map: {

          },
          format: 'JS',
          encoders: {},
          events: {}
        },
        writable: true
      },

      count: {
        value: 0,
        writable: true
      },

      counter: {
        get: function() {
          return ++this.count;
        }
      },

      url: {
        get: function() {
          return [this.opts('path'), this.classname.toLowerCase()].join('/');
        },
        configurable: true
      },

      extend: {
        value: function( constructor, propDefs ) {
          var Subclass = Proto.extend.apply( this, arguments );
          Subclass.count = 0;

          return Subclass;
        }
      },

      send: {
        value: function( action, model, options ) {
          var opts = this.opts(),
              sendOpts = options,
              promise;

          promise = opts.store.perform( action, model, sendOpts ).then(
            function (res) {
              console.log("SEND SUCCESS", arguments);
              model.trigger( 'send', 'success', action, res, sendOpts );
              return res;
            },
            function (error) {
              console.log("SEND FAIL", arguments);
              model.trigger( 'send', 'fail', action, error, sendOpts );
              return error;
            }
          );

          return promise;
        }
      }
    });

    // Instance properties
    Object.defineProperties( Model.prototype, {
      uid: {
        get: function() {
          return this[this.constructor.opts('props.uid')] || 'iid-' + this.__model__.iid;
        },
        set: function( uid ) {
          return this[this.constructor.opts('props.uid')] = uid;
        }
      },

      isNew: {
        get: function() {
          var id = this[this.constructor.opts('props.uid')];
          return id === undefined || id === null;
        }
      },

      url: {
        get: function() {
          var id = this.isNew ? null : this[this.constructor.opts('props.uid')];
          return [this.constructor.url, id].join('/');
        },
        configurable: true
      },

      set: {
        value: function( props, options ) {
          var args = __slice.call( arguments, 0 ),
              changes = {},
              opts, prop;

          if( __isString(props) ) {
            props = {};
            prop = args[0];
            props[prop] = args[1];
            options = args[2];
          }

          opts = __mixin.call( {overwrite: true, touch: true, reset: false, silent: false}, options );

          Object.keys( props ).forEach(function( prop ) {
            if( !opts.overwrite && this.hasModified(prop) ) {
              return;
            }

            if( !this.has(prop) || this[prop] !== props[prop] ) {
              changes[prop] = __copy( this[prop] );
              this[prop] = props[prop];

              if( !opts.silent ) {
                // this.trigger( 'change.' + prop, changes[prop], __copy(this[prop]) );
                this.trigger( 'change', prop, changes[prop], __copy(this[prop]), opts );
              }
            }
          }, this);

          if( opts.reset ) {
            this.__model__.modified = false;
          }

          if( Object.keys( changes ).length ) {
            if( !opts.reset && opts.touch ) {
              this.__model__.modified = true;
            }

            if( !opts.silent ) {
              this.trigger( 'set', changes, opts );
            }
          }

          return this;
        }
      },

      fetch: {
        value: function( options ) {
          if( this.isNew ) {
            throw Error( 'Need a unique id to fetch (model.' + this.constructor.opts('props.uid') + ').' );
          }

          var sendOpts = __mixin.call({
                url: this.url
              }, options),
              promise;

          this.trigger( 'fetch' );

          promise = this.constructor.send( 'read', this, sendOpts );
          promise.then(
            this.bind(function (data, status, req) {
              console.log("FETCH SUCCESS", arguments, this);
              this.set( data, {reset: true} );
              this.trigger( 'fetch', 'success', data, status );
              return arguments;
            }),
            this.bind(function (req, status, error) {
              console.log("FETCH FAILED", arguments, this);
              this.trigger( 'fetch', 'fail', error, status );
              return arguments;
            }),
            this.bind(function (data) {
              console.log("FETCH PROGRESS", arguments, this);
              this.trigger( 'fetch', 'progress', data );
              return arguments;
            })
          );

          return promise;
        },
        writable: true
      },

      create: {
        value: function( options ) {
          if( !this.isNew ) {
            throw Error( this.toString() + ' has already been created (try "model.update()").' );
          }

          var promise;

          this.trigger( 'create' );

          promise = this.save( options );
          promise.then(
            this.bind(function (data, status, req) {
              console.log("CREATE SUCCESS", arguments, this);
              this.trigger( 'create', 'success', this.uid );
              return arguments;
            }),
            this.bind(function (req, status, error) {
              console.log("CREATE FAILED", arguments, this);
              this.trigger( 'create', 'fail', error, status );
              return arguments;
            })
          );

          return promise;
        },
        writable: true
      },

      update: {
        value: function( options ) {
          if( this.isNew ) {
            throw Error( this.toString() + ' has not been persisted yet (try "model.create()").' );
          }

          var promise;

          this.trigger( 'update' );
          promise = this.save( options );
          promise.then(
            this.bind(function (data, status, req) {
              console.log("UPDATE SUCCESS", arguments, this);
              this.trigger( 'update', 'success', data, status );
              return arguments;
            }),
            this.bind(function (req, status, error) {
              console.log("UPDATE FAILED", arguments, this);
              this.trigger( 'update', 'fail', error, status );
              return arguments;
            })
          );

          return promise;
        },
        writable: true
      },

      save: {
        value: function( options ) {
          if( !this.validate() ) {
            console.log("INVALID", this);
            return false;
          }

          var opts = __mixin.call( {sanitize: true}, options, true ),
              data = this.deflate( opts ),
              action = this.isNew ? 'create' : 'update',
              sendOpts = __mixin.call({
                url: this.url,
                data: data
              }, opts, true ),
            subs, subPromises, promise;

          if( !opts.predone && ((subs = this.opts('map.pre')) && subs.length) ) {
            // TODO: (IW) Ensure proper order of operations using async/queue
            subs = map.pre.map(function (sub) {
              return sub.save( opts );
            });

            when.all( subs ).then(
              function (result) {
                console.log("PRE-MAPPED SUCCESS", arguments, this);
              },
              function (reason) {
                console.log("PRE-MAPPED FAILED", arguments, this);
              }
            );
          }

          this.trigger( 'save', action );

          promise = this.constructor.send( action, this, sendOpts );
          promise.then(
            this.bind(function (data, status, req) {
              console.log("SAVE SUCCESS", arguments, this);

              if( data && _.isObject(data) ) {
                this.set( data );
              }

              this.trigger( 'save', 'success', data, status );
            }),
            this.bind(function (req, status, error) {
              console.log("SAVE FAILED", arguments, this);
              this.trigger( 'save', 'fail', error, status );
            })
          );

          return promise;
        },
        writable: true
      },

      destroy: {
        value: function( options ) {
          var opts = __mixin.call({
                url: this.url
              }, options),
              promise;

          this.trigger( 'destroy' );

          promise = this.constructor.send( 'destroy', this, opts ).then(
            this.bind(function (data, status, req) {
              this.trigger( 'destroy', 'success' );
            }),
            this.bind(function (req, status, error) {
              this.trigger( 'destroy', 'fail', error, status );
            })
          );

          return promise;
        },
        writable: true
      },

      clone: {
        value: function() {
          var clone = Proto.prototype.clone.apply( this, arguments );
          if( !clone.__model__.original ) {
            clone.__model__.original = this;
          }

          this.trigger( 'clone', clone );
          return clone;
        },
        writable: true
      },

      validate: {
        value: function( options ) {
          var opts = __mixin.call({
            require: []
          }, this.constructor.opts('props'), options, true ),
          requires = opts.require;

          return !requires.length ? true : opts.require.every(function(i) {
            var v;
            return this.has(i) && !__isEmpty(this.thread(i));
          }, this);
        },
        writable: true
      },

      // TODO: (IW) method to return invalid fields w/ reasons

      deflate: {
        value: function( options ) {
          var opts = __mixin.call({
                require: [],
                exclude: [],
                include: [],
                sanitize: false
              }, this.opts('props'), options ),
              requires = opts.require,
              includes = opts.include,
              excludes = opts.exclude,
              props, prop;

          props = Proto.prototype.deflate.call( this );

          if( opts.sanitize && this.constructor.sanitize ) {
            props = this.constructor.sanitize( props, opts );
          }

          if( includes.length ) {
            for( prop in props ) {
              if( includes.indexOf(prop) === -1 ) {
                // console.log("NOT INCLUDE", prop);
                delete props[prop];
              }
            }
          }

          excludes.forEach(function (prop, i) {
            if( prop in props ) {
              // console.log("EXCLUDE", prop);
              delete props[prop];
            }
          });

          return props;
        },
        writable: true
      },

      /**
       * Check for property modifications. This is a basic implementation
       * that only checks that the model has been modified, and that the
       * property exists. Use `Proto.DirtyModel` for more granular,
       * property-level tracking.
       *
       * @param {string} Property to check
       */
      hasModified: {
        value: function( prop ) {
          return this.__model__.modified && this.has( prop );
        }
      },

      toString: {
        value: function() {
          var idProp = this.constructor.opts('props.uid'),
              id = this[idProp],
              iid = this.__model__.iid,
              ids = 'iid:' + iid + (id ? ', ' + idProp + ':' + id : '');

          return this.constructor.classname + '(' + ids + ')';
        },
        writable: true
      },

      valueOf: {
        value: function() {
          return __mixin( Proto.prototype.valueOf.call(this), {iid: this.__model__.iid} );
        }
      }
    });

    // Constructor
    function Model( obj, options ) {
      var args = __slice.call( arguments, 0 ),
          self, opts, encoder;

      // Assume the first argument is the model data
      if( args.length > 1 ) {
        args.shift();
      }

      if( (self = Proto.construct(this, args, Model)) && self ) {
        return self;
      }

      // TODO: (IW) Replace w/ 'this.opts()'?
      opts = __mixin.call( {reset: true}, this.constructor.opts(), options, true );

      if( !this.__model__ ) {
        Object.defineProperty( this, '__model__', {
          value: {
            iid: this.constructor.counter
          }
        });
      }

      if( obj ) {
        if( opts.format && (encoder = Utils.encoder( opts.format )) ) {
          obj = encoder.decode( obj );
        }
        this.set( obj, opts );
      }

      this.constructor.trigger( 'new', this );
    }

    return Model;
  })();



  // ==========================================================================
  // Collection
  // --------------------------------------------------------------------------

  Collection = (function() {
    __extend.call( Collection, Proto, ['abstract'] );

    // Class properties
    Object.defineProperties( Collection, {
      options: {
        value: {
          model: undefined,
          comparator: Utils.compare,
          path: '/api',
          limit: 100,
          poll: false,
          pollMultiplier: 1,
          store: undefined
        },
        writable: true
      },

      url: {
        get: function() {
          var url, path, models, parts;

          if( (url = this.opts('url')) && !__isUndefined(url) ) {
            return url;
          }

          path = this.opts('path'),
          models = Utils.Strings.pluralize( this.opts('model.classname').toLowerCase() ),
          parts = [];

          if( !__isEmpty(path) ) {
            parts.push(path);
          }
          parts.push( models );

          return parts.join('/');
        },
        configurable: true
      },

      send: {
        value: function( action, collection, options ) {
          var opts = this.opts(),
              sendOpts = options,
              promise;

          return opts.store.perform( action, collection, sendOpts ).then(
            function (res) {
              console.log("COLLECTION SEND SUCCESS", arguments);
              collection.trigger( 'send', 'success', action, res, sendOpts );
              return res;
            },
            function (error) {
              console.log("COLLECTION SEND FAILED", arguments);
              collection.trigger( 'send', 'fail', action, error, sendOpts );
              return error;
            }
          );
        }
      }
    });

    // Instance properties
    Object.defineProperties( Collection.prototype, {
      // count: {
      //   value: undefined,
      //   enumerable: true,
      //   writable: true
      // },

      url: {
        get: function() {
          var url, path, models, parts;

          if( (url = this.opts('url')) && !__isUndefined(url) ) {
            return url;
          }

          path = this.opts('path'),
          models = Utils.Strings.pluralize( this.__collection__.model.classname.toLowerCase() ),
          parts = [];

          if( !__isEmpty(path) ) {
            parts.push(path);
          }
          parts.push( models );

          return parts.join('/');
        },
        configurable: true
      },

      add: {
        value: function( objs, options ) {
          var opts = __mixin.call( {parse: true, replace: false, merge: false, silent: false}, options ),
              at = opts.at ? parseInt( opts.at, 10 ) : undefined,
              model = this.__collection__.model,
              records = objs,
              format = opts.format || 'JS',
              added = [];

          if( !__isUndefined(at) && (!__isNumber(at) || at === -1) ) {
            throw new Error( 'Invalid array index (options.at: ' + at + ').' );
          }

          if( !Array.isArray(records) ) {
            records = [records];
          }

          records.forEach(function( obj ) {
            var id = obj[this.__collection__.model.opts('props.uid')],
                found, record, uid, idx;

            if( opts.parse ) {
              obj = Proto.Utils.encoder( format ).decode( obj );
            }

            if( (found = this.get(obj)) ) {
              // Update existing record
              if( opts.merge ) {
                found.set( obj, opts );
              }

              // Reject conflicting record
              if( opts.replace ) {
                this.remove( found, options );
                found = undefined;
              }
            }

            if( found ) {
              record = found;
              idx = this.indexOf( record );
            } else if( obj instanceof model ) {
              // Already a record
              record = obj;
            } else {
              // Reject non-model object
              if( !opts.parse ) {
                this.trigger( 'reject', 'parse', obj, obj.constructor.name + ' is not an instance of ' + model.classname );
                return;
              }

              // Create new record from obj
              record = model.new( obj );
            }

            // TODO: (IW) Splice in at proper index if collection is sorted
            if( !__isUndefined(at) && (idx !== at) ) {
              if( found && idx !== -1 ) {
                // Remove from previous index
                this.records.splice( idx, 1 );
              }

              // Splice into collection at given index
              this.records.splice( at++, 0, record );
            } else if( !found ) {
              // Add new record to the end of the collection
              this.records.push( record );

              // Keep an internal reference by iid/uid
              this.__collection__.by.iid[ record.__model__.iid ] = record;
              this.__collection__.by.uid[ record.uid ] = record;
              if( id !== undefined ) {
                this.__collection__.by.id[ id ] = record;
              }
            }

            added.push( record );
            // this.trigger( 'add.record', record );
          }, this);

          if( !opts.silent ) {
            this.trigger( 'add', added );
          }
          return this;
        }
      },

      // TODO: (IW) Should this work the same way as find? To dangerous?
      remove: {
        value: function( records, options ) {
          var opts = __mixin.call( {}, options ),
              i, l, record;

          if( !Array.isArray(records) ) {
            records = [records];
          }

          for( i = 0, l = records.length; i < l; ++i ) {
            var record = this.__collection__.by.uid[records[i].uid],
                index = this.indexOf( record ),
                id = record[record.constructor.opts('props.uid')],
                iid = record.__model__.iid,
                uid = record.uid;

            if( !record ) {
              continue;
            }

            delete this.__collection__.by.iid[iid];
            delete this.__collection__.by.uid[uid];
            if( id !== undefined ) {
              delete this.__collection__.by.id[id];
            }

            if( index !== -1 ) {
              this.records.splice( index, 1 );
            }

            this.trigger( 'remove', record, index );
            return this;
          }
        }
      },

      get: {
        value: function( obj ) {
          if( obj === undefined ) {
            return undefined;
          }

          var idProp = this.__collection__.model.opts('props.uid'),
              records, i, uid, len, record;

          // Return the list of records from an array of uids
          if( __isArray(obj) ) {
            len = obj.length;
            records = [];

            for( i = 0; i < len, uid = obj[i]; ++i ) {
              records.push( this.get(uid) );
            }

            return records;
          }

          // Return a single record matching the given uid
          uid = __isObject(obj) ? obj[idProp] || obj['iid'] || obj['uid'] : obj;

          return this.__collection__.by.uid[uid];
        },
        writable: true
      },

      indexOf: {
        value: function( record ) {
          var model = this.__collection__.model,
              idProp = model.opts('props.uid');

          if( !__isObject(record) || !(record instanceof model) ) {
            record = this.get( obj );
            if( __isUndefined(record) ) {
              return -1;
            }
          }

          return this.records.indexOf( record );
        },
        writable: true
      },

      /**
       * Search for matching records based on one or more filtersets (arrays of
       * property filters).
       *
       * Find records that match *all* of the passed props in *any* of the
       * filtersets (filters in filtersets are exclusive, multiple filtersets
       * are inclusive).
       *
       * @param {string|object|function}
       * @param {object=}
       * @return {array} The set of matched records
       */
      find: {
        value: function( filterset ) {
          var args = __slice.call( arguments, 0 ),
              filters, prop, value, i;

          if( __isEmpty(args) ) {
            return __copy( this.records );
          }

          if( __isString(filterset) && args.length === 2 ) {
            prop = args[0];
            value = args[1];

            return this.records.filter(function (record) {
              return record.has(prop) && (record.thread(prop) === value);
            });
          }

          return this.records.filter(function (record) {
            var include;

            for( i = 0; i < args.length; i++ ) {
              filters = args[i];
              include = true;

              if( !__isObject(filters) ) {
                continue;
              }

              for( prop in filters ) {
                value = filters[prop];

                if( record.has( prop ) && record.thread( prop ) === value ) {
                  continue;
                }

                include = false;
                break;
              }

              if( include ) {
                return true;
              }
            }

            return false;
          });

          console.log( 'COLLECTION.FIND: Not sure what do do with', args, this );
          throw new Error( 'Invalid arguments. Find requires either key & value, or an object to search for matching records.' );
        },
        writable: true
      },

      first: {
        value: function() {
          // TODO: (IW) Optimize by breaking out after first match
          return this.find.apply( this, arguments ).shift();
        }
      },

      last: {
        value: function() {
          return this.find.apply( this, arguments ).pop();
        }
      },

      sort: {
        value: function( options ) {
          var prop, opts;

          if( __isFunction(options) ) {
            options = { comparator: options };
          } else if( __isString(options) ) {
            // TODO: (IW) Stick this somewhere in Utils
            prop = options;
            options = {
              property: prop,
              comparator: function( a, b ) {
                return Proto.Utils.compare( a[prop], b[prop] );
              }
            }
          }

          opts = __mixin.call( {comparator: this.opts('comparator')}, options );

          if( !opts.comparator ) {
            throw new Error( 'Sort requires a comparator function (options.comparator)' );
          }

          this.records.sort( opts.comparator );
          this.trigger( 'sort', options );
          return this;
        },
        writable: true
      },

      fetch: {
        value: function( params, options ) {
          var data = __mixin.call( {}, this.opts('params'), params, true ),
              sendOpts = __mixin.call({
                url: this.url,
                data: data
              }, options, true );

          this.trigger( 'fetch', data );

          return this.constructor.send( 'read', this, sendOpts ).then(
            this.bind(function (res) {
              console.log("COLLECTION FETCH SUCCESS", arguments);

              var opts = this.constructor.opts(),
                  args = __slice.call( arguments, 0 );

              if( res.data ) {
                this.add( res.data, options );
              }

              args.push( sendOpts );

              // // Start polling
              // if( opts.poll ) {
              //   // The timeout is increased each time a poll returns nothing new
              //   // (w/ 5x max), and reset when there are changes.
              //   var maxDelay = opts.poll * opts.pollMultiplier * 5,
              //       multiDelay = opts.poll * opts.pollMultiplier * this.__collection__.pollCount,
              //       delay = __min( maxDelay, __max(opts.poll, multiDelay) );

              //   if( this.__collection__.pollTimeout ) {
              //     clearTimeout( this.__collection__.pollTimeout );
              //     this.__collection__.pollTimeout = null;
              //   }

              //   this.__collection__.pollTimeout = setTimeout( this.bind(this.poll), delay );
              // }

              this.trigger( 'fetch.success', res, sendOpts );
              return res;
            }),
            function (error) {
              console.log("COLLECTION FETCH FAILED", arguments);

              this.trigger( 'fetch.fail', error, sendOpts );
              return error;
            }
          );
        }
      },

      poll: {
        value: function() {
          this.fetch( {poll: true} );
          this.__collection__.lastPolled = new Date();

          return this;
        }
      },

      // TODO: (IW) This is pretty silly. Optimize.
      save: {
        value: function( options ) {
          var opts = __mixin.call( {create: true, update: true}, options ),
              filtersets = opts.filtersets || [],
              records, promises;

          if( opts.create ) {
            filtersets.push( {isNew: true} );
          }

          if( opts.update ) {
            filtersets.push( {'__model__.modified': true, isNew: false} );
          }

          records = this.find.apply( this, filtersets );

          if( !records.length ) {
            return;
          }

          this.trigger( 'save', records, opts );
          promises = records.map(function(record) {
            record.save( opts );
          });

          // return when.all(promises);
        },
        writable: true
      },

      clear: {
        value: function() {
          this.records.length = 0;
          this.__collection__.by.uid.length = 0;
          this.__collection__.by.id.length = 0;

          if( this.__collection__.pollTimeout ) {
            clearTimeout( this.__collection__.pollTimeout );
            this.__collection__.pollTimeout = null;
          }
          this.__collection__.pollCount = 0;

          this.trigger( 'clear' );
          return this;
        }
      },

      toString: {
        value: function() {
          var modelclass = this.opts('model.classname') || this.thread( '__collection__.model.classname');
          return this.constructor.classname + (modelclass ? ' (' + modelclass + ')' : '');
        },
        writable: true
      }
    });

    // Constructor
    function Collection( records, options ) {
      var args = __slice.call( arguments, 0 ),
          self;

      if( __isArray(records) ) {
        args.shift();
      }

      if( (self = Proto.construct(this, args, Collection)) && self ) {
        return self;
      }

      if( !this.opts('model') ) {
        throw Error( "Model is required when instantiating collection (options.model).");
      }

      if( !this.has('records') ) {
        Object.defineProperty( this, 'records', {
          value: [],
          writable: true,
          enumerable: true
        });
      }

      if( !this.has('__collection__') ) {
        Object.defineProperty( this, '__collection__', {
          value: {
            model: this.opts('model'),
            by: {
              id: {},
              iid: {},
              uid: {}
            },
            limit: this.opts('limit'),
            poll: this.opts('poll'),
            pollModifier: this.opts('pollModifier'),
            pollCount: 0,
            lastPolled: undefined,
            params: {}
          }
        });
      }

      if( this.opts('params') ) {
        this.__collection__.params = Proto.Utils.mixin( {}, this.__collection__.params, this.opts('params'), true );
      }

      if( records ) {
        this.add( records, opts );
      }

      this.constructor.trigger( 'new', this );
    }

    return Collection;
  })();



  // Wrap it all up in a neat little bundle
  Proto.Array = ProtoArray;
  Proto.Store = Store;
  Proto.Model = Model;
  Proto.Collection = Collection;

  // Add core mixins
  Proto.Mixins.Events = Events;

  // TODO: (IW) For debugging only
  window.Proto = Proto;
  return Proto;

});