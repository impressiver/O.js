define(['proto', 'jquery'],
function ( Proto, $ ) {
  "use strict";

  var DOM, View,
      dom;


  // Proto DOM View
  // --------------

  function View( options ) {
    var self, el;

    if( (self = Proto.construct(this, arguments, View)) && self ) {
      return self;
    }

    if( !this.hasOwn('__view__') ) {
      Object.defineProperty( this, '__view__', {
        value: {
          iid: this.constructor.counter,
          el: undefined,
          children: [],
          context: {}
        }
      });
    }

    if( (el = this.opts('el')) ) {
      this.el = el;
    }

    this.constructor.trigger( 'new', this );
  }

  Proto.extend( View,
    // Class property definitions
    {
      options: {
        value: {
          el: undefined,
          template: undefined,
          tag: 'div',
          attrs: {
            'class': ['proto', 'proto-view'],
          },
          ui: {},
          data: {},
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
      }
    },

    // Instance property definitions
    {
      uid: {
        get: function() {
          return this.__view__.iid;
        }
      },

      context: {
        get: function() {
          return Proto.Utils.mixin( {}, this.opts('data'), this.__view__.context );
        },
        enumerable: true,
        configurable: true
      },

      el: {
        get: function() {
          var el = this.__view__.el;

          if( Proto.Utils.isUndefined(el) ) {
            el = this.el = dom.create( this.opts('tag') );
          }

          return el;
        },
        set: function( el ) {
          var $el = dom.$( el ),
              attrs = Proto.Utils.mixin( {}, this.opts('attrs'), true ),
              classes;

          if( Proto.Utils.isUndefined(el) ) {
            throw new Error( 'Invalid type. Undefined is not allowed as a vew element.' );
          }
          if( !$el.length ) {
            throw new Error( 'Invalid selector. Unable to determine element from \'' + el + '\'.' );
          }

          // Merge existing classes w/ added view classes
          classes = !Proto.Utils.isEmpty($el.attr('class')) ? $el.attr('class').split(/\s+/) : [];
          // Add opts classes
          if( Proto.Utils.isString(attrs.class) ) {
            classes = classes.concat( attrs.class.split(/\s+/) );
          } else {
            classes = classes.concat( attrs.class );
          }
          // Add instance id to classes
          classes.push( this.toString().toLowerCase().replace(/\s+/, '-') );
          attrs.class = classes.join(' ');

          // Store a ref in the view metadata
          this.__view__.el = $el.attr( attrs )[0];
        },
        enumerable: true
      },

      children: {
        get: function() {
          return this.__view__.children || [];
        },
        set: function( children ) {
          var current = this.__view__.children,
              i, len;

          if( !Proto.Utils.isArray(children) ) {
            throw new Error( 'Invalid type: Expected an array, but got \'' + (typeof children) + '\'.' );
          }

          // Stop and remove any existing child views
          if( (len = current.length) ) {
            for( i = 0; i < len; ++i ) {
              this.remove( current[i] );
            }
          }

          this.__view__.children = children;
        },
        configurable: true,
        enumerable: true
      },

      $el: {
        get: function() {
          return dom.$( this.el );
        },
        enumerable: true
      },

      $ui: {
        value: function( selector ) {
          var alias = this.opts('ui')[ selector ],
              ref = alias || selector;

          return dom.$( ref, this.$el );
        }
      },

      visible: {
        get: function() {
          var selector = this.opts( 'el' ) + ':visible',
              $el = dom.$( selector );

          return $el.length && ($el === this.$el);
        },
        set: function( show ) {
          var visible = !!show;

          if( visible === this.visible ) {
            return this;
          }

          this.$el.toggle(visible).toggleClass('hide', !visible).toggleClass('show', visible);

          this.trigger( 'visible', visible );
          return this.visible;
        }
      },

      toggle: {
        value: function( show, options ) {
          var args = Proto.Utils.args( arguments ),
              show = args.shift(),
              options = args.shift(),
              opts = Proto.Utils.mixin( {silent: false}, options ),
              toggle = (show === true) || !this.visible;

          if( this.visible === toggle ) {
            return this;
          }

          this.visible = toggle;

          this.trigger( 'toggle', toggle, opts );
          this.trigger( this.visible ? 'show' : 'hide', opts );
          return this;
        },
        writable: true
      },

      show: {
        value: function( options ) {
          var args = Proto.Utils.args( arguments ).unshift( true );
          return this.toggle.apply( this, args );
        },
        writable: true
      },

      hide: {
        value: function( options ) {
          var args = Proto.Utils.args( arguments ).unshift( false );
          return this.toggle.apply( this, args );
        },
        writable: true
      },

      render: {
        value: function( options ) {
          var opts = Proto.Utils.mixin( {silent: false}, options );

          if( !opts.silent ) {
            this.trigger( 'render', opts );
          }
          return this;
        }
      },

      refresh: {
        value: function( options ) {
          var opts = Proto.Utils.mixin( {silent: false}, options );

          if( !opts.silent ) {
            this.trigger( 'refresh', opts );
          }
          return this;
        }
      },

      start: {
        value: function( options ) {
          var opts = Proto.Utils.mixin( {silent: false}, options ),
              len = this.children.length,
              i, child;

          if( opts.show ) {
            this.show();
          }

          for( i = 0; i < len, child = this.children[i]; ++i ) {
            child.start( opts );
          }

          // TODO: (IW) Attach listeners

          if( !opts.silent ) {
            this.trigger( 'start', opts );
          }
          return this;
        }
      },

      stop: {
        value: function( options ) {
          var opts = Proto.Utils.mixin( {silent: false}, options ),
              len = this.children.length,
              i, child;

          // TODO: (IW) Detatch listeners

          for( i = 0; i < len, child = this.children[i]; ++i ) {
            child.stop( opts );
          }

          if( !opts.silent ) {
            this.trigger( 'stop', opts );
          }
          return this;
        }
      },

      /**
       * Attach this view to another view, or the first element matching a selector
       * @type {Object}
       */
      attach: {
        value: function( view, options ) {
          var args = Proto.Utils.args( arguments ),
              parent = args.shift(),
              opts = Proto.Utils.mixin( {render: true, show: true, silent: false}, args.shift() ),
              $elm;

          if( Proto.Utils.is(parent, View) ) {
            parent.append( this, opts );
            this.__view__.parent = parent;
          } else {
            $elm = dom.$( parent );

            if( !$elm.length ) {
              throw new Error('No elements found matching `' + parent + '`.' );
            }

            if( this.has('__view__.parent') ) {
              this.__view__.parent.remove( this );
              delete this.__view__.parent;
            }

            $elm.append( this.$el );
          }

          if( opts.render ) {
            this.render();
          }

          // TODO: (IW) Make optional?
          this.start( opts );

          if( !opts.silent ) {
            this.trigger( 'attach', elm, opts );
          }
          return this;
        },
        writable: true
      },

      /**
       * Stop this view and detatch the el from the DOM
       * @type {Object}
       */
      detatch: {
        value: function( options ) {
          var opts = Proto.Utils.mixin( {stop: true, silent: false}, args.shift() );

          if( opts.stop ) {
            this.stop( opts );
          }

          this.$el.detach();

          if( !opts.silent ) {
            this.trigger( 'detatch', opts );
          }
          return this;
        },
        writable: true
      },

      /**
       * Append a view to the children of this view. Optionally render/show the
       * child view.
       * @type {Object}
       */
      append: {
        value: function( view, options ) {
          var opts = Proto.Utils.mixin( {start: true, silent: false}, options ),
              $elm = !Proto.Utils.isEmpty( opts.to ) ? this.$ui( opts.to ) : this.$el;

          $elm.append( view.$el );
          this.children.push( view );

          if( opts.start ) {
            view.start();
          }

          if( !opts.silent ) {
            view.trigger( 'append', this, opts );
            this.trigger( 'append', view, opts );
          }
          return this;
        }
      },

      /**
       * Remove a child view.
       * @type {Object}
       */
      remove: {
        value: function( child, options ) {
          var opts = Proto.Utils.mixin( {stop: true, silent: false}, options ),
              idx = Proto.Utils.isUndefined(child) ? -1 : this.children.indexOf(child);

          if( !Proto.Utils.Objects.is(child, View) || idx === -1 || child === this ) {
            // TODO: (IW) Lookup child view from selector?
            console.log( "Couldn't find child view", child, this.children );
            return this;
          }

          child.detatch( opts );
          this.children.slice( idx, 1 );

          this.trigger( 'remove', child, opts );
          return this;
        },
        writable: true
      },

      toString: {
        value: function() {
          return this.constructor.classname + ' ' + this.uid;
        },
        writable: true
      }
    }
  );


  // Proto DOM
  // ---------

  function DOM( options ) {
    var self;

    if( (self = Proto.construct(this, arguments, DOM)) && self ) {
      return self;
    }
  }

  Proto.extend( DOM,
    // Class property definitions
    {
      singleton: {
        value: true,
        writable: true
      },

      options: {
        value: {
          api: $,
          doc: document,
          win: window,
          events: {}
        },
        writable: true
      },

      View: {
        value: View,
        writable: true
      },

      Views: {
        value: {},
        writable: true
      }
    },

    // Instance property definitions
    {
      $: {
        get: function() {
          return this.opts( 'api' );
        },
        enumerable: true
      },

      create: {
        value: function( tag ) {
          var doc = this.opts( 'doc' );

          return this.$( doc.createElement(tag) );
        }
      }
    }
  );

  DOM.mixin( Proto.Mixins.Events, true );


  /*** Augment Proto ***/

  Proto.define( 'DOM', {
    value: DOM
  });

  // Return the singleton instance
  return dom = DOM.new();
});