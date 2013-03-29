/**
 * Enumeration depicting the options when loading a pane
 */
var paneLoadOption  = {
	PROMPT_ONLY_IF_MODIFIED : 'PROMPT-ONLY-IF-MODIFIED',
	NO_PROMPT : 'NO-PROMPT',
	PROMPT_ALWAYS : 'PROMPT-ALWAYS'
};

function selectPaneContainer(paneId) {
	var pane = $("#" + paneId);
	if (pane.hasClass("hasPane")) {
		// the ID passed in represents the pane container
		return pane;
	}
	
	return pane.parents(".hasPane");
}

function selectPaneUsingContainerId(containerId) {
	var container = $("#" + containerId);
	if (container.hasClass("hasPane")) {
		// the ID passed in represents the pane identifier
		return container;
	}
	
	return container.children(".hasPane");
}

/*!
 * jQuery Pane
 * Author: Doug Estep - Dayton Technology Group.
 * Version 1.1.0
 * 
 * API Documention:
 *   http://dougestep.com/dme/jquery-pane-widget
 * 
 * Depends:
 *   jquery 1.7.2 +
 *   jquery-ui 1.8+ using the following plugins.
 *     jQuery UI widget factory
 *     Dialog
 *     
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */
(function($, undefined) {
	var paneContainerClass = "hasPane";
	
	var paneHighlightColumnData = "data-pane-highlight-column-class-name";
	var paneHighlightLabelData = "data-pane-highlight-label-class-name";
	var paneReloadWarningDialogId = "pane-reload-warning-dialog";
	
	$.widget("dtg.pane", {
		// default options
		options: {
			// The URL to invoke when loading the contents of a PANE. Required.
			paneActionUrl: '',
			// Supply true to refresh the PANE upon first access to the pane. Supply false if the data to populate the pane was already initiated prior to the first display.
			paneRefreshOnFirstAccess: true,
			// The message displayed when refreshing a pane and the option to always prompt for confirmation is sent
			paneLoadAlwaysPromptMessage : 'You have chosen to refresh the data on this pane.<br /><br />Continue?',
			// The message displayed when refreshing a pane and the option to prompt only if there are unsaved changes on the pane for confirmation is sent
			paneLoadPromptWhenModifiedMessage : 'You have chosen to refresh the data on this pane. There are unsaved changes which will be lost if you continue.<br /><br />Continue?',
			// The title displayed in the load warning dialog
			paneLoadDialogTitle : 'Reload Pane',
			// A set of key/value pairs that configure the Ajax request to load the pane
			paneAjaxLoadSettings: {},
			
			// the message to display if an exception were to occur on the server within an ajax call
			friendlyExceptionMessage: 'This page is having trouble communicating to the web server while processing your request. '
				+ 'You may retrying the transaction, however, if it keeps having problems please call the help desk '
				+ 'and relay to them as much information as you have which led up to the error occurring. <br /><br />'
				+ 'We apologize for any inconvenience.',
			// the name of the HTTP request parameter to supply on the URL when a refresh was initiated.
			refreshParameterName: 'refresh',
			// supply true to display a header bar at the top of the pane
			enablePaneHeader : false,
			// supply the text to display in the header bar at the top of the pane
			paneHeaderTitle : '',
			// supply left to left align the text in the header bar, center to align center, or right to align right
			paneHeaderAlign : 'center',
			// supply true to wrap the pane with a border
			enablePaneGroupBox : false,
			// supply true to disable this pane; false to enable.
			disable : false,
			// supply true to set all inputable columns to read-only.
			readonly : false,
			// default disabler plugin options
			disablerOptions : {
				disable : false,
				readonly : false,
				expression : "*:not(.disabler-ignore-readonly):not(label)" 
			},
			// modificationHighlighter plugin options
			modificationHighlighterOptions : {
				addlSelectableInputTypes : '',
				inputNotModifiedIfHasClass: 'error',
				modifiedColumnClass: "ui-state-highlight",
				modifiedLabelClass: "ui-state-highlight"
			},
			// set to true to highlight the modified columns on this pane
			highlightModifications : true,
			// the CSS class used to display disabled information
			disabledClass : "ui-state-disabled",
			// the CSS class used to indicate that an AJAX transaction is executing
			paneProgressIndicatorClass : "pane-progress-indicator",
			// the CSS class used to style the PANE header bar on this pane
			paneHeaderTitleBarClass : "pane-header-title-bar",
			// the CSS class used to style the content of this PANE when group-box is enabled
			paneGroupBoxContentClass : "pane-group-box-content",
			// the CSS class which is applied to a DIV placed when group-box is enabled
			paneGroupBoxWrapperClass : "pane-group-box-wrapper"
		},
		
		/**
		 * Enables this pane.
		 */
		enable : function() {
			this._setOption("disable", false);
		},
		
		/**
		 * Disables this pane.
		 */
		disable : function() {
			this._setOption("disable", true);
		},
		
		_create : function() {
			this._initOptions();
			this._assertContainerHasId();			
			this._assertUniqueId();
			
			// assign pane container class to plugin container
			if (!this.element.hasClass(paneContainerClass)) {
				this.element.addClass(paneContainerClass);
			}
			
			this._doLoadPane(this.options.paneRefreshOnFirstAccess);
		},
		
		_initOptions : function() {
			// ensure all boolean options are boolean in type
			this.options.paneRefreshOnFirstAccess = this._ensureBoolean(this.options.paneRefreshOnFirstAccess);
			this.options.enablePaneHeader = this._ensureBoolean(this.options.enablePaneHeader);
			this.options.enablePaneGroupBox = this._ensureBoolean(this.options.enablePaneGroupBox);
			this.options.disable = this._ensureBoolean(this.options.disable);
			this.options.readonly = this._ensureBoolean(this.options.readonly);
			this.options.highlightModifications = this._ensureBoolean(this.options.highlightModifications);
		},
		
		_ensureBoolean : function(value) {
			var bool = false;
			if (this._isNotNullAndNotUndefined(value)) {
				var flag = new String(value).toLowerCase();
				bool = flag === "true";
			}
			return bool;
		},
		
		_assertContainerHasId : function() {
			var paneId = this.element.attr("id");
			if (this._isNullOrUndefined(paneId) || paneId.length === 0) {
				throw "The container which this plugin is running against must contain an ID attribute.";  
			} 
		},
		
		_assertUniqueId : function() {
			var len = $("#" + this.element.attr("id")).length === 1;
			if (len > 1) {
				throw "The container ID must be unique within the DOM.  There are " + len 
					+ " elements which have the \"" + this.element.attr("id") + "\" ID.";   
			}
		},
		
		_initPaneOptions : function() {
			this._setOption("enablePaneHeader", this.options.enablePaneHeader);
			this._setOption("paneHeaderTitle", this.options.paneHeaderTitle);
			this._setOption("paneHeaderAlign", this.options.paneHeaderAlign);
			this._setOption("enablePaneGroupBox", this.options.enablePaneGroupBox);
			this._setOption("disable", this.options.disable);
			if (this.options.readonly) {
				this._setOption("readonly", this.options.readonly);
			}
			this._setOption("highlightModifications", this.options.highlightModifications);
		},
		
		_setOption: function( key, value ) {
			this.options[ key ] = value;
			this._initOptions();
			var paneId = this.element.attr("id");
			switch (key) {
			case 'enablePaneHeader':	
				this._enablePaneHeader(this.options.enablePaneHeader);
				break;
			case 'paneHeaderTitle': 
				$("#" + paneId + " ." + this.options.paneHeaderTitleBarClass).text(value);
				break;
			case 'paneHeaderAlign': 
				var leftAlign = this.options.paneHeaderTitleBarClass + '-left';
				var rightAlign = this.options.paneHeaderTitleBarClass + '-right';
				var centerAlign = this.options.paneHeaderTitleBarClass + '-center';
				var align = this.options.paneHeaderTitleBarClass + "-" + value;
				
				$("#" + paneId + " ." + this.options.paneHeaderTitleBarClass)
					.removeClass(leftAlign)
					.removeClass(rightAlign)
					.removeClass(centerAlign)
					.addClass(align);
				break;
			case 'enablePaneGroupBox': 
				this._enablePaneGroupBox(this.options.enablePaneGroupBox);
				break;
			case 'disable':
				this._doDisable(paneId, this.options.disable);
				break;
			case 'readonly':
				this.readOnly(paneId, this.options.readonly);
				break;
			case 'highlightModifications' : 
				this._turnOnOffHighlightModifications(this.options.highlightModifications);
				break;
			default:
				this._doDisable(paneId, this.options.disable);
				break;
			}
		},
		
		_turnOnOffHighlightModifications : function(turnOn) {
			if (this._isNullOrUndefined(this.options.modificationHighlighterOptions)) { return; }
			
			if (turnOn) {
				var modifiedColumnClass = this._getAttribute(this.element, paneHighlightColumnData);
				var modifiedLabelClass = this._getAttribute(this.element, paneHighlightLabelData);
				if (this._isNotNullAndNotUndefined(modifiedColumnClass)) { 
					this.options.modificationHighlighterOptions.modifiedColumnClass = modifiedColumnClass;
					this.options.modificationHighlighterOptions.modifiedLabelClass = modifiedLabelClass;
					var tracker = this._createColumnTracker();
					tracker.modificationHighlighter("evaluate");
				}
			} else {
				var modifiedColumnClass = this.options.modificationHighlighterOptions.modifiedColumnClass;
				var modifiedLabelClass = this.options.modificationHighlighterOptions.modifiedLabelClass;
				
				var paneId = this.element.attr("id");
				if (this._isNotNullAndNotUndefined(modifiedColumnClass) && $.trim(modifiedColumnClass).length > 0) {
					$("#" + paneId + " ." + modifiedColumnClass).removeClass(modifiedColumnClass);
					this._setAttribute(this.element, paneHighlightColumnData, modifiedColumnClass);
					this.options.modificationHighlighterOptions.modifiedColumnClass = "";
				}
				if (this._isNotNullAndNotUndefined(modifiedLabelClass) && $.trim(modifiedLabelClass).length > 0) {
					$("#" + paneId + " ." + modifiedLabelClass).removeClass(modifiedLabelClass);
					this._setAttribute(this.element, paneHighlightLabelData, modifiedLabelClass);
					this.options.modificationHighlighterOptions.modifiedLabelClass = "";
				}
				
				this._createColumnTracker();
			}
		},
		
		_hasDisabler : function(containerId) {
			var selector = this._formatSelectorForContainerId(containerId);
			return $(selector).hasClass("hasDisabler");
		},
		
		_createDisabler : function(containerId, readonly, disabled) {
			var selector = this._formatSelectorForContainerId(containerId);
			var options = this.options.disablerOptions;
			options.readonly = readonly;
			options.disable = disabled;
			return $(selector).disabler(options);
		},
		
		_doDisable : function(containerId, disabled) {
			var selector = this._formatSelectorForContainerId(containerId);
			if (this._hasDisabler(containerId)) {
				$(selector).disabler("option", "disable", disabled);
				this._setDisablerOptions(selector);
			} else {
				this._createDisabler(containerId, false, disabled);
			}
			this.options.disable = $(selector).disabler("option", "disable");
		},
		
		/**
		 * Sets the inputable columns contained with the supplied container to read-only, disables buttons, and unbinds all events.
		 * Warning: this method can be expensive for very busy panes because it has to traverse the entire DOM to unbind all
		 * events. Use with caution.
		 * @param containerId the ID representing the container to set to read-only. Set to null to evaluate the entire pane.
		 * @param readOnlyFlag set to true to set to read-only.  Set to false to undo the read-only 
		 * columns set by this function, to enable the buttons, and bind the events back.  Setting this parameter to false will 
		 * not remove the read-only attribute of a column that was not set to read-only by this function.
		 */
		readOnly : function(containerId, readOnlyFlag) {
			var selector = this._formatSelectorForContainerId(containerId);
			if (this._hasDisabler(containerId)) {
				$(selector).disabler("option", "readonly", readOnlyFlag);
				this._setDisablerOptions(selector);
			} else {
				this._createDisabler(containerId, readOnlyFlag, false);
			}
			
			this.options.readonly = $(selector).disabler("option", "readonly");
		},
		
		_setDisablerOptions : function(selector) {
			$(selector).disabler("option", "disabledClass", this.options.disablerOptions.disabledClass);
			$(selector).disabler("option", "expression", this.options.disablerOptions.expression);
		},
				
		_enablePaneHeader : function(value) {
			var paneId = this.element.attr("id");
			var headerHtml = '';
			if (value) {
				var align = this.options.paneHeaderTitleBarClass + '-' + $.trim(this.options.paneHeaderAlign.toLowerCase());
				if ($("#" + this.element.attr("id") + " div." + this.options.paneHeaderTitleBarClass).length === 0) {
					headerHtml += '<div class="' + this.options.paneHeaderTitleBarClass + ' ' + align + '">';
					headerHtml += this.options.paneHeaderTitle;
					headerHtml += '</div>\n';
					
					var container = $("#" + paneId + " ." + this.options.paneGroupBoxContentClass);
					if (container.length === 0) {
						container = $($("#" + paneId)[0]);
					}
					container.prepend(headerHtml);
				}
			} else {
				var header = $("#" + paneId + " div." + this.options.paneHeaderTitleBarClass);
				header.remove();
			}
		},
		
		_enablePaneGroupBox : function(value) {
			var paneId = this.element.attr("id");
			if (value) {
				var selector = "div." + this.options.paneGroupBoxContentClass + " #" + this.element.attr("id");
				if ($(selector).length === 0) {
					$("#" + paneId).wrap('<div class="' + this.options.paneGroupBoxContentClass + '" />');
					$("#" + paneId).wrap('<div class="' + this.options.paneGroupBoxWrapperClass + '" />');
				}
			} else {
				if ($("div." + this.options.paneGroupBoxContentClass + " #" + paneId).length > 0) {
					$("#" + paneId).unwrap().unwrap();
				}
			}
		},
		
		destroy : function() {
			$.Widget.prototype.destroy.call(this);
		},
		
		/**
		 * Loads the contents of this pane from the data repository. 
		 * @param loadOption the load option to execute as described by the paneLoadOption enumeration.
		 */
		load : function(loadOption) {	
			var bpl = $.Event("beforePaneLoad");
			this._trigger("beforePaneLoad", bpl, { 
				'element' : this.element
			});
			if (bpl.isDefaultPrevented()) { return; }
			
			var warnDialog = this._createPaneReloadWarningDialog();
			warnDialog.dialog("option", "title", this.options.paneLoadDialogTitle);
			
			if (this._isNullOrUndefined(loadOption) || loadOption === paneLoadOption.PROMPT_ALWAYS) {
				warnDialog.html(this.options.paneLoadAlwaysPromptMessage);
				warnDialog.dialog("open");
			} else if (loadOption === paneLoadOption.NO_PROMPT) { 
				this._doLoadPane(true);
			} else if (loadOption === paneLoadOption.PROMPT_ONLY_IF_MODIFIED) {
				var containerId = this.element.attr("id");
				var columns = this.getModifiedColumnsWithinContainer(containerId);
				if (columns.length === 0) {
					this._doLoadPane(true);
				} else {
					warnDialog.html(this.options.paneLoadPromptWhenModifiedMessage);
					warnDialog.dialog("open");
				}
			}
		}, 
		
		_createPaneReloadWarningDialog : function(tab) {
			var plugin = this;
			var warnDialog = $(plugin._prepId(paneReloadWarningDialogId)).dialog({
				autoOpen: false,	
				closeOnEscape: true,
				draggable: true,
				modal: true,
				resizable: true,
				buttons: {
					'OK': function(e) {
						$(this).dialog('close');
						plugin._doLoadPane(true);
					}, 
					'Cancel' : function(e) {
						$(this).dialog('close');
					}
				}
			}); 
			return warnDialog;
		},
		
		_processPaneProgress : function(startingProgress) {
			var paneId = this.element.attr("id");
			if (this.element.length === 0 || $.trim(this.element.html()).length === 0) {
				if (startingProgress) {
					$("#" + paneId).addClass(this.options.paneProgressIndicatorClass);
					$("body").css("cursor", "progress");
				} else {
					$("#" + paneId).removeClass(this.options.paneProgressIndicatorClass);
					$("body").css("cursor", "auto");
				}
			} else {				
				if (startingProgress) {
					$("body").css("cursor", "progress");
					$("#" + paneId).addClass(this.options.disabledClass);
				} else {
					$("body").css("cursor", "auto");
					$("#" + paneId).removeClass(this.options.paneProgressIndicatorClass);
					$("#" + paneId).removeClass(this.options.disabledClass);
				}
			}
		},
		
		_doLoadPane : function(refreshOnFirstAccess) {
			var paneId = this.element.attr("id");
			var holdEnablePaneGroupBox = this.options.enablePaneGroupBox; 
			var optionsUrl = this.options.paneActionUrl;
			if (this._isNullOrUndefined(optionsUrl) || $.trim(optionsUrl).length === 0) {
				this._doBeforeLoad();
				var data = "You must supply a URL as an option to this PANE before the content is loaded";
				this._doSuccessfulLoad(holdEnablePaneGroupBox, data);
				return;
			}
			
			// if the URL points to a DOM element, load the contents of the element into this PANE.
			if (optionsUrl.indexOf("#") === 0) {
				this._doBeforeLoad();
				var data = $(optionsUrl).html();
				this._doSuccessfulLoad(holdEnablePaneGroupBox, data);
				return;
			}
			
			var url = this._appendRefreshParam(optionsUrl, refreshOnFirstAccess);
			var plugin = this;

			var ajaxParams = new Object();
			ajaxParams['cache'] = false;
			ajaxParams['async'] = true;
			ajaxParams['beforeSend'] = function (xhr, settings) {
				plugin._doBeforeLoad();
				
				if (plugin._isNotNullAndNotUndefined(plugin.options.paneAjaxLoadSettings.beforeSend)) {
					plugin.options.paneAjaxLoadSettings.beforeSend(xhr, settings);
				}
			};
			ajaxParams['error'] = function(xhr, status) {
				plugin._processPaneProgress(false);
				plugin.options.enablePaneGroupBox = holdEnablePaneGroupBox;
			
				var container = $('#' + paneId);
				container.html(plugin.options.friendlyExceptionMessage);					
				
				plugin._initPaneOptions();
				
				if (plugin._isNotNullAndNotUndefined(plugin.options.paneAjaxLoadSettings.error)) {
					plugin.options.paneAjaxLoadSettings.error(xhr, status, error);
				}
			};
			ajaxParams['url'] = url;
			ajaxParams['success'] = function(data, status, xhr) {
				plugin._doSuccessfulLoad(holdEnablePaneGroupBox, data);
				
				if (plugin._isNotNullAndNotUndefined(plugin.options.paneAjaxLoadSettings.success)) {
					plugin.options.paneAjaxLoadSettings.success(data, status, xhr);
				}
			};
			for (var propertyName in plugin.options.paneAjaxLoadSettings) {
				if (propertyName !== 'beforeSend' && propertyName !== 'error' && propertyName !== 'success') {
					ajaxParams[propertyName] = params.ajaxSettings[propertyName];
				}
			}
			$.ajax(ajaxParams);			
			
			// fire event
			var apl = $.Event("afterPaneLoad");
			this._trigger("afterPaneLoad", apl, { 
				'element' : this.element
			});
		},
		
		_doBeforeLoad : function() {
			this._processPaneProgress(true);
			this._setOption("enablePaneGroupBox", false);
		},
		
		_doSuccessfulLoad : function(holdEnablePaneGroupBox, data) {
			this.options.enablePaneGroupBox = holdEnablePaneGroupBox;
			
			var paneId = this.element.attr("id");
			var container = $('#' + paneId);
			container.html(data);
			
			// initPaneOptions results in the storeOriginalValues method being called..and so does afterPaneLoad???
			this._initPaneOptions();
			this._afterPaneLoad(paneId);
			this._processPaneProgress(false);
		},
				
		_appendRefreshParam : function(url, paramValue) {
			var idx = url.indexOf(this.options.refreshParameterName + "=");
			if (idx < 0) {
				url = this._getUrlWithRefreshParamAtEnd(url, paramValue);
			} else {
				url = this._getUrlWithRefreshParamReplaced(url, paramValue, idx);
			}
			return url;
		},
		
		_getUrlWithRefreshParamAtEnd : function(url, paramValue) {
			if (url.indexOf('?') < 0) {
				url += "?" + this.options.refreshParameterName + "=" + paramValue;
			} else {
				url += "&" + this.options.refreshParameterName + "=" + paramValue;
			}
			return url;
		},
		
		_getUrlWithRefreshParamReplaced : function(url, paramValue, beginIdx) {
			var nameEqLen = this.options.refreshParameterName.length + 1;
			var valueIdx = beginIdx + nameEqLen;
			var value = null;
			var ampIdx = url.indexOf("&", valueIdx);
			if (ampIdx < 0) {
				// refresh param is at the end of the URL
				value = url.substring(valueIdx);
			} else {
				// refresh param is in the middle of the URL
				value = url.substring(valueIdx, ampIdx);
			}
			var param = this.options.refreshParameterName + "=" + value;
			return url.replace(param, this.options.refreshParameterName + "=" + paramValue);
		},
		
		_createColumnTracker : function() {
			var container = $("#" + this.element.attr("id"));
			return container.modificationHighlighter(this.options.modificationHighlighterOptions);
		},
		
		_getIdOrContainerId : function(containerId) {
			if (this._isNullOrUndefined(containerId)) {
				containerId = this.element.attr("id");
			}
			return containerId;
		},
		
		/**
		 * Returns an array of column objects. Each entry in the array represents a column within the 
		 * supplied container where the current value is different than the original value 
		 * stored upon initial load.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 */
		getModifiedColumnsWithinContainer : function(containerId) {
			var tracker = this._createColumnTracker();
			return tracker.modificationHighlighter("getModifiedColumns", this._getIdOrContainerId(containerId));
		},
		
		/**
		 * Returns an array of column objects where the column has the supplied CSS class associated with it within the supplied container. 
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 * @param className the class name to search for.
		 */
		getAllColumnsWithSuppliedClass : function(containerId, className) {
			var tracker = this._createColumnTracker();
			return tracker.modificationHighlighter("getAllColumnsWithSuppliedClass", this._getIdOrContainerId(containerId), className);
		},
		
		/**
		 * Returns the column object stored upon load that is associated to the supplied 
		 * search column ID in the supplied container.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 * @param searchColumnId the column ID to search for.
		 * @return the found column or null if not found.
		 */
		getStoredInputValue : function(containerId, searchColumnId) {
			var tracker = this._createColumnTracker();
			return tracker.modificationHighlighter("getStoredInputValue", this._getIdOrContainerId(containerId), searchColumnId);
		},
		
		/**
		 * Returns an array of column objects stored upon load for the supplied container.  
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 */
		getStoredInputColumns : function(containerId) {
			var tracker = this._createColumnTracker();
			return tracker.modificationHighlighter("getStoredInputColumns", this._getIdOrContainerId(containerId));
		},
		
		/**
		 * Stores internally the value of all input-type objects identified by the supplied container. 
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 */
		storeOriginalValues : function(containerId) {
			var tracker = this._createColumnTracker();
			tracker.modificationHighlighter("storeOriginalValues", this._getIdOrContainerId(containerId));
		},
		
		/**
		 * Resets all columns that have been modified within the supplied container to their original value as determined 
		 * when the container was originally loaded.
		 * @param containerId the ID value for the internal container which contains the input-type objects to evaluate. Supplying
		 * null, undefined, or not suppling a value will result in the entire PANE being evaluated.
		 */
		resetModifiedColumnsInContainer : function(containerId) {
			var tracker = this._createColumnTracker();
			tracker.modificationHighlighter("reset", this._getIdOrContainerId(containerId));
		},
		
		/**
		 * Performs an AJAX post to the specified URL sending the supplied parameters.
		 * @param params the parameters to issue the post.
		 * 	params.containerId - the ID associated to the container that contains the page data to post. (Required)
		 *  params.keepModifiedIfExistInDom - supply the DOM element to issue a jQuery search that indicates the need to keep
		 *     the visual display for modified columns. This is usually necessary if the post resulted in a response displaying
		 *     user errors.  An example value would be "div.error-message". This example would result in a jQuery selector like
		 *     this: $("#" + containerId + " div.error-message") where containerId is the value supplied in the containerId
		 *     parameter to this method.  Do not supply to always reset the modified status. (Optional)
		 *  params.afterCall - a function to call after the call has completed successfully. (Optional)
		 *  params.ajaxSettings - A set of key/value pairs that configure the Ajax request.
		 *    params.url - the URL to post to (Required)
		 */
		call : function(params) {
			this._assertCallParamsSupplied(params);
			
			var plugin = this;
			var selector = this._formatSelectorForContainerId(params.containerId);
			
			var ajaxParams = new Object();
			ajaxParams['cache'] = false;
			ajaxParams['async'] = true;
			ajaxParams['beforeSend'] = function (xhr, settings) {
				$("body").css("cursor", "progress");
				$(selector).addClass(plugin.options.disabledClass);
				if (plugin._isNotNullAndNotUndefined(params.ajaxSettings.beforeSend)) {
					params.ajaxSettings.beforeSend(xhr, settings);
				}
			};
			ajaxParams['error'] = function(xhr, status, error) {
				$("body").css("cursor", "auto");
				$(selector).removeClass(plugin.options.disabledClass);
				$(selector).html(plugin.options.friendlyExceptionMessage);
				
				if (plugin._isNotNullAndNotUndefined(params.ajaxSettings.error)) {
					params.ajaxSettings.error(xhr, status, error);
				}
			};
			ajaxParams['success'] = function(data, status, xhr) {
				var modifiedColumns = plugin.getModifiedColumnsWithinContainer(params.containerId);
				
				if (plugin._isNotNullAndNotUndefined(params.ajaxSettings.success)) {
					params.ajaxSettings.success(data, status, xhr);
				}
				
				$("body").css("cursor", "auto");
				$(selector).removeClass(plugin.options.disabledClass);
				
				plugin._afterPaneLoad(params.containerId);
				plugin._evaluateModifiedStateAfterPost(params.containerId, params.keepModifiedIfExistInDom, modifiedColumns);
									
				if (plugin._isNotNullAndNotUndefined(params.afterCall)) {
					params.afterCall(data, status, xhr);
				}
			};
			
			for (var propertyName in params.ajaxSettings) {
				if (propertyName !== 'beforeSend' && propertyName !== 'error' && propertyName !== 'success') {
					ajaxParams[propertyName] = params.ajaxSettings[propertyName];
				}
			}
			if (this._isNullOrUndefined(ajaxParams['type'])) {
				ajaxParams['type'] = "POST";
			}
			
			$.ajax(ajaxParams);
		},
		
		_assertCallParamsSupplied : function(params) {
			if (this._isNullOrUndefined(params)) {
				this._throwMissingParamsException();
			}
			
			if (this._isNullOrUndefined(params.ajaxSettings)) {
				this._throwMissingParamsException();
			}
			
			if (this._isNullOrUndefined(params.containerId) || $.trim(params.containerId).length === 0) {
				throw "The params.containerId is required in order to issue a call."; 
			}
			
			if (this._isNullOrUndefined(params.ajaxSettings.url) || $.trim(params.ajaxSettings.url).length === 0) {
				throw "The params.ajaxSettings.url is required in order to issue a call."; 
			}
		},
		
		_throwMissingParamsException : function() {
			throw "Please supply the essential parameters as an object literal to issue a post. Valid parameters are: \n\n" 
			+ "params.containerId - the ID associated to the container that contains the page data to post. (Required)\n"
			+ "params.keepModifiedIfExistInDom - supply the DOM element to issue a jQuery search that indicates the need to keep "
			+ "the visual display for modified columns. This is usually necessary if the post resulted in a response displaying "
			+ "user errors.  An example value would be \"div.error-message\". This example would result in a jQuery selector like "
			+ "this: $(\"#\" + containerId + \" div.error-message\") where containerId is the value supplied in the containerId "
			+ "parameter to this method.  Do not supply to always reset the modified status. (Optional)\n"
			+ "params.afterCall - a function to call after the call has completed successfully.  (Optional)\n"
			+ "params.ajaxSettings.url - the URL to post to (Required)\n"
			+ "params.ajaxSettings.data - an object representing the parameters to post to the url. (Optional)\n"
			+ "params.ajaxSettings.success - a function to call upon successful completion of the AJAX call.  (Optional)\n"
			+ "params.ajaxSettings.error - a function to call if the AJAX call fails.  (Optional)\n";
		},
		
		_afterPaneLoad : function(containerId) {
			this.storeOriginalValues(containerId);
			
			var apl = $.Event("afterPaneLoad");
			// fire user supplied post pane load 
			this._trigger("afterPaneLoad", apl, {
				'element' : this.element,
				'containerId' : containerId
			});
		},
		
		_formatSelectorForContainerId : function(containerId) {
			var paneId = this.element.attr("id");
			if (paneId === containerId) {
				containerId = null;
			}
			var selector = '#' + this._escapeValue(containerId) + ' ';
			if (this._isNullOrUndefined(containerId)) {
				selector = '';
			}
			if (selector === '') {
				selector = '#' + this._escapeValue(paneId);
			} else {
				selector = '#' + this._escapeValue(paneId) + ' ' + selector;
			}
			return selector + ' ';
		},
		
		//
		// If the element, identified by the parameter keepModifiedIfExistInDom, exists in the DOM and their are 1 or more characters in the element
		// then continue to keep the columns that were modified prior to the post in modified state
		//
		_evaluateModifiedStateAfterPost : function(containerId, keepModifiedIfExistInDom, modifiedColumns) {
			if (this._isNullOrUndefined(keepModifiedIfExistInDom) || $.trim(keepModifiedIfExistInDom).length === 0) { return; }
			
			var modifiedFlagContainer = $("#" + containerId + " " + keepModifiedIfExistInDom);
			if (modifiedFlagContainer.length === 0) { return; }
			
			var text = $.trim(modifiedFlagContainer.text());
			if (text.length === 0) { return; }
			
			var tracker = this._createColumnTracker();
			tracker.modificationHighlighter("setOriginalValues", containerId, modifiedColumns);
		},
		
		_prepId : function(id) {
			if (this._isNullOrUndefined(id)) { return ""; }
			
			if (id.indexOf("#") < 0) {
				id = "#" + id;
			}
			return id;
		},
		
		_isNullOrUndefined : function(obj) {
			return obj === null || obj === undefined;
		},
		
		_isNotNullAndNotUndefined : function(obj) {
			return obj !== undefined && obj !== null;
		},
		
		_escapeValue : function(str) {
			if (this._isNullOrUndefined(str)) { return str; }
			
			str = str.replace(/\+/g,"\\+");
			str = str.replace(/\\/g,"\\");
			str = str.replace(/\//g,"\\/");
			str = str.replace(/!/g,"\\!");
			str = str.replace(/"/g,'\\"');
			str = str.replace(/#/g,"\\#");
			str = str.replace(/\$/g,"\\$");
			str = str.replace(/%/g,"\\%");
			str = str.replace(/&/g,"\\&");
			str = str.replace(/'/g,"\\'");
			str = str.replace(/\(/g,"\\(");
			str = str.replace(/\)/g,"\\)");
			str = str.replace(/\*/g,"\\*");
			str = str.replace(/,/g,"\\,");
			str = str.replace(/\./g,"\\.");
			str = str.replace(/:/g,"\\:");
			str = str.replace(/;/g,"\\;");
			str = str.replace(/\?/g,"\\?");
			str = str.replace(/@/g,"\\@");
			str = str.replace(/\[/g,"\\[");
			str = str.replace(/\]/g,"\\]");
			str = str.replace(/\^/g,"\\^");
			str = str.replace(/`/g,"\\`");
			str = str.replace(/\{/g,"\\{");
			str = str.replace(/\}/g,"\\}");
			str = str.replace(/\|/g,"\\|");
			str = str.replace(/\~/g,"\\~");
			
			return str;
		},

		/**
		 * Evaluates all panes in the DOM and returns true if any pane has modified columns.
		 * @returns {Boolean}
		 */
		isAnyPaneModified : function() {
			var columns = this.getAllModifiedPaneColumns();
			return columns.length > 0;
		},
		
		/**
		 * Returns an array of objects where each object contains the title and ID of the PANE and an array of modified column objects.
		 * @returns {Array}
		 */
		getAllModifiedPaneColumns : function() {
			var plugin = this;
			var allColumns = [];
			$("." + paneContainerClass).each(function(index) {
				var paneContainer = $(this);
				var columns = paneContainer.pane("getModifiedColumnsWithinContainer");
				if (columns.length === 0) { return true; }
				
				var title = paneContainer.pane("option", "paneHeaderTitle");
				if (plugin._isNullOrUndefined(title) || $.trim(title).length === 0) {
					title = "[no title]";
				}
				
				var column = {"id" : paneContainer.attr("id"), "title": title, "columns": columns};
				allColumns.push(column);
			});
			return allColumns;
		},
		
		_hasAttribute : function(inp, attrName) {
			var attr = inp.attr(attrName);
			return typeof attr !==  'undefined' && attr !==  false;
		},
		
		_hasNoAttribute : function(inp, attrName) {
			return !this._hasAttribute(inp, attrName);
		},
		
		_setAttribute : function(inp, attrName, attrValue) {
			inp.attr(attrName, attrValue);
		},
		
		_removeAttribute : function(inp, attrName) {
			inp.removeAttr(attrName);
		},
		
		_getAttribute : function(inp, attrName) {
			return inp.attr(attrName);
		}
	});
	
	$.extend( $.dtg.pane, {
		version: "1.1.0"
	});
}(jQuery));
