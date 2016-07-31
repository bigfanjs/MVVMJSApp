const
  create = Object.create,
  assign = Object.assign;

const count = Symbol('count');
window[ count ] = 0;

const
  Model = {
    author: '',
    title: '',
    url: '',
    setup( options = {} ) {
      if ( !_.isObject( options ) )
        options = {};

      const
        model = create( this );

      Object.defineProperty(
        model,
        'subscribers',
        {
          value: [],
          enumerable: false
        }
      );

      model.attrs = Object.keys( JSON.parse( JSON.stringify( this ) ) );

      assign( model, options );

      const
        set = function ( target, key, val, context ) {
          Reflect.set( ...arguments );

          model.subscribers.forEach(viewModel => {  
            viewModel.notify( key, val, viewModel[ Symbol.for('ID') ] );
          });

          return true;
        },
        handler = { set },
        proxy = new Proxy( model, handler );

      return proxy;
    },
    fetch( resolve, rej ) {
      jQuery.get(`api/blogs/${ this._id || '' }`, res => {
        res.forEach(( obj, idx ) => {
          assign( this, obj );
          resolve( obj );
        });   
      });
    },
    save( res, rej ) {
      jQuery.ajax({
        type: this._id ? 'PUT' : 'POST',
        url: `api/blogs/${ ( this._id || '' ) }`,
        data: JSON.stringify( this ),
        dataType: 'json',
        contentType: 'application/json',
        success: res,
        error: rej
      });

      return this;
    },
    destroy( res, rej ) {
      jQuery.ajax({
        type: 'DELETE',
        url: `/api/blogs/${ this._id }`,
        dataType: 'json',
        success: res,
        error: rej
      });
    },
    addSubscriber( viewModel ) {
      this.subscribers.push( viewModel );
      return this;
    }
  };

const
  ViewModel = {
    updateForm: false,
    model: Model.setup(),
    setup( options = {} ) {
      const
        viewModel = create( this ),
        ID = Symbol.for('ID');

      viewModel[ ID ] = window[ count ]++;
      viewModel.views = [];

      if ( options.model == null )
        viewModel.model = Model.setup();

      assign( viewModel, options );

      const model = viewModel.model;

      if ( Model.isPrototypeOf( model ) )
        model.addSubscriber( viewModel );

      const
        get = function ( target, key, ctx ) {
          var obj;

          if ( viewModel && typeof viewModel[ key ] !== 'function'
                && model.attrs.includes( key ) && ( model && model[ key ] )
            ) {
              obj = Reflect.get( model, key );
          } else {
            obj = Reflect.get( ...arguments );
          }

          return obj;
        },
        set = function ( target, key, value, ctx ) {

          if ( !model.attrs.includes( key ) ) {
            Reflect.set( ...arguments );
          } else {
            if ( viewModel.updateForm == false ) {
              Reflect.set( model, key, value );
            } else {
              const hypermedia = viewModel.hypermedia || [];

              for ( let i = 0; i < hypermedia.length; i ++ ) {
                const
                  input = hypermedia[ i ],
                  binding = $( input ).attr('data-bind'),
                  obj = JSON.parse(`{${ binding }}`);

                if ( key == obj.val ) {
                  input.value = value;
                  break;
                }
              }
            }
          }

        },
        handlers = { get, set },
        proxy = new Proxy( viewModel, handlers );

      viewModel.registerEvents = this.eventHandler.bind(proxy, 'ON');
      viewModel.unregisterEvents = this.eventHandler.bind(proxy, 'OFF');

      return proxy;
    },
    populate: function populate( selector, original = true ) {
      var wrappers = [];

      const
        fields = $( selector ).find('[data-bind]'),
        isTemplate = $( selector )[ 0 ].type == 'text/template',
        isBoolean = typeof original === 'boolean',
        isWrapper = selector => {
          const rege = /^template:\s?{\s"(?:name|data)":\s"(?:\S+)"\s?}$/gi;
          return rege.test( $( selector ).attr('data-bind') );
        };

      $( selector ).each(( idx, field ) => {
        if ( isWrapper( field ) ) wrappers.push( field );
      });

      fields.each(( idx, field ) => {
        if ( isWrapper( field ) ) wrappers.push( field );
      });

      if ( wrappers.length && isBoolean && !isTemplate ) {

        wrappers.forEach(wrapper => {
          let
            value = $( wrapper ).attr('data-bind'),
            html, length, view;

          const
            rege = /{[\s\S]*}$/i,
            obj = JSON.parse( value.match( rege ) );

          $( wrapper ).append( html = this.render( obj.name ) );

          if ( ( length = $( html ).length ) > 1 ) {
            view = $( wrapper ).children().slice( -length );
          } else {
            view = $( wrapper ).children().last();
          }

          if ( original == true ) {
            this.views.push( view );
            this.idx = 'v' + this.views.indexOf( view );
          }

          this.populate( view, false );
        });
      } else if ( typeof selector === 'string' && isTemplate ) {
        const
          template = selector,
          html = this.render( template ),
          view = this.views[ this.idx.substr( 1 ) ];

        let newHtml;

        if ( view.length == 1 ) {
          newHtml = $( html ).replaceAll( view[ 0 ] );
        } else if ( view.length > 1 ) {
          const elem = view.last();
          newHtml = ( html ).insertAfter( elem[ 0 ] );
          view.remove();
        }

        this.views[ this.idx.substr( 1 ) ] = newHtml;
        this.populate( newHtml );
      } else {
        const fields = $( selector ).find('[data-bind]');

        fields.each(( idx, field ) => {
          const
            rege = /^"(?:ev|action|val)":\s?"(?:\S+)"/gi,
            value = $( field ).attr('data-bind');

          if ( rege.test( value ) ) {
            const obj = JSON.parse(`{${ value }}`);

            this.hypermedia.push( field );

            if ( obj.hasOwnProperty('val') )
              field.value = this.model[ obj.val ];
          }
        });
      }
    },
    apply( selector = 'body', template ) {
      if ( typeof selector !== 'string' && ( selector[ 0 ] && selector[ 0 ].nodeType != 1 ) )
        selector = 'body';

      this.unregisterEvents().hypermedia = [];
      this.populate( selector, template );
      this.registerEvents();

      return this;
    },
    render( template ) {
      const
        compiler = _.template( $( template ).html() ),
        html = compiler( this.model );

      return html;
    },
    eventHandler( toggle ) {
      const hypermedia = this.hypermedia || [];

      if ( !hypermedia.length )
        return this;

      hypermedia.forEach(input => {
        let
          callback = null,
          events;

        const
          value = $( input ).attr('data-bind'),
          obj = JSON.parse(`{${ value }}`),
          event = obj.ev;

        if ( ( toggle = toggle.toLowerCase() ) === 'on' ) {
          callback = () => {
            return this.handle( event, obj.action );
          };
        }

        if ( event != null ) {
          if ( typeof event === 'string' ) {
            $( input )[ toggle ]( event, callback );
          } else if ( Array.isArray( events = event ) ) {
            events.forEach(event => {
              $( input )[ toggle ]( event, callback );
            });
          }
        } else if ( event == null && ( obj.val != null && input.type == 'text' ) ) {
          $( input )[ toggle ]('change', () => {
            this[ obj.val ] = input.value;
          });
        }

      });

      return this;
    },
    handle( event, action ) {
      switch ( action ) {
        case 'add':
          this.add();
          break;
        case 'edit':
          this.edit();
          break;
        case 'delete':
          this.delete();
          break;
        case 'update':
          this.update();
          break;
        case 'cancel':
          this.cancel();
          break;
      }
    },
    add() {
      this.updateForm = true;

      const
        model = Model.setup({
          author: this.author,
          title: this.title,
          url: this.url
        });

      model.save(
        obj => {
          ViewModel.setup({ model: assign( model, obj ) }).apply('.blogs-list');
          console.log('correctly saved!');
        },
        () => { console.log('error: not saved!'); }
      );

      this.author = this.title = this.url = '';

      this.updateForm = false;
    },
    edit() {
      const obj = this.pre = {};

      ({
        author: obj.author,
        title: obj.title,
        url: obj.url
      } = this.model);

      this.apply('.blog-editor-template');
    },
    update() {
      this.apply('.blog-list-template');
      this.model.save(
        () => { console.log('Correctly updated!'); },
        () => { console.log('Error: not updated!'); }
      );
    },
    delete() {
      $( this.views[ this.idx.substr( 1 ) ] ).remove();
      this.model.destroy(
        () => { console.log('correctly deleted!'); },
        () => { console.log('error: not deleted!') }
      );
    },
    cancel() {
      assign( this.model, this.pre );
      this.apply('.blog-list-template');
    },
    notify( key, val, id ) {
      if ( id == this[ Symbol.for('ID') ] ) return;

      this.views.forEach(view => {
        view.find( key ).html( val );
      });
    }
  };

  $( document ).ready(function () {
    Model.fetch(( res ) => {
      const model = Model.setup( res );
      ViewModel.setup({ model }).apply('.blogs-list');
    });

    ViewModel.setup().apply('.blogs-actions');
  });