define(['bndry', 'proto'],
function ( Bndry, Proto ) {
  "use strict";

  /**
  * Boundary Request/Response Encoders
  **/

  var BoundaryEncoder = Object.create( Object.prototype, {
    format: {
      value: 'Boundary'
    },

    encode: {
      value: function( src ) {
        var req = src.deflate ? src.deflate() : Proto.Utils.copy( src );

        if( !Proto.Utils.isEmpty(req.data) ) {
          // replace data object entirely because it has extra fields that WT might eventually barf on
          req.data = Bndry.Utils.Solr.filter( req.data );
        }

        // console.log("BOUNDARY ENCODER", src, req);
        return req;
      },
      enumerable: true
    },

    decode: {
      value: function( src ) {
        var res = Proto.Utils.copy( src ),
            i, len;

        // TODO: (IW) Make decode take 'recursive' opt?
        res = Proto.Utils.encoder( 'JS' ).decode( res );

        // if( res.results && Proto.Utils.isArray(res.results) ) {
        //   for( i = 0, len = res.results.length; i < len; i++ ) {
        //     res.results[i] = Proto.encoder( 'JS' ).decode( res.results[i] );
        //   }
        // }

        // Proto standardized response format
        if( !Proto.Utils.isUndefined(res.results) ) {
          if( !Proto.Utils.isUndefined(res.data) ) {
            throw new Error( 'Whoops. Cannot reformat API response. `data` property is already defined.' );
          }

          res.data = res.results;
          delete res.results;
        }

        if( !Proto.Utils.isUndefined(res.total) ) {
          if( !Proto.Utils.isUndefined(res.count) ) {
            throw new Error( 'Whoops. Cannot reformat API response. `count` property is already defined.' );
          }

          res.count = Proto.Utils.copy( res.total );
          delete res.total;
        }

        // console.log("BOUNDARY DECODER", src, res);
        return res;
      },
      enumerable: true
    }
  });


  /**
  * BoundaryAJAX: Proto AJAX storage adapter w/ Boundary sugar
  **/

  function BoundaryAJAX( options ) {
    var self;

    // Call Proto constructor to init constructor chain
    if( (self = Proto.construct(this, arguments, BoundaryAJAX)) && self ) {
      return self;
    }
  }


  /*** Extend Proto.Store ***/

  Proto.Store.Ajax.extend( BoundaryAJAX ).opts({
    ajax: Bndry.ajax,
    methods: {
      // update: 'POST'
    },
    encoder: BoundaryEncoder
  });

  return BoundaryAJAX;
});