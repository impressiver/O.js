define(['proto'],
function (Proto) {
  "use strict";

  var Comparator, Sorter, Multisort, MultisortArray;

  /**
  * Multisort Proto Mixin
  * -------------------------
  * Adds multi-sort to Proto objects
  **/

  function Comparator( prop, dir, options ) {
    var self, opts, compare;

    if( Proto.Utils.isEmpty(prop) ) {
      throw new Error( 'Sort property is required (e.g. "Comparator.new(\'title\', \'asc\')")' );
    }

    if ( (self = Proto.construct(this, [options], Comparator)) && self ) {
      return self;
    }

    compare = this.opts('comparator');

    this.property = prop;
    this.direction = dir || Comparator.RANK.ASC;

    if( Proto.Utils.isFunction(compare) ) {
      this.compare = comparator;
    }
  }

  Proto.extend( Comparator,
    // Class property definition
    {
      RANK: {
        value: Proto.Utils.define({
          ASC: {
            value: {
              key: 'asc',
              rank: 1
            },
            writable: true
          },

          DESC: {
            value: {
              key: 'desc',
              rank: -1
            },
            writable: true
          }
        }),
        writable: true,
        enumerable: true
      },

      options: {
        value: {},
        writable: true
      }
    },

    // Instance property definition
    {
      property: {
        value: undefined,
        writable: true,
        enumerable: true
      },

      direction: {
        get: function() {
          return this.dir;
        },
        set: function( dir ) {
          if( Proto.Utils.isNumber(dir) ) {
            return this.dir = (dir >= 1) ? Comparator.RANK.ASC : Comparator.RANK.DESC;
          }

          if( Proto.Utils.isString(dir) ) {
            return this.dir = (dir === Comparator.RANK.ASC.key) ? Comparator.RANK.ASC : Comparator.RANK.DESC;
          }
        },
        enumerable: true
      },

      toggle: {
        value: function( asc ) {
          return this.direction = ( (asc !== true) || (this.direction === Comparator.RANK.ASC) ) ? Comparator.RANK.DESC : Comparator.RANK.ASC;
        },
        writable: true
      },

      compare: {
        value: function( a, b ) {
          return a[this.property] === b[this.property] ? 0 : ((a[this.property] <= b[this.property]) ? -1 : 1) * this.direction.rank;
        },
        writable: true
      },

      toString: {
        value: function() {
          return [this.property, this.direction.key].join(' ');
        }
      }
    }
  );



  function Sorter( sort, options ) {
    var args = Proto.Utils.copy( arguments ),
        self, stack;

    if( !Proto.Utils.isString(sort) ) {
      args.shift();
      options = sort;
      sort = undefined;
    }

    if ( (self = Proto.construct(this, args, Sorter)) && self ) {
      return self;
    }

    sort = sort || this.opts('default');

    if( sort && (stack = this.parse(sort)) && stack.length ) {
      this.set( stack );
    }
  };

  Proto.extend( Sorter,
    // Class property definition
    {
      options: {
        value: {
          default: 'uid asc',
          multi: true
        },
        writable: true
      }
    },

    // Instance property definition
    {
      sort: {
        value: function( list, options ) {
          var opts = Proto.Utils.mixin( {}, this.opts(), options, true );
          console.log('SORTER SORT', list, options );
        }
      },

      parse: {
        value: function( sort ) {
          var stack, args;

          if( !Proto.Utils.isString(sort) ) {
            throw new Error( 'Invalid arguments. Parse accepts one string argument (e.g. "created desc, message asc, id desc").' )
          }

          stack = sort.split( Proto.Utils.RE.ish(',') ).map(function (pair) {
            args = pair.split( /\s+/ );

            // if( sortables.length && sortables.indexOf(args[0]) === -1 ) {
            //   throw new Error( '\'' + args[0] + '\' is not a sortable field (see: options.props.sortable).' );
            // }

            return Comparator.new.apply( Comparator, args );
          }, this);

          return stack;
        }
      },

      set: {
        value: function( comps ) {
          if( !Proto.Utils.isArray(comps) ) {
            throw new Error( 'Invalid argument. Sorter.set accepts an array of Comparators.' );
          }

          this.stack = comps;

          this.trigger( 'set.multisort', this.stack );
          return this;
        }
      },

      add: {
        value: function( comps, options ) {
          var opts = Proto.Utils.mixin( {}, options ),
              stack = this.stack,
              add = [],
              comp, idx, i;

          if( !Proto.Utils.isArray(comps) ) {
            comps = [comps];
          }

          for( i = 0; i < comps.length; i++ ) {
            comp = comps[i];

            this.remove( comp );
            add.push( comp );
          }

          if( Proto.Utils.isNumber(opts.at) ) {
            // Insert at given index
            idx = opts.at;
          } else if( opts.at === true ) {
            // Add to the top of the stack
            idx = 0;
          } else {
            // Add it to the bottom of the stack
            idx = stack.length;
          }

          args = [stack, idx, 0].concat( add );
          Array.prototype.splice.apply( stack, args );

          this.trigger( 'add.multisort', add, idx, opts );
          return this;
        }
      },

      remove: {
        value: function( comp ) {
          var stack = this.stack,
              idx = this.indexOf( comp );

          if( idx !== -1 ) {
            this.stack.slice( idx, 1 );
            this.trigger( 'remove.multisort', comp, idx );
          }

          return this;
        }
      },

      indexOf: {
        value: function( comp ) {
          var comp, prop;

          if( Proto.Utils.isString(comp) ) {
            prop = comp;
          } else {
            prop = comp.property;
          }

          for( i = 0, check = this.stack[i]; i < stack.length; ++i ) {
            if( check.property === prop ) {
              return i;
            }
          }

          return -1;
        }
      },

      toString: {
        value: function() {
          return this.stack.map(function (comp) {
            return comp.toString();
          }).join( ', ' );
        }
      }
    }
  );


  Multisort = {
    options: {
      sort: {
        default: 'uid asc'
      },
      writable: true
    },

    prototype: Object.create( null, {
      sort: {
        value: function( sort, options ) {
          var opts = Proto.Utils.mixin( {}, this.opts('sort'), options ),
              list = opts.list || this,
              stack;

          console.log('MULTISORT SORT', arguments);

          if( !this.has('__sorter__') ) {
            this.define({
              '__sorter__': {
                value: Sorter.new( sort, opts )
              }
            });
          }

          if( sort && (stack = this.__sorter__.parse(sort)) ) {
            this.__sorter__.set( stack );
          }

          if( !opts.defer ) {
            this.__sorter__.sort( list, opts );
          }

          this.trigger( 'sort.multisort', list, opts );
          return this;
        }
      }
    })
  };


  Proto.Mixins.Multisort = Multisort;
  return Multisort;
});