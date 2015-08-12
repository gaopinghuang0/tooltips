(function($){

	var LightBox = function(settings) {
		var self = this;

		this.settings = {
			speed: 500,
		};
		$.extend(this.settings, settings || {});

		// Create two divs
		this.popupMask = $("<div id='g-lightbox-mask'>");
		this.popupWin = $("<div id='g-lightbox-popup'>");

		this.bodyNode = $("body");

		this.renderDOM();
		// select DOM after rendering
		this.picViewArea = this.popupWin.find(".lightbox-pic-view");
		this.popupPic = this.popupWin.find(".lightbox-image");
		this.picCaptionArea = this.popupWin.find(".lightbox-pic-caption");
		this.nextBtn = this.popupWin.find(".lightbox-btn-next");
		this.prevBtn = this.popupWin.find(".lightbox-btn-prev");

		this.captionText = this.popupWin.find(".lightbox-pic-desc");
		this.currentIndex = this.popupWin.find(".lightbox-of-index");
		this.closeBtn = this.popupWin.find(".lightbox-close-btn");

		this.groupName = null;
		this.groupData = [];
		this.bodyNode.on("click", ".js-lightbox, *[data-role=lightbox]", function(e) {
			// kill the bubbling on the click event
			e.stopPropagation();

			var currentGroupName = $(this).data("group");

			if (currentGroupName !== self.groupName) {
				self.groupName = currentGroupName;
				// fetch data in the same group based on groupName
				self.getGroup();
			}

			// init popup
			self.initPopup($(this));
		});

		// hide popup
		this.popupMask.add(this.closeBtn).on("click", function() {
			self.popupMask.fadeOut();
			self.popupWin.fadeOut();
			self.clear = false;  // disable resize when hidden
		});

		// switch img event
		this.flag = true;  // avoid multiple click before loading complete
		this.nextBtn.add(this.prevBtn).hover(function() {
			if (!$(this).hasClass("disabled") && self.groupData.length>1) {
				$(this).addClass("show");
			}
		}, function() {
			if (!$(this).hasClass("disabled") && self.groupData.length>1) {
				$(this).removeClass("show");
			}
		}).on("click", function(e) {
			// slide image direction
			var dir = ($(this).attr("class").indexOf("next") > -1) ? "next" : "prev";
			if (!$(this).hasClass("disabled") && self.flag) {
				self.flag = false;
				e.stopPropagation();
				self.goto(dir);
			}
		});

		// resize window only after stable
		var timer = null;
		this.clear = false;  // disable resize when popupWin is hidden;
		$(window).resize(function() {
			if (self.clear) {
				clearTimeout(timer);
				timer = setTimeout(function() {
					self.loadPicSize(self.groupData[self.index].src);
				}, 500);				
			}
		}).keyup(function(e) {
			if (self.clear) {
				switch(e.which) {
					case 38: // Up
					case 37: // Left
					self.prevBtn.click();
					break;

					case 39:  // Right
					case 40:  // Down
					self.nextBtn.click();
					break;

					case 27:  // Esc
					self.popupMask.click();
					break;
				}				
			}
		});

	};
	LightBox.prototype = {
		initPopup: function(currentObj) {
			var self = this,
				currentObj = $(currentObj),
				sourceSrc = currentObj.data("source"),
				currentId = currentObj.data('id');

			this.showMaskAndPopup(sourceSrc, currentId);
		},
		getGroup: function() {
			var self = this;

			// fetch all objects with the same groupName
			var $groupList = this.bodyNode.find("*[data-group="+this.groupName+"]");
			// empty groupData each time
			self.groupData.length = 0;
			$groupList.each(function() {
				self.groupData.push({
					src: $(this).data("source"),
					id: $(this).data("id"),
					caption: $(this).data("caption"),
				});
			});
		},
		renderDOM: function() {
			var strDom = '<div class="lightbox-pic-view">' +
							'<span class="lightbox-btn lightbox-btn-prev"></span>' +
							'<img src="" class="lightbox-image" alt="">' +
							'<span class="lightbox-btn lightbox-btn-next"></span>' +
						'</div>' +
						'<div class="lightbox-pic-caption">' +
							'<div class="lightbox-caption-area">' +
								'<p class="lightbox-pic-desc"></p>' +
								'<span class="lightbox-of-index">index: 0 of 0</span>' +
							'</div>' +
							'<span class="lightbox-close-btn"></span>' +
						'</div>';
			// insert into popupWin
			this.popupWin.html(strDom);
			// insert into body in proper order
			this.bodyNode.append(this.popupMask, this.popupWin);
		},
		showMaskAndPopup: function(sourceSrc, currentId) {
			var self = this;

			// smooth transition before showing pic
			this.popupPic.hide();
			this.picCaptionArea.hide();

			this.popupMask.fadeIn();

			var winWidth = $(window).width(),
				winHeight = $(window).height();

			// set viewpoint size
			this.picViewArea.css({
				width: winWidth / 2,
				height: winHeight / 2
			});
			var viewWidth = this.picViewArea.outerWidth(),
				viewHeight = this.picViewArea.outerHeight();

			// initial width/height of popupWin are both half of window,
			// add animation to move it from up to center
			this.popupWin.fadeIn().css({
				width: viewWidth,
				height: viewHeight,
				marginLeft: -(viewWidth / 2),
				top: -viewHeight,
			}).animate({
				top: (winHeight - viewHeight) / 2
			}, self.settings.speed, function() {
				// load pic
				self.loadPicSize(sourceSrc);
			});

			// get index in array based on current clicked id
			this.index = this.getIndexOf(currentId);

			// hover show prev-btn or next-btn
			var groupLength = this.groupData.length;
			if (groupLength > 1) {
				if (this.index === 0) {
					this.prevBtn.addClass("disabled");
					this.nextBtn.removeClass("disabled");
				} else if (this.index === groupLength - 1) {
					this.prevBtn.removeClass("disabled");
					this.nextBtn.addClass("disabled");
				} else {
					this.prevBtn.removeClass("disabled");
					this.nextBtn.removeClass("disabled");					
				}
			}
		},
		getIndexOf: function(currentId) {
			var index = 0;
			$(this.groupData).each(function(i) {
				index = i;
				if (this.id === currentId) {
					return false;
				}
			});

			return index;
		},
		loadPicSize: function(sourceSrc) {
			var self = this;
			// if <img> has inline-style width or set by jquery.css(), we cannot get real size
			// eg. if <img> has inline-attr "width='100%'" or width="400px",
			// remove it or set it to "auto". ^_^
			self.popupPic.css({width:"auto", height: "auto"}).hide();
			self.picCaptionArea.hide();

			this.preLoadImg(sourceSrc, function() {
				self.popupPic.attr('src', sourceSrc);
				var picWidth = self.popupPic.width(),
					picHeight = self.popupPic.height();
				self.changePic(picWidth, picHeight);
			});
		},
		preLoadImg: function(sourceSrc, callback) {
			var img = new Image();
			if (!!window.ActiveXObject) {  // support IE
				img.onreadystatechange = function() {
					if (this.readyState == "complete") {
						callback();
					}
				};
			} else {
				img.onload = function() {
					callback();
				}
			}
			img.src = sourceSrc;
		},
		changePic: function(width, height) {
			var self = this
				winWidth = $(window).width(),
				winHeight = $(window).height(),
				borderWidth = parseInt(this.picViewArea.outerWidth() - this.picViewArea.innerWidth());
			// animate to change popupWin size based on img's real size
			// aviod overflow if img size is greater than window width
			var scale = Math.min(winWidth/(width+borderWidth),
						winHeight/(height+borderWidth), 1);
			
			width = width * scale;
			height = height * scale;

			this.picViewArea.animate({
				width: width - borderWidth,
				height: height - borderWidth
			}, self.settings.speed);
			this.popupWin.animate({
				width: width,
				height: height,
				marginLeft: -(width/2),
				top: (winHeight-height) / 2,
			}, self.settings.speed, function() {
				self.popupPic.css({
					width: width - borderWidth,
					height: height - borderWidth,
				}).fadeIn();
				self.picCaptionArea.fadeIn();
				self.flag = true;  // enable next click
				self.clear = true;  // enable resize when popup shows
			});

			// set index and caption
			this.captionText.text(this.groupData[this.index].caption);
			this.currentIndex.text("index: "+(this.index+1)+" of "+this.groupData.length);
		},
		goto: function(dir) {
			if (dir === "next") {
				var src = "";

				this.index++;
				if (this.index >= this.groupData.length - 1) {
					this.nextBtn.addClass("disabled").removeClass("show");
				}
				if (this.index !== 0) {
					this.prevBtn.removeClass("disabled");
				}
			} 
			else if (dir === "prev") {
				this.index--;
				if (this.index <= 0) {
					this.prevBtn.addClass("disabled").removeClass("show");
				}
				if (this.index !== this.groupData.length - 1) {
					this.nextBtn.removeClass("disabled");
				}
			}
			src = this.groupData[this.index].src;
			this.loadPicSize(src);
		},
	};

	window.LightBox = LightBox;
})(jQuery);