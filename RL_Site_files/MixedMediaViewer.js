/*!************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2013 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/
if(typeof s7viewers == "undefined") {
	s7viewers = {};
}else if(typeof s7viewers != "object") {
	throw new Error("Cannot initialize a root 's7viewers' package. s7viewers is not an object");
}

if(!s7viewers.MixedMediaViewer) {
	(function(){
		var s7sdk;
		/**
		 * Construct a MixedMediaViewer object
		 * @param {Object} inObj optional simple JSON object that consists of name:value pairs for customization of the viewer.
		 */
		s7viewers.MixedMediaViewer = function (inObj) {
			this.sdkBasePath = 'js/3.3/MixedMediaViewer/';
			this.containerId = null;
			this.params = {};
			this.handlers = [];
	//		this.onInitComplete = null;
			this.onInitFail = null;
			this.initializationComplete = false;
			this.initCalled = false;
			this.firstMediasetParsed = false;
			this.isDisposed = false;
			this.utilsScriptElm = null;
			this.fixinputmarker = null;
			this.indicatormode = "page";
			this.numberOfItems = null;

			if (typeof inObj == "object"){
				if (inObj.containerId) {
					this.setContainerId(inObj.containerId)
				}
				if (inObj.params) {
					for(var param in inObj.params) {
						if(inObj.params.hasOwnProperty(param) && inObj.params.propertyIsEnumerable(param)) {
							this.setParam(param,inObj.params[param]);
						}
					}
				}
				if (inObj.handlers) {
					this.setHandlers(inObj.handlers);
				}
				if (inObj.localizedTexts) {
					this.setLocalizedTexts(inObj.localizedTexts);
				}
			}		

			var self = this;
			this.onChangeZoomState = function (stateEvent){
				if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_IN))
					self.zoomInButton.activate();
				else
					self.zoomInButton.deactivate();
					
				if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_OUT))
					self.zoomOutButton.activate();
				else
					self.zoomOutButton.deactivate();						
						
				if (stateEvent.s7event.state.hasCapability(s7sdk.ZoomCapabilityState.ZOOM_RESET)){
					self.zoomResetButton.activate();
				}
				else {
					self.zoomResetButton.deactivate();
				}
			};	
		};

		s7viewers.MixedMediaViewer.cssClassName = "s7mixedmediaviewer";

		s7viewers.MixedMediaViewer.prototype.modifiers = {
			zoomMode: { params: ["zoomMode"], defaults: ["continuous"], ranges: [["auto", "continuous", "inline"]] },
			indicatorMode: { params: ["indicatormode"], defaults: ["page"], ranges:[["item","page"]]}
		};
		
		s7viewers.MixedMediaViewer.prototype.setContainerId = function (inElemId) {
			if (this.isDisposed) return;
			this.containerId = inElemId || null;
		};
		
		s7viewers.MixedMediaViewer.getCodeBase = function() {
			var contentUrl = "";
			var viewerPath = "";
			var scriptTags = null;
			if (document.scripts){
				scriptTags = document.scripts;
			} else {
				scriptTags = document.getElementsByTagName("script");
			}

			for(var i=0; i<scriptTags.length;i++){
				var src = scriptTags[i].src;
				var result = /^\s*(http[s]?:\/\/[^\/]*)?(.*)(\/(js|js_orig)\/MixedMediaViewer\.js)/.exec(src);
				if (result && result.length == 5) {
					if ( typeof result[1] !== 'undefined' ) {
						contentUrl = result[1];
					}
					contentUrl += result[2];
					viewerPath = src;
					break;
				 }
			}
			if ((contentUrl != '') && (contentUrl.lastIndexOf('/') != contentUrl.length - 1)) {
				contentUrl += '/';
			}
			
			var codebaseRegEx = /\/etc\/dam\/viewers\//;
			s7viewers.MixedMediaViewer.codebase = {"contentUrl": contentUrl, "isDAM": codebaseRegEx.test(viewerPath)};
			
		};
		s7viewers.MixedMediaViewer.getCodeBase();
		
		s7viewers.MixedMediaViewer.prototype.getContentUrl = function () {
			return s7viewers.MixedMediaViewer.codebase.contentUrl;
		};

		s7viewers.MixedMediaViewer.prototype.includeViewer = function () {
			s7sdk.Util.lib.include("s7sdk.event.Event");
			s7sdk.Util.lib.include("s7sdk.common.Button");
			s7sdk.Util.lib.include("s7sdk.common.Container");
			s7sdk.Util.lib.include("s7sdk.image.ZoomView");
			s7sdk.Util.lib.include("s7sdk.image.FlyoutZoomView");
			s7sdk.Util.lib.include("s7sdk.set.SpinView");
			s7sdk.Util.lib.include("s7sdk.set.MediaSet");
			s7sdk.Util.lib.include("s7sdk.set.Swatches");
			s7sdk.Util.lib.include("s7sdk.video.VideoControls");
			s7sdk.Util.lib.include("s7sdk.video.VideoPlayer");
			s7sdk.Util.lib.include("s7sdk.common.ControlBar");
			s7sdk.Util.lib.include("s7sdk.set.SetIndicator");

			this.trackingManager = new s7sdk.TrackingManager(); // needs to be created first to track LOAD event
			
			var mixedMediaViewerLocalizedTexts = {
				"en":{
					"PanRightButton.TOOLTIP":"Spin East",			
					"PanLeftButton.TOOLTIP":"Spin West"
				},
				defaultLocale: "en"
			};		

			this.s7params = new s7sdk.ParameterManager(null,null,{"asset" : "MediaSet.asset"},this.getContentUrl()+"MixedMediaViewer_light.css");
			var viewerName = ""; 
			if (this.s7params.params.config && (typeof(this.s7params.params.config) == "string")) {
				viewerName = ",";
				if (this.s7params.params.config.indexOf("/") > -1) {
					viewerName += this.s7params.params.config.split('/')[1];
				} else 
					viewerName += this.s7params.params.config;
			}
			this.s7params.setViewer("505,5.8.4" + viewerName);

			this.s7params.setLocalizedTexts(mixedMediaViewerLocalizedTexts);

			for(var prm in this.params){
				if (prm != "localizedtexts"){
					this.s7params.push(prm, this.params[prm]);
				}else{
					this.s7params.setLocalizedTexts(this.params[prm]);
				}
			}

			this.container = null;
			this.zoomView = null;
			this.flyoutZoomView = null;
			this.spinView = null;
			this.videoPlayer = null;
			this.activeView = null;
			this.zoomMode = null;
			this.isFlyoutView = null;

			this.toolbarContainer = null;
			this.imageViewContainer = null;
			this.zoomInButton = null;
			this.zoomOutButton = null;
			this.zoomResetButton = null;
			this.spinLeftButton = null;
			this.spinRightButton = null;
			this.fullScreenButton = null;
			this.videoFullScreenButton = null;
			this.closeButton = null;
			this.closedCaptionButton = null;

			this.videoControls = null;
			this.playPauseButton = null;
			this.videoScrubber = null;
			this.videoTime = null;
			this.mutableVolume = null;
			this.bcr_videoControls = null;
			this.bcr_playPauseButton = null;
			this.bcr_videoTime = null;
			this.bcr_videoScrubber = null;
			this.storedPlayingState = false;

			this.mediaSet = null; 
			this.s7mediasetDesc = null; 
			this.singleImage = null;

			this.colorSwatches = null; 
			this.currentColorSwatchesFrame = null;
			this.colorSwatchesActive = false;

			this.swatches = null; 
			this.currentSwatchesFrame = null;
			this.containerHeight = null;

			this.setindicator = null;
			//visibility manager
			this.visibilityManagerZoom = null;
			this.visibilityManagerSpin = null;
			this.visibilityManagerVideo = null;

			this.captionButtonPosition = null;
			this.volumeButtonPosition = null;
			this.videoTimePosition = null;		
			this.captionSpecified = true;
			this.curCaption = null;						  
			this.storedCaptionEnabled = true;
			this.isCSSforCaptionButton = true;
			this.needsRebuild = false;
			this.prevAsset = null;
            this.isPosterImage = null
			
			//initial frame
			this.initialFrame = 0;

			this.setPages = true;

			this.isOrientationMarkerForcedChanged = false;

			var self = this;
			
			function initViewer(){
				
				self.s7params.push("aemmode",  s7viewers.MixedMediaViewer.codebase.isDAM  ? "1" : "0");
				
				self.s7params.push("Swatches.tmblayout", "0,1");
				self.s7params.push("Swatches.textpos", "none");
				self.s7params.push("VideoPlayer.autoplay", "0");
				self.s7params.push("ZoomView.frametransition", "slide");
				self.s7params.push("FlyoutZoomView.frametransition", "fade");
				self.s7params.push("initialbitrate", "1400");

				if (s7sdk.browser.device.name == "desktop") self.s7params.push("ZoomView.singleclick", "zoomReset"); //singleclick and doubleclick for desktop have specific
				if (s7sdk.browser.device.name == "desktop") self.s7params.push("ZoomView.doubleclick", "reset");						
				if (s7sdk.browser.device.name == "desktop") self.s7params.push("SpinView.singleclick", "zoomReset"); //singleclick and doubleclick for desktop have specific
				if (s7sdk.browser.device.name == "desktop") self.s7params.push("SpinView.doubleclick", "reset");						
				if (s7sdk.browser.device.name != "desktop" || s7sdk.browser.supportsTouch()){
					self.s7params.push("Swatches.enablescrollbuttons","0");	
				}			

				/*get fixinputmarker*/
				var fixinputmarkerParam = self.getParam("fixinputmarker");
				if (fixinputmarkerParam) {
					self.fixinputmarker = (fixinputmarkerParam == "s7touchinput" || fixinputmarkerParam == "s7mouseinput") ? self.fixinputmarker = fixinputmarkerParam : null;
				};
				
				var urlParam = self.getURLParameter("fixinputmarker");
				if (urlParam){
					self.fixinputmarker = (urlParam == "s7touchinput" || urlParam == "s7mouseinput") ? self.fixinputmarker = urlParam : null;;
				};
				/*some code...*/
				if (self.fixinputmarker){
					if(self.fixinputmarker === "s7mouseinput"){
						self.addClass(self.containerId,"s7mouseinput");
					}else if(self.fixinputmarker === "s7touchinput"){
						self.addClass(self.containerId,"s7touchinput");
					}
				}else{
					// Create a viewer Container
					if (s7sdk.browser.supportsTouch()){
						self.addClass(self.containerId,"s7touchinput");
				}else{
						self.addClass(self.containerId,"s7mouseinput");
					}
				}

				/*get indicatormode*/
				var indicatormodeParam = self.getParam("indicatormode");
				if (indicatormodeParam) {
					self.indicatormode = (indicatormodeParam == "page" || indicatormodeParam == "item") ? self.indicatormode = indicatormodeParam : "page";
				};
				
				var indicatormodeUrlParam = self.getURLParameter("indicatormode");
				if (indicatormodeUrlParam){
					self.indicatormode = (indicatormodeUrlParam == "page" || indicatormodeUrlParam == "item") ? self.indicatormode = indicatormodeUrlParam : "page";
				};

				self.parseMods();

				self.container = new s7sdk.common.Container(self.containerId, self.s7params, self.containerId+"_container");
				if(self.container.isInLayout()){
					completeInitViewer();
				} else {
					self.container.addEventListener(s7sdk.event.ResizeEvent.ADDED_TO_LAYOUT, completeInitViewer, false);
				}
			}

			function completeInitViewer(){
				self.container.removeEventListener(s7sdk.event.ResizeEvent.ADDED_TO_LAYOUT, completeInitViewer, false);
				
				// work-around for webkit issue with applying height:100% to the containing element
				var containerDiv = document.getElementById(self.containerId);
				var tempMinHeight = containerDiv.style.minHeight;
				containerDiv.style.minHeight = "1px";

				var testdiv = document.createElement("div");
				testdiv.style.position = "relative";
				testdiv.style.width = "100%";
				testdiv.style.height = "100%";
				containerDiv.appendChild(testdiv);
				var emptyViewerHeight = testdiv.offsetHeight;
				if (testdiv.offsetHeight <= 1){
					containerDiv.style.height = "100%";
					emptyViewerHeight = testdiv.offsetHeight;
				}
				containerDiv.removeChild(testdiv);
				containerDiv.style.minHeight = tempMinHeight;

				var responsive = false;
				switch(self.s7params.get("responsive", "auto")){
					case "fit":
						responsive = false;
						break;
					case "constrain":
						responsive = true;
						break;
					default :
						responsive = emptyViewerHeight == 0;
						break;
				}
				self.updateCSSMarkers();
				self.updateOrientationMarkers();
				if(self.container.isFixedSize()) { // free
					self.viewerMode = "fixed";
				} else {
					if(responsive) { // restrict
						self.viewerMode = "ratio";
					} else {
						self.viewerMode = "free";
					}
				}

				self.containerHeight = self.container.getHeight();
					
				//create container for ZoomView or FlyoutZoomView
				self.imageViewContainer = document.createElement('div');
				self.imageViewContainer.setAttribute("id",self.containerId+"_imageViewContainer");
				var ctnr = document.getElementById(self.container.getInnerContainerId());
				ctnr.appendChild(self.imageViewContainer);			
				

				var isNotDesktop = !(s7sdk.browser.device.name == "desktop");

				if (self.zoomMode == "auto") {
					if (!isNotDesktop) {
						self.zoomMode = "inline";
					}
					else {
						self.zoomMode = "continuous";
					}
				}
				if (self.zoomMode == "inline") self.s7params.push("MediaSet.flattenSets", "1,1");
				self.flyoutZoomView = new s7sdk.image.FlyoutZoomView(self.containerId+"_imageViewContainer", self.s7params, self.containerId+"_flyoutZoomView");
				self.zoomView = new s7sdk.image.ZoomView(self.containerId+"_imageViewContainer", self.s7params, self.containerId+"_zoomView");
				self.isFlyoutView = (self.zoomMode == "inline" || (self.zoomMode == "auto" && !isNotDesktop));
				if (self.isFlyoutView){
					self.trackingManager.attach(self.flyoutZoomView);
					self.zoomView.setCSS(".s7zoomview", "display", "none");
				}
				else{
					self.trackingManager.attach(self.zoomView);
					self.flyoutZoomView.setCSS(".s7flyoutzoomview", "display", "none");
				}
			
				self.spinView = new s7sdk.set.SpinView(self.container, self.s7params, self.containerId+"_spinView");
				self.trackingManager.attach(self.spinView);

                self.setindicator = new s7sdk.set.SetIndicator(self.container, self.s7params, self.containerId+"_setIndicator");
                if (!isNotDesktop) {
                    self.setindicator.setCSS(".s7setindicator", "display", "none");
                }

				// Create the VideoPlayer
				self.videoPlayer = new s7sdk.video.VideoPlayer(self.container, self.s7params, self.containerId + "_videoPlayer");
				self.trackingManager.attach(self.videoPlayer);
				self.storedCaptionEnabled = self.videoPlayer.getCaptionEnabled();
				// Create the ControlBar
				self.videoControls = new s7sdk.common.ControlBar(self.container, self.s7params, self.containerId + "_controls");
				self.bcr_videoControls = document.getElementById(self.containerId + "_controls").getBoundingClientRect();
				self.videoControlsHeight = self.videoControls.getHeight();
				self.videoControls.attachView(self.videoPlayer, false);
				// Create the PlayPauseButton
				self.playPauseButton = new s7sdk.common.PlayPauseButton(self.containerId + "_controls", self.s7params, self.containerId + "_playPauseButton");
				// Create the VideoScrubber
				self.videoScrubber = new s7sdk.video.VideoScrubber(self.containerId + "_controls", self.s7params, self.containerId + "_videoScrubber");
				// Create the VideoTime
				self.videoTime = new s7sdk.video.VideoTime(self.containerId + "_controls", self.s7params, self.containerId + "_videoTime");
				self.bcr_playPauseButton = document.getElementById(self.containerId + "_playPauseButton").getBoundingClientRect();
				self.bcr_videoTime = document.getElementById(self.containerId + "_videoTime").getBoundingClientRect();
				self.bcr_videoScrubber = document.getElementById(self.containerId + "_videoScrubber").getBoundingClientRect();

				// Create the MutableVolume
				self.mutableVolume = new s7sdk.video.MutableVolume(self.containerId + "_controls", self.s7params, self.containerId + "_mutableVolume");
				
				// Create the ClosedCaptionButton
				self.closedCaptionButton = new s7sdk.common.ClosedCaptionButton(self.containerId+"_controls", self.s7params, self.containerId + "_closedCaptionButton");
				self.closedCaptionButton.addEventListener("click", clickClosedCaptionButton);
				self.closedCaptionButton.setSelected(self.videoPlayer.getCaptionEnabled());
				//check user specified ClosedCaptionButton in css
				var captionStyleLeft = s7sdk.Util.getStyle(document.getElementById(self.containerId + "_closedCaptionButton"),"left");
				var captionStyleRight = s7sdk.Util.getStyle(document.getElementById(self.containerId + "_closedCaptionButton"),"right");			
				self.isCSSforCaptionButton =  ((!isNaN(captionStyleRight.substring(0, captionStyleRight.length-2))&& Number(captionStyleLeft.substring(0, captionStyleLeft.length-2)) != 0));
				self.videoFullScreenButton = new s7sdk.common.FullScreenButton(self.containerId + "_controls", self.s7params, self.containerId + "_videofullScreenButton");

				self.supportsInline = self.videoPlayer.supportsInline();
				if(!self.supportsInline){
					// IF inline playback isn't available (iPhone, etc.), hide the controlbar.
					self.videoControls.setCSS(".s7controlbar", "display", "none");
				}

				self.swatches = new s7sdk.set.Swatches(self.container, self.s7params, self.containerId+"_swatches");
				self.trackingManager.attach(self.swatches);

				self.toolbarContainer = document.createElement('div');
				self.toolbarContainer.className = "s7toolbarcontainer";
				self.toolbarContainer.setAttribute("id",self.containerId+"_toolbarContainer");
				self.toolbarContainer.style.position = "absolute";
				self.toolbarContainer.style.width= self.container.getWidth() + "px";
				self.toolbarContainer.style.top= self.containerHeight - self.swatches.getHeight() + "px";
				self.toolbarContainer.style.height = "0px";
				self.toolbarContainer.style.zIndex = "1";
				
				ctnr.insertBefore(self.toolbarContainer,document.getElementById(self.containerId+"_swatches"));

				self.zoomInButton = new s7sdk.common.ZoomInButton(self.containerId+"_toolbarContainer", self.s7params, self.containerId+"_zoomInButton");
				self.zoomOutButton = new s7sdk.common.ZoomOutButton(self.containerId+"_toolbarContainer", self.s7params, self.containerId+"_zoomOutButton");
				self.zoomResetButton = new s7sdk.common.ZoomResetButton(self.containerId+"_toolbarContainer", self.s7params, self.containerId+"_zoomResetButton");

				//create container for SpinButtons
				self.divSpinButton = document.createElement('div');
				self.divSpinButton.setAttribute("id",self.containerId+"_divSpinButton");
				self.divSpinButton.className = "s7spinbuttons";
				self.divSpinButton.style.position = "absolute";
				self.divSpinButton.style.top = self.containerHeight - self.swatches.getHeight() + "px";
				
				ctnr.insertBefore(self.divSpinButton,document.getElementById(self.containerId+"_swatches"));

				self.spinLeftButton = new s7sdk.common.PanLeftButton(self.containerId+"_divSpinButton", self.s7params, self.containerId+"_spinLeftButton");
				self.spinRightButton = new s7sdk.common.PanRightButton(self.containerId+"_divSpinButton", self.s7params, self.containerId+"_spinRightButton");

				if ((self.s7params.get("closeButton", "0") == "1") || (self.s7params.get("closeButton", "0").toLowerCase() == "true")){
					self.closeButton = new s7sdk.common.CloseButton(self.container, self.s7params, self.containerId + "_closeButton");
					self.closeButton.addEventListener("click", closeWindow);
				}			

				//create container for ColorSwatches
				self.divColorSwatches = document.createElement('div');
				self.divColorSwatches.setAttribute("id",self.containerId+"_divColorSwatches");
				self.divColorSwatches.className = "s7colorswatches";
				self.divColorSwatches.style.position = "absolute";
				self.divColorSwatches.style.zIndex = "1";
				self.divColorSwatches.style.top = self.containerHeight - self.swatches.getHeight() + "px";
				
				ctnr.insertBefore(self.divColorSwatches,document.getElementById(self.containerId+"_swatches"));

				self.colorSwatches = new s7sdk.set.Swatches(self.containerId+"_divColorSwatches", self.s7params, self.containerId+"_colorSwatches");
				if (s7sdk.browser.device.name != "desktop"){
					self.colorSwatches.setCSS(".s7swatches", "pointer-events", "none");
				}
				self.trackingManager.attach(self.colorSwatches);			

				self.fullScreenButton = new s7sdk.common.FullScreenButton(self.containerId+"_toolbarContainer", self.s7params, self.containerId + "_fullScreenButton");
				self.notCustomSize = self.container.isPopup() && !self.container.isFixedSize();
				if (self.notCustomSize && !self.container.supportsNativeFullScreen()) {
					self.videoFullScreenButton.setCSS(".s7fullscreenbutton", "display", "none");
					self.fullScreenButton.setCSS(".s7fullscreenbutton", "display", "none");
				}
				if (!self.videoPlayer.supportsVolumeControl()){
					self.mutableVolume.setCSS(".s7mutablevolume", "display", "none");
				}
				if(self.viewerMode == "ratio"){
					containerDiv.style.height = "auto";
				}

				//Store button positions
				self.captionButtonPosition = getDeepCSS(document.getElementById(self.containerId + "_closedCaptionButton"), "right");
				self.captionButtonPosition =  Number(self.captionButtonPosition.substring(0, self.captionButtonPosition.length - 2));
				self.volumeButtonPosition = getDeepCSS(document.getElementById(self.containerId + "_mutableVolume"), "right");
				self.volumeButtonPosition =  Number(self.volumeButtonPosition.substring(0, self.volumeButtonPosition.length - 2));
				self.videoTimePosition = getDeepCSS(document.getElementById(self.containerId + "_videoTime"), "right");
				self.videoTimePosition =  Number(self.videoTimePosition.substring(0, self.videoTimePosition.length - 2));
				
				//check is caption
				if (!self.s7params.get("caption")) {
					self.captionSpecified = false;
				} else {
					self.curCaption = self.s7params.params.caption;
				}
				
				function getDeepCSS (element, css){
					var dv, sty, val;
					if(element && element.style){
						css= css.toLowerCase();
						sty= css.replace(/\-([a-z])/g, function(a, b){
							return b.toUpperCase();
						});
						val= element.style[sty];
						if(!val){
							dv= document.defaultView || window;
							if(dv.getComputedStyle){
								val= dv.getComputedStyle(element,'').getPropertyValue(css);
							}
							else if(element.currentStyle){
								val= element.currentStyle[sty];
							}
						}
					}
					return val || '';
				}

				//Initial preparation
				viewerPreparation();


				self.mediaSet = new s7sdk.set.MediaSet(null, self.s7params, self.containerId+"_mediaSet");
				self.trackingManager.attach(self.mediaSet);

				// ====================================== VisibilityManagers ====================================== //
				//Add VisibilityManager (for touch devices only)
				if (isNotDesktop) {
					self.visibilityManagerZoom = new s7sdk.VisibilityManager();
					self.visibilityManagerSpin = new s7sdk.VisibilityManager();
					if (self.isFlyoutView) {
						self.visibilityManagerZoom.reference(self.flyoutZoomView);
					}
					else { 
						self.visibilityManagerZoom.reference(self.zoomView);
					}
					self.visibilityManagerSpin.reference(self.spinView);

					self.visibilityManagerZoom.attach(self.closeButton);
					self.visibilityManagerSpin.attach(self.closeButton);

					if (!self.isFlyoutView) {
						self.visibilityManagerZoom.attach(self.zoomInButton);
						self.visibilityManagerZoom.attach(self.zoomOutButton);
						self.visibilityManagerZoom.attach(self.zoomResetButton);
					}
					if (!self.notCustomSize  || self.container.supportsNativeFullScreen()) {
						self.visibilityManagerZoom.attach(self.fullScreenButton);
					}

					self.visibilityManagerSpin.attach(self.zoomInButton);
					self.visibilityManagerSpin.attach(self.zoomOutButton);
					self.visibilityManagerSpin.attach(self.zoomResetButton);
					self.visibilityManagerSpin.attach(self.spinLeftButton);
					self.visibilityManagerSpin.attach(self.spinRightButton);
					if (!self.notCustomSize  || self.container.supportsNativeFullScreen()) {
						self.visibilityManagerSpin.attach(self.fullScreenButton);
					}

					self.visibilityManagerZoom.attach(self.colorSwatches);
					self.visibilityManagerZoom.attach(self.swatches);
					self.visibilityManagerSpin.attach(self.swatches);
					
					self.visibilityManagerZoom.attach(self.setindicator);
					self.visibilityManagerSpin.attach(self.setindicator);
					
					// IF inline playback isn't available (iPhone, etc.), do not create VisibilityManager for VideoPlayer.
					if (self.supportsInline) {
						self.visibilityManagerVideo = new s7sdk.VisibilityManager();
						self.visibilityManagerVideo.reference(self.videoPlayer);
						self.visibilityManagerVideo.attach(self.closeButton);
						self.visibilityManagerVideo.attach(self.videoControls);
						self.visibilityManagerVideo.attach(self.swatches);
						self.visibilityManagerVideo.attach(self.setindicator);					
					}
				}		
				// ====================================== Event Listeners ====================================== //
				// Add Swatches event listeners
				self.swatches.addEventListener(s7sdk.AssetEvent.SWATCH_SELECTED_EVENT, swatchSelected, false); 
				// Add ColorSwatches event listeners
				self.colorSwatches.addEventListener(s7sdk.AssetEvent.SWATCH_SELECTED_EVENT, colorSwatchSelected, false); 
				// Add MediaSet event listeners
				self.mediaSet.addEventListener(s7sdk.AssetEvent.NOTF_SET_PARSED, onSetParsed, false);
				// Add Container event listeners
				self.container.addEventListener(s7sdk.event.ResizeEvent.COMPONENT_RESIZE, onContainerResize,false);
				self.container.addEventListener(s7sdk.event.ResizeEvent.FULLSCREEN_RESIZE, onContainerFullScreen,false);	
				self.container.addEventListener(s7sdk.event.ResizeEvent.REMOVED_FROM_LAYOUT, onRemovedFromLayout, false);
				self.container.addEventListener(s7sdk.event.ResizeEvent.ADDED_TO_LAYOUT, onAddedToLayout, false);
				self.container.addEventListener(s7sdk.event.ResizeEvent.SIZE_MARKER_CHANGE, onContainerSizeMarkerChange,false);	
				
				if (isNotDesktop) self.swatches.addEventListener(s7sdk.event.SwatchEvent.SWATCH_PAGE_CHANGE, onPageChange, false);

				// Add ZoomInButton event listeners
				self.zoomInButton.addEventListener("click", onZoomInClick, false);
				// Add ZoomOutButton event listeners
				self.zoomOutButton.addEventListener("click", onZoomOutClick, false);
				// Add ZoomResetButton event listeners
				self.zoomResetButton.addEventListener("click",onZoomResetClick, false);	

				// Add SpinLeftButton event listeners
				self.spinLeftButton.addEventListener("click", onSpinLeftButtonClick, false);
				// Add SpinRightButton event listeners
				self.spinRightButton.addEventListener("click", onSpinRightButtonClick, false);

				// Add FullScreenButton event listeners
				self.fullScreenButton.addEventListener("click", onFullScreenButtonClick);
				// Add VideoFullScreenButton event listeners
				self.videoFullScreenButton.addEventListener("click", onFullScreenButtonClick);

				if (!self.isFlyoutView) {
					// Add event listener for swipe image
					self.zoomView.addEventListener(s7sdk.event.AssetEvent.ASSET_CHANGED, onImageChanged, false);
					// Add buttons event listener (change states)
					self.zoomView.addEventListener(s7sdk.event.CapabilityStateEvent.NOTF_ZOOM_CAPABILITY_STATE,self.onChangeZoomState, false);				
				}
				self.spinView.addEventListener(s7sdk.event.CapabilityStateEvent.NOTF_SPIN_CAPABILITY_STATE,self.onChangeZoomState, false);				

				// Add VideoPlayer event listeners
				self.videoPlayer.addEventListener(s7sdk.event.CapabilityStateEvent.NOTF_VIDEO_CAPABILITY_STATE, onVideoCapabilityStateChange, false);
				self.videoPlayer.addEventListener(s7sdk.event.VideoEvent.NOTF_DURATION, onVideoDuration, false);
				self.videoPlayer.addEventListener(s7sdk.event.VideoEvent.NOTF_LOAD_PROGRESS, onVideoLoadProgress, false);
				self.videoPlayer.addEventListener(s7sdk.event.VideoEvent.NOTF_CURRENT_TIME, onVideoCurrentTime, false);
				// Add PlayPauseButton event listeners
				self.playPauseButton.addEventListener("click", onPlayPauseButtonClick);
				// Add VideoScrubber event listeners
				self.videoScrubber.addEventListener(s7sdk.SliderEvent.NOTF_SLIDER_UP, onNotifyScrubberEvent, false);
				// Add MutableVolume event listeners
				self.mutableVolume.addEventListener("click", onMuteButtonClick);
				self.mutableVolume.addEventListener(s7sdk.SliderEvent.NOTF_SLIDER_DOWN, onVolumeDown, false);
				self.mutableVolume.addEventListener(s7sdk.SliderEvent.NOTF_SLIDER_MOVE, onVolumeMove, false);
				self.mutableVolume.addEventListener(s7sdk.SliderEvent.NOTF_SLIDER_UP, onVolumeMove, false);

				if (("onorientationchange" in window) && s7sdk.browser.device != "") {
					window.addEventListener("orientationchange", onOrientationChange); 
				}

				self.trackingManager.setCallback(proxyTrack);
				// AppMeasurementBridge only available when config2 modifier is present
				if ((typeof(AppMeasurementBridge) == "function") && (self.isConfig2Exist == true)){
					self.appMeasurementBridge = new AppMeasurementBridge(self.trackingParams);
					self.appMeasurementBridge.setVideoPlayer(self.videoPlayer);
				}

				// ====================================== Event Handlers ====================================== //
				function onOrientationChange(event){				
				}
				
				function onZoomInClick(){
					if(self.activeView && (self.activeView === self.zoomView || self.activeView === self.spinView)){
						self.activeView.zoomIn();
					}
				}
				function onZoomOutClick(){
					if(self.activeView && (self.activeView === self.zoomView || self.activeView === self.spinView)){
						self.activeView.zoomOut();
					}
				}
				function onSpinLeftButtonClick(){
					if(self.activeView && self.activeView === self.spinView){
						self.activeView.moveFrame(s7sdk.Enum.SPIN_DIRECTION.WEST);
					}
				}
				function onSpinRightButtonClick(){
					if(self.activeView && self.activeView === self.spinView){
						self.activeView.moveFrame(s7sdk.Enum.SPIN_DIRECTION.EAST);
					}
				}
				function onZoomResetClick(){
					if(self.activeView && (self.activeView === self.zoomView || self.activeView === self.spinView)){
						self.activeView.zoomReset();
					}
				}

				function onSetParsed(e) {
					self.s7mediasetDesc = e.s7event.asset;
					self.numberOfItems = self.s7mediasetDesc.items.length;
					self.currentSwatchesFrame = null;
					self.initialFrame = Math.max(0,parseInt((typeof(self.s7params.get('initialframe')) != 'undefined') ? self.s7params.get('initialframe') : 0));			
					
					if (self.initialFrame < self.s7mediasetDesc.items.length){
						//
					}else{
						self.initialFrame = 0;
					}

					var isComlex = false;
					if(self.s7mediasetDesc.items.length > 1 && ((self.s7mediasetDesc.type == s7sdk.ItemDescType.VIDEO_SET) ||
                        (self.s7mediasetDesc.type == s7sdk.ItemDescType.VIDEO_GROUP) ||
						(self.s7mediasetDesc.type == s7sdk.ItemDescType.SPIN_SET))){
						isComlex = true;
					}
					var assetRatio = 1;
					if(self.viewerMode == "ratio"){
						var itm = self.s7mediasetDesc.items[0];
						while(itm instanceof s7sdk.MediaSetDesc && itm.items && (itm.itemslength != 0)){
							itm = itm.items[0];
						}
						if(itm && itm.height) {
							assetRatio = itm.width/itm.height;
						}
					}

					if(self.s7mediasetDesc.items.length == 1 || isComlex) {
						self.singleImage = true;
						self.swatches.setCSS(".s7swatches", "visibility", "hidden");
						if(self.viewerMode == "fixed") {
							self.container.resize (self.container.getWidth(), self.containerHeight - self.swatches.getHeight());
						} else if(self.viewerMode == "ratio") {
							self.container.setModifier({ "aspect": assetRatio });
						} else {
							updateLayout(self.container.getWidth(), self.container.getHeight(), self.container.getHeight());
						}
					}
					else {
						self.singleImage = false;
						if(self.viewerMode == "fixed") {
							self.container.resize (self.container.getWidth(), self.containerHeight);
							updateLayout(self.container.getWidth(), self.containerHeight, self.containerHeight - self.swatches.getHeight());
						} else if(self.viewerMode == "ratio") {
							var w = self.container.getWidth();
							if(s7sdk.browser.device.name == "desktop"){
								self.container.setModifier({ "aspect": w /( w/assetRatio + self.swatches.getHeight()) });
							} else {
								self.container.setModifier({ "aspect": assetRatio });
							}
						} else {
							updateLayout(self.container.getWidth(),  self.containerHeight, self.containerHeight - self.swatches.getHeight());
						}

						self.swatches.setCSS(".s7swatches", "visibility", "inherit");
					}			
					var modifiersObj = {};
					modifiersObj["caption"] =  self.curCaption ? self.curCaption : ",0";
					modifiersObj["posterimage"] =  self.isPosterImage ? self.isPosterImage : "";
					self.videoPlayer.setModifier(modifiersObj);
					
					resizeViewer(self.container.getWidth(), self.container.getHeight());

					if(self.s7mediasetDesc.items.length == 1 || isComlex) {
						if(isComlex){
							var e = {};
							e.s7event = {};
							e.s7event.asset = self.s7mediasetDesc;
							e.s7event.frame = 0;
							swatchSelected(e); 
						} else {
							self.swatches.setMediaSet(self.s7mediasetDesc);
						}
						self.swatches.selectSwatch(0, true);			
					}
					else {
						self.swatches.setMediaSet(self.s7mediasetDesc);
						self.swatches.selectSwatch(self.initialFrame, true);			
					}			

					if (self.setindicator){								
						resolveIndicatorVisibility();
					}		

					if ((self.handlers["initComplete"] != null) && (typeof self.handlers["initComplete"] == "function") && !self.firstMediasetParsed){
                        if (typeof window.s7sdk == "undefined") {
                            window.s7sdk = s7sdk;
                        }
                        self.handlers["initComplete"]();
					}
					self.firstMediasetParsed = true;
				}


				function resolveIndicatorVisibility(){
					if (self.swatches.getPageCount().x <= 1){
						self.setindicator.setCSS(".s7setindicator", "visibility", "hidden");
					}else{				
						self.setindicator.setNumberOfPages(self.swatches.getPageCount().x);
						self.setindicator.setCSS(".s7setindicator", "visibility", "inherit");
					}
					var pages = self.swatches.getPageCount();
					if (self.indicatormode === "item"){
						self.setindicator.setNumberOfPages(self.numberOfItems);
					}else{
						self.setindicator.setNumberOfPages(pages.x);
					}
				}

				function positionSetIndicator(left,top){
					//set indicator				 							
					self.setindicator.setCSS(".s7setindicator","top", top + 'px');		
					self.setindicator.setCSS(".s7setindicator","left", left + 'px');
				}
				
				// Define an event handler function to update the SetIndicator when the swatch page changes
				function onPageChange(event){
					var pg = event.s7event.page.x;				
					if (self.setindicator && self.indicatormode === "page"){
						self.setindicator.setSelectedPage(pg);
					}
				}
				
				// FullScreenButtons Event Handlers
				function onFullScreenButtonClick() { 
					if (!self.container.isFullScreen()){
						if(self.closeButton){
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}
						self.container.requestFullScreen();
					}
					else {
						if(self.closeButton){
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
						self.container.cancelFullScreen();
					}					
				}				
				
				function updateLayout(containerWidth, containerHeight, viewHeight) {
					self.toolbarContainer.style.top = viewHeight + "px";
					self.toolbarContainer.style.width = containerWidth + "px";
					self.divColorSwatches.style.top = viewHeight + "px";
					self.divColorSwatches.style.left = parseInt(containerWidth / 2 - self.colorSwatches.getWidth()/2) + "px";
					self.divSpinButton.style.top = viewHeight + "px";

					var videoControlsObj = document.getElementById(self.containerId + "_controls");
					var prevState = s7sdk.Util.getStyle(videoControlsObj, "display");
					videoControlsObj.style.display  = 'block';
					
					self.videoControls.setCSS(".s7controlbar", "top", viewHeight - self.videoControlsHeight+"px");
					self.videoControls.setCSS(".s7controlbar", "width", containerWidth + "px");

					var bcr_playPauseButton = document.getElementById(self.containerId + "_playPauseButton").getBoundingClientRect();
					var bcr_videoTime = document.getElementById(self.containerId + "_videoTime").getBoundingClientRect();
					var bcr_videoScrubber = document.getElementById(self.containerId + "_videoScrubber").getBoundingClientRect();
					self.videoScrubber.resize(bcr_videoTime.left - bcr_playPauseButton.right - 10, (bcr_videoScrubber.bottom - bcr_videoScrubber.top));
					
					videoControlsObj.style.display  = prevState;

					if (s7sdk.browser.device.name != "desktop") {
						if (!self.isFlyoutView) {
							self.zoomView.resize(containerWidth, containerHeight);
						}
						else {
							self.flyoutZoomView.resize(containerWidth, containerHeight);
						}
						self.spinView.resize(containerWidth, containerHeight);
						self.videoPlayer.resize(containerWidth, containerHeight);
					}else{
						if (!self.isFlyoutView) {
							self.zoomView.resize(containerWidth, viewHeight);
						}
						else {
							self.flyoutZoomView.resize(containerWidth, viewHeight);
						}
						self.spinView.resize(containerWidth, viewHeight);
						self.videoPlayer.resize(containerWidth, viewHeight);
					}
					self.swatches.resize(containerWidth, self.swatches.getHeight());
					if(self.colorSwatches){
						self.colorSwatches.reload();
					}
					
					if (isNotDesktop){
						resolveIndicatorVisibility();
						//todo:the hard coded '5' isn't good...but not sure of what value to be able to calculate.
						self.setindicator.resize(containerWidth,self.setindicator.getHeight());
						positionSetIndicator((containerWidth * .5) - (self.setindicator.getWidth() * .5),containerHeight - self.swatches.getHeight() - 10);
					}
				}
				
				function handleButtonsVisibility (asset) {
					
					var showCaptionButton = self.captionSpecified && needSetCaption(asset,self.swatches.getFrame()) && self.isCSSforCaptionButton;
					var volFlag = self.videoPlayer.supportsVolumeControl();
					var videoTimeRight;
					var bcr_playPauseButton = document.getElementById(self.containerId + "_playPauseButton").getBoundingClientRect();
					if(!volFlag && !showCaptionButton) {
						self.mutableVolume.setCSS(".s7mutablevolume", "display", "none");
						self.closedCaptionButton.setCSS(".s7closedcaptionbutton", "display", "none");
						videoTimeRight = self.volumeButtonPosition;
					}
					else {
						if(!volFlag) {
							self.mutableVolume.setCSS(".s7mutablevolume", "display", "none");
							videoTimeRight = self.captionButtonPosition;
							self.closedCaptionButton.setCSS(".s7closedcaptionbutton", "right", self.volumeButtonPosition + "px");
						}
						if(!showCaptionButton) {
							self.closedCaptionButton.setCSS(".s7closedcaptionbutton", "display", "none");
							if (self.isCSSforCaptionButton){
								videoTimeRight = self.captionButtonPosition;
							}
							else {
								videoTimeRight = self.videoTimePosition;
							}
						}
						else {
							self.closedCaptionButton.setCSS(".s7closedcaptionbutton", "display", "block");
							if (!volFlag) {
								videoTimeRight = self.captionButtonPosition;
							}
							else {
								videoTimeRight = self.videoTimePosition;
							}
						}
					}
					self.videoTime.setCSS(".s7videotime", "right", videoTimeRight + "px");

					self.videoScrubber.resize(document.getElementById(self.containerId + "_videoTime").getBoundingClientRect().left - bcr_playPauseButton.right - 10, document.getElementById(self.containerId + "_videoScrubber").getBoundingClientRect().height);
				}
				
				function resizeViewer(w, h){
					self.updateOrientationMarkers();
					var hei = h;
					hei = Math.max(self.singleImage ? h : h - self.swatches.getHeight(), 1);
					self.videoScrubber.resize(0,0);
					self.videoControls.resize(w, self.videoControls.getHeight());

					if(self.closeButton){
						if(self.container.isFullScreen()) {
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}else{
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
					}
					updateLayout(w, h, hei);
				}
				//Container Resize handler
				function onContainerResize(event) {
					if((typeof(event.target) == 'undefined') || (event.target == document.getElementById(self.containerId+"_container"))) {
						if(!self.container.isInLayout()){
							return;
						}
						resizeViewer(event.s7event.w, event.s7event.h);
					}				
				}
				
				//Container FullScreen Resize handler
				function onContainerFullScreen(event) {
					if(self.closeButton){
						if(self.container.isFullScreen()) {
							self.closeButton.setCSS(".s7closebutton", "display", "none");
						}else{
							self.closeButton.setCSS(".s7closebutton", "display", "block");
						}
					}
					self.fullScreenButton.setSelected(self.container.isFullScreen());
					self.videoFullScreenButton.setSelected(self.container.isFullScreen());
					resizeViewer(event.s7event.w, event.s7event.h);
				}

				function onContainerSizeMarkerChange(event) {
					self.updateCSSMarkers();
				}

				function onAddedToLayout(event){
					if (s7sdk.browser.device.name != "desktop"){
						//
					}else{
						if (self.storedPlayingState) {
							self.videoPlayer.play();
							self.storedPlayingState = false;
						}
					}
				}
				function onRemovedFromLayout(event){
					if (s7sdk.browser.device.name != "desktop"){
						//
					}else{
						//
					}
					if (self.videoPlayer.getCapabilityState().hasCapability(s7sdk.VideoCapabilityState.PAUSE)) {
						self.storedPlayingState = true;
						s7sdk.Logger.log(s7sdk.Logger.INFO, "Pause video");
						self.videoPlayer.pause();
					}
				}
				// VideoPlayer Event Handlers
				function onVideoCapabilityStateChange(event){
					var cap = event.s7event.state;
					if (cap.hasCapability(s7sdk.VideoCapabilityState.PAUSE)) {
						self.playPauseButton.setSelected(false);
					}
					else if (cap.hasCapability(s7sdk.VideoCapabilityState.PLAY) || cap.hasCapability(s7sdk.VideoCapabilityState.REPLAY)) {
						// pause or stop
						self.playPauseButton.setSelected(true);
					}				
					self.playPauseButton.enableReplay(cap.hasCapability(s7sdk.VideoCapabilityState.REPLAY));
				}
				function onVideoDuration(event){
					self.videoTime.setDuration(event.s7event.data);					
					self.videoScrubber.setDuration(event.s7event.data);
				}
				function onVideoLoadProgress(event){
					self.videoScrubber.setLoadedPosition(event.s7event.data);
				}
				function onVideoCurrentTime(event){
					self.videoTime.setPlayedTime(event.s7event.data);
					self.videoScrubber.setPlayedTime(event.s7event.data);
				}
				// PlayPauseButton Event handlers
				function onPlayPauseButtonClick(event) { 
					if (!self.playPauseButton.isSelected()) {
						// IF the video is over, restart from the beginning
						var rem = self.videoPlayer.getDuration() - self.videoPlayer.getCurrentTime();	// Time remaining
						if (rem <= 1){
							self.videoPlayer.seek(0);
						}
						self.videoPlayer.play();
					}
					else {
						self.videoPlayer.pause();
					}
				}
				// VideoScrubber Event Handlers
				function onNotifyScrubberEvent(event) {
					self.videoPlayer.seek(event.s7event.position * self.videoPlayer.getDuration());
				}
				// MutableVolume Event Handlers
				function onMuteButtonClick(event) {
					if(self.mutableVolume.isSelected()){
						self.videoPlayer.mute();
					}else{
						self.videoPlayer.unmute();
						self.videoPlayer.setVolume(self.mutableVolume.getPosition());
					}
				}
				function onVolumeDown(event){
					self.videoPlayer.unmute();	// Make sure the player isn't muted as soon as the user start to change volume
				}
				function onVolumeMove(event){
					self.videoPlayer.setVolume(event.s7event.position);
				}

				function toolsButtonsShowHide(isShow) {
					self.zoomResetButton.setCSS(".s7zoomresetbutton", "display", isShow ? "" : "none");
					self.zoomInButton.setCSS(".s7zoominbutton", "display", isShow ? "" : "none");
					self.zoomOutButton.setCSS(".s7zoomoutbutton", "display", isShow ? "" : "none");
				}
				
				function viewerPreparation() { 
					self.flyoutZoomView.setCSS(".s7flyoutzoomview", "display", "none");
					self.zoomView.setCSS(".s7zoomview", "display", "none");

					self.spinView.setCSS(".s7spinview", "display", "none");
					self.spinLeftButton.setCSS(".s7panleftbutton", "display", "none");
					self.spinRightButton.setCSS(".s7panrightbutton", "display","none");
					self.toolbarContainer.style.display="none";
					var videoState = self.videoPlayer.getCapabilityState();
					if (videoState.hasCapability(s7sdk.VideoCapabilityState.STOP) || 
						videoState.hasCapability(s7sdk.VideoCapabilityState.REPLAY) ||
						videoState.hasCapability(s7sdk.VideoCapabilityState.PAUSE) 
						) {
						self.videoPlayer.stop();
					}
					self.videoControls.setCSS(".s7controlbar", "position", "absolute");
					self.videoControls.setCSS(".s7controlbar", "left", "-99999px");
					self.videoControls.setCSS(".s7controlbar", "visibility", "hidden");

					self.videoPlayer.setCSS(".s7videoplayer", "position", "absolute");
					self.videoPlayer.setCSS(".s7videoplayer", "left", "-99999px");

					self.divColorSwatches.style.display = "none";
					self.colorSwatchesActive = false;
					self.currentColorSwatchesFrame = null;
				}

				function swatchSelected(e) { 
					var asset = e.s7event.asset;
					
					
					if(self.currentSwatchesFrame != e.s7event.frame || asset != self.prevAsset || self.needsRebuild){
						viewerPreparation();				
						if (self.setindicator){
							if (self.indicatormode === "item"){
								self.setindicator.setSelectedPage(e.s7event.frame);
							}else{
								self.setindicator.setSelectedPage(self.swatches.getCurrentPage().x);
							}
						}

						switch(asset.type){
						case s7sdk.ItemDescType.IMG:
							if(self.flyoutZoomView || self.zoomView) {
								var mediaDsc = new s7sdk.MediaSetDesc();
								mediaDsc.name = new Date().getTime();
								var imgDsc = new s7sdk.ImageDesc(
											mediaDsc,
											asset.type,asset.name,
											asset.swatch,
											asset.width,asset.height,asset.version,asset.isDefault,asset.mod,asset.pmod,asset.label,null,null,null,
											(asset.maps && asset.maps.length) ? true:false,
											false,true
										);
								mediaDsc.items.push(imgDsc);						
								if(self.isFlyoutView){
									toolsButtonsShowHide(false);
									self.activeView = self.flyoutZoomView;
									self.flyoutZoomView.setCSS(".s7flyoutzoomview", "display", "block");
									self.flyoutZoomView.setItem(imgDsc);								
								}
								else{
									toolsButtonsShowHide(true);
									self.activeView = self.zoomView;
									self.zoomView.setItem(imgDsc);
									self.zoomView.setCSS(".s7zoomview", "display", "block");
									var state = self.zoomView.getCapabilityState();
									if(typeof(state) !=  'undefined'){
										self.onChangeZoomState({s7event: {state: state}});
									}
								}	
								if (self.visibilityManagerZoom){
									self.visibilityManagerZoom.detach(self.colorSwatches);
								}
								self.toolbarContainer.style.display="block";							
							}
							break;
						case s7sdk.ItemDescType.IMAGE_SET:
							if(self.flyoutZoomView || self.zoomView) {
								if(self.isFlyoutView){
									toolsButtonsShowHide(false);
									self.activeView = self.flyoutZoomView;
									self.colorSwatchesActive = false;
									self.flyoutZoomView.setCSS(".s7flyoutzoomview", "display", "block");
								}
								else{
									toolsButtonsShowHide(true);
									self.activeView = self.zoomView;
									self.colorSwatchesActive = true;
									self.zoomView.setCSS(".s7zoomview", "display", "block");
									var state = self.zoomView.getCapabilityState();
									if(typeof(state) !=  'undefined'){
										self.onChangeZoomState({s7event: {state: state}});
									}								
								}
								self.colorSwatches.setMediaSet(asset);
								self.colorSwatches.selectSwatch(0, false);

								self.toolbarContainer.style.display="block";
								self.divColorSwatches.style.display = "";
								if (self.visibilityManagerZoom){
									self.visibilityManagerZoom.attach(self.colorSwatches);
								}
							}						
							break;
						case s7sdk.ItemDescType.SPIN_SET:
							if(self.spinView){
								toolsButtonsShowHide(true);
								self.activeView = self.spinView;
								self.spinLeftButton.setCSS(".s7panleftbutton", "display", "block");
								self.spinRightButton.setCSS(".s7panrightbutton", "display","block");
								self.spinView.setMediaSet(asset);
								self.spinView.setCSS(".s7spinview", "display", "block");
								self.toolbarContainer.style.display="block";
								var state = self.spinView.getCapabilityState();
								if(typeof(state) !=  'undefined'){
									self.onChangeZoomState({s7event: {state: state}});
								}
							}
							break;
						case s7sdk.ItemDescType.VIDEO:
                        case s7sdk.ItemDescType.VIDEO_GROUP:
							if(self.videoPlayer){
								toolsButtonsShowHide(false);
								self.activeView = self.videoPlayer;
								self.videoPlayer.setItem(asset);
								self.videoPlayer.setCaptionEnabled(needSetCaption(asset, self.swatches.getFrame()) && self.captionSpecified && self.storedCaptionEnabled);
								if (self.videoPlayer.supportsInline()) {
									self.videoControls.setCSS(".s7controlbar", "visibility","inherit");
								} else {
									self.toolbarContainer.style.display="block";
								}
								self.videoControls.setCSS(".s7controlbar", "position", "absolute");
								self.videoControls.setCSS(".s7controlbar", "left", "0px");

								self.videoPlayer.setCSS(".s7videoplayer", "position", "absolute");
								self.videoPlayer.setCSS(".s7videoplayer", "left", "0px");
								
								handleButtonsVisibility(asset);
							}
							break;
						case s7sdk.ItemDescType.VIDEO_SET:
							if(self.videoPlayer){
								toolsButtonsShowHide(false);
								self.activeView = self.videoPlayer;
								self.videoPlayer.setItem(asset);
								self.videoPlayer.setCaptionEnabled(needSetCaption(asset, self.swatches.getFrame()) && self.captionSpecified && self.storedCaptionEnabled);
								if (self.videoPlayer.supportsInline()) {
									self.videoControls.setCSS(".s7controlbar", "visibility","inherit");
								} else {
									self.toolbarContainer.style.display="block";
								}
	
								self.videoControls.setCSS(".s7controlbar", "position", "absolute");
								self.videoControls.setCSS(".s7controlbar", "left", "0px");

								self.videoPlayer.setCSS(".s7videoplayer", "position", "absolute");
								self.videoPlayer.setCSS(".s7videoplayer", "left", "0px");
								handleButtonsVisibility(asset);
							}
							break;
						default:
							break;
						}
					}
					self.currentSwatchesFrame = e.s7event.frame;
					self.prevAsset = asset;
					self.needsRebuild = false;
				}
		
				function needSetCaption (asset, frame){
					for (var i = 0; i < frame; i++) {
						if ((asset.parent.items[i].type == s7sdk.ItemDescType.VIDEO) || (asset.parent.items[i].type == s7sdk.ItemDescType.VIDEO_SET) || (asset.parent.items[i].type == s7sdk.ItemDescType.VIDEO_GROUP)){
							return false; 
						}
					}
					return true;
				}
				
				function colorSwatchSelected(e) { 
					var asset = e.s7event.asset;
						if(self.activeView && (self.activeView === self.zoomView)){
							if(self.activeView){
								self.activeView.setItem(asset);
							}
						}

				}

				function onImageChanged(e) {
					if (self.colorSwatches && self.colorSwatchesActive && e.s7event.frame != self.colorSwatches.getFrame()){
						self.currentColorSwatchesFrame = e.s7event.frame; 
						self.colorSwatches.selectSwatch(e.s7event.frame, true);
					}
				}

				function closeWindow() {
					try{
						if(s7sdk.browser.name != "firefox") {
							window.open(self.getContentUrl() + "s7sdkclose.html","_self"); //workaround for close self window with JS
						} else {
							window.close(); // Firefox does not allow workaround so we fall back to window.close to cover pop-up case
						} 
					}
					catch(e){
						s7sdk.Logger.log(s7sdk.Logger.WARN,"Cannot close the window");
					}
				}	
				
				function proxyTrack(objID, compClass, instName, timeStamp, eventInfo) {
					if (self.appMeasurementBridge) {
						self.appMeasurementBridge.track(objID, compClass, instName, timeStamp, eventInfo);
					}
					if (self.handlers["trackEvent"]) {
                        if (typeof window.s7sdk == "undefined") {
                            window.s7sdk = s7sdk;
                        }
						self.handlers["trackEvent"](objID, compClass, instName, timeStamp, eventInfo);
					}
					if ("s7ComponentEvent" in window) {
						s7ComponentEvent(objID, compClass, instName, timeStamp, eventInfo);
					}
				}
				
				// Add ClosedCaption enable/disable feature.
				function clickClosedCaptionButton() {
					self.videoPlayer.setCaptionEnabled(self.closedCaptionButton.isSelected());
					self.storedCaptionEnabled = self.closedCaptionButton.isSelected();
				}	
			}

			this.s7params.addEventListener(s7sdk.Event.SDK_READY,function(){
													self.initSiteCatalyst(self.s7params,initViewer);
											},false);
			this.s7params.init();
		};

		
		s7viewers.MixedMediaViewer.prototype.setParam = function(key, def){
			if (this.isDisposed) return;
			this.params[key] = def;	
		};

		s7viewers.MixedMediaViewer.prototype.getParam = function(key){
			var keyLC = key.toLowerCase();
            for (var paramsKey in this.params) {
                if (paramsKey.toLowerCase() == keyLC) {
                    return this.params[paramsKey];
                }
            }
            return null; 
		};

		s7viewers.MixedMediaViewer.prototype.setParams = function(inParams){
			if (this.isDisposed) return;
			var params = inParams.split("&");
			for (var i = 0; i < params.length; i++) {
				var pair = params[i].split("=");
				if (pair.length > 1) {
					this.setParam(pair[0],decodeURIComponent(params[i].split("=")[1]));
				}
			}
		};
		
		s7viewers.MixedMediaViewer.prototype.s7sdkUtilsAvailable = function(){
			if (s7viewers.MixedMediaViewer.codebase.isDAM) {
				return typeof(s7viewers.s7sdk) != "undefined";
			} else {
				return (typeof(s7classic) != "undefined") && (typeof(s7classic.s7sdk) != "undefined");
			}
		};

		s7viewers.MixedMediaViewer.prototype.init = function(){
			if (this.isDisposed) return;
			if (this.initCalled) return;
			this.initCalled = true;
			if (this.initializationComplete) return this;

			var containerDiv = document.getElementById(this.containerId);
			if (containerDiv.className != ""){
				if (containerDiv.className.indexOf(s7viewers.MixedMediaViewer.cssClassName) != -1){
					//
				}else{
					containerDiv.className += " "+s7viewers.MixedMediaViewer.cssClassName;
				}	
			}else{
				containerDiv.className = s7viewers.MixedMediaViewer.cssClassName;
			}

			this.s7sdkNamespace = s7viewers.MixedMediaViewer.codebase.isDAM ? "s7viewers" : "s7classic";
			var utilSrcPath = this.getContentUrl() + this.sdkBasePath + "js/s7sdk/utils/Utils.js?namespace="+this.s7sdkNamespace;
			var allScripts = null;
			if (document.scripts){
				allScripts = document.scripts;
			}else{
				allScripts = document.getElementsByTagName("script");
			}

			if (this.s7sdkUtilsAvailable()){
				s7sdk = (s7viewers.MixedMediaViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);
				s7sdk.Util.init(); 
				this.includeViewer(); 
				this.initializationComplete = true; 
			}else if (!this.s7sdkUtilsAvailable() && (s7viewers.MixedMediaViewer.codebase.isDAM ? s7viewers.S7SDK_S7VIEWERS_LOAD_STARTED : s7viewers.S7SDK_S7CLASSIC_LOAD_STARTED)){
				var selfRef = this;
				var utilsWaitId = setInterval(
					function() {
						if (selfRef.s7sdkUtilsAvailable()) {
							clearInterval(utilsWaitId);
							s7sdk = (s7viewers.MixedMediaViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);
							s7sdk.Util.init(); 
							selfRef.includeViewer();
							selfRef.initializationComplete = true;  
						}
					}, 100
				);
			}else{
				this.utilsScriptElm = document.createElement("script");
				this.utilsScriptElm.setAttribute("language", "javascript");
				this.utilsScriptElm.setAttribute("type", "text/javascript");

				var headElem = document.getElementsByTagName("head")[0];
				var self = this;

				function cleanupAndInitUtils() {
					if (!self.utilsScriptElm.executed) { 
						self.utilsScriptElm.executed = true;
						s7sdk = (s7viewers.MixedMediaViewer.codebase.isDAM ? s7viewers.s7sdk : s7classic.s7sdk);					
						if (self.s7sdkUtilsAvailable() && s7sdk.Util){
							s7sdk.Util.init(); 
							self.includeViewer();  
							self.initializationComplete = true;
							self.utilsScriptElm.onreadystatechange = null;
							self.utilsScriptElm.onload = null;
							self.utilsScriptElm.onerror = null;
						}
					}  
				}

				if (typeof(self.utilsScriptElm.readyState) != "undefined") {
					self.utilsScriptElm.onreadystatechange =  function() {
						if (self.utilsScriptElm.readyState == "loaded") {
							headElem.appendChild(self.utilsScriptElm);
						} else if (self.utilsScriptElm.readyState == "complete") {
							cleanupAndInitUtils();
						}
					};
					self.utilsScriptElm.setAttribute("src", utilSrcPath);
				} else {
					self.utilsScriptElm.onload = function() {
						cleanupAndInitUtils();
					};
					self.utilsScriptElm.onerror = function() {
					};
					self.utilsScriptElm.setAttribute("src", utilSrcPath);
					headElem.appendChild(self.utilsScriptElm);
					self.utilsScriptElm.setAttribute("data-src", self.utilsScriptElm.getAttribute("src"));
					self.utilsScriptElm.setAttribute("src", "?namespace="+this.s7sdkNamespace);
				}
				if(s7viewers.MixedMediaViewer.codebase.isDAM) {
					s7viewers.S7SDK_S7VIEWERS_LOAD_STARTED = true;
				}else {
					s7viewers.S7SDK_S7CLASSIC_LOAD_STARTED = true;	
				}
			}
			
			return this;
		};
				
		s7viewers.MixedMediaViewer.prototype.getDomain = function(inUrl) {
			var res = /(^http[s]?:\/\/[^\/]+)/i.exec(inUrl);
			if (res == null) {
				return '';
			} else {
				return res[1];
			}
		};

		s7viewers.MixedMediaViewer.prototype.setAsset = function(inAsset, inObj) {
			if (this.isDisposed) return;
            var inCaption = null, inPosterImage = null;
			if (inObj) {
				if (Object.prototype.toString.apply(inObj) === '[object String]') {
					inCaption = inObj;
				} else if (typeof inObj == "object"){
					if (inObj.caption) {
						inCaption = inObj.caption;
					} 
					if (inObj.posterimage) {
						inPosterImage = inObj.posterimage
					}                    
				}
			}
			if (this.mediaSet){
				this.mediaSet.setAsset(inAsset);
				if (inCaption){
					this.captionSpecified = true;
					this.curCaption = inCaption + ",1";				
					this.videoPlayer.setCaption(inCaption);
					this.videoPlayer.setCaptionEnabled(this.storedCaptionEnabled);
				}
				else {
					this.captionSpecified = false;
					this.curCaption = null;		
					this.videoPlayer.setCaptionEnabled(false);//disable caption because caption may be active from previous video
				}
                this.isPosterImage =(inPosterImage)? inPosterImage : null;
			}else{
				this.setParam("asset", inAsset);
			}	
		};
		
		s7viewers.MixedMediaViewer.prototype.setLocalizedTexts = function(inText) {
			if (this.isDisposed) return;
			if (this.s7params){
				this.s7params.setLocalizedTexts(inText);
			}else{
				this.setParam("localizedtexts", inText);
			}
		};

		s7viewers.MixedMediaViewer.prototype.initSiteCatalyst = function(params,inCallback) {
				//integrate SiteCatalyst logging
				//strip modifier from asset and take the very first entry from the image list, and the first element in combination from that entry
				var siteCatalystAsset = params.get("asset", null, "MediaSet").split(',')[0].split(':')[0];
				this.isConfig2Exist = false;
				if (siteCatalystAsset.indexOf('/') != -1) {
					var company = s7sdk.MediaSetParser.findCompanyNameInAsset(siteCatalystAsset);
					var config2 = params.get("config2");
					this.isConfig2Exist = (config2 != '' && typeof config2 != "undefined");
					if (this.isConfig2Exist){
						this.trackingParams = {
							siteCatalystCompany: company,
							config2: config2,
							isRoot: params.get("serverurl"),
							contentUrl: this.getContentUrl()
						};
						var jsp_src =this.getContentUrl()+'../AppMeasurementBridge.jsp?company=' + company + (config2 == '' ? '' : '&preset=' + config2);
						if (params.get("serverurl", null)) {
							jsp_src += "&isRoot=" + params.get("serverurl");
						}
						var elem = document.createElement("script");
						elem.setAttribute("language", "javascript");
						elem.setAttribute("type", "text/javascript");
						elem.setAttribute("src", jsp_src);

						var elems = document.getElementsByTagName("head");
						elem.onload = elem.onerror = function() {  
							if (!elem.executed) { 
								elem.executed = true;  
								if (typeof inCallback == "function"){
									inCallback();
								}
								elem.onreadystatechange = null;
								elem.onload = null;
								elem.onerror = null;
							}  
						};  

						elem.onreadystatechange = function() {  
							if (elem.readyState == "complete" || elem.readyState == "loaded") {  
								setTimeout(function() { 
									if (!elem.executed) { 
										elem.executed = true;  
										if (typeof inCallback == "function"){
											inCallback();
										}
									}  
									elem.onreadystatechange = null;
									elem.onload = null;
									elem.onerror = null;
								}, 0);
							}  
						};
						elems[0].appendChild(elem);
					}else{
						if (typeof inCallback == "function"){
							inCallback();
						}
					}	
				}
		};
		
		
		/**
		 * Return component within the viewer according the specified id, null if id is invalid or inapplicable.
		 * @param inId ID of the component to retrieve 
		 */
		s7viewers.MixedMediaViewer.prototype.getComponent = function(inId) {
			if (this.isDisposed) return null;
			switch(inId){
				case "container":
					return this.container || null;
				case "mediaSet":
					return this.mediaSet || null;
				case "flyoutZoomView":
					return this.flyoutZoomView || null;
				case "zoomView":
					return this.zoomView || null;
				case "spinView":
					return this.spinView || null;
				case "videoPlayer":
					return this.videoPlayer || null;
				case "controls":
					return this.videoControls || null;
				case "videoScrubber":
					return this.videoScrubber || null;
				case "videoTime":
					return this.videoTime || null;
				case "swatches":
					return this.swatches || null;
				case "colorSwatches":
					return this.colorSwatches || null;
				case "setIndicator":
					return this.setindicator || null;			
				case "zoomInButton":
					return this.zoomInButton || null;
				case "zoomOutButton":
					return this.zoomOutButton || null;
				case "zoomResetButton":
					return this.zoomResetButton || null;
				case "spinLeftButton":
					return this.spinLeftButton || null;
				case "spinRightButton":
					return this.spinRightButton || null;
				case "mutableVolume":
					return this.mutableVolume || null;
				case "playPauseButton":
					return this.playPauseButton || null;
				case "fullScreenButton":
					return this.fullScreenButton || null;
				case "closeButton":
					return this.closeButton || null;
				case "videoFullScreenButton":
					return this.videoFullScreenButton || null;
				case "closedCaptionButton":
					return this.closedCaptionButton || null;
				case "parameterManager":
					return this.s7params || null;
				default:
					return null;
			}
		};	

		/**
		 * @private
		 * Assigns handler functions by names.  This function will clear the previous handler functions on the list.
		 * Non-function entries will be ignored.
		 *
		 * @param {Object} inObj Simple JSON object containing name:function pairs.
		 */
		s7viewers.MixedMediaViewer.prototype.setHandlers = function(inObj) {
			if (this.isDisposed) return;
			if (this.initCalled) return;
			this.handlers = [];
			for (var i in inObj) {
				if (!inObj.hasOwnProperty(i)) continue;
				if (typeof inObj[i] != "function") continue;
				this.handlers[i] = inObj[i];
			}
		};
		
		s7viewers.MixedMediaViewer.prototype.setModifier = function(modifierObject) {
			if (this.isDisposed) return;
			var modName, modDesc, modObj, modVal, parsedModifier, i;
			for(modName in modifierObject) {
				if(!this.modifiers.hasOwnProperty(modName)) {
					continue;
				}
				modDesc = this.modifiers[modName];
				
				try {
					modVal = modifierObject[modName];

					if (modDesc.parseParams === false) {
						parsedModifier = new s7sdk.Modifier([modVal  != "" ? modVal : modDesc.defaults[0]]);
					} else {
						parsedModifier = s7sdk.Modifier.parse(modVal, modDesc.defaults, modDesc.ranges);
					}

					if(parsedModifier.values.length == 1) {
						var val = parsedModifier.values[0];
						if (val !== this[modName]){
							this[modName] = val;
							this.setModifierInternal(modName);
						}
					}
					else if(parsedModifier.values.length > 1) {
						modObj = {};
						for(i = 0; i < parsedModifier.values.length; i++) {
							modObj[modDesc.params[i]] = parsedModifier.values[i];
						}
						if (modObj !== this[modName]){
							this[modName] = modObj;
							this.setModifierInternal(modName);
						}
					}
				}
				catch(error) {
					throw new Error("Unable to process modifier: '"+ modName + "'. " + error);
				}
			}
		};

		s7viewers.MixedMediaViewer.prototype.setModifierInternal = function(modName) {
			switch (modName) {
				case "zoomMode" :
					if (this.zoomMode == "auto") {
						if (s7sdk.browser.device.name == "desktop") {
							this.zoomMode = "inline";
						}
						else {
							this.zoomMode = "continuous";
						}
					}
					this.needsRebuild = true;
					if (this.zoomMode == "inline"){
						this.isFlyoutView = true;
						if (this.zoomView) {
							this.trackingManager.detach(this.zoomView);
							this.zoomView.removeEventListener(s7sdk.event.CapabilityStateEvent.NOTF_ZOOM_CAPABILITY_STATE,self.onChangeZoomState, false);
							this.zoomView.setCSS(".s7zoomview", "display", "none");
						}
						this.trackingManager.attach(this.flyoutZoomView);
						if (!(s7sdk.browser.device.name == "desktop")) this.visibilityManagerZoom.reference(this.flyoutZoomView);
						this.mediaSet.setModifier({"flattenSets": "1,1"});
					}
					else{
						this.isFlyoutView = false;
						if (this.flyoutZoomView) {
							this.trackingManager.detach(this.flyoutZoomView);
							this.flyoutZoomView.setCSS(".s7flyoutzoomview", "display", "none");
						}
						this.zoomView.addEventListener(s7sdk.event.CapabilityStateEvent.NOTF_ZOOM_CAPABILITY_STATE,this.onChangeZoomState, false);
						if (!(s7sdk.browser.device.name == "desktop")) this.visibilityManagerZoom.reference(this.zoomView);
						this.trackingManager.attach(this.zoomView);
						this.mediaSet.setModifier({"flattenSets": "0,0"});
					}
					break;
				default :
					break;				
			}
		};

		s7viewers.MixedMediaViewer.prototype.parseMods = function () {
			var modName, modDesc, modObj, modVal, parsedModifier, i;
			
			for(modName in this.modifiers) {
				if(!this.modifiers.hasOwnProperty(modName)) {
					continue;
				}
				modDesc = this.modifiers[modName];
				
				try {
					modVal = this.s7params.get(modName, "");

					if (modDesc.parseParams === false) {
						parsedModifier = new s7sdk.Modifier([modVal  != "" ? modVal : modDesc.defaults[0]]);
					} else {
						parsedModifier = s7sdk.Modifier.parse(modVal, modDesc.defaults, modDesc.ranges);
					}

					if(parsedModifier.values.length == 1) {
						this[modName] = parsedModifier.values[0];
					}
					else if(parsedModifier.values.length > 1) {
						modObj = {};
						for(i = 0; i < parsedModifier.values.length; i++) {
							modObj[modDesc.params[i]] = parsedModifier.values[i];
						}
						this[modName] = modObj;
					}
				}
				catch(error) {
					throw new Error("Unable to process modifier: '"+ modName + "'. " + error);
				}
			}
		};

		/**
		 * @private
		 */
		s7viewers.MixedMediaViewer.prototype.updateCSSMarkers = function (){
			var sizeMarker = this.container.getSizeMarker();
			var newclass;
			if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_NONE){
				return;
			}		
			if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_LARGE){
				newclass = "s7size_large";
			}else{
				if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_SMALL){
					newclass = "s7size_small";
				}else if (sizeMarker == s7sdk.common.Container.SIZE_MARKER_MEDIUM){
					newclass = "s7size_medium";
				}
			}
			if (this.containerId) {
				this.setNewSizeMarker(this.containerId, newclass);
			}
			this.reloadInnerComponents();
		};

		s7viewers.MixedMediaViewer.prototype.reloadInnerComponents = function () {
			var regCompArr = this.s7params.getRegisteredComponents();
			for(var i=0; i < regCompArr.length; i++){
				var control = regCompArr[i];
				if (control && control.restrictedStylesInvalidated()){
						control.reload();
				}
			}
		};
		
		s7viewers.MixedMediaViewer.prototype.setNewSizeMarker = function (elm, inClass) {
			var cls = document.getElementById(elm).className;
			var re = /^(.*)(s7size_small|s7size_medium|s7size_large)(.*)$/gi;
			var newcls;
			if(cls.match(re)){
				newcls = cls.replace(re,  "$1" + inClass + "$3");
			} else {
				newcls = cls + " " + inClass;
			}
			if(cls != newcls){
				document.getElementById(elm).className = newcls;
			}
		};

		s7viewers.MixedMediaViewer.prototype.dispose = function () {

			window.removeEventListener("orientationchange", this.onOrientationChange); 
			if (this.zoomView){
				this.zoomView.removeEventListener(s7sdk.event.CapabilityStateEvent.NOTF_ZOOM_CAPABILITY_STATE,this.onChangeZoomState, false);
			}
			if (this.spinView){
				this.spinView.removeEventListener(s7sdk.event.CapabilityStateEvent.NOTF_SPIN_CAPABILITY_STATE,this.onChangeZoomState, false);				
			}
			this.onChangeZoomState = null;

			if (this.appMeasurementBridge) {
				this.appMeasurementBridge.dispose();
				this.appMeasurementBridge = null;
			}
			if (this.trackingManager){
				this.trackingManager.dispose();
				this.trackingManager = null;
			}
			if (this.visibilityManagerZoom){
				this.visibilityManagerZoom.dispose();
				this.visibilityManagerZoom = null;
			}
			if (this.visibilityManagerSpin){
				this.visibilityManagerSpin.dispose();
				this.visibilityManagerSpin = null;
			}
			if (this.visibilityManagerVideo){
				this.visibilityManagerVideo.dispose();
				this.visibilityManagerVideo = null;
			}
			if (this.setindicator){
				this.setindicator.dispose();
				this.setindicator = null;
			}
			if (this.colorSwatches){
				this.colorSwatches.dispose();
				this.colorSwatches = null;
			}
			if (this.swatches){
				this.swatches.dispose();
				this.swatches = null;
			}
			if (this.zoomView){
				this.zoomView.dispose();
				this.zoomView = null;
			}
			if (this.divColorSwatches){
				this.divColorSwatches.parentNode.removeChild(this.divColorSwatches);	
				delete this.divColorSwatches
			}
			if (this.zoomInButton){
				this.zoomInButton.dispose();
				this.zoomInButton = null;
			}
			if (this.zoomOutButton){
				this.zoomOutButton.dispose();
				this.zoomOutButton = null;
			}
			if (this.zoomResetButton){
				this.zoomResetButton.dispose();
				this.zoomResetButton = null;
			}
			if (this.fullScreenButton){
				this.fullScreenButton.dispose();
				this.fullScreenButton = null;
			}
			if (this.closeButton){
				this.closeButton.dispose();
				this.closeButton = null;
			}
			if (this.flyoutZoomView){
				this.flyoutZoomView.dispose();
				this.flyoutZoomView = null;
			}
			if (this.spinLeftButton){
				this.spinLeftButton.dispose();
				this.spinLeftButton = null;
			}
			if (this.spinRightButton){
				this.spinRightButton.dispose();
				this.spinRightButton = null;
			}
			if (this.divSpinButton){
				this.divSpinButton.parentNode.removeChild(this.divSpinButton);	
				delete this.divSpinButton
			}
			if (this.spinView){
				this.spinView.dispose();
				this.spinView = null;
			}
			if (this.videoTime){
				this.videoTime.dispose();
				this.videoTime = null;
			}
			if (this.videoScrubber){
				this.videoScrubber.dispose();
				this.videoScrubber = null;
			}
			if (this.playPauseButton){
				this.playPauseButton.dispose();
				this.playPauseButton = null;
			}
			if (this.mutableVolume){
				this.mutableVolume.dispose();
				this.mutableVolume = null;
			}
			if (this.videoFullScreenButton){
				this.videoFullScreenButton.dispose();
				this.videoFullScreenButton = null;
			}
			if (this.closedCaptionButton){
				this.closedCaptionButton.dispose();
				this.closedCaptionButton = null;
			}
			if (this.videoPlayer){
				this.videoPlayer.dispose();
				this.videoPlayer = null;
			}
			if (this.videoControls){
				this.videoControls.dispose();
				this.videoControls = null;
			}		
			if (this.toolbarContainer){
				this.toolbarContainer.parentNode.removeChild(this.toolbarContainer);	
				delete this.toolbarContainer
			}
			if (this.imageViewContainer){
				this.imageViewContainer.parentNode.removeChild(this.imageViewContainer);	
				delete this.imageViewContainer
			}

			if (this.mediaSet){
				this.mediaSet.dispose();
				this.mediaSet = null;
			}
			if (this.s7params){
				this.s7params.dispose();
				this.s7params = null;
			}
			if (this.container){
				var classes = [s7viewers.MixedMediaViewer.cssClassName,"s7touchinput","s7mouseinput","s7size_large","s7size_small","s7size_medium"];
				var cls = document.getElementById(this.containerId).className.split(' ');
				for(var i=0; i<classes.length;i++){
					var idx = cls.indexOf(classes[i]);
					if(idx != -1) { 
						cls.splice(idx, 1);
					}
				}
				document.getElementById(this.containerId).className = cls.join(' ');
				this.container.dispose();
				this.container = null;
			}

			this.prevAsset = null;
			this.s7mediasetDesc = null; 
			this.currentColorSwatchesFrame = null;
			this.currentSwatchesFrame = null;
			this.bcr_videoControls = null;
			this.bcr_playPauseButton = null;
			this.bcr_videoTime = null;
			this.bcr_videoScrubber = null;
			this.activeView = null;

			this.handlers = [];
			this.isDisposed = true;
		};

		/**
		 * @private
		 */	
		s7viewers.MixedMediaViewer.prototype.updateOrientationMarkers = function (){
			if(!this.isOrientationMarkerForcedChanged){
				var newclass;
				if (window.innerWidth > window.innerHeight){
					newclass = "s7device_landscape";
				}else{
					newclass = "s7device_portrait";
				}			
				if (document.getElementById(this.containerId).className.indexOf(newclass) == -1) {
					this.setNewOrientationMarker(this.containerId, newclass);
					this.reloadInnerComponents();
				}
			}
		};
		
		s7viewers.MixedMediaViewer.prototype.setNewOrientationMarker = function (elm, inClass) {
			var cls = document.getElementById(elm).className;
			var re = /^(.*)(s7device_landscape|s7device_portrait)(.*)$/gi;
			var newcls;
			if(cls.match(re)){
				newcls = cls.replace(re,  "$1" + inClass + "$3");
			} else {
				newcls = cls + " " + inClass;
			}
			if(cls != newcls){
				document.getElementById(elm).className = newcls;
			}
		};

		s7viewers.MixedMediaViewer.prototype.forceDeviceOrientationMarker = function (marker){
			switch (marker){
				case "s7device_portrait":
				case "s7device_landscape":
					this.isOrientationMarkerForcedChanged = true;
					if (this.containerId) {
						this.setNewOrientationMarker(this.containerId, marker);
					}
					this.reloadInnerComponents();
					break;
				case null:
					this.isOrientationMarkerForcedChanged = false;
					this.updateOrientationMarkers();
					break;
				default:
					break;
			}
		};

		s7viewers.MixedMediaViewer.prototype.getURLParameter = function (name) {
			return decodeURIComponent((new RegExp('[?|&]' + name + '=([^&;]+?)(&|#|;|$)','gi').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
		};

		s7viewers.MixedMediaViewer.prototype.addClass = function (elm, inClass) {
			var cls = document.getElementById(elm).className.split(' ');
			if(cls.indexOf(inClass) == -1) {
				cls[cls.length] = inClass;
				document.getElementById(elm).className = cls.join(' ');
			}
		};

	})();		
}
