/**
 * pan.js v 0.2 2011-10-04
 * http://aino.com
 *
 * Copyright (c) 2011, Aino
 * Licensed under the MIT license.
 *
**/

/*global Pan:true */

(function(window) {

    var document = window.document,

        coords = function( e ) {

            var html = document.documentElement,
                get = function( e, lr ) {
                    var scr = 'scroll' + lr,
                        client = lr == 'Left' ? 'clientX' : 'clientY';
                    return e[client] + ( html[ scr ] ? html[ scr ] : document.body[ scr ] );
                };

            return 'touches' in e && e.touches.length ? {
                x: e.touches[0].pageX,
                y: e.touches[0].pageY
            } : {
                x: e.pageX || get( e, 'Left'),
                y: e.pageY || get( e, 'Top')
            };
        },

        dec = function( num ) {

            if ( typeof num != 'number' ) {
                num = num * 1;
            }

            var n = num.toFixed( 2 ) * 1;
            return Math.abs(n) > 0.2 ? n : 0;
        },

        M = Math,

        pf = parseFloat,

        pos,

        support = ( typeof document.documentElement.style.WebkitTransform !== 'undefined' ),

        touch = !!( 'ontouchstart' in document ),

        attach = !!( 'attachEvent' in document ),

        addEvent = function( elem, type, fn ) {
            if ( attach ) {
                elem.attachEvent( 'on' + type, fn );
            } else if ('addEventListener' in document) {
                elem.addEventListener( type, fn );
            }
        },

        removeEvent = function( elem, type, fn ) {
            if ( attach ) {
                elem.detachEvent( 'on' + type, fn );
            } else if ('removeEventListener' in document) {
                elem.removeEventListener( type, fn );
            }
        },

        retfalse = function() {
            return false;
        },

        getStyle = function( elem, m ) {
            if ( 'defaultView' in document ) {
                return document.defaultView.getComputedStyle(elem, '').getPropertyValue( m );
            } else if ( 'currentStyle' in elem ) {
                return elem.currentStyle[ m ];
            }
        },

        setStyle = function( elem, styles ) {
            for ( var prop in styles ) {
                elem.style[prop] = styles[ prop ];
            }
        },

        getWH = function( elem, m ) {

            var offset = 'offset' + m.substr(0,1).toUpperCase() + m.substr(1);

            if ( elem[ offset ] ) {
                return pf( elem[ offset ] );
            }
            return pf( getStyle( elem, m ) );
        },

        translate3d = function( elem, arr ) {
            arr = arr || [0,0,0];
            for ( var i in arr ) {
                arr[i] += 'px';
            }
            elem.style.WebkitTransform = 'translate3d(' + arr.join(',') + ')';
        };

    Pan = function( elem, options ) {

        options = options || {};

        var defaults = {
                mousemove: false,
                fps: 80,
                smoothness: 3.2
            },
            parent = elem.parentNode || window,
            move = false,
            decx = 0, decy = 0,
            x = pf( getStyle( elem, 'left' ) ) || 0,
            y = pf( getStyle( elem, 'top' ) ) || 0,
            dx = x, cx = x,
            dy = y, cy = y,
            minx = 0, miny = 0,
            mx, my, width, height,

            loop = function() {

                if ( touch || !options.mousemove ) {

                    decx = dec(( dx - cx ) / options.smoothness);
                    decy = dec(( dy - cy ) / options.smoothness);

                    if ( !move && (decx || decy) ) {
                        dx += decx;
                        dy += decy;
                        x = dx = M.min( 0, M.max( dx, minx ) );
                        y = dy = M.min( 0, M.max( dy, miny ) );
                    } else {
                        decx = 0;
                        decy = 0;
                    }
                }

                mx = dx - cx;
                my = dy - cy;

                cx += dec( mx / options.smoothness );
                cy += dec( my / options.smoothness );

                // round up
                if ( M.abs( mx ) < 0.8 ) {
                    cx = Math.round( cx );
                }

                if ( M.abs( my ) < 0.8 ) {
                    cy = Math.round( cy );
                }

                if ( cx || cy ) {
                    if ( support ) {
                        translate3d( elem, [ dec(cx), dec(cy), 0 ] );
                    } else {
                        elem.style.left = dec(cx) + 'px';
                        elem.style.top = dec(cy) + 'px';
                    }
                }
            },

            onresize = function() {
                width  = getWH( parent, 'width' );
                height = getWH( parent, 'height' );
                minx = ( getWH( elem, 'width' ) - width ) * -1;
                miny = ( getWH( elem, 'height' ) - height ) * -1;
            },

            tid = null,

            onmove = function(e) {
                if ( !move ) {
                    return;
                }

                try {
                    e.preventDefault();
                } catch(err) {
                    e.returnValue = false;
                }

                if ( e.touches && e.touches.length > 1 ) {
                    return;
                }

                pos = coords( e );

                if ( options.mousemove ) {
                    dx = x - M.abs( pos.x/width * minx );
                    dy = y - M.abs( pos.y/height * miny );
                } else {
                    dx = pos.x - x;
                    dy = pos.y - y;

                    if ( dx > 0 ) {
                        x = pos.x;
                    } else if ( dx < minx ) {
                        x = pos.x - minx;
                    }

                    if ( dy > 0 ) {
                        y = pos.y;
                    } else if ( dy < miny ) {
                        y = pos.y - miny;
                    }
                }
                dx = M.min( 0, M.max( dx, minx ) );
                dy = M.min( 0, M.max( dy, miny ) );
            },

            onstart = function(e) {

                try {
                    e.preventDefault();
                } catch(err) {
                    e.returnValue = false;
                }

                pos = coords( e );

                move = true;

                x = pos.x - x;
                y = pos.y - y;
                decx = 0;
                decy = 0;

                addEvent( document, 'mousemove', onmove );
                addEvent( document, 'touchmove', onmove );
            },

            onend = function() {
                move = false;
                x = dx;
                y = dy;
                removeEvent( document, 'mousemove', onmove );
                removeEvent( document, 'touchmove', onmove );
            },

            hasPixelEvent = false,
            delta = 0,

            onwheel = function(e) {

                // FF 3.6+
                if ( e.type == 'MozMousePixelScroll' ) {

                    hasPixelEvent = true;
                    delta = e.detail / -7;

                // other gecko
                } else if ( e.type == 'DOMMouseScroll' ) {
                    if ( hasPixelEvent ) {
                        removeEvent( e.currentTarget, e.type, arguments.callee );
                        e.preventDefault();
                        return false;
                    } else {
                        delta = e.detail * -3;
                    }

                // webkit + IE
                } else {
                    delta = e.wheelDelta / 18;
                }

                // webkit horizontal
                if ( 'wheelDeltaX' in e ) {
                    dx += e.wheelDeltaX / 18;
                }

                // firefox horizontal
                if ( 'HORIZONTAL_AXIS' in e && e.axis == e.HORIZONTAL_AXIS ) {
                    dx += delta;
                    return;
                }

                dy += delta;
            };

        for ( var d in defaults ) {
            options[d] = d in options ? options[d] : defaults[d];
        }

        if ( support ) {

            elem.style.left = 0;
            elem.style.top = 0;

            translate3d( elem, [x,y,0] );

            var images = elem.getElementsByTagName('img'),
                i=0;

            for(; images[i]; i++) {
                translate3d( images[i] );
            }
        }

        if ( getStyle( parent, 'position' ) == 'static' ) {
            setStyle( parent, { position: 'relative' } );
        }

        setStyle( elem, { position: 'absolute' } );

        if ( options.mousemove ) {

            move = true;
            options.smoothness *= 5;
            addEvent( document, 'mousemove', onmove );

        } else {

            addEvent( parent, 'mousedown', onstart );
            addEvent( parent, 'mouseup', onend );
            addEvent( parent, 'mouseout', onend );
            addEvent( parent, 'MozMousePixelScroll', onwheel );
            addEvent( parent, 'DOMMouseScroll', onwheel );
            addEvent( parent, 'mousewheel', onwheel );

        }

        addEvent( parent, 'touchstart', onstart );
        addEvent( parent, 'touchend', onend );

        addEvent( window, 'resize', onresize );

        onresize();

        // IE
        if ( attach ) {
            document.attachEvent('ondragstart', retfalse);
        }

        this.destroy = function() {
            window.clearInterval( tid );
            removeEvent( parent, 'mousedown', onstart );
            removeEvent( parent, 'touchstart', onstart );
            removeEvent( parent, 'mouseup', onend );
            removeEvent( parent, 'touchend', onend );
            removeEvent( parent, 'mouseout', onend );
            removeEvent( window, 'resize', onresize );
            removeEvent( parent, 'MozMousePixelScroll', onwheel );
            removeEvent( parent, 'DOMMouseScroll', onwheel );
            removeEvent( parent, 'mousewheel', onwheel );
            removeEvent( document, 'mousemove', onmove );

            if ( attach ) {
                document.detachEvent('ondragstart', retfalse);
            }
        };

        // GO
        tid = window.setInterval( loop, 1000/options.fps );
    };

}( this ));