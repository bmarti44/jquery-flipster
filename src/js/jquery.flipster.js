(function($) {
  'use strict';
$.fn.flipster = function(options) {
	var isMethodCall = typeof options === 'string' ? true : false,
	 method,
	 args,
	 defaults,
	 settings,
	 win;

	if (isMethodCall) {
		method = options;
		args = Array.prototype.slice.call(arguments, 1);
	} else {
		defaults = {
			itemContainer:			'ul', // Container for the flippin' items.
			itemSelector:				'li', // Selector for children of itemContainer to flip
			style:							'coverflow', // Switch between 'coverflow' or 'carousel' display styles
			start:							'center', // Starting item. Set to 0 to start at the first, 'center' to start in the middle or the index of the item you want to start with.
			
			enableKeyboard:			true, // Enable left/right arrow navigation
			enableMousewheel:		true, // Enable scrollwheel navigation (up = left, down = right)
			enableTouch:				true, // Enable swipe navigation for touch devices
			
			enableNav:					false, // If true, flipster will insert an unordered list of the slides
			enableNavButtons:		false, // If true, flipster will insert Previous / Next buttons
			
			onItemSwitch:				function(){}, // Callback function when items are switches
			disableRotation: false
		};
		
		settings = $.extend({}, defaults, options);

		win = $(window);
	}
	
	return this.each(function(){
		var flipster = $(this),
		  methods,
		  flipItemsOuter,
		  flipItems,
		  flipNav,
		  flipNavItems,
		  current = 0,
		  startTouchX = 0,
		  actionThrottle = 0,
		  throttleTimeout,
		  compatibility;

		if (isMethodCall) {
			methods = flipster.data('methods');
			return methods[method].apply(this, args);
		}
		
		// public methods
		methods = {
			jump: jump
		};
		flipster.data('methods', methods);

		function removeThrottle() {
			actionThrottle = 0;
		}

        function resize() {
            flipItemsOuter.height(calculateBiggestFlipItemHeight());
            flipster.css("height","auto");
            if ( settings.style === 'carousel' ) { flipItemsOuter.width(flipItems.width()); }
        }

        function calculateBiggestFlipItemHeight() {
            var biggestHeight = 0;
            flipItems.each(function() {
                if ($(this).height() > biggestHeight) biggestHeight = $(this).height();
            });
            return biggestHeight;
        }

		function buildNav() {
			if ( settings.enableNav && flipItems.length > 1 ) {
				var navCategories = [],
					navItems = [],
					navList = [];
				
				flipItems.each(function(){
					var category = $(this).data("flip-category"),
						itemId = $(this).attr("id"),
						itemTitle = $(this).attr("title");
						
					if ( typeof category !== 'undefined' ) {
						if ( $.inArray(category,navCategories) < 0 ) {
							navCategories.push(category);
							navList[category] = '<li class="flip-nav-category"><a href="#" class="flip-nav-category-link" data-flip-category="'+category+'">'+category+'</a>\n<ul class="flip-nav-items">\n';
						}
					}
					
					if ( $.inArray(itemId,navItems) < 0 ) {
						navItems.push(itemId);
						link = '<a href="#'+itemId+'" class="flip-nav-item-link">'+itemTitle+'</a></li>\n';
						if ( typeof category !== 'undefined' ) {
							navList[category] = navList[category] + '<li class="flip-nav-item">' + link;
						} else {
							navList[itemId] = '<li class="flip-nav-item no-category">' + link;
						}
					}
				});
				
				navDisplay = '<ul class="flipster-nav">\n';
				for ( var catIndex in navCategories ) {
					navList[navCategories[catIndex]] = navList[navCategories[catIndex]] + "</ul>\n</li>\n";
				}
				for ( var navIndex in navList ) { navDisplay += navList[navIndex]; }
				navDisplay += '</ul>';
				
				flipNav = $(navDisplay).prependTo(flipster);
				flipNavItems = flipNav.find("a").on("click",function(e){
					var target;
					if ( $(this).hasClass("flip-nav-category-link") ) {
						target = flipItems.filter("[data-flip-category='"+$(this).data("flip-category")+"']");
					} else {
						target = $(this.hash);
					}
					
					if ( target.length ) {
						jump(target);
						e.preventDefault();
					}
				});
			}
		}
		
		function updateNav() {
			if ( settings.enableNav && flipItems.length > 1 ) {
				currentItem = $(flipItems[current]);
				flipNav.find(".flip-nav-current").removeClass("flip-nav-current");
				flipNavItems.filter("[href='#"+currentItem.attr("id")+"']").addClass("flip-nav-current");
				flipNavItems.filter("[data-flip-category='"+currentItem.data("flip-category")+"']").parent().addClass("flip-nav-current");
			}
		}
		
		function buildNavButtons() {
			if ( settings.enableNavButtons && flipItems.length > 1 ) {
				flipster.find(".flipto-prev, .flipto-next").remove();
				flipster.append("<a href='#' class='flipto-prev'>Previous</a> <a href='#' class='flipto-next'>Next</a>");
				
				flipster.children('.flipto-prev').on("click", function(e) {
					jump("left");
					e.preventDefault();
				});
				
				flipster.children('.flipto-next').on("click", function(e) {
					jump("right");
					e.preventDefault();
				});
			}
		}
		
		function center() {
			var currentItem = $(flipItems[current]).addClass("flip-current");
			
			flipItems.removeClass("flip-prev flip-next flip-current flip-past flip-future no-transition");
		
			if ( settings.style === 'carousel' ) {
				
				flipItems.addClass("flip-hidden");
			
				var nextItem = $(flipItems[current+1]),
					futureItem = $(flipItems[current+2]),
					prevItem = $(flipItems[current-1]),
					pastItem = $(flipItems[current-2]);
				
				if ( current === 0 ) {
					prevItem = flipItems.last();
					pastItem = prevItem.prev();
				}
				else if ( current === 1 ) {
					pastItem = flipItems.last();
				}
				else if ( current === flipItems.length-2 ) {
					futureItem = flipItems.first();
				}
				else if ( current === flipItems.length-1 ) {
					nextItem = flipItems.first();
					futureItem = $(flipItems[1]);
				}
					
				futureItem.removeClass("flip-hidden").addClass("flip-future");
				pastItem.removeClass("flip-hidden").addClass("flip-past");
				nextItem.removeClass("flip-hidden").addClass("flip-next");
				prevItem.removeClass("flip-hidden").addClass("flip-prev");
					
			} else {
				var spacer = currentItem.outerWidth()/2;
				var totalLeft = 0;
				var totalWidth = flipItemsOuter.width();
				var currentWidth = currentItem.outerWidth();
				var currentLeft = (flipItems.index(currentItem)*currentWidth)/2 +spacer/2;
				
				flipItems.removeClass("flip-hidden");
				
				for (var i = 0; i < flipItems.length; i++) {
					var thisItem = $(flipItems[i]);
					var thisWidth = thisItem.outerWidth();
					
					if (i < current) {
						thisItem.addClass("flip-past")
							.css({
								"z-index" : i,
								"left" : (i*thisWidth/2)+"px"
							});
					}
					else if ( i > current ) {
						thisItem.addClass("flip-future")
							.css({
								"z-index" : flipItems.length-i,
								"left" : (i*thisWidth/2)+spacer+"px"
							});
					}
				}
				
				currentItem.css({
					"z-index" : flipItems.length+1,
					"left" : currentLeft +"px"
				});
				
				totalLeft = (currentLeft + (currentWidth/2)) - (totalWidth/2);
				var newLeftPos = -1*(totalLeft)+"px";
/* Untested Compatibility */
				if (compatibility) {
					var leftItems = $(".flip-past");
					var rightItems = $(".flip-future");
					$(".flip-current").css("zoom", "1.0");
					for (i = 0; i < leftItems.length; i++) {
						$(leftItems[i]).css("zoom", (100-((leftItems.length-i)*5)+"%"));
					}
					for (i = 0; i < rightItems.length; i++) {
						$(rightItems[i]).css("zoom", (100-((i+1)*5)+"%"));
					}

					flipItemsOuter.animate({"left":newLeftPos}, 333);
				}
				else {
					flipItemsOuter.css("left", newLeftPos);
				}
			}
				
			currentItem
				.addClass("flip-current")
				.removeClass("flip-prev flip-next flip-past flip-future flip-hidden");
			
			resize();
			updateNav();
			settings.onItemSwitch.call(this);
		}
		
		function jump(to) {
			if ( flipItems.length > 1 ) {
				if ( to === "left" ) {
					if ( current > 0 ) { current--; }
					else { current = flipItems.length-1; }
				}
				else if ( to === "right" ) {
					if ( current < flipItems.length-1 ) { current++; }
					else { current = 0; }
				} else if ( typeof to === 'number' ) {
					current = to;
				} else {
					// if object is sent, get its index
					current = flipItems.index(to);
				}
				center();
			}
		}
	
		function init() {
/* Untested Compatibility */
				
			// Basic setup
			flipster.addClass("flipster flipster-active flipster-"+settings.style).css("visibility","hidden");
			if (settings.disableRotation)
			  flipster.addClass('no-rotate');
			flipItemsOuter = flipster.find(settings.itemContainer).addClass("flip-items");
			flipItems = flipItemsOuter.find(settings.itemSelector).addClass("flip-item flip-hidden").wrapInner("<div class='flip-content' />");
			
			//Browsers that don't support CSS3 transforms get compatibility:
			var isIEmax8 = ('\v' === 'v'); //IE <= 8
			var checkIE = document.createElement("b");
			checkIE.innerHTML = "<!--[if IE 9]><i></i><![endif]-->"; //IE 9
			var isIE9 = checkIE.getElementsByTagName("i").length === 1;
			if (isIEmax8 || isIE9) {
				compatibility = true;
				flipItemsOuter.addClass("compatibility");
			}
			
	
			// Insert navigation if enabled.
			buildNav();
			buildNavButtons();
			
			
			// Set the starting item
			if ( settings.start && flipItems.length > 1 ) {
				// Find the middle item if start = center
				if ( settings.start === 'center' ) {
					if (!flipItems.length % 2) {
						current = flipItems.length/2 + 1;
					}
					else {
						current = Math.floor(flipItems.length/2);
					}
				} else {
					current = settings.start;
				}
			}
			
			
			// initialize containers
			resize();
			
			
			// Necessary to start flipster invisible and then fadeIn so height/width can be set accurately after page load
			flipster.hide().css("visibility","visible").fadeIn(400,function(){ center(); });
			
			
			// Attach event bindings.
			win.resize(function(){ resize(); center(); });
			
			
			// Navigate directly to an item by clicking
			flipItems.on("click", function(e) {
				if ( !$(this).hasClass("flip-current") ) { e.preventDefault(); }
				jump(flipItems.index(this));
			});
			
			
			// Keyboard Navigation
			if ( settings.enableKeyboard && flipItems.length > 1 ) {
				win.on("keydown.flipster", function(e) {
					actionThrottle++;
					if (actionThrottle % 7 !== 0 && actionThrottle !== 1) return; //if holding the key down, ignore most events
					
					var code = e.which;
					if (code === 37 ) {
						e.preventDefault();
						jump('left');
					}
					else if (code === 39 ) {
						e.preventDefault();
						jump('right');
					}
				});
		
				win.on("keyup.flipster", function(e){
					actionThrottle = 0; //reset action throttle on key lift to avoid throttling new interactions
				});
			}
			
			
			// Mousewheel Navigation
			if ( settings.enableMousewheel && flipItems.length > 1 ) { // TODO: Fix scrollwheel on Firefox
				flipster.on("mousewheel.flipster", function(e){
					throttleTimeout = window.setTimeout(removeThrottle, 500); //throttling should expire if scrolling pauses for a moment.
					actionThrottle++;
					if (actionThrottle % 4 !==0 && actionThrottle !== 1) return; //throttling like with held-down keys
					window.clearTimeout(throttleTimeout);
					
					if ( e.originalEvent.wheelDelta /120 > 0 ) { jump("left"); }
					else { jump("right"); }
					
					e.preventDefault();
				});
			}
			
			
			// Touch Navigation
			if ( settings.enableTouch && flipItems.length > 1 ) {
				flipster.on("touchstart.flipster", function(e) {
					startTouchX = e.originalEvent.targetTouches[0].screenX;
				});
		
				flipster.on("touchmove.flipster", function(e) {
					e.preventDefault();
					var nowX = e.originalEvent.targetTouches[0].screenX;
					var touchDiff = nowX-startTouchX;
					if (touchDiff > flipItems[0].clientWidth/1.75){
						jump("left");
						startTouchX = nowX;
					}else if (touchDiff < -1*(flipItems[0].clientWidth/1.75)){
						jump("right");
						startTouchX = nowX;
					}
				});
		
				flipster.on("touchend.flipster", function(e) {
					startTouchX = 0;
				});
			}
		}
		
		
		// Initialize if flipster is not already active.
		if ( !flipster.hasClass("flipster-active") ) { init(); }
	});
};
})(jQuery);
