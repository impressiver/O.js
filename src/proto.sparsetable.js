define(['proto', 'lib/proto/proto.collection.queryset'],
function (Proto, Multisort) {
  "use strict";

  var min = Math.min,
      max = Math.max,
      floor = Math.floor,
      ceil = Math.ceil;


  function SparseTable( count, options ) {
    var args = Proto.Utils.copy( arguments ),
        count, self;

    if( Proto.Utils.isNumber(count) ) {
      args.shift();
    } else if( Proto.Utils.isObject(count) ) {
      options = count;
      count = undefined;
    }

    // Call Proto constructor to init constructor chain
    if( (self = Proto.construct(this, args, SparseTable)) && self ) {
      return self;
    }

    // Construct instance
    this.rows = this.opts('collection');
    this.count = count || this.opts('count');

    if ( this.opts('data') ) {
      this.paste( 0, this.opts('data') );
    }
  };

  Proto.extend( SparseTable, {}, {
    // TODO: (IW) Add methods for splicing new rows into/out of the table

    count: {
      get: function () {
        return this._count;
      },
      set: function ( count ) {
        this._count = count;
        this.length = count || 0;
      }
    },

    length: {
      get: function () {
        return this.rows.length;
      },
      set: function ( len ) {
        this.rows.length = len;
        return this.rows.length;
      }
    },

    update: {
      value: function( idx, rows, attr ) {
        // console.log('update', idx, rows, attr);

        var idx = parseInt( idx, 10 ),
            displaced = new SparseTable( rows.length ),
            added = new SparseTable( rows.length ),
            changed = new SparseTable( rows.length ),
            i;

        if( !_.isArray(rows) ) {
          rows = [rows];
        }

        // TODO: (IW) First check if there's an offset (e.g. row added/removed above the whole set)
        // Then, check for offsets to subsets in the for loop

        for( i in rows ) {
          i = parseInt( i, 10 );

          var fresh = rows[i],
              stale = this.rows[idx + i],
              changes = {},
              found, key;

          // Look for an existing row that matches the uid of the new data
          if( stale === undefined || (attr && stale[attr] !== fresh[attr]) ) {
            found = undefined;

            // Update existing rows by searching for a row w/ matching unique value
            if( attr ) {
              // Move the current row data to a temp table
              if( stale !== undefined ) {
                displaced.paste( idx + i, this.cut(idx + i) );
                stale = undefined;
              }

              // Search for a row w/ matching uid. First in this table, then in the temp table
              found = this.cursor( attr, fresh[attr] );
              if( found.index === undefined ) {
                found = displaced.cursor( attr, fresh[attr] );
              }

              // If a matching row was found, stick it in the new position
              if( found.index !== undefined ) {
                changes.index = found.index;
                stale = found.table.cut( found.index );
                this.paste( idx + i, stale );
              }
            }

            // No matching row found, short circuit the property update loop.
            if( stale === undefined ) {
              this.paste( idx + i, fresh );
              added.paste( idx + i, fresh );
              continue;
            }
          }

          // Check each property for changes in row data.
          for( key in fresh ) {
            if( !fresh.hasOwnProperty(key) ) {
              continue;
            }

            var value = fresh[key],
                old = stale.hasOwnProperty(key)? stale[key] : undefined;

            if( !_.isEqual(old, value) ) {
              changes[key] = old;
              stale[key] = value;
            }
          }

          // Return an array containing attributes that changed for each row
          if( !_.isEmpty(changes)) {
            changed.paste( idx + i, changes );
          }
        }

        return {
          changed: changed.rows,
          added: added.rows,
          removed: displaced.rows,
          total: _.reduce([changed.rows, added.rows, displaced.rows], function(memo, list) {
            return memo + _.compact(list).length;
          }, 0)
        };
      }
    },

    paste: {
      value: function( idx, rows ) {
        // console.log( 'paste', idx, rows );

        var idx = parseInt( idx, 10 ),
            i;

        if( !_.isArray(rows) ) {
          this.rows[idx] = rows;
          return;
        }

        for( i in rows ) {
          i = parseInt( i, 10 );
          this.rows[idx + i] = rows[i];
        }
      }
    },

    cut: {
      value: function( idx, count ) {
        // console.log( 'cut', this, idx, count );

        var idx = parseInt( idx, 10 ),
            count = count || 1,
            cut = [],
            i;

        if( count === 1 ) {
          cut = this.rows[idx];
          this.rows[idx] = undefined;
          return cut;
        }

        for( i = idx; i < idx + count; i++ ) {
          cut.push(this.rows[i]);
          this.rows[idx] = undefined;
        }

        return cut;
      }
    },

    clear: {
      value: function() {
        // console.log( 'clear', this );
        this.count = undefined;
      }
    },

    copy: {
      value: function( idx, count ) {
        var idx = parseInt( idx, 10 ),
            count = count || 1,
            start = max( 0, idx ),
            end = start + min( this.length - start, count );

        return this.rows.slice( start, end );
      }
    },

    row: {
      value: function( idx ) {
        var idx = parseInt( idx, 10 );

        return this.rows[idx];
      }
    },

    contains: {
      value: function( idx, count ) {
        var idx = parseInt( idx, 10 ),
            i;

        for( i = idx; i < idx + count; i++ ) {
          if( this.rows[i] === undefined ) {
            return false;
          }
        }

        return true;
      }
    },

    // TODO: (IW) Merge this w/ cursor
    pointer: {
      value: function( attr, value ) {
        return _.bind(function() {
          var i, index, data;

          if( Proto.Utils.isNumber(attr) ) {
            // Get pointer to current row index
            index = attr;
            data = this.row(attr);
          } else {
            // Get pointer to first row that matches prop/value
            for( i = 0; i < this.length; i++ ) {
              if( this.rows[i] === undefined || !this.rows[i].hasOwnProperty(attr) ) {
                continue;
              }

              if( this.rows[i][attr] === value ) {
                index = i;
                data = this.row(i);
                break;
              }
            }
          }

          return { table: this, index: index, data: data };
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
      }
    }
  });

  return SparseTable;
});