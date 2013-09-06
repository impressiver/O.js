define(['proto', 'lib/proto/proto.mixin.multisort'],
function (Proto) {
  "use strict";

  var QuerySet,

      max = Math.max,
      min = Math.min;

  /**
  * QuerySet Proto Collection
  * -------------------------
  * Proto model collection that supports lazy-loading large, filtered data sets
  **/

  function QuerySet( options ) {
    var self;

    // Init constructor chain
    if( (self = Proto.construct(this, arguments, QuerySet)) && self ) {
      return self;
    }

    if( !this.hasOwn('table') ) {
      Object.defineProperty( this, 'table', {
        value: [],
        writable: true,
        enumerable: true
      });
    }

    // TODO: (IW) Sort by `this.opts('sort')` by default?
    this.sort( undefined, {silent: true} );

    this.constructor.trigger( 'new', this );
  }


  /*** Extend Proto.Collection ***/

  Proto.Collection.extend( QuerySet,

    // Class property definitions
    {
      options: {
        value: {},
        writable: true
      }
    },

    // Instance property definitions
    {
      count: {
        get: function () {
          return this.__collection__.count;
        },
        set: function ( count ) {
          this.__collection__.count = Proto.Utils.isUndefined(count) ? undefined : parseInt( count, 10 );
          this.length = count || 0;
        }
      },

      length: {
        get: function () {
          return this.table.length;
        },
        set: function ( len ) {
          this.table.length = len;
          return this.table.length;
        }
      },

      params: {
        value: function( obj, options ) {
          var args = Proto.Utils.copy( arguments ),
              params = this.__collection__.params,
              changes = {},
              opts, param;

          // No arguments: return current params
          if( Proto.Utils.isEmpty(args) ) {
            return params;
          }

          if( Proto.Utils.isString(args[0]) ) {
            // Return current value for param
            if( args.length === 1 ) {
              return params[args[0]];
            }

            // Convert param/value pair into an object
            obj = {};
            param = args[0];
            obj[param] = args[1];
            options = args[2];
          }

          opts = Proto.Utils.mixin( {silent: false}, options );

          Object.keys( obj ).forEach(function( param ) {
            if( !params[param] || params[param] !== obj[param] ) {

              changes[param] = Proto.Utils.copy( params[param] );
              params[param] = obj[param];

              if( !opts.silent ) {
                this.trigger( 'param', param, changes[param], Proto.Utils.copy(params[param]), opts );
              }
            }
          }, this);

          if( Object.keys( changes ).length ) {
            if( !opts.silent ) {
              this.trigger( 'params', changes, opts );

              // Reload the collection
              // this.clear().fetch();
            }
          }

          return this;
        }
      },

      row: {
        value: function( idx ) {
          var idx = parseInt( idx, 10 );

          return this.table[idx];
        }
      },

      copy: {
        value: function( idx, count, options ) {
          var idx = parseInt( idx, 10 ),
              count = count || 1,
              start = max( 0, idx ),
              end = start + min( this.length - start, count );

          return this.table.slice( start, end );
        }
      },

      paste: {
        value: function( idx, rows, options ) {
          var idx = parseInt( idx, 10 ),
              opts = Proto.Utils.mixin( {at: idx, replace: true}, options ),
              args = [idx, rows.length].concat( rows );

          return this.table.splice.apply( this.table, args );
        }
      },

      cut: {
        value: function( idx, count, options ) {
          var idx = parseInt( idx, 10 ),
              opts = Proto.Utils.mixin( options ),
              count = count || 1,
              end = idx + count,
              copy, i;

          copy = this.copy( idx, count, opts );

          for( i = 0; i < end; i++ ) {
            delete this.table[i];
          }

          return copy;
        }
      },

      filled: {
        value: function( idx, count ) {
          var idx = parseInt( idx, 10 ),
              count = parseInt( count, 10 ),
              end = idx + count,
              i;

          for( i = idx; i < end; i++ ) {
            if( Proto.Utils.isUndefined(this.table[i]) ) {
              return false;
            }
          }

          return true;
        }
      },

      // TODO: (IW) Merge this w/ cursor. Maybe stick it in the base Proto.Collection?
      // TODO: (IW) Rename 'table' to 'collection' in the following:
      pointer: {
        value: function( index ) {
          var args = Proto.Utils.copy( arguments );

          return this.bind(function() {
            var idx, data;

            if( args.length === 1 && Proto.Utils.isNumber(args[0]) ) {
              // Get pointer to current row index
              idx = args[0];
              data = this.row(idx);
            } else {
              data = this.first.apply( this, args );
              idx = Proto.Utils.isEmpty(data) ? -1 : this.indexOf(data);
            }

            return { table: this, index: idx, data: data };
          }, this);
        }
      },

      cursor: {
        value: function( index ) {
          var pointer = this.pointer.apply( this, arguments );

          return Object.create({}, {
            table: {
              get: function() {
                return pointer().table;
              }
            },

            data: {
              get: function() {
                return pointer().data;
              }
            },

            index: {
              get: function() {
                return pointer().index;
              }
            },

            prev: {
              value: function() {
                var ptr = pointer(),
                    prev = max( 0, ptr.index - 1 );
                pointer = ptr.table.pointer( prev );
                return this;
              }
            },

            next: {
              value: function() {
                var ptr = pointer(),
                    next = min( ptr.table.length, ptr.index + 1 );
                pointer = ptr.table.pointer( next );
                return this;
              }
            }
          });
        },
      },

      fetch: {
        value: function( params, options ) {
          var merged = Proto.Utils.mixin( {}, this.params(), params ),
              opts = Proto.Utils.mixin( {}, options );

          return Proto.Collection.prototype.fetch.call( this, merged, options ).then(
            this.bind(function (res) {
              console.log("QUERYSET FETCH SUCCESS", arguments);

              if( !Proto.Utils.isUndefined(res.count) ) {
                this.count = res.count;
              }
              if( !Proto.Utils.isEmpty(res.data) ) {
                this.paste( merged.offset || 0, this.get( res.data ), opts );
              }

              return res;
            }),
            this.bind(function (error) {
              console.log("QUERYSET FETCH FAIL", arguments);
              return error;
            })
          );
        },
        writable: true
      },

      clear: {
        value: function() {
          this.count = undefined;
          return Proto.Collection.prototype.clear.call( this );
        }
      },

      sort: {
        value: function( sort, options ) {
          var opts = Proto.Utils.mixin( {defer: true}, options ),
              param;

          // Override default Multisort.sort, passing an option to defer
          // the actual sorting. The actual sorting will be done by the server,
          // so all we need is the query param.
          Proto.Mixins.Multisort.prototype.sort.call( this, sort, opts );

          param = this.__sorter__.toString().split( Proto.Utils.RE.ish(',') );
          this.params( 'sort', param, options );

          this.trigger( 'sort.queryset', param );
          return this;
        }
      }
    }
  );


  /** Mixins ***/

  QuerySet.mixin( Proto.Mixins.Multisort, true );


  Proto.Collections.QuerySet = QuerySet;
  return QuerySet;
});