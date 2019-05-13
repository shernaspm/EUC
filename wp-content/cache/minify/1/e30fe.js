( function( $ ) {

	'use strict';

	if ( typeof wpcf7 === 'undefined' || wpcf7 === null ) {
		return;
	}

	wpcf7 = $.extend( {
		cached: 0,
		inputs: []
	}, wpcf7 );

	$( function() {
		wpcf7.supportHtml5 = ( function() {
			var features = {};
			var input = document.createElement( 'input' );

			features.placeholder = 'placeholder' in input;

			var inputTypes = [ 'email', 'url', 'tel', 'number', 'range', 'date' ];

			$.each( inputTypes, function( index, value ) {
				input.setAttribute( 'type', value );
				features[ value ] = input.type !== 'text';
			} );

			return features;
		} )();

		$( 'div.wpcf7 > form' ).each( function() {
			var $form = $( this );
			wpcf7.initForm( $form );

			if ( wpcf7.cached ) {
				wpcf7.refill( $form );
			}
		} );
	} );

	wpcf7.getId = function( form ) {
		return parseInt( $( 'input[name="_wpcf7"]', form ).val(), 10 );
	};

	wpcf7.initForm = function( form ) {
		var $form = $( form );

		$form.submit( function( event ) {
			if ( ! wpcf7.supportHtml5.placeholder ) {
				$( '[placeholder].placeheld', $form ).each( function( i, n ) {
					$( n ).val( '' ).removeClass( 'placeheld' );
				} );
			}

			if ( typeof window.FormData === 'function' ) {
				wpcf7.submit( $form );
				event.preventDefault();
			}
		} );

		$( '.wpcf7-submit', $form ).after( '<span class="ajax-loader"></span>' );

		wpcf7.toggleSubmit( $form );

		$form.on( 'click', '.wpcf7-acceptance', function() {
			wpcf7.toggleSubmit( $form );
		} );

		// Exclusive Checkbox
		$( '.wpcf7-exclusive-checkbox', $form ).on( 'click', 'input:checkbox', function() {
			var name = $( this ).attr( 'name' );
			$form.find( 'input:checkbox[name="' + name + '"]' ).not( this ).prop( 'checked', false );
		} );

		// Free Text Option for Checkboxes and Radio Buttons
		$( '.wpcf7-list-item.has-free-text', $form ).each( function() {
			var $freetext = $( ':input.wpcf7-free-text', this );
			var $wrap = $( this ).closest( '.wpcf7-form-control' );

			if ( $( ':checkbox, :radio', this ).is( ':checked' ) ) {
				$freetext.prop( 'disabled', false );
			} else {
				$freetext.prop( 'disabled', true );
			}

			$wrap.on( 'change', ':checkbox, :radio', function() {
				var $cb = $( '.has-free-text', $wrap ).find( ':checkbox, :radio' );

				if ( $cb.is( ':checked' ) ) {
					$freetext.prop( 'disabled', false ).focus();
				} else {
					$freetext.prop( 'disabled', true );
				}
			} );
		} );

		// Placeholder Fallback
		if ( ! wpcf7.supportHtml5.placeholder ) {
			$( '[placeholder]', $form ).each( function() {
				$( this ).val( $( this ).attr( 'placeholder' ) );
				$( this ).addClass( 'placeheld' );

				$( this ).focus( function() {
					if ( $( this ).hasClass( 'placeheld' ) ) {
						$( this ).val( '' ).removeClass( 'placeheld' );
					}
				} );

				$( this ).blur( function() {
					if ( '' === $( this ).val() ) {
						$( this ).val( $( this ).attr( 'placeholder' ) );
						$( this ).addClass( 'placeheld' );
					}
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.date ) {
			$form.find( 'input.wpcf7-date[type="date"]' ).each( function() {
				$( this ).datepicker( {
					dateFormat: 'yy-mm-dd',
					minDate: new Date( $( this ).attr( 'min' ) ),
					maxDate: new Date( $( this ).attr( 'max' ) )
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.number ) {
			$form.find( 'input.wpcf7-number[type="number"]' ).each( function() {
				$( this ).spinner( {
					min: $( this ).attr( 'min' ),
					max: $( this ).attr( 'max' ),
					step: $( this ).attr( 'step' )
				} );
			} );
		}

		// Character Count
		$( '.wpcf7-character-count', $form ).each( function() {
			var $count = $( this );
			var name = $count.attr( 'data-target-name' );
			var down = $count.hasClass( 'down' );
			var starting = parseInt( $count.attr( 'data-starting-value' ), 10 );
			var maximum = parseInt( $count.attr( 'data-maximum-value' ), 10 );
			var minimum = parseInt( $count.attr( 'data-minimum-value' ), 10 );

			var updateCount = function( target ) {
				var $target = $( target );
				var length = $target.val().length;
				var count = down ? starting - length : length;
				$count.attr( 'data-current-value', count );
				$count.text( count );

				if ( maximum && maximum < length ) {
					$count.addClass( 'too-long' );
				} else {
					$count.removeClass( 'too-long' );
				}

				if ( minimum && length < minimum ) {
					$count.addClass( 'too-short' );
				} else {
					$count.removeClass( 'too-short' );
				}
			};

			$( ':input[name="' + name + '"]', $form ).each( function() {
				updateCount( this );

				$( this ).keyup( function() {
					updateCount( this );
				} );
			} );
		} );

		// URL Input Correction
		$form.on( 'change', '.wpcf7-validates-as-url', function() {
			var val = $.trim( $( this ).val() );

			if ( val
			&& ! val.match( /^[a-z][a-z0-9.+-]*:/i )
			&& -1 !== val.indexOf( '.' ) ) {
				val = val.replace( /^\/+/, '' );
				val = 'http://' + val;
			}

			$( this ).val( val );
		} );
	};

	wpcf7.submit = function( form ) {
		if ( typeof window.FormData !== 'function' ) {
			return;
		}

		var $form = $( form );

		$( '.ajax-loader', $form ).addClass( 'is-active' );

		wpcf7.clearResponse( $form );

		var formData = new FormData( $form.get( 0 ) );

		var detail = {
			id: $form.closest( 'div.wpcf7' ).attr( 'id' ),
			status: 'init',
			inputs: [],
			formData: formData
		};

		$.each( $form.serializeArray(), function( i, field ) {
			if ( '_wpcf7' == field.name ) {
				detail.contactFormId = field.value;
			} else if ( '_wpcf7_version' == field.name ) {
				detail.pluginVersion = field.value;
			} else if ( '_wpcf7_locale' == field.name ) {
				detail.contactFormLocale = field.value;
			} else if ( '_wpcf7_unit_tag' == field.name ) {
				detail.unitTag = field.value;
			} else if ( '_wpcf7_container_post' == field.name ) {
				detail.containerPostId = field.value;
			} else if ( field.name.match( /^_wpcf7_\w+_free_text_/ ) ) {
				var owner = field.name.replace( /^_wpcf7_\w+_free_text_/, '' );
				detail.inputs.push( {
					name: owner + '-free-text',
					value: field.value
				} );
			} else if ( field.name.match( /^_/ ) ) {
				// do nothing
			} else {
				detail.inputs.push( field );
			}
		} );

		wpcf7.triggerEvent( $form.closest( 'div.wpcf7' ), 'beforesubmit', detail );

		var ajaxSuccess = function( data, status, xhr, $form ) {
			detail.id = $( data.into ).attr( 'id' );
			detail.status = data.status;
			detail.apiResponse = data;

			var $message = $( '.wpcf7-response-output', $form );

			switch ( data.status ) {
				case 'validation_failed':
					$.each( data.invalidFields, function( i, n ) {
						$( n.into, $form ).each( function() {
							wpcf7.notValidTip( this, n.message );
							$( '.wpcf7-form-control', this ).addClass( 'wpcf7-not-valid' );
							$( '[aria-invalid]', this ).attr( 'aria-invalid', 'true' );
						} );
					} );

					$message.addClass( 'wpcf7-validation-errors' );
					$form.addClass( 'invalid' );

					wpcf7.triggerEvent( data.into, 'invalid', detail );
					break;
				case 'acceptance_missing':
					$message.addClass( 'wpcf7-acceptance-missing' );
					$form.addClass( 'unaccepted' );

					wpcf7.triggerEvent( data.into, 'unaccepted', detail );
					break;
				case 'spam':
					$message.addClass( 'wpcf7-spam-blocked' );
					$form.addClass( 'spam' );

					wpcf7.triggerEvent( data.into, 'spam', detail );
					break;
				case 'aborted':
					$message.addClass( 'wpcf7-aborted' );
					$form.addClass( 'aborted' );

					wpcf7.triggerEvent( data.into, 'aborted', detail );
					break;
				case 'mail_sent':
					$message.addClass( 'wpcf7-mail-sent-ok' );
					$form.addClass( 'sent' );

					wpcf7.triggerEvent( data.into, 'mailsent', detail );
					break;
				case 'mail_failed':
					$message.addClass( 'wpcf7-mail-sent-ng' );
					$form.addClass( 'failed' );

					wpcf7.triggerEvent( data.into, 'mailfailed', detail );
					break;
				default:
					var customStatusClass = 'custom-'
						+ data.status.replace( /[^0-9a-z]+/i, '-' );
					$message.addClass( 'wpcf7-' + customStatusClass );
					$form.addClass( customStatusClass );
			}

			wpcf7.refill( $form, data );

			wpcf7.triggerEvent( data.into, 'submit', detail );

			if ( 'mail_sent' == data.status ) {
				$form.each( function() {
					this.reset();
				} );

				wpcf7.toggleSubmit( $form );
			}

			if ( ! wpcf7.supportHtml5.placeholder ) {
				$form.find( '[placeholder].placeheld' ).each( function( i, n ) {
					$( n ).val( $( n ).attr( 'placeholder' ) );
				} );
			}

			$message.html( '' ).append( data.message ).slideDown( 'fast' );
			$message.attr( 'role', 'alert' );

			$( '.screen-reader-response', $form.closest( '.wpcf7' ) ).each( function() {
				var $response = $( this );
				$response.html( '' ).attr( 'role', '' ).append( data.message );

				if ( data.invalidFields ) {
					var $invalids = $( '<ul></ul>' );

					$.each( data.invalidFields, function( i, n ) {
						if ( n.idref ) {
							var $li = $( '<li></li>' ).append( $( '<a></a>' ).attr( 'href', '#' + n.idref ).append( n.message ) );
						} else {
							var $li = $( '<li></li>' ).append( n.message );
						}

						$invalids.append( $li );
					} );

					$response.append( $invalids );
				}

				$response.attr( 'role', 'alert' ).focus();
			} );
		};

		$.ajax( {
			type: 'POST',
			url: wpcf7.apiSettings.getRoute(
				'/contact-forms/' + wpcf7.getId( $form ) + '/feedback' ),
			data: formData,
			dataType: 'json',
			processData: false,
			contentType: false
		} ).done( function( data, status, xhr ) {
			ajaxSuccess( data, status, xhr, $form );
			$( '.ajax-loader', $form ).removeClass( 'is-active' );
		} ).fail( function( xhr, status, error ) {
			var $e = $( '<div class="ajax-error"></div>' ).text( error.message );
			$form.after( $e );
		} );
	};

	wpcf7.triggerEvent = function( target, name, detail ) {
		var $target = $( target );

		/* DOM event */
		var event = new CustomEvent( 'wpcf7' + name, {
			bubbles: true,
			detail: detail
		} );

		$target.get( 0 ).dispatchEvent( event );

		/* jQuery event */
		$target.trigger( 'wpcf7:' + name, detail );
		$target.trigger( name + '.wpcf7', detail ); // deprecated
	};

	wpcf7.toggleSubmit = function( form, state ) {
		var $form = $( form );
		var $submit = $( 'input:submit', $form );

		if ( typeof state !== 'undefined' ) {
			$submit.prop( 'disabled', ! state );
			return;
		}

		if ( $form.hasClass( 'wpcf7-acceptance-as-validation' ) ) {
			return;
		}

		$submit.prop( 'disabled', false );

		$( '.wpcf7-acceptance', $form ).each( function() {
			var $span = $( this );
			var $input = $( 'input:checkbox', $span );

			if ( ! $span.hasClass( 'optional' ) ) {
				if ( $span.hasClass( 'invert' ) && $input.is( ':checked' )
				|| ! $span.hasClass( 'invert' ) && ! $input.is( ':checked' ) ) {
					$submit.prop( 'disabled', true );
					return false;
				}
			}
		} );
	};

	wpcf7.notValidTip = function( target, message ) {
		var $target = $( target );
		$( '.wpcf7-not-valid-tip', $target ).remove();
		$( '<span role="alert" class="wpcf7-not-valid-tip"></span>' )
			.text( message ).appendTo( $target );

		if ( $target.is( '.use-floating-validation-tip *' ) ) {
			var fadeOut = function( target ) {
				$( target ).not( ':hidden' ).animate( {
					opacity: 0
				}, 'fast', function() {
					$( this ).css( { 'z-index': -100 } );
				} );
			};

			$target.on( 'mouseover', '.wpcf7-not-valid-tip', function() {
				fadeOut( this );
			} );

			$target.on( 'focus', ':input', function() {
				fadeOut( $( '.wpcf7-not-valid-tip', $target ) );
			} );
		}
	};

	wpcf7.refill = function( form, data ) {
		var $form = $( form );

		var refillCaptcha = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( 'img.wpcf7-captcha-' + i ).attr( 'src', n );
				var match = /([0-9]+)\.(png|gif|jpeg)$/.exec( n );
				$form.find( 'input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]' ).attr( 'value', match[ 1 ] );
			} );
		};

		var refillQuiz = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( ':input[name="' + i + '"]' ).siblings( 'span.wpcf7-quiz-label' ).text( n[ 0 ] );
				$form.find( 'input:hidden[name="_wpcf7_quiz_answer_' + i + '"]' ).attr( 'value', n[ 1 ] );
			} );
		};

		if ( typeof data === 'undefined' ) {
			$.ajax( {
				type: 'GET',
				url: wpcf7.apiSettings.getRoute(
					'/contact-forms/' + wpcf7.getId( $form ) + '/refill' ),
				beforeSend: function( xhr ) {
					var nonce = $form.find( ':input[name="_wpnonce"]' ).val();

					if ( nonce ) {
						xhr.setRequestHeader( 'X-WP-Nonce', nonce );
					}
				},
				dataType: 'json'
			} ).done( function( data, status, xhr ) {
				if ( data.captcha ) {
					refillCaptcha( $form, data.captcha );
				}

				if ( data.quiz ) {
					refillQuiz( $form, data.quiz );
				}
			} );

		} else {
			if ( data.captcha ) {
				refillCaptcha( $form, data.captcha );
			}

			if ( data.quiz ) {
				refillQuiz( $form, data.quiz );
			}
		}
	};

	wpcf7.clearResponse = function( form ) {
		var $form = $( form );
		$form.removeClass( 'invalid spam sent failed' );
		$form.siblings( '.screen-reader-response' ).html( '' ).attr( 'role', '' );

		$( '.wpcf7-not-valid-tip', $form ).remove();
		$( '[aria-invalid]', $form ).attr( 'aria-invalid', 'false' );
		$( '.wpcf7-form-control', $form ).removeClass( 'wpcf7-not-valid' );

		$( '.wpcf7-response-output', $form )
			.hide().empty().removeAttr( 'role' )
			.removeClass( 'wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked' );
	};

	wpcf7.apiSettings.getRoute = function( path ) {
		var url = wpcf7.apiSettings.root;

		url = url.replace(
			wpcf7.apiSettings.namespace,
			wpcf7.apiSettings.namespace + path );

		return url;
	};

} )( jQuery );

/*
 * Polyfill for Internet Explorer
 * See https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
 */
( function () {
	if ( typeof window.CustomEvent === "function" ) return false;

	function CustomEvent ( event, params ) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event,
			params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
} )();

;/*!
	Zoom 1.7.21
	license: MIT
	http://www.jacklmoore.com/zoom
*/
(function(o){var t={url:!1,callback:!1,target:!1,duration:120,on:"mouseover",touch:!0,onZoomIn:!1,onZoomOut:!1,magnify:1};o.zoom=function(t,n,e,i){var u,c,a,r,m,l,s,f=o(t),h=f.css("position"),d=o(n);return t.style.position=/(absolute|fixed)/.test(h)?h:"relative",t.style.overflow="hidden",e.style.width=e.style.height="",o(e).addClass("zoomImg").css({position:"absolute",top:0,left:0,opacity:0,width:e.width*i,height:e.height*i,border:"none",maxWidth:"none",maxHeight:"none"}).appendTo(t),{init:function(){c=f.outerWidth(),u=f.outerHeight(),n===t?(r=c,a=u):(r=d.outerWidth(),a=d.outerHeight()),m=(e.width-c)/r,l=(e.height-u)/a,s=d.offset()},move:function(o){var t=o.pageX-s.left,n=o.pageY-s.top;n=Math.max(Math.min(n,a),0),t=Math.max(Math.min(t,r),0),e.style.left=t*-m+"px",e.style.top=n*-l+"px"}}},o.fn.zoom=function(n){return this.each(function(){var e=o.extend({},t,n||{}),i=e.target&&o(e.target)[0]||this,u=this,c=o(u),a=document.createElement("img"),r=o(a),m="mousemove.zoom",l=!1,s=!1;if(!e.url){var f=u.querySelector("img");if(f&&(e.url=f.getAttribute("data-src")||f.currentSrc||f.src),!e.url)return}c.one("zoom.destroy",function(o,t){c.off(".zoom"),i.style.position=o,i.style.overflow=t,a.onload=null,r.remove()}.bind(this,i.style.position,i.style.overflow)),a.onload=function(){function t(t){f.init(),f.move(t),r.stop().fadeTo(o.support.opacity?e.duration:0,1,o.isFunction(e.onZoomIn)?e.onZoomIn.call(a):!1)}function n(){r.stop().fadeTo(e.duration,0,o.isFunction(e.onZoomOut)?e.onZoomOut.call(a):!1)}var f=o.zoom(i,u,a,e.magnify);"grab"===e.on?c.on("mousedown.zoom",function(e){1===e.which&&(o(document).one("mouseup.zoom",function(){n(),o(document).off(m,f.move)}),t(e),o(document).on(m,f.move),e.preventDefault())}):"click"===e.on?c.on("click.zoom",function(e){return l?void 0:(l=!0,t(e),o(document).on(m,f.move),o(document).one("click.zoom",function(){n(),l=!1,o(document).off(m,f.move)}),!1)}):"toggle"===e.on?c.on("click.zoom",function(o){l?n():t(o),l=!l}):"mouseover"===e.on&&(f.init(),c.on("mouseenter.zoom",t).on("mouseleave.zoom",n).on(m,f.move)),e.touch&&c.on("touchstart.zoom",function(o){o.preventDefault(),s?(s=!1,n()):(s=!0,t(o.originalEvent.touches[0]||o.originalEvent.changedTouches[0]))}).on("touchmove.zoom",function(o){o.preventDefault(),f.move(o.originalEvent.touches[0]||o.originalEvent.changedTouches[0])}).on("touchend.zoom",function(o){o.preventDefault(),s&&(s=!1,n())}),o.isFunction(e.callback)&&e.callback.call(a)},a.setAttribute("role","presentation"),a.alt="",a.src=e.url})},o.fn.zoom.defaults=t})(window.jQuery);
;/*
 * jQuery FlexSlider v2.2.2
 * Copyright 2012 WooThemes
 * Contributing Author: Tyler Smith
 */
!function(a){a.flexslider=function(b,c){var d=a(b);d.vars=a.extend({},a.flexslider.defaults,c);var j,e=d.vars.namespace,f=window.navigator&&window.navigator.msPointerEnabled&&window.MSGesture,g=("ontouchstart"in window||f||window.DocumentTouch&&document instanceof DocumentTouch)&&d.vars.touch,h="click touchend MSPointerUp",i="",k="vertical"===d.vars.direction,l=d.vars.reverse,m=d.vars.itemWidth>0,n="fade"===d.vars.animation,o=""!==d.vars.asNavFor,p={},q=!0;a.data(b,"flexslider",d),p={init:function(){d.animating=!1,d.currentSlide=parseInt(d.vars.startAt?d.vars.startAt:0,10),isNaN(d.currentSlide)&&(d.currentSlide=0),d.animatingTo=d.currentSlide,d.atEnd=0===d.currentSlide||d.currentSlide===d.last,d.containerSelector=d.vars.selector.substr(0,d.vars.selector.search(" ")),d.slides=a(d.vars.selector,d),d.container=a(d.containerSelector,d),d.count=d.slides.length,d.syncExists=a(d.vars.sync).length>0,"slide"===d.vars.animation&&(d.vars.animation="swing"),d.prop=k?"top":"marginLeft",d.args={},d.manualPause=!1,d.stopped=!1,d.started=!1,d.startTimeout=null,d.transitions=!d.vars.video&&!n&&d.vars.useCSS&&function(){var a=document.createElement("div"),b=["perspectiveProperty","WebkitPerspective","MozPerspective","OPerspective","msPerspective"];for(var c in b)if(void 0!==a.style[b[c]])return d.pfx=b[c].replace("Perspective","").toLowerCase(),d.prop="-"+d.pfx+"-transform",!0;return!1}(),d.ensureAnimationEnd="",""!==d.vars.controlsContainer&&(d.controlsContainer=a(d.vars.controlsContainer).length>0&&a(d.vars.controlsContainer)),""!==d.vars.manualControls&&(d.manualControls=a(d.vars.manualControls).length>0&&a(d.vars.manualControls)),d.vars.randomize&&(d.slides.sort(function(){return Math.round(Math.random())-.5}),d.container.empty().append(d.slides)),d.doMath(),d.setup("init"),d.vars.controlNav&&p.controlNav.setup(),d.vars.directionNav&&p.directionNav.setup(),d.vars.keyboard&&(1===a(d.containerSelector).length||d.vars.multipleKeyboard)&&a(document).bind("keyup",function(a){var b=a.keyCode;if(!d.animating&&(39===b||37===b)){var c=39===b?d.getTarget("next"):37===b?d.getTarget("prev"):!1;d.flexAnimate(c,d.vars.pauseOnAction)}}),d.vars.mousewheel&&d.bind("mousewheel",function(a,b){a.preventDefault();var f=0>b?d.getTarget("next"):d.getTarget("prev");d.flexAnimate(f,d.vars.pauseOnAction)}),d.vars.pausePlay&&p.pausePlay.setup(),d.vars.slideshow&&d.vars.pauseInvisible&&p.pauseInvisible.init(),d.vars.slideshow&&(d.vars.pauseOnHover&&d.hover(function(){d.manualPlay||d.manualPause||d.pause()},function(){d.manualPause||d.manualPlay||d.stopped||d.play()}),d.vars.pauseInvisible&&p.pauseInvisible.isHidden()||(d.vars.initDelay>0?d.startTimeout=setTimeout(d.play,d.vars.initDelay):d.play())),o&&p.asNav.setup(),g&&d.vars.touch&&p.touch(),(!n||n&&d.vars.smoothHeight)&&a(window).bind("resize orientationchange focus",p.resize),d.find("img").attr("draggable","false"),setTimeout(function(){d.vars.start(d)},200)},asNav:{setup:function(){d.asNav=!0,d.animatingTo=Math.floor(d.currentSlide/d.move),d.currentItem=d.currentSlide,d.slides.removeClass(e+"active-slide").eq(d.currentItem).addClass(e+"active-slide"),f?(b._slider=d,d.slides.each(function(){var b=this;b._gesture=new MSGesture,b._gesture.target=b,b.addEventListener("MSPointerDown",function(a){a.preventDefault(),a.currentTarget._gesture&&a.currentTarget._gesture.addPointer(a.pointerId)},!1),b.addEventListener("MSGestureTap",function(b){b.preventDefault();var c=a(this),e=c.index();a(d.vars.asNavFor).data("flexslider").animating||c.hasClass("active")||(d.direction=d.currentItem<e?"next":"prev",d.flexAnimate(e,d.vars.pauseOnAction,!1,!0,!0))})})):d.slides.on(h,function(b){b.preventDefault();var c=a(this),f=c.index(),g=c.offset().left-a(d).scrollLeft();0>=g&&c.hasClass(e+"active-slide")?d.flexAnimate(d.getTarget("prev"),!0):a(d.vars.asNavFor).data("flexslider").animating||c.hasClass(e+"active-slide")||(d.direction=d.currentItem<f?"next":"prev",d.flexAnimate(f,d.vars.pauseOnAction,!1,!0,!0))})}},controlNav:{setup:function(){d.manualControls?p.controlNav.setupManual():p.controlNav.setupPaging()},setupPaging:function(){var f,g,b="thumbnails"===d.vars.controlNav?"control-thumbs":"control-paging",c=1;if(d.controlNavScaffold=a('<ol class="'+e+"control-nav "+e+b+'"></ol>'),d.pagingCount>1)for(var j=0;j<d.pagingCount;j++){if(g=d.slides.eq(j),f="thumbnails"===d.vars.controlNav?'<img src="'+g.attr("data-thumb")+'"/>':"<a>"+c+"</a>","thumbnails"===d.vars.controlNav&&!0===d.vars.thumbCaptions){var k=g.attr("data-thumbcaption");""!=k&&void 0!=k&&(f+='<span class="'+e+'caption">'+k+"</span>")}d.controlNavScaffold.append("<li>"+f+"</li>"),c++}d.controlsContainer?a(d.controlsContainer).append(d.controlNavScaffold):d.append(d.controlNavScaffold),p.controlNav.set(),p.controlNav.active(),d.controlNavScaffold.delegate("a, img",h,function(b){if(b.preventDefault(),""===i||i===b.type){var c=a(this),f=d.controlNav.index(c);c.hasClass(e+"active")||(d.direction=f>d.currentSlide?"next":"prev",d.flexAnimate(f,d.vars.pauseOnAction))}""===i&&(i=b.type),p.setToClearWatchedEvent()})},setupManual:function(){d.controlNav=d.manualControls,p.controlNav.active(),d.controlNav.bind(h,function(b){if(b.preventDefault(),""===i||i===b.type){var c=a(this),f=d.controlNav.index(c);c.hasClass(e+"active")||(d.direction=f>d.currentSlide?"next":"prev",d.flexAnimate(f,d.vars.pauseOnAction))}""===i&&(i=b.type),p.setToClearWatchedEvent()})},set:function(){var b="thumbnails"===d.vars.controlNav?"img":"a";d.controlNav=a("."+e+"control-nav li "+b,d.controlsContainer?d.controlsContainer:d)},active:function(){d.controlNav.removeClass(e+"active").eq(d.animatingTo).addClass(e+"active")},update:function(b,c){d.pagingCount>1&&"add"===b?d.controlNavScaffold.append(a("<li><a>"+d.count+"</a></li>")):1===d.pagingCount?d.controlNavScaffold.find("li").remove():d.controlNav.eq(c).closest("li").remove(),p.controlNav.set(),d.pagingCount>1&&d.pagingCount!==d.controlNav.length?d.update(c,b):p.controlNav.active()}},directionNav:{setup:function(){var b=a('<ul class="'+e+'direction-nav"><li><a class="'+e+'prev" href="#">'+d.vars.prevText+'</a></li><li><a class="'+e+'next" href="#">'+d.vars.nextText+"</a></li></ul>");d.controlsContainer?(a(d.controlsContainer).append(b),d.directionNav=a("."+e+"direction-nav li a",d.controlsContainer)):(d.append(b),d.directionNav=a("."+e+"direction-nav li a",d)),p.directionNav.update(),d.directionNav.bind(h,function(b){b.preventDefault();var c;(""===i||i===b.type)&&(c=a(this).hasClass(e+"next")?d.getTarget("next"):d.getTarget("prev"),d.flexAnimate(c,d.vars.pauseOnAction)),""===i&&(i=b.type),p.setToClearWatchedEvent()})},update:function(){var a=e+"disabled";1===d.pagingCount?d.directionNav.addClass(a).attr("tabindex","-1"):d.vars.animationLoop?d.directionNav.removeClass(a).removeAttr("tabindex"):0===d.animatingTo?d.directionNav.removeClass(a).filter("."+e+"prev").addClass(a).attr("tabindex","-1"):d.animatingTo===d.last?d.directionNav.removeClass(a).filter("."+e+"next").addClass(a).attr("tabindex","-1"):d.directionNav.removeClass(a).removeAttr("tabindex")}},pausePlay:{setup:function(){var b=a('<div class="'+e+'pauseplay"><a></a></div>');d.controlsContainer?(d.controlsContainer.append(b),d.pausePlay=a("."+e+"pauseplay a",d.controlsContainer)):(d.append(b),d.pausePlay=a("."+e+"pauseplay a",d)),p.pausePlay.update(d.vars.slideshow?e+"pause":e+"play"),d.pausePlay.bind(h,function(b){b.preventDefault(),(""===i||i===b.type)&&(a(this).hasClass(e+"pause")?(d.manualPause=!0,d.manualPlay=!1,d.pause()):(d.manualPause=!1,d.manualPlay=!0,d.play())),""===i&&(i=b.type),p.setToClearWatchedEvent()})},update:function(a){"play"===a?d.pausePlay.removeClass(e+"pause").addClass(e+"play").html(d.vars.playText):d.pausePlay.removeClass(e+"play").addClass(e+"pause").html(d.vars.pauseText)}},touch:function(){function r(f){d.animating?f.preventDefault():(window.navigator.msPointerEnabled||1===f.touches.length)&&(d.pause(),g=k?d.h:d.w,i=Number(new Date),o=f.touches[0].pageX,p=f.touches[0].pageY,e=m&&l&&d.animatingTo===d.last?0:m&&l?d.limit-(d.itemW+d.vars.itemMargin)*d.move*d.animatingTo:m&&d.currentSlide===d.last?d.limit:m?(d.itemW+d.vars.itemMargin)*d.move*d.currentSlide:l?(d.last-d.currentSlide+d.cloneOffset)*g:(d.currentSlide+d.cloneOffset)*g,a=k?p:o,c=k?o:p,b.addEventListener("touchmove",s,!1),b.addEventListener("touchend",t,!1))}function s(b){o=b.touches[0].pageX,p=b.touches[0].pageY,h=k?a-p:a-o,j=k?Math.abs(h)<Math.abs(o-c):Math.abs(h)<Math.abs(p-c);var f=500;(!j||Number(new Date)-i>f)&&(b.preventDefault(),!n&&d.transitions&&(d.vars.animationLoop||(h/=0===d.currentSlide&&0>h||d.currentSlide===d.last&&h>0?Math.abs(h)/g+2:1),d.setProps(e+h,"setTouch")))}function t(){if(b.removeEventListener("touchmove",s,!1),d.animatingTo===d.currentSlide&&!j&&null!==h){var k=l?-h:h,m=k>0?d.getTarget("next"):d.getTarget("prev");d.canAdvance(m)&&(Number(new Date)-i<550&&Math.abs(k)>50||Math.abs(k)>g/2)?d.flexAnimate(m,d.vars.pauseOnAction):n||d.flexAnimate(d.currentSlide,d.vars.pauseOnAction,!0)}b.removeEventListener("touchend",t,!1),a=null,c=null,h=null,e=null}function u(a){a.stopPropagation(),d.animating?a.preventDefault():(d.pause(),b._gesture.addPointer(a.pointerId),q=0,g=k?d.h:d.w,i=Number(new Date),e=m&&l&&d.animatingTo===d.last?0:m&&l?d.limit-(d.itemW+d.vars.itemMargin)*d.move*d.animatingTo:m&&d.currentSlide===d.last?d.limit:m?(d.itemW+d.vars.itemMargin)*d.move*d.currentSlide:l?(d.last-d.currentSlide+d.cloneOffset)*g:(d.currentSlide+d.cloneOffset)*g)}function v(a){a.stopPropagation();var c=a.target._slider;if(c){var d=-a.translationX,f=-a.translationY;return q+=k?f:d,h=q,j=k?Math.abs(q)<Math.abs(-d):Math.abs(q)<Math.abs(-f),a.detail===a.MSGESTURE_FLAG_INERTIA?(setImmediate(function(){b._gesture.stop()}),void 0):((!j||Number(new Date)-i>500)&&(a.preventDefault(),!n&&c.transitions&&(c.vars.animationLoop||(h=q/(0===c.currentSlide&&0>q||c.currentSlide===c.last&&q>0?Math.abs(q)/g+2:1)),c.setProps(e+h,"setTouch"))),void 0)}}function w(b){b.stopPropagation();var d=b.target._slider;if(d){if(d.animatingTo===d.currentSlide&&!j&&null!==h){var f=l?-h:h,k=f>0?d.getTarget("next"):d.getTarget("prev");d.canAdvance(k)&&(Number(new Date)-i<550&&Math.abs(f)>50||Math.abs(f)>g/2)?d.flexAnimate(k,d.vars.pauseOnAction):n||d.flexAnimate(d.currentSlide,d.vars.pauseOnAction,!0)}a=null,c=null,h=null,e=null,q=0}}var a,c,e,g,h,i,j=!1,o=0,p=0,q=0;f?(b.style.msTouchAction="none",b._gesture=new MSGesture,b._gesture.target=b,b.addEventListener("MSPointerDown",u,!1),b._slider=d,b.addEventListener("MSGestureChange",v,!1),b.addEventListener("MSGestureEnd",w,!1)):b.addEventListener("touchstart",r,!1)},resize:function(){!d.animating&&d.is(":visible")&&(m||d.doMath(),n?p.smoothHeight():m?(d.slides.width(d.computedW),d.update(d.pagingCount),d.setProps()):k?(d.viewport.height(d.h),d.setProps(d.h,"setTotal")):(d.vars.smoothHeight&&p.smoothHeight(),d.newSlides.width(d.computedW),d.setProps(d.computedW,"setTotal")))},smoothHeight:function(a){if(!k||n){var b=n?d:d.viewport;a?b.animate({height:d.slides.eq(d.animatingTo).height()},a):b.height(d.slides.eq(d.animatingTo).height())}},sync:function(b){var c=a(d.vars.sync).data("flexslider"),e=d.animatingTo;switch(b){case"animate":c.flexAnimate(e,d.vars.pauseOnAction,!1,!0);break;case"play":c.playing||c.asNav||c.play();break;case"pause":c.pause()}},uniqueID:function(b){return b.find("[id]").each(function(){var b=a(this);b.attr("id",b.attr("id")+"_clone")}),b},pauseInvisible:{visProp:null,init:function(){var a=["webkit","moz","ms","o"];if("hidden"in document)return"hidden";for(var b=0;b<a.length;b++)a[b]+"Hidden"in document&&(p.pauseInvisible.visProp=a[b]+"Hidden");if(p.pauseInvisible.visProp){var c=p.pauseInvisible.visProp.replace(/[H|h]idden/,"")+"visibilitychange";document.addEventListener(c,function(){p.pauseInvisible.isHidden()?d.startTimeout?clearTimeout(d.startTimeout):d.pause():d.started?d.play():d.vars.initDelay>0?setTimeout(d.play,d.vars.initDelay):d.play()})}},isHidden:function(){return document[p.pauseInvisible.visProp]||!1}},setToClearWatchedEvent:function(){clearTimeout(j),j=setTimeout(function(){i=""},3e3)}},d.flexAnimate=function(b,c,f,h,i){if(d.vars.animationLoop||b===d.currentSlide||(d.direction=b>d.currentSlide?"next":"prev"),o&&1===d.pagingCount&&(d.direction=d.currentItem<b?"next":"prev"),!d.animating&&(d.canAdvance(b,i)||f)&&d.is(":visible")){if(o&&h){var j=a(d.vars.asNavFor).data("flexslider");if(d.atEnd=0===b||b===d.count-1,j.flexAnimate(b,!0,!1,!0,i),d.direction=d.currentItem<b?"next":"prev",j.direction=d.direction,Math.ceil((b+1)/d.visible)-1===d.currentSlide||0===b)return d.currentItem=b,d.slides.removeClass(e+"active-slide").eq(b).addClass(e+"active-slide"),!1;d.currentItem=b,d.slides.removeClass(e+"active-slide").eq(b).addClass(e+"active-slide"),b=Math.floor(b/d.visible)}if(d.animating=!0,d.animatingTo=b,c&&d.pause(),d.vars.before(d),d.syncExists&&!i&&p.sync("animate"),d.vars.controlNav&&p.controlNav.active(),m||d.slides.removeClass(e+"active-slide").eq(b).addClass(e+"active-slide"),d.atEnd=0===b||b===d.last,d.vars.directionNav&&p.directionNav.update(),b===d.last&&(d.vars.end(d),d.vars.animationLoop||d.pause()),n)g?(d.slides.eq(d.currentSlide).css({opacity:0,zIndex:1}),d.slides.eq(b).css({opacity:1,zIndex:2}),d.wrapup(q)):(d.slides.eq(d.currentSlide).css({zIndex:1}).animate({opacity:0},d.vars.animationSpeed,d.vars.easing),d.slides.eq(b).css({zIndex:2}).animate({opacity:1},d.vars.animationSpeed,d.vars.easing,d.wrapup));else{var r,s,t,q=k?d.slides.filter(":first").height():d.computedW;m?(r=d.vars.itemMargin,t=(d.itemW+r)*d.move*d.animatingTo,s=t>d.limit&&1!==d.visible?d.limit:t):s=0===d.currentSlide&&b===d.count-1&&d.vars.animationLoop&&"next"!==d.direction?l?(d.count+d.cloneOffset)*q:0:d.currentSlide===d.last&&0===b&&d.vars.animationLoop&&"prev"!==d.direction?l?0:(d.count+1)*q:l?(d.count-1-b+d.cloneOffset)*q:(b+d.cloneOffset)*q,d.setProps(s,"",d.vars.animationSpeed),d.transitions?(d.vars.animationLoop&&d.atEnd||(d.animating=!1,d.currentSlide=d.animatingTo),d.container.unbind("webkitTransitionEnd transitionend"),d.container.bind("webkitTransitionEnd transitionend",function(){clearTimeout(d.ensureAnimationEnd),d.wrapup(q)}),clearTimeout(d.ensureAnimationEnd),d.ensureAnimationEnd=setTimeout(function(){d.wrapup(q)},d.vars.animationSpeed+100)):d.container.animate(d.args,d.vars.animationSpeed,d.vars.easing,function(){d.wrapup(q)})}d.vars.smoothHeight&&p.smoothHeight(d.vars.animationSpeed)}},d.wrapup=function(a){n||m||(0===d.currentSlide&&d.animatingTo===d.last&&d.vars.animationLoop?d.setProps(a,"jumpEnd"):d.currentSlide===d.last&&0===d.animatingTo&&d.vars.animationLoop&&d.setProps(a,"jumpStart")),d.animating=!1,d.currentSlide=d.animatingTo,d.vars.after(d)},d.animateSlides=function(){!d.animating&&q&&d.flexAnimate(d.getTarget("next"))},d.pause=function(){clearInterval(d.animatedSlides),d.animatedSlides=null,d.playing=!1,d.vars.pausePlay&&p.pausePlay.update("play"),d.syncExists&&p.sync("pause")},d.play=function(){d.playing&&clearInterval(d.animatedSlides),d.animatedSlides=d.animatedSlides||setInterval(d.animateSlides,d.vars.slideshowSpeed),d.started=d.playing=!0,d.vars.pausePlay&&p.pausePlay.update("pause"),d.syncExists&&p.sync("play")},d.stop=function(){d.pause(),d.stopped=!0},d.canAdvance=function(a,b){var c=o?d.pagingCount-1:d.last;return b?!0:o&&d.currentItem===d.count-1&&0===a&&"prev"===d.direction?!0:o&&0===d.currentItem&&a===d.pagingCount-1&&"next"!==d.direction?!1:a!==d.currentSlide||o?d.vars.animationLoop?!0:d.atEnd&&0===d.currentSlide&&a===c&&"next"!==d.direction?!1:d.atEnd&&d.currentSlide===c&&0===a&&"next"===d.direction?!1:!0:!1},d.getTarget=function(a){return d.direction=a,"next"===a?d.currentSlide===d.last?0:d.currentSlide+1:0===d.currentSlide?d.last:d.currentSlide-1},d.setProps=function(a,b,c){var e=function(){var c=a?a:(d.itemW+d.vars.itemMargin)*d.move*d.animatingTo,e=function(){if(m)return"setTouch"===b?a:l&&d.animatingTo===d.last?0:l?d.limit-(d.itemW+d.vars.itemMargin)*d.move*d.animatingTo:d.animatingTo===d.last?d.limit:c;switch(b){case"setTotal":return l?(d.count-1-d.currentSlide+d.cloneOffset)*a:(d.currentSlide+d.cloneOffset)*a;case"setTouch":return l?a:a;case"jumpEnd":return l?a:d.count*a;case"jumpStart":return l?d.count*a:a;default:return a}}();return-1*e+"px"}();d.transitions&&(e=k?"translate3d(0,"+e+",0)":"translate3d("+e+",0,0)",c=void 0!==c?c/1e3+"s":"0s",d.container.css("-"+d.pfx+"-transition-duration",c),d.container.css("transition-duration",c)),d.args[d.prop]=e,(d.transitions||void 0===c)&&d.container.css(d.args),d.container.css("transform",e)},d.setup=function(b){if(n)d.slides.css({width:"100%","float":"left",marginRight:"-100%",position:"relative"}),"init"===b&&(g?d.slides.css({opacity:0,display:"block",webkitTransition:"opacity "+d.vars.animationSpeed/1e3+"s ease",zIndex:1}).eq(d.currentSlide).css({opacity:1,zIndex:2}):d.slides.css({opacity:0,display:"block",zIndex:1}).eq(d.currentSlide).css({zIndex:2}).animate({opacity:1},d.vars.animationSpeed,d.vars.easing)),d.vars.smoothHeight&&p.smoothHeight();else{var c,f;"init"===b&&(d.viewport=a('<div class="'+e+'viewport"></div>').css({overflow:"hidden",position:"relative"}).appendTo(d).append(d.container),d.cloneCount=0,d.cloneOffset=0,l&&(f=a.makeArray(d.slides).reverse(),d.slides=a(f),d.container.empty().append(d.slides))),d.vars.animationLoop&&!m&&(d.cloneCount=2,d.cloneOffset=1,"init"!==b&&d.container.find(".clone").remove(),p.uniqueID(d.slides.first().clone().addClass("clone").attr("aria-hidden","true")).appendTo(d.container),p.uniqueID(d.slides.last().clone().addClass("clone").attr("aria-hidden","true")).prependTo(d.container)),d.newSlides=a(d.vars.selector,d),c=l?d.count-1-d.currentSlide+d.cloneOffset:d.currentSlide+d.cloneOffset,k&&!m?(d.container.height(200*(d.count+d.cloneCount)+"%").css("position","absolute").width("100%"),setTimeout(function(){d.newSlides.css({display:"block"}),d.doMath(),d.viewport.height(d.h),d.setProps(c*d.h,"init")},"init"===b?100:0)):(d.container.width(200*(d.count+d.cloneCount)+"%"),d.setProps(c*d.computedW,"init"),setTimeout(function(){d.doMath(),d.newSlides.css({width:d.computedW,"float":"left",display:"block"}),d.vars.smoothHeight&&p.smoothHeight()},"init"===b?100:0))}m||d.slides.removeClass(e+"active-slide").eq(d.currentSlide).addClass(e+"active-slide"),d.vars.init(d)},d.doMath=function(){var a=d.slides.first(),b=d.vars.itemMargin,c=d.vars.minItems,e=d.vars.maxItems;d.w=void 0===d.viewport?d.width():d.viewport.width(),d.h=a.height(),d.boxPadding=a.outerWidth()-a.width(),m?(d.itemT=d.vars.itemWidth+b,d.minW=c?c*d.itemT:d.w,d.maxW=e?e*d.itemT-b:d.w,d.itemW=d.minW>d.w?(d.w-b*(c-1))/c:d.maxW<d.w?(d.w-b*(e-1))/e:d.vars.itemWidth>d.w?d.w:d.vars.itemWidth,d.visible=Math.floor(d.w/d.itemW),d.move=d.vars.move>0&&d.vars.move<d.visible?d.vars.move:d.visible,d.pagingCount=Math.ceil((d.count-d.visible)/d.move+1),d.last=d.pagingCount-1,d.limit=1===d.pagingCount?0:d.vars.itemWidth>d.w?d.itemW*(d.count-1)+b*(d.count-1):(d.itemW+b)*d.count-d.w-b):(d.itemW=d.w,d.pagingCount=d.count,d.last=d.count-1),d.computedW=d.itemW-d.boxPadding},d.update=function(a,b){d.doMath(),m||(a<d.currentSlide?d.currentSlide+=1:a<=d.currentSlide&&0!==a&&(d.currentSlide-=1),d.animatingTo=d.currentSlide),d.vars.controlNav&&!d.manualControls&&("add"===b&&!m||d.pagingCount>d.controlNav.length?p.controlNav.update("add"):("remove"===b&&!m||d.pagingCount<d.controlNav.length)&&(m&&d.currentSlide>d.last&&(d.currentSlide-=1,d.animatingTo-=1),p.controlNav.update("remove",d.last))),d.vars.directionNav&&p.directionNav.update()},d.addSlide=function(b,c){var e=a(b);d.count+=1,d.last=d.count-1,k&&l?void 0!==c?d.slides.eq(d.count-c).after(e):d.container.prepend(e):void 0!==c?d.slides.eq(c).before(e):d.container.append(e),d.update(c,"add"),d.slides=a(d.vars.selector+":not(.clone)",d),d.setup(),d.vars.added(d)},d.removeSlide=function(b){var c=isNaN(b)?d.slides.index(a(b)):b;d.count-=1,d.last=d.count-1,isNaN(b)?a(b,d.slides).remove():k&&l?d.slides.eq(d.last).remove():d.slides.eq(b).remove(),d.doMath(),d.update(c,"remove"),d.slides=a(d.vars.selector+":not(.clone)",d),d.setup(),d.vars.removed(d)},p.init()},a(window).blur(function(){focused=!1}).focus(function(){focused=!0}),a.flexslider.defaults={namespace:"flex-",selector:".slides > li",animation:"fade",easing:"swing",direction:"horizontal",reverse:!1,animationLoop:!0,smoothHeight:!1,startAt:0,slideshow:!0,slideshowSpeed:7e3,animationSpeed:600,initDelay:0,randomize:!1,thumbCaptions:!1,pauseOnAction:!0,pauseOnHover:!1,pauseInvisible:!0,useCSS:!0,touch:!0,video:!1,controlNav:!0,directionNav:!0,prevText:"Previous",nextText:"Next",keyboard:!0,multipleKeyboard:!1,mousewheel:!1,pausePlay:!1,pauseText:"Pause",playText:"Play",controlsContainer:"",manualControls:"",sync:"",asNavFor:"",itemWidth:0,itemMargin:0,minItems:1,maxItems:0,move:0,allowOneSlide:!0,start:function(){},before:function(){},after:function(){},end:function(){},added:function(){},removed:function(){},init:function(){}},a.fn.flexslider=function(b){if(void 0===b&&(b={}),"object"==typeof b)return this.each(function(){var c=a(this),d=b.selector?b.selector:".slides > li",e=c.find(d);1===e.length&&b.allowOneSlide===!0||0===e.length?(e.fadeIn(400),b.start&&b.start(c)):void 0===c.data("flexslider")&&new a.flexslider(this,b)});var c=a(this).data("flexslider");switch(b){case"play":c.play();break;case"pause":c.pause();break;case"stop":c.stop();break;case"next":c.flexAnimate(c.getTarget("next"),!0);break;case"prev":case"previous":c.flexAnimate(c.getTarget("prev"),!0);break;default:"number"==typeof b&&c.flexAnimate(b,!0)}}}(jQuery);
;/*! PhotoSwipe - v4.1.1 - 2015-12-24
* http://photoswipe.com
* Copyright (c) 2015 Dmitry Semenov; */
!function(e,t){"function"==typeof define&&define.amd?define(t):"object"==typeof exports?module.exports=t():e.PhotoSwipe=t()}(this,function(){"use strict";return function(e,t,n,i){var o={features:null,bind:function(e,t,n,i){var o=(i?"remove":"add")+"EventListener";t=t.split(" ");for(var a=0;a<t.length;a++)t[a]&&e[o](t[a],n,!1)},isArray:function(e){return e instanceof Array},createEl:function(e,t){var n=document.createElement(t||"div");return e&&(n.className=e),n},getScrollY:function(){var e=window.pageYOffset;return e!==undefined?e:document.documentElement.scrollTop},unbind:function(e,t,n){o.bind(e,t,n,!0)},removeClass:function(e,t){var n=new RegExp("(\\s|^)"+t+"(\\s|$)");e.className=e.className.replace(n," ").replace(/^\s\s*/,"").replace(/\s\s*$/,"")},addClass:function(e,t){o.hasClass(e,t)||(e.className+=(e.className?" ":"")+t)},hasClass:function(e,t){return e.className&&new RegExp("(^|\\s)"+t+"(\\s|$)").test(e.className)},getChildByClass:function(e,t){for(var n=e.firstChild;n;){if(o.hasClass(n,t))return n;n=n.nextSibling}},arraySearch:function(e,t,n){for(var i=e.length;i--;)if(e[i][n]===t)return i;return-1},extend:function(e,t,n){for(var i in t)if(t.hasOwnProperty(i)){if(n&&e.hasOwnProperty(i))continue;e[i]=t[i]}},easing:{sine:{out:function(e){return Math.sin(e*(Math.PI/2))},inOut:function(e){return-(Math.cos(Math.PI*e)-1)/2}},cubic:{out:function(e){return--e*e*e+1}}},detectFeatures:function(){if(o.features)return o.features;var e=o.createEl().style,t="",n={};if(n.oldIE=document.all&&!document.addEventListener,n.touch="ontouchstart"in window,window.requestAnimationFrame&&(n.raf=window.requestAnimationFrame,n.caf=window.cancelAnimationFrame),n.pointerEvent=navigator.pointerEnabled||navigator.msPointerEnabled,!n.pointerEvent){var i=navigator.userAgent;if(/iP(hone|od)/.test(navigator.platform)){var a=navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);a&&a.length>0&&(a=parseInt(a[1],10))>=1&&a<8&&(n.isOldIOSPhone=!0)}var r=i.match(/Android\s([0-9\.]*)/),l=r?r[1]:0;(l=parseFloat(l))>=1&&(l<4.4&&(n.isOldAndroid=!0),n.androidVersion=l),n.isMobileOpera=/opera mini|opera mobi/i.test(i)}for(var s,u,c=["transform","perspective","animationName"],d=["","webkit","Moz","ms","O"],p=0;p<4;p++){t=d[p];for(var m=0;m<3;m++)s=c[m],u=t+(t?s.charAt(0).toUpperCase()+s.slice(1):s),!n[s]&&u in e&&(n[s]=u);t&&!n.raf&&(t=t.toLowerCase(),n.raf=window[t+"RequestAnimationFrame"],n.raf&&(n.caf=window[t+"CancelAnimationFrame"]||window[t+"CancelRequestAnimationFrame"]))}if(!n.raf){var f=0;n.raf=function(e){var t=(new Date).getTime(),n=Math.max(0,16-(t-f)),i=window.setTimeout(function(){e(t+n)},n);return f=t+n,i},n.caf=function(e){clearTimeout(e)}}return n.svg=!!document.createElementNS&&!!document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect,o.features=n,n}};o.detectFeatures(),o.features.oldIE&&(o.bind=function(e,t,n,i){t=t.split(" ");for(var o,a=(i?"detach":"attach")+"Event",r=0;r<t.length;r++)if(o=t[r])if("object"==typeof n&&n.handleEvent){if(i){if(!n["oldIE"+o])return!1}else n["oldIE"+o]=function(){n.handleEvent.call(n)};e[a]("on"+o,n["oldIE"+o])}else e[a]("on"+o,n)});var a=this,r={allowPanToNext:!0,spacing:.12,bgOpacity:1,mouseUsed:!1,loop:!0,pinchToClose:!0,closeOnScroll:!0,closeOnVerticalDrag:!0,verticalDragRange:.75,hideAnimationDuration:333,showAnimationDuration:333,showHideOpacity:!1,focus:!0,escKey:!0,arrowKeys:!0,mainScrollEndFriction:.35,panEndFriction:.35,isClickableElement:function(e){return"A"===e.tagName},getDoubleTapZoom:function(e,t){return e?1:t.initialZoomLevel<.7?1:1.33},maxSpreadZoom:1.33,modal:!0,scaleMode:"fit"};o.extend(r,i);var l,s,u,c,d,p,m,f,h,y,x,v,g,w,b,I,C,D,M,T,S,A,E,O,k,R,Z,P,F,L,_,z,N,U,H,Y,B,W,G,X,V,K,q,$,j,J,Q,ee,te,ne,ie,oe,ae,re,le,se,ue={x:0,y:0},ce={x:0,y:0},de={x:0,y:0},pe={},me=0,fe={},he={x:0,y:0},ye=0,xe=!0,ve=[],ge={},we=!1,be=function(e,t){o.extend(a,t.publicMethods),ve.push(e)},Ie=function(e){var t=Kt();return e>t-1?e-t:e<0?t+e:e},Ce={},De=function(e,t){return Ce[e]||(Ce[e]=[]),Ce[e].push(t)},Me=function(e){var t=Ce[e];if(t){var n=Array.prototype.slice.call(arguments);n.shift();for(var i=0;i<t.length;i++)t[i].apply(a,n)}},Te=function(){return(new Date).getTime()},Se=function(e){re=e,a.bg.style.opacity=e*r.bgOpacity},Ae=function(e,t,n,i,o){(!we||o&&o!==a.currItem)&&(i/=o?o.fitRatio:a.currItem.fitRatio),e[A]=v+t+"px, "+n+"px"+g+" scale("+i+")"},Ee=function(e){te&&(e&&(y>a.currItem.fitRatio?we||(rn(a.currItem,!1,!0),we=!0):we&&(rn(a.currItem),we=!1)),Ae(te,de.x,de.y,y))},Oe=function(e){e.container&&Ae(e.container.style,e.initialPosition.x,e.initialPosition.y,e.initialZoomLevel,e)},ke=function(e,t){t[A]=v+e+"px, 0px"+g},Re=function(e,t){if(!r.loop&&t){var n=c+(he.x*me-e)/he.x,i=Math.round(e-mt.x);(n<0&&i>0||n>=Kt()-1&&i<0)&&(e=mt.x+i*r.mainScrollEndFriction)}mt.x=e,ke(e,d)},Ze=function(e,t){var n=ft[e]-fe[e];return ce[e]+ue[e]+n-n*(t/x)},Pe=function(e,t){e.x=t.x,e.y=t.y,t.id&&(e.id=t.id)},Fe=function(e){e.x=Math.round(e.x),e.y=Math.round(e.y)},Le=null,_e=function(){Le&&(o.unbind(document,"mousemove",_e),o.addClass(e,"pswp--has_mouse"),r.mouseUsed=!0,Me("mouseUsed")),Le=setTimeout(function(){Le=null},100)},ze=function(){o.bind(document,"keydown",a),_.transform&&o.bind(a.scrollWrap,"click",a),r.mouseUsed||o.bind(document,"mousemove",_e),o.bind(window,"resize scroll",a),Me("bindEvents")},Ne=function(){o.unbind(window,"resize",a),o.unbind(window,"scroll",h.scroll),o.unbind(document,"keydown",a),o.unbind(document,"mousemove",_e),_.transform&&o.unbind(a.scrollWrap,"click",a),W&&o.unbind(window,m,a),Me("unbindEvents")},Ue=function(e,t){var n=tn(a.currItem,pe,e);return t&&(ee=n),n},He=function(e){return e||(e=a.currItem),e.initialZoomLevel},Ye=function(e){return e||(e=a.currItem),e.w>0?r.maxSpreadZoom:1},Be=function(e,t,n,i){return i===a.currItem.initialZoomLevel?(n[e]=a.currItem.initialPosition[e],!0):(n[e]=Ze(e,i),n[e]>t.min[e]?(n[e]=t.min[e],!0):n[e]<t.max[e]&&(n[e]=t.max[e],!0))},We=function(){if(A){var t=_.perspective&&!O;return v="translate"+(t?"3d(":"("),void(g=_.perspective?", 0px)":")")}A="left",o.addClass(e,"pswp--ie"),ke=function(e,t){t.left=e+"px"},Oe=function(e){var t=e.fitRatio>1?1:e.fitRatio,n=e.container.style,i=t*e.w,o=t*e.h;n.width=i+"px",n.height=o+"px",n.left=e.initialPosition.x+"px",n.top=e.initialPosition.y+"px"},Ee=function(){if(te){var e=te,t=a.currItem,n=t.fitRatio>1?1:t.fitRatio,i=n*t.w,o=n*t.h;e.width=i+"px",e.height=o+"px",e.left=de.x+"px",e.top=de.y+"px"}}},Ge=function(e){var t="";r.escKey&&27===e.keyCode?t="close":r.arrowKeys&&(37===e.keyCode?t="prev":39===e.keyCode&&(t="next")),t&&(e.ctrlKey||e.altKey||e.shiftKey||e.metaKey||(e.preventDefault?e.preventDefault():e.returnValue=!1,a[t]()))},Xe=function(e){e&&(V||X||ne||Y)&&(e.preventDefault(),e.stopPropagation())},Ve=function(){a.setScrollOffset(0,o.getScrollY())},Ke={},qe=0,$e=function(e){Ke[e]&&(Ke[e].raf&&R(Ke[e].raf),qe--,delete Ke[e])},je=function(e){Ke[e]&&$e(e),Ke[e]||(qe++,Ke[e]={})},Je=function(){for(var e in Ke)Ke.hasOwnProperty(e)&&$e(e)},Qe=function(e,t,n,i,o,a,r){var l,s=Te();je(e);var u=function(){if(Ke[e]){if((l=Te()-s)>=i)return $e(e),a(n),void(r&&r());a((n-t)*o(l/i)+t),Ke[e].raf=k(u)}};u()},et={shout:Me,listen:De,viewportSize:pe,options:r,isMainScrollAnimating:function(){return ne},getZoomLevel:function(){return y},getCurrentIndex:function(){return c},isDragging:function(){return W},isZooming:function(){return j},setScrollOffset:function(e,t){fe.x=e,L=fe.y=t,Me("updateScrollOffset",fe)},applyZoomPan:function(e,t,n,i){de.x=t,de.y=n,y=e,Ee(i)},init:function(){if(!l&&!s){var n;a.framework=o,a.template=e,a.bg=o.getChildByClass(e,"pswp__bg"),Z=e.className,l=!0,_=o.detectFeatures(),k=_.raf,R=_.caf,A=_.transform,F=_.oldIE,a.scrollWrap=o.getChildByClass(e,"pswp__scroll-wrap"),a.container=o.getChildByClass(a.scrollWrap,"pswp__container"),d=a.container.style,a.itemHolders=I=[{el:a.container.children[0],wrap:0,index:-1},{el:a.container.children[1],wrap:0,index:-1},{el:a.container.children[2],wrap:0,index:-1}],I[0].el.style.display=I[2].el.style.display="none",We(),h={resize:a.updateSize,scroll:Ve,keydown:Ge,click:Xe};var i=_.isOldIOSPhone||_.isOldAndroid||_.isMobileOpera;for(_.animationName&&_.transform&&!i||(r.showAnimationDuration=r.hideAnimationDuration=0),n=0;n<ve.length;n++)a["init"+ve[n]]();t&&(a.ui=new t(a,o)).init(),Me("firstUpdate"),c=c||r.index||0,(isNaN(c)||c<0||c>=Kt())&&(c=0),a.currItem=Vt(c),(_.isOldIOSPhone||_.isOldAndroid)&&(xe=!1),e.setAttribute("aria-hidden","false"),r.modal&&(xe?e.style.position="fixed":(e.style.position="absolute",e.style.top=o.getScrollY()+"px")),L===undefined&&(Me("initialLayout"),L=P=o.getScrollY());var u="pswp--open ";for(r.mainClass&&(u+=r.mainClass+" "),r.showHideOpacity&&(u+="pswp--animate_opacity "),u+=O?"pswp--touch":"pswp--notouch",u+=_.animationName?" pswp--css_animation":"",u+=_.svg?" pswp--svg":"",o.addClass(e,u),a.updateSize(),p=-1,ye=null,n=0;n<3;n++)ke((n+p)*he.x,I[n].el.style);F||o.bind(a.scrollWrap,f,a),De("initialZoomInEnd",function(){a.setContent(I[0],c-1),a.setContent(I[2],c+1),I[0].el.style.display=I[2].el.style.display="block",r.focus&&e.focus(),ze()}),a.setContent(I[1],c),a.updateCurrItem(),Me("afterInit"),xe||(w=setInterval(function(){qe||W||j||y!==a.currItem.initialZoomLevel||a.updateSize()},1e3)),o.addClass(e,"pswp--visible")}},close:function(){l&&(l=!1,s=!0,Me("close"),Ne(),$t(a.currItem,null,!0,a.destroy))},destroy:function(){Me("destroy"),Bt&&clearTimeout(Bt),e.setAttribute("aria-hidden","true"),e.className=Z,w&&clearInterval(w),o.unbind(a.scrollWrap,f,a),o.unbind(window,"scroll",a),gt(),Je(),Ce=null},panTo:function(e,t,n){n||(e>ee.min.x?e=ee.min.x:e<ee.max.x&&(e=ee.max.x),t>ee.min.y?t=ee.min.y:t<ee.max.y&&(t=ee.max.y)),de.x=e,de.y=t,Ee()},handleEvent:function(e){e=e||window.event,h[e.type]&&h[e.type](e)},goTo:function(e){var t=(e=Ie(e))-c;ye=t,c=e,a.currItem=Vt(c),me-=t,Re(he.x*me),Je(),ne=!1,a.updateCurrItem()},next:function(){a.goTo(c+1)},prev:function(){a.goTo(c-1)},updateCurrZoomItem:function(e){if(e&&Me("beforeChange",0),I[1].el.children.length){var t=I[1].el.children[0];te=o.hasClass(t,"pswp__zoom-wrap")?t.style:null}else te=null;ee=a.currItem.bounds,x=y=a.currItem.initialZoomLevel,de.x=ee.center.x,de.y=ee.center.y,e&&Me("afterChange")},invalidateCurrItems:function(){b=!0;for(var e=0;e<3;e++)I[e].item&&(I[e].item.needsUpdate=!0)},updateCurrItem:function(e){if(0!==ye){var t,n=Math.abs(ye);if(!(e&&n<2)){a.currItem=Vt(c),we=!1,Me("beforeChange",ye),n>=3&&(p+=ye+(ye>0?-3:3),n=3);for(var i=0;i<n;i++)ye>0?(t=I.shift(),I[2]=t,ke((++p+2)*he.x,t.el.style),a.setContent(t,c-n+i+1+1)):(t=I.pop(),I.unshift(t),ke(--p*he.x,t.el.style),a.setContent(t,c+n-i-1-1));if(te&&1===Math.abs(ye)){var o=Vt(C);o.initialZoomLevel!==y&&(tn(o,pe),rn(o),Oe(o))}ye=0,a.updateCurrZoomItem(),C=c,Me("afterChange")}}},updateSize:function(t){if(!xe&&r.modal){var n=o.getScrollY();if(L!==n&&(e.style.top=n+"px",L=n),!t&&ge.x===window.innerWidth&&ge.y===window.innerHeight)return;ge.x=window.innerWidth,ge.y=window.innerHeight,e.style.height=ge.y+"px"}if(pe.x=a.scrollWrap.clientWidth,pe.y=a.scrollWrap.clientHeight,Ve(),he.x=pe.x+Math.round(pe.x*r.spacing),he.y=pe.y,Re(he.x*me),Me("beforeResize"),p!==undefined){for(var i,l,s,u=0;u<3;u++)i=I[u],ke((u+p)*he.x,i.el.style),s=c+u-1,r.loop&&Kt()>2&&(s=Ie(s)),(l=Vt(s))&&(b||l.needsUpdate||!l.bounds)?(a.cleanSlide(l),a.setContent(i,s),1===u&&(a.currItem=l,a.updateCurrZoomItem(!0)),l.needsUpdate=!1):-1===i.index&&s>=0&&a.setContent(i,s),l&&l.container&&(tn(l,pe),rn(l),Oe(l));b=!1}x=y=a.currItem.initialZoomLevel,(ee=a.currItem.bounds)&&(de.x=ee.center.x,de.y=ee.center.y,Ee(!0)),Me("resize")},zoomTo:function(e,t,n,i,a){t&&(x=y,ft.x=Math.abs(t.x)-de.x,ft.y=Math.abs(t.y)-de.y,Pe(ce,de));var r=Ue(e,!1),l={};Be("x",r,l,e),Be("y",r,l,e);var s=y,u={x:de.x,y:de.y};Fe(l);var c=function(t){1===t?(y=e,de.x=l.x,de.y=l.y):(y=(e-s)*t+s,de.x=(l.x-u.x)*t+u.x,de.y=(l.y-u.y)*t+u.y),a&&a(t),Ee(1===t)};n?Qe("customZoomTo",0,1,n,i||o.easing.sine.inOut,c):c(1)}},tt={},nt={},it={},ot={},at={},rt=[],lt={},st=[],ut={},ct=0,dt={x:0,y:0},pt=0,mt={x:0,y:0},ft={x:0,y:0},ht={x:0,y:0},yt=function(e,t){return e.x===t.x&&e.y===t.y},xt=function(e,t){return Math.abs(e.x-t.x)<25&&Math.abs(e.y-t.y)<25},vt=function(e,t){return ut.x=Math.abs(e.x-t.x),ut.y=Math.abs(e.y-t.y),Math.sqrt(ut.x*ut.x+ut.y*ut.y)},gt=function(){K&&(R(K),K=null)},wt=function(){W&&(K=k(wt),Lt())},bt=function(){return!("fit"===r.scaleMode&&y===a.currItem.initialZoomLevel)},It=function(e,t){return!(!e||e===document)&&!(e.getAttribute("class")&&e.getAttribute("class").indexOf("pswp__scroll-wrap")>-1)&&(t(e)?e:It(e.parentNode,t))},Ct={},Dt=function(e,t){return Ct.prevent=!It(e.target,r.isClickableElement),Me("preventDragEvent",e,t,Ct),Ct.prevent},Mt=function(e,t){return t.x=e.pageX,t.y=e.pageY,t.id=e.identifier,t},Tt=function(e,t,n){n.x=.5*(e.x+t.x),n.y=.5*(e.y+t.y)},St=function(e,t,n){if(e-N>50){var i=st.length>2?st.shift():{};i.x=t,i.y=n,st.push(i),N=e}},At=function(){var e=de.y-a.currItem.initialPosition.y;return 1-Math.abs(e/(pe.y/2))},Et={},Ot={},kt=[],Rt=function(e){for(;kt.length>0;)kt.pop();return E?(se=0,rt.forEach(function(e){0===se?kt[0]=e:1===se&&(kt[1]=e),se++})):e.type.indexOf("touch")>-1?e.touches&&e.touches.length>0&&(kt[0]=Mt(e.touches[0],Et),e.touches.length>1&&(kt[1]=Mt(e.touches[1],Ot))):(Et.x=e.pageX,Et.y=e.pageY,Et.id="",kt[0]=Et),kt},Zt=function(e,t){var n,i,o,l,s=de[e]+t[e],u=t[e]>0,c=mt.x+t.x,d=mt.x-lt.x;if(n=s>ee.min[e]||s<ee.max[e]?r.panEndFriction:1,s=de[e]+t[e]*n,(r.allowPanToNext||y===a.currItem.initialZoomLevel)&&(te?"h"!==ie||"x"!==e||X||(u?(s>ee.min[e]&&(n=r.panEndFriction,ee.min[e],i=ee.min[e]-ce[e]),(i<=0||d<0)&&Kt()>1?(l=c,d<0&&c>lt.x&&(l=lt.x)):ee.min.x!==ee.max.x&&(o=s)):(s<ee.max[e]&&(n=r.panEndFriction,ee.max[e],i=ce[e]-ee.max[e]),(i<=0||d>0)&&Kt()>1?(l=c,d>0&&c<lt.x&&(l=lt.x)):ee.min.x!==ee.max.x&&(o=s))):l=c,"x"===e))return l!==undefined&&(Re(l,!0),q=l!==lt.x),ee.min.x!==ee.max.x&&(o!==undefined?de.x=o:q||(de.x+=t.x*n)),l!==undefined;ne||q||y>a.currItem.fitRatio&&(de[e]+=t[e]*n)},Pt=function(e){if(!("mousedown"===e.type&&e.button>0))if(Xt)e.preventDefault();else if(!B||"mousedown"!==e.type){if(Dt(e,!0)&&e.preventDefault(),Me("pointerDown"),E){var t=o.arraySearch(rt,e.pointerId,"id");t<0&&(t=rt.length),rt[t]={x:e.pageX,y:e.pageY,id:e.pointerId}}var n=Rt(e),i=n.length;$=null,Je(),W&&1!==i||(W=oe=!0,o.bind(window,m,a),H=le=ae=Y=q=V=G=X=!1,ie=null,Me("firstTouchStart",n),Pe(ce,de),ue.x=ue.y=0,Pe(ot,n[0]),Pe(at,ot),lt.x=he.x*me,st=[{x:ot.x,y:ot.y}],N=z=Te(),Ue(y,!0),gt(),wt()),!j&&i>1&&!ne&&!q&&(x=y,X=!1,j=G=!0,ue.y=ue.x=0,Pe(ce,de),Pe(tt,n[0]),Pe(nt,n[1]),Tt(tt,nt,ht),ft.x=Math.abs(ht.x)-de.x,ft.y=Math.abs(ht.y)-de.y,J=Q=vt(tt,nt))}},Ft=function(e){if(e.preventDefault(),E){var t=o.arraySearch(rt,e.pointerId,"id");if(t>-1){var n=rt[t];n.x=e.pageX,n.y=e.pageY}}if(W){var i=Rt(e);if(ie||V||j)$=i;else if(mt.x!==he.x*me)ie="h";else{var a=Math.abs(i[0].x-ot.x)-Math.abs(i[0].y-ot.y);Math.abs(a)>=10&&(ie=a>0?"h":"v",$=i)}}},Lt=function(){if($){var e=$.length;if(0!==e)if(Pe(tt,$[0]),it.x=tt.x-ot.x,it.y=tt.y-ot.y,j&&e>1){if(ot.x=tt.x,ot.y=tt.y,!it.x&&!it.y&&yt($[1],nt))return;Pe(nt,$[1]),X||(X=!0,Me("zoomGestureStarted"));var t=vt(tt,nt),n=Ht(t);n>a.currItem.initialZoomLevel+a.currItem.initialZoomLevel/15&&(le=!0);var i=1,o=He(),l=Ye();if(n<o)if(r.pinchToClose&&!le&&x<=a.currItem.initialZoomLevel){var s=1-(o-n)/(o/1.2);Se(s),Me("onPinchClose",s),ae=!0}else(i=(o-n)/o)>1&&(i=1),n=o-i*(o/3);else n>l&&((i=(n-l)/(6*o))>1&&(i=1),n=l+i*o);i<0&&(i=0),J=t,Tt(tt,nt,dt),ue.x+=dt.x-ht.x,ue.y+=dt.y-ht.y,Pe(ht,dt),de.x=Ze("x",n),de.y=Ze("y",n),H=n>y,y=n,Ee()}else{if(!ie)return;if(oe&&(oe=!1,Math.abs(it.x)>=10&&(it.x-=$[0].x-at.x),Math.abs(it.y)>=10&&(it.y-=$[0].y-at.y)),ot.x=tt.x,ot.y=tt.y,0===it.x&&0===it.y)return;if("v"===ie&&r.closeOnVerticalDrag&&!bt()){ue.y+=it.y,de.y+=it.y;var u=At();return Y=!0,Me("onVerticalDrag",u),Se(u),void Ee()}St(Te(),tt.x,tt.y),V=!0,ee=a.currItem.bounds,Zt("x",it)||(Zt("y",it),Fe(de),Ee())}}},_t=function(e){if(_.isOldAndroid){if(B&&"mouseup"===e.type)return;e.type.indexOf("touch")>-1&&(clearTimeout(B),B=setTimeout(function(){B=0},600))}Me("pointerUp"),Dt(e,!1)&&e.preventDefault();var t;if(E){var n=o.arraySearch(rt,e.pointerId,"id");if(n>-1)if(t=rt.splice(n,1)[0],navigator.pointerEnabled)t.type=e.pointerType||"mouse";else{var i={4:"mouse",2:"touch",3:"pen"};t.type=i[e.pointerType],t.type||(t.type=e.pointerType||"mouse")}}var l,s=Rt(e),u=s.length;if("mouseup"===e.type&&(u=0),2===u)return $=null,!0;1===u&&Pe(at,s[0]),0!==u||ie||ne||(t||("mouseup"===e.type?t={x:e.pageX,y:e.pageY,type:"mouse"}:e.changedTouches&&e.changedTouches[0]&&(t={x:e.changedTouches[0].pageX,y:e.changedTouches[0].pageY,type:"touch"})),Me("touchRelease",e,t));var c=-1;if(0===u&&(W=!1,o.unbind(window,m,a),gt(),j?c=0:-1!==pt&&(c=Te()-pt)),pt=1===u?Te():-1,l=-1!==c&&c<150?"zoom":"swipe",j&&u<2&&(j=!1,1===u&&(l="zoomPointerUp"),Me("zoomGestureEnded")),$=null,V||X||ne||Y)if(Je(),U||(U=zt()),U.calculateSwipeSpeed("x"),Y)if(At()<r.verticalDragRange)a.close();else{var d=de.y,p=re;Qe("verticalDrag",0,1,300,o.easing.cubic.out,function(e){de.y=(a.currItem.initialPosition.y-d)*e+d,Se((1-p)*e+p),Ee()}),Me("onVerticalDrag",1)}else{if((q||ne)&&0===u){if(Ut(l,U))return;l="zoomPointerUp"}ne||("swipe"===l?!q&&y>a.currItem.fitRatio&&Nt(U):Yt())}},zt=function(){var e,t,n={lastFlickOffset:{},lastFlickDist:{},lastFlickSpeed:{},slowDownRatio:{},slowDownRatioReverse:{},speedDecelerationRatio:{},speedDecelerationRatioAbs:{},distanceOffset:{},backAnimDestination:{},backAnimStarted:{},calculateSwipeSpeed:function(i){st.length>1?(e=Te()-N+50,t=st[st.length-2][i]):(e=Te()-z,t=at[i]),n.lastFlickOffset[i]=ot[i]-t,n.lastFlickDist[i]=Math.abs(n.lastFlickOffset[i]),n.lastFlickDist[i]>20?n.lastFlickSpeed[i]=n.lastFlickOffset[i]/e:n.lastFlickSpeed[i]=0,Math.abs(n.lastFlickSpeed[i])<.1&&(n.lastFlickSpeed[i]=0),n.slowDownRatio[i]=.95,n.slowDownRatioReverse[i]=1-n.slowDownRatio[i],n.speedDecelerationRatio[i]=1},calculateOverBoundsAnimOffset:function(e,t){n.backAnimStarted[e]||(de[e]>ee.min[e]?n.backAnimDestination[e]=ee.min[e]:de[e]<ee.max[e]&&(n.backAnimDestination[e]=ee.max[e]),n.backAnimDestination[e]!==undefined&&(n.slowDownRatio[e]=.7,n.slowDownRatioReverse[e]=1-n.slowDownRatio[e],n.speedDecelerationRatioAbs[e]<.05&&(n.lastFlickSpeed[e]=0,n.backAnimStarted[e]=!0,Qe("bounceZoomPan"+e,de[e],n.backAnimDestination[e],t||300,o.easing.sine.out,function(t){de[e]=t,Ee()}))))},calculateAnimOffset:function(e){n.backAnimStarted[e]||(n.speedDecelerationRatio[e]=n.speedDecelerationRatio[e]*(n.slowDownRatio[e]+n.slowDownRatioReverse[e]-n.slowDownRatioReverse[e]*n.timeDiff/10),n.speedDecelerationRatioAbs[e]=Math.abs(n.lastFlickSpeed[e]*n.speedDecelerationRatio[e]),n.distanceOffset[e]=n.lastFlickSpeed[e]*n.speedDecelerationRatio[e]*n.timeDiff,de[e]+=n.distanceOffset[e])},panAnimLoop:function(){if(Ke.zoomPan&&(Ke.zoomPan.raf=k(n.panAnimLoop),n.now=Te(),n.timeDiff=n.now-n.lastNow,n.lastNow=n.now,n.calculateAnimOffset("x"),n.calculateAnimOffset("y"),Ee(),n.calculateOverBoundsAnimOffset("x"),n.calculateOverBoundsAnimOffset("y"),n.speedDecelerationRatioAbs.x<.05&&n.speedDecelerationRatioAbs.y<.05))return de.x=Math.round(de.x),de.y=Math.round(de.y),Ee(),void $e("zoomPan")}};return n},Nt=function(e){if(e.calculateSwipeSpeed("y"),ee=a.currItem.bounds,e.backAnimDestination={},e.backAnimStarted={},Math.abs(e.lastFlickSpeed.x)<=.05&&Math.abs(e.lastFlickSpeed.y)<=.05)return e.speedDecelerationRatioAbs.x=e.speedDecelerationRatioAbs.y=0,e.calculateOverBoundsAnimOffset("x"),e.calculateOverBoundsAnimOffset("y"),!0;je("zoomPan"),e.lastNow=Te(),e.panAnimLoop()},Ut=function(e,t){var n;ne||(ct=c);var i;if("swipe"===e){var l=ot.x-at.x,s=t.lastFlickDist.x<10;l>30&&(s||t.lastFlickOffset.x>20)?i=-1:l<-30&&(s||t.lastFlickOffset.x<-20)&&(i=1)}var u;i&&((c+=i)<0?(c=r.loop?Kt()-1:0,u=!0):c>=Kt()&&(c=r.loop?0:Kt()-1,u=!0),u&&!r.loop||(ye+=i,me-=i,n=!0));var d,p=he.x*me,m=Math.abs(p-mt.x);return n||p>mt.x==t.lastFlickSpeed.x>0?(d=Math.abs(t.lastFlickSpeed.x)>0?m/Math.abs(t.lastFlickSpeed.x):333,d=Math.min(d,400),d=Math.max(d,250)):d=333,ct===c&&(n=!1),ne=!0,Me("mainScrollAnimStart"),Qe("mainScroll",mt.x,p,d,o.easing.cubic.out,Re,function(){Je(),ne=!1,ct=-1,(n||ct!==c)&&a.updateCurrItem(),Me("mainScrollAnimComplete")}),n&&a.updateCurrItem(!0),n},Ht=function(e){return 1/Q*e*x},Yt=function(){var e=y,t=He(),n=Ye();y<t?e=t:y>n&&(e=n);var i,r=re;return ae&&!H&&!le&&y<t?(a.close(),!0):(ae&&(i=function(e){Se((1-r)*e+r)}),a.zoomTo(e,0,200,o.easing.cubic.out,i),!0)};be("Gestures",{publicMethods:{initGestures:function(){var e=function(e,t,n,i,o){D=e+t,M=e+n,T=e+i,S=o?e+o:""};(E=_.pointerEvent)&&_.touch&&(_.touch=!1),E?navigator.pointerEnabled?e("pointer","down","move","up","cancel"):e("MSPointer","Down","Move","Up","Cancel"):_.touch?(e("touch","start","move","end","cancel"),O=!0):e("mouse","down","move","up"),m=M+" "+T+" "+S,f=D,E&&!O&&(O=navigator.maxTouchPoints>1||navigator.msMaxTouchPoints>1),a.likelyTouchDevice=O,h[D]=Pt,h[M]=Ft,h[T]=_t,S&&(h[S]=h[T]),_.touch&&(f+=" mousedown",m+=" mousemove mouseup",h.mousedown=h[D],h.mousemove=h[M],h.mouseup=h[T]),O||(r.allowPanToNext=!1)}}});var Bt,Wt,Gt,Xt,Vt,Kt,qt,$t=function(t,n,i,l){Bt&&clearTimeout(Bt),Xt=!0,Gt=!0;var s;t.initialLayout?(s=t.initialLayout,t.initialLayout=null):s=r.getThumbBoundsFn&&r.getThumbBoundsFn(c);var d=i?r.hideAnimationDuration:r.showAnimationDuration,p=function(){$e("initialZoom"),i?(a.template.removeAttribute("style"),a.bg.removeAttribute("style")):(Se(1),n&&(n.style.display="block"),o.addClass(e,"pswp--animated-in"),Me("initialZoom"+(i?"OutEnd":"InEnd"))),l&&l(),Xt=!1};if(!d||!s||s.x===undefined)return Me("initialZoom"+(i?"Out":"In")),y=t.initialZoomLevel,Pe(de,t.initialPosition),Ee(),e.style.opacity=i?0:1,Se(1),void(d?setTimeout(function(){p()},d):p());!function(){var n=u,l=!a.currItem.src||a.currItem.loadError||r.showHideOpacity;t.miniImg&&(t.miniImg.style.webkitBackfaceVisibility="hidden"),i||(y=s.w/t.w,de.x=s.x,de.y=s.y-P,a[l?"template":"bg"].style.opacity=.001,Ee()),je("initialZoom"),i&&!n&&o.removeClass(e,"pswp--animated-in"),l&&(i?o[(n?"remove":"add")+"Class"](e,"pswp--animate_opacity"):setTimeout(function(){o.addClass(e,"pswp--animate_opacity")},30)),Bt=setTimeout(function(){if(Me("initialZoom"+(i?"Out":"In")),i){var a=s.w/t.w,r={x:de.x,y:de.y},u=y,c=re,m=function(t){1===t?(y=a,de.x=s.x,de.y=s.y-L):(y=(a-u)*t+u,de.x=(s.x-r.x)*t+r.x,de.y=(s.y-L-r.y)*t+r.y),Ee(),l?e.style.opacity=1-t:Se(c-t*c)};n?Qe("initialZoom",0,1,d,o.easing.cubic.out,m,p):(m(1),Bt=setTimeout(p,d+20))}else y=t.initialZoomLevel,Pe(de,t.initialPosition),Ee(),Se(1),l?e.style.opacity=1:Se(1),Bt=setTimeout(p,d+20)},i?25:90)}()},jt={},Jt=[],Qt={index:0,errorMsg:'<div class="pswp__error-msg"><a href="%url%" target="_blank">The image</a> could not be loaded.</div>',forceProgressiveLoading:!1,preload:[1,1],getNumItemsFn:function(){return Wt.length}},en=function(e,t,n){var i=e.bounds;i.center.x=Math.round((jt.x-t)/2),i.center.y=Math.round((jt.y-n)/2)+e.vGap.top,i.max.x=t>jt.x?Math.round(jt.x-t):i.center.x,i.max.y=n>jt.y?Math.round(jt.y-n)+e.vGap.top:i.center.y,i.min.x=t>jt.x?0:i.center.x,i.min.y=n>jt.y?e.vGap.top:i.center.y},tn=function(e,t,n){if(e.src&&!e.loadError){var i=!n;if(i&&(e.vGap||(e.vGap={top:0,bottom:0}),Me("parseVerticalMargin",e)),jt.x=t.x,jt.y=t.y-e.vGap.top-e.vGap.bottom,i){var o=jt.x/e.w,a=jt.y/e.h;e.fitRatio=o<a?o:a;var l=r.scaleMode;"orig"===l?n=1:"fit"===l&&(n=e.fitRatio),n>1&&(n=1),e.initialZoomLevel=n,e.bounds||(e.bounds={center:{x:0,y:0},max:{x:0,y:0},min:{x:0,y:0}})}if(!n)return;return en(e,e.w*n,e.h*n),i&&n===e.initialZoomLevel&&(e.initialPosition=e.bounds.center),e.bounds}return e.w=e.h=0,e.initialZoomLevel=e.fitRatio=1,e.bounds={center:{x:0,y:0},max:{x:0,y:0},min:{x:0,y:0}},e.initialPosition=e.bounds.center,e.bounds},nn=function(e,t,n,i,o,r){t.loadError||i&&(t.imageAppended=!0,rn(t,i,t===a.currItem&&we),n.appendChild(i),r&&setTimeout(function(){t&&t.loaded&&t.placeholder&&(t.placeholder.style.display="none",t.placeholder=null)},500))},on=function(e){e.loading=!0,e.loaded=!1;var t=e.img=o.createEl("pswp__img","img"),n=function(){e.loading=!1,e.loaded=!0,e.loadComplete?e.loadComplete(e):e.img=null,t.onload=t.onerror=null,t=null};return t.onload=n,t.onerror=function(){e.loadError=!0,n()},t.src=e.src,t},an=function(e,t){if(e.src&&e.loadError&&e.container)return t&&(e.container.innerHTML=""),e.container.innerHTML=r.errorMsg.replace("%url%",e.src),!0},rn=function(e,t,n){if(e.src){t||(t=e.container.lastChild);var i=n?e.w:Math.round(e.w*e.fitRatio),o=n?e.h:Math.round(e.h*e.fitRatio);e.placeholder&&!e.loaded&&(e.placeholder.style.width=i+"px",e.placeholder.style.height=o+"px"),t.style.width=i+"px",t.style.height=o+"px"}},ln=function(){if(Jt.length){for(var e,t=0;t<Jt.length;t++)(e=Jt[t]).holder.index===e.index&&nn(e.index,e.item,e.baseDiv,e.img,0,e.clearPlaceholder);Jt=[]}};be("Controller",{publicMethods:{lazyLoadItem:function(e){e=Ie(e);var t=Vt(e);t&&(!t.loaded&&!t.loading||b)&&(Me("gettingData",e,t),t.src&&on(t))},initController:function(){o.extend(r,Qt,!0),a.items=Wt=n,Vt=a.getItemAt,Kt=r.getNumItemsFn,qt=r.loop,Kt()<3&&(r.loop=!1),De("beforeChange",function(e){var t,n=r.preload,i=null===e||e>=0,o=Math.min(n[0],Kt()),l=Math.min(n[1],Kt());for(t=1;t<=(i?l:o);t++)a.lazyLoadItem(c+t);for(t=1;t<=(i?o:l);t++)a.lazyLoadItem(c-t)}),De("initialLayout",function(){a.currItem.initialLayout=r.getThumbBoundsFn&&r.getThumbBoundsFn(c)}),De("mainScrollAnimComplete",ln),De("initialZoomInEnd",ln),De("destroy",function(){for(var e,t=0;t<Wt.length;t++)(e=Wt[t]).container&&(e.container=null),e.placeholder&&(e.placeholder=null),e.img&&(e.img=null),e.preloader&&(e.preloader=null),e.loadError&&(e.loaded=e.loadError=!1);Jt=null})},getItemAt:function(e){return e>=0&&Wt[e]!==undefined&&Wt[e]},allowProgressiveImg:function(){return r.forceProgressiveLoading||!O||r.mouseUsed||screen.width>1200},setContent:function(e,t){r.loop&&(t=Ie(t));var n=a.getItemAt(e.index);n&&(n.container=null);var i,s=a.getItemAt(t);if(s){Me("gettingData",t,s),e.index=t,e.item=s;var u=s.container=o.createEl("pswp__zoom-wrap");if(!s.src&&s.html&&(s.html.tagName?u.appendChild(s.html):u.innerHTML=s.html),an(s),tn(s,pe),!s.src||s.loadError||s.loaded)s.src&&!s.loadError&&((i=o.createEl("pswp__img","img")).style.opacity=1,i.src=s.src,rn(s,i),nn(0,s,u,i));else{if(s.loadComplete=function(n){if(l){if(e&&e.index===t){if(an(n,!0))return n.loadComplete=n.img=null,tn(n,pe),Oe(n),void(e.index===c&&a.updateCurrZoomItem());n.imageAppended?!Xt&&n.placeholder&&(n.placeholder.style.display="none",n.placeholder=null):_.transform&&(ne||Xt)?Jt.push({item:n,baseDiv:u,img:n.img,index:t,holder:e,clearPlaceholder:!0}):nn(0,n,u,n.img,0,!0)}n.loadComplete=null,n.img=null,Me("imageLoadComplete",t,n)}},o.features.transform){var d="pswp__img pswp__img--placeholder";d+=s.msrc?"":" pswp__img--placeholder--blank";var p=o.createEl(d,s.msrc?"img":"");s.msrc&&(p.src=s.msrc),rn(s,p),u.appendChild(p),s.placeholder=p}s.loading||on(s),a.allowProgressiveImg()&&(!Gt&&_.transform?Jt.push({item:s,baseDiv:u,img:s.img,index:t,holder:e}):nn(0,s,u,s.img,0,!0))}Gt||t!==c?Oe(s):(te=u.style,$t(s,i||s.img)),e.el.innerHTML="",e.el.appendChild(u)}else e.el.innerHTML=""},cleanSlide:function(e){e.img&&(e.img.onload=e.img.onerror=null),e.loaded=e.loading=e.img=e.imageAppended=!1}}});var sn,un={},cn=function(e,t,n){var i=document.createEvent("CustomEvent"),o={origEvent:e,target:e.target,releasePoint:t,pointerType:n||"touch"};i.initCustomEvent("pswpTap",!0,!0,o),e.target.dispatchEvent(i)};be("Tap",{publicMethods:{initTap:function(){De("firstTouchStart",a.onTapStart),De("touchRelease",a.onTapRelease),De("destroy",function(){un={},sn=null})},onTapStart:function(e){e.length>1&&(clearTimeout(sn),sn=null)},onTapRelease:function(e,t){if(t&&!V&&!G&&!qe){var n=t;if(sn&&(clearTimeout(sn),sn=null,xt(n,un)))return void Me("doubleTap",n);if("mouse"===t.type)return void cn(e,t,"mouse");if("BUTTON"===e.target.tagName.toUpperCase()||o.hasClass(e.target,"pswp__single-tap"))return void cn(e,t);Pe(un,n),sn=setTimeout(function(){cn(e,t),sn=null},300)}}}});var dn;be("DesktopZoom",{publicMethods:{initDesktopZoom:function(){F||(O?De("mouseUsed",function(){a.setupDesktopZoom()}):a.setupDesktopZoom(!0))},setupDesktopZoom:function(t){dn={};var n="wheel mousewheel DOMMouseScroll";De("bindEvents",function(){o.bind(e,n,a.handleMouseWheel)}),De("unbindEvents",function(){dn&&o.unbind(e,n,a.handleMouseWheel)}),a.mouseZoomedIn=!1;var i,r=function(){a.mouseZoomedIn&&(o.removeClass(e,"pswp--zoomed-in"),a.mouseZoomedIn=!1),y<1?o.addClass(e,"pswp--zoom-allowed"):o.removeClass(e,"pswp--zoom-allowed"),l()},l=function(){i&&(o.removeClass(e,"pswp--dragging"),i=!1)};De("resize",r),De("afterChange",r),De("pointerDown",function(){a.mouseZoomedIn&&(i=!0,o.addClass(e,"pswp--dragging"))}),De("pointerUp",l),t||r()},handleMouseWheel:function(e){if(y<=a.currItem.fitRatio)return r.modal&&(!r.closeOnScroll||qe||W?e.preventDefault():A&&Math.abs(e.deltaY)>2&&(u=!0,a.close())),!0;if(e.stopPropagation(),dn.x=0,"deltaX"in e)1===e.deltaMode?(dn.x=18*e.deltaX,dn.y=18*e.deltaY):(dn.x=e.deltaX,dn.y=e.deltaY);else if("wheelDelta"in e)e.wheelDeltaX&&(dn.x=-.16*e.wheelDeltaX),e.wheelDeltaY?dn.y=-.16*e.wheelDeltaY:dn.y=-.16*e.wheelDelta;else{if(!("detail"in e))return;dn.y=e.detail}Ue(y,!0);var t=de.x-dn.x,n=de.y-dn.y;(r.modal||t<=ee.min.x&&t>=ee.max.x&&n<=ee.min.y&&n>=ee.max.y)&&e.preventDefault(),a.panTo(t,n)},toggleDesktopZoom:function(t){t=t||{x:pe.x/2+fe.x,y:pe.y/2+fe.y};var n=r.getDoubleTapZoom(!0,a.currItem),i=y===n;a.mouseZoomedIn=!i,a.zoomTo(i?a.currItem.initialZoomLevel:n,t,333),o[(i?"remove":"add")+"Class"](e,"pswp--zoomed-in")}}});var pn,mn,fn,hn,yn,xn,vn,gn,wn,bn,In,Cn,Dn={history:!0,galleryUID:1},Mn=function(){return In.hash.substring(1)},Tn=function(){pn&&clearTimeout(pn),fn&&clearTimeout(fn)},Sn=function(){var e=Mn(),t={};if(e.length<5)return t;var n,i=e.split("&");for(n=0;n<i.length;n++)if(i[n]){var o=i[n].split("=");o.length<2||(t[o[0]]=o[1])}if(r.galleryPIDs){var a=t.pid;for(t.pid=0,n=0;n<Wt.length;n++)if(Wt[n].pid===a){t.pid=n;break}}else t.pid=parseInt(t.pid,10)-1;return t.pid<0&&(t.pid=0),t},An=function(){if(fn&&clearTimeout(fn),qe||W)fn=setTimeout(An,500);else{hn?clearTimeout(mn):hn=!0;var e=c+1,t=Vt(c);t.hasOwnProperty("pid")&&(e=t.pid);var n=vn+"&gid="+r.galleryUID+"&pid="+e;gn||-1===In.hash.indexOf(n)&&(bn=!0);var i=In.href.split("#")[0]+"#"+n;Cn?"#"+n!==window.location.hash&&history[gn?"replaceState":"pushState"]("",document.title,i):gn?In.replace(i):In.hash=n,gn=!0,mn=setTimeout(function(){hn=!1},60)}};be("History",{publicMethods:{initHistory:function(){if(o.extend(r,Dn,!0),r.history){In=window.location,bn=!1,wn=!1,gn=!1,vn=Mn(),Cn="pushState"in history,vn.indexOf("gid=")>-1&&(vn=vn.split("&gid=")[0],vn=vn.split("?gid=")[0]),De("afterChange",a.updateURL),De("unbindEvents",function(){o.unbind(window,"hashchange",a.onHashChange)});var e=function(){xn=!0,wn||(bn?history.back():vn?In.hash=vn:Cn?history.pushState("",document.title,In.pathname+In.search):In.hash=""),Tn()};De("unbindEvents",function(){u&&e()}),De("destroy",function(){xn||e()}),De("firstUpdate",function(){c=Sn().pid});var t=vn.indexOf("pid=");t>-1&&"&"===(vn=vn.substring(0,t)).slice(-1)&&(vn=vn.slice(0,-1)),setTimeout(function(){l&&o.bind(window,"hashchange",a.onHashChange)},40)}},onHashChange:function(){if(Mn()===vn)return wn=!0,void a.close();hn||(yn=!0,a.goTo(Sn().pid),yn=!1)},updateURL:function(){Tn(),yn||(gn?pn=setTimeout(An,800):An())}}}),o.extend(a,et)}});
;/*! PhotoSwipe Default UI - 4.1.1 - 2015-12-24
* http://photoswipe.com
* Copyright (c) 2015 Dmitry Semenov; */
!function(e,t){"function"==typeof define&&define.amd?define(t):"object"==typeof exports?module.exports=t():e.PhotoSwipeUI_Default=t()}(this,function(){"use strict";return function(e,t){var n,o,l,r,i,s,a,u,c,p,d,m,f,h,w,g,v,b,_,C=this,T=!1,I=!0,E=!0,F={barsSize:{top:44,bottom:"auto"},closeElClasses:["item","caption","zoom-wrap","ui","top-bar"],timeToIdle:4e3,timeToIdleOutside:1e3,loadingIndicatorDelay:1e3,addCaptionHTMLFn:function(e,t){return e.title?(t.children[0].innerHTML=e.title,!0):(t.children[0].innerHTML="",!1)},closeEl:!0,captionEl:!0,fullscreenEl:!0,zoomEl:!0,shareEl:!0,counterEl:!0,arrowEl:!0,preloaderEl:!0,tapToClose:!1,tapToToggleControls:!0,clickToCloseNonZoomable:!0,shareButtons:[{id:"facebook",label:"Share on Facebook",url:"https://www.facebook.com/sharer/sharer.php?u={{url}}"},{id:"twitter",label:"Tweet",url:"https://twitter.com/intent/tweet?text={{text}}&url={{url}}"},{id:"pinterest",label:"Pin it",url:"http://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}"},{id:"download",label:"Download image",url:"{{raw_image_url}}",download:!0}],getImageURLForShare:function(){return e.currItem.src||""},getPageURLForShare:function(){return window.location.href},getTextForShare:function(){return e.currItem.title||""},indexIndicatorSep:" / ",fitControlsWidth:1200},x=function(e){if(g)return!0;e=e||window.event,w.timeToIdle&&w.mouseUsed&&!c&&D();for(var n,o,l=(e.target||e.srcElement).getAttribute("class")||"",r=0;r<N.length;r++)(n=N[r]).onTap&&l.indexOf("pswp__"+n.name)>-1&&(n.onTap(),o=!0);if(o){e.stopPropagation&&e.stopPropagation(),g=!0;var i=t.features.isOldAndroid?600:30;v=setTimeout(function(){g=!1},i)}},S=function(){return!e.likelyTouchDevice||w.mouseUsed||screen.width>w.fitControlsWidth},k=function(e,n,o){t[(o?"add":"remove")+"Class"](e,"pswp__"+n)},K=function(){var e=1===w.getNumItemsFn();e!==h&&(k(o,"ui--one-slide",e),h=e)},L=function(){k(a,"share-modal--hidden",E)},O=function(){return(E=!E)?(t.removeClass(a,"pswp__share-modal--fade-in"),setTimeout(function(){E&&L()},300)):(L(),setTimeout(function(){E||t.addClass(a,"pswp__share-modal--fade-in")},30)),E||y(),!1},R=function(t){var n=(t=t||window.event).target||t.srcElement;return e.shout("shareLinkClick",t,n),!(!n.href||!n.hasAttribute("download")&&(window.open(n.href,"pswp_share","scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=550,height=420,top=100,left="+(window.screen?Math.round(screen.width/2-275):100)),E||O(),1))},y=function(){for(var e,t,n,o,l="",r=0;r<w.shareButtons.length;r++)e=w.shareButtons[r],t=w.getImageURLForShare(e),n=w.getPageURLForShare(e),o=w.getTextForShare(e),l+='<a href="'+e.url.replace("{{url}}",encodeURIComponent(n)).replace("{{image_url}}",encodeURIComponent(t)).replace("{{raw_image_url}}",t).replace("{{text}}",encodeURIComponent(o))+'" target="_blank" class="pswp__share--'+e.id+'"'+(e.download?"download":"")+">"+e.label+"</a>",w.parseShareButtonOut&&(l=w.parseShareButtonOut(e,l));a.children[0].innerHTML=l,a.children[0].onclick=R},z=function(e){for(var n=0;n<w.closeElClasses.length;n++)if(t.hasClass(e,"pswp__"+w.closeElClasses[n]))return!0},M=0,D=function(){clearTimeout(_),M=0,c&&C.setIdle(!1)},A=function(e){var t=(e=e||window.event).relatedTarget||e.toElement;t&&"HTML"!==t.nodeName||(clearTimeout(_),_=setTimeout(function(){C.setIdle(!0)},w.timeToIdleOutside))},P=function(){w.fullscreenEl&&!t.features.isOldAndroid&&(n||(n=C.getFullscreenAPI()),n?(t.bind(document,n.eventK,C.updateFullscreen),C.updateFullscreen(),t.addClass(e.template,"pswp--supports-fs")):t.removeClass(e.template,"pswp--supports-fs"))},U=function(){w.preloaderEl&&(Z(!0),p("beforeChange",function(){clearTimeout(f),f=setTimeout(function(){e.currItem&&e.currItem.loading?(!e.allowProgressiveImg()||e.currItem.img&&!e.currItem.img.naturalWidth)&&Z(!1):Z(!0)},w.loadingIndicatorDelay)}),p("imageLoadComplete",function(t,n){e.currItem===n&&Z(!0)}))},Z=function(e){m!==e&&(k(d,"preloader--active",!e),m=e)},q=function(e){var n=e.vGap;if(S()){var i=w.barsSize;if(w.captionEl&&"auto"===i.bottom)if(r||((r=t.createEl("pswp__caption pswp__caption--fake")).appendChild(t.createEl("pswp__caption__center")),o.insertBefore(r,l),t.addClass(o,"pswp__ui--fit")),w.addCaptionHTMLFn(e,r,!0)){var s=r.clientHeight;n.bottom=parseInt(s,10)||44}else n.bottom=i.top;else n.bottom="auto"===i.bottom?0:i.bottom;n.top=i.top}else n.top=n.bottom=0},B=function(){w.timeToIdle&&p("mouseUsed",function(){t.bind(document,"mousemove",D),t.bind(document,"mouseout",A),b=setInterval(function(){2==++M&&C.setIdle(!0)},w.timeToIdle/2)})},H=function(){p("onVerticalDrag",function(e){I&&e<.95?C.hideControls():!I&&e>=.95&&C.showControls()});var e;p("onPinchClose",function(t){I&&t<.9?(C.hideControls(),e=!0):e&&!I&&t>.9&&C.showControls()}),p("zoomGestureEnded",function(){(e=!1)&&!I&&C.showControls()})},N=[{name:"caption",option:"captionEl",onInit:function(e){l=e}},{name:"share-modal",option:"shareEl",onInit:function(e){a=e},onTap:function(){O()}},{name:"button--share",option:"shareEl",onInit:function(e){s=e},onTap:function(){O()}},{name:"button--zoom",option:"zoomEl",onTap:e.toggleDesktopZoom},{name:"counter",option:"counterEl",onInit:function(e){i=e}},{name:"button--close",option:"closeEl",onTap:e.close},{name:"button--arrow--left",option:"arrowEl",onTap:e.prev},{name:"button--arrow--right",option:"arrowEl",onTap:e.next},{name:"button--fs",option:"fullscreenEl",onTap:function(){n.isFullscreen()?n.exit():n.enter()}},{name:"preloader",option:"preloaderEl",onInit:function(e){d=e}}],W=function(){var e,n,l,r=function(o){if(o)for(var r=o.length,i=0;i<r;i++){e=o[i],n=e.className;for(var s=0;s<N.length;s++)l=N[s],n.indexOf("pswp__"+l.name)>-1&&(w[l.option]?(t.removeClass(e,"pswp__element--disabled"),l.onInit&&l.onInit(e)):t.addClass(e,"pswp__element--disabled"))}};r(o.children);var i=t.getChildByClass(o,"pswp__top-bar");i&&r(i.children)};C.init=function(){t.extend(e.options,F,!0),w=e.options,o=t.getChildByClass(e.scrollWrap,"pswp__ui"),p=e.listen,H(),p("beforeChange",C.update),p("doubleTap",function(t){var n=e.currItem.initialZoomLevel;e.getZoomLevel()!==n?e.zoomTo(n,t,333):e.zoomTo(w.getDoubleTapZoom(!1,e.currItem),t,333)}),p("preventDragEvent",function(e,t,n){var o=e.target||e.srcElement;o&&o.getAttribute("class")&&e.type.indexOf("mouse")>-1&&(o.getAttribute("class").indexOf("__caption")>0||/(SMALL|STRONG|EM)/i.test(o.tagName))&&(n.prevent=!1)}),p("bindEvents",function(){t.bind(o,"pswpTap click",x),t.bind(e.scrollWrap,"pswpTap",C.onGlobalTap),e.likelyTouchDevice||t.bind(e.scrollWrap,"mouseover",C.onMouseOver)}),p("unbindEvents",function(){E||O(),b&&clearInterval(b),t.unbind(document,"mouseout",A),t.unbind(document,"mousemove",D),t.unbind(o,"pswpTap click",x),t.unbind(e.scrollWrap,"pswpTap",C.onGlobalTap),t.unbind(e.scrollWrap,"mouseover",C.onMouseOver),n&&(t.unbind(document,n.eventK,C.updateFullscreen),n.isFullscreen()&&(w.hideAnimationDuration=0,n.exit()),n=null)}),p("destroy",function(){w.captionEl&&(r&&o.removeChild(r),t.removeClass(l,"pswp__caption--empty")),a&&(a.children[0].onclick=null),t.removeClass(o,"pswp__ui--over-close"),t.addClass(o,"pswp__ui--hidden"),C.setIdle(!1)}),w.showAnimationDuration||t.removeClass(o,"pswp__ui--hidden"),p("initialZoomIn",function(){w.showAnimationDuration&&t.removeClass(o,"pswp__ui--hidden")}),p("initialZoomOut",function(){t.addClass(o,"pswp__ui--hidden")}),p("parseVerticalMargin",q),W(),w.shareEl&&s&&a&&(E=!0),K(),B(),P(),U()},C.setIdle=function(e){c=e,k(o,"ui--idle",e)},C.update=function(){I&&e.currItem?(C.updateIndexIndicator(),w.captionEl&&(w.addCaptionHTMLFn(e.currItem,l),k(l,"caption--empty",!e.currItem.title)),T=!0):T=!1,E||O(),K()},C.updateFullscreen=function(o){o&&setTimeout(function(){e.setScrollOffset(0,t.getScrollY())},50),t[(n.isFullscreen()?"add":"remove")+"Class"](e.template,"pswp--fs")},C.updateIndexIndicator=function(){w.counterEl&&(i.innerHTML=e.getCurrentIndex()+1+w.indexIndicatorSep+w.getNumItemsFn())},C.onGlobalTap=function(n){var o=(n=n||window.event).target||n.srcElement;if(!g)if(n.detail&&"mouse"===n.detail.pointerType){if(z(o))return void e.close();t.hasClass(o,"pswp__img")&&(1===e.getZoomLevel()&&e.getZoomLevel()<=e.currItem.fitRatio?w.clickToCloseNonZoomable&&e.close():e.toggleDesktopZoom(n.detail.releasePoint))}else if(w.tapToToggleControls&&(I?C.hideControls():C.showControls()),w.tapToClose&&(t.hasClass(o,"pswp__img")||z(o)))return void e.close()},C.onMouseOver=function(e){var t=(e=e||window.event).target||e.srcElement;k(o,"ui--over-close",z(t))},C.hideControls=function(){t.addClass(o,"pswp__ui--hidden"),I=!1},C.showControls=function(){I=!0,T||C.update(),t.removeClass(o,"pswp__ui--hidden")},C.supportsFullscreen=function(){var e=document;return!!(e.exitFullscreen||e.mozCancelFullScreen||e.webkitExitFullscreen||e.msExitFullscreen)},C.getFullscreenAPI=function(){var t,n=document.documentElement,o="fullscreenchange";return n.requestFullscreen?t={enterK:"requestFullscreen",exitK:"exitFullscreen",elementK:"fullscreenElement",eventK:o}:n.mozRequestFullScreen?t={enterK:"mozRequestFullScreen",exitK:"mozCancelFullScreen",elementK:"mozFullScreenElement",eventK:"moz"+o}:n.webkitRequestFullscreen?t={enterK:"webkitRequestFullscreen",exitK:"webkitExitFullscreen",elementK:"webkitFullscreenElement",eventK:"webkit"+o}:n.msRequestFullscreen&&(t={enterK:"msRequestFullscreen",exitK:"msExitFullscreen",elementK:"msFullscreenElement",eventK:"MSFullscreenChange"}),t&&(t.enter=function(){if(u=w.closeOnScroll,w.closeOnScroll=!1,"webkitRequestFullscreen"!==this.enterK)return e.template[this.enterK]();e.template[this.enterK](Element.ALLOW_KEYBOARD_INPUT)},t.exit=function(){return w.closeOnScroll=u,document[this.exitK]()},t.isFullscreen=function(){return document[this.elementK]}),t}}});