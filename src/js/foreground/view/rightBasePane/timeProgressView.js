﻿//  A progress bar which shows the elapsed time as compared to the total time of the current song.
define([
    'common/enum/playerState',
    'common/model/utility',
    'foreground/view/behavior/tooltip',
    'text!template/timeProgress.html'
], function (PlayerState, Utility, Tooltip, TimeProgressTemplate) {
    'use strict';

    var StreamItems = chrome.extension.getBackgroundPage().StreamItems;
    var Settings = chrome.extension.getBackgroundPage().Settings;

    var TimeProgressView = Backbone.Marionette.ItemView.extend({
        id: 'time-progress',
        template: _.template(TimeProgressTemplate),
        
        events: {
            'input @ui.timeRange:not(.disabled)': 'updateProgress',
            'mousewheel @ui.timeRange:not(.disabled)': 'mousewheelUpdateProgress',
            'mousedown @ui.timeRange:not(.disabled)': 'startSeeking',
            'mouseup @ui.timeRange:not(.disabled)': 'seekToTime',
            'click @ui.timeElapsedLabel': 'toggleShowTimeRemaining'
        },
        
        ui: {
            //  Progress is the shading filler for the volumeRange's value.
            progress: '.progress',
            timeRange: '.time-range',
            timeElapsedLabel: '.time-elapsed',
            durationLabel: '.duration'
        },
        
        behaviors: {
            Tooltip: {
                behaviorClass: Tooltip
            }
        },
       
        autoUpdate: true,
        
        templateHelpers: {
            elapsedTimeMessage: chrome.i18n.getMessage('elapsedTime'),
            totalTimeMessage: chrome.i18n.getMessage('totalTime')
        },

        onRender: function () {
            this.ui.timeRange.toggleClass('disabled', StreamItems.length === 0);
            
            //  If a song is currently playing when the GUI opens then initialize with those values.
            //  Set total time before current time because it affects the range's max.
            this.setTotalTime(this.getCurrentSongDuration());
            this.setCurrentTime(this.model.get('currentTime'));
        },
        
        modelEvents: {
            'change:currentTime': 'updateCurrentTime',
            'change:state': 'stopSeeking'
        },
        
        initialize: function () {
            this.listenTo(StreamItems, 'remove reset', this.clearOnEmpty);
            this.listenTo(StreamItems, 'add', this.enable);
            this.listenTo(StreamItems, 'change:active', this.restart);
        },
        
        //  Allow the user to manual time change by click or scroll.
        mousewheelUpdateProgress: function (event) {
            var delta = event.originalEvent.wheelDeltaY / 120;
            var currentTime = parseInt(this.ui.timeRange.val());

            this.setCurrentTime(currentTime + delta);

            this.model.seekTo(currentTime + delta);
        },

        startSeeking: function (event) {
            //  1 is primary mouse button, usually left
            if (event.which === 1) {
                this.autoUpdate = false;
            }
        },
        
        stopSeeking: function () {
            //  Seek is known to have finished when the player announces a state change that isn't buffering / unstarted.
            var state = this.model.get('state');

            if (state == PlayerState.Playing || state == PlayerState.Paused) {
                this.autoUpdate = true;
            }
        },

        seekToTime: function (event) {
            //  1 is primary mouse button, usually left
            if (event.which === 1) {
                //  Bind to progressBar mouse-up to support dragging as well as clicking.
                //  I don't want to send a message until drag ends, so mouseup works nicely. 
                var currentTime = parseInt(this.ui.timeRange.val());
                this.model.seekTo(currentTime);
            }
        },
        
        toggleShowTimeRemaining: function() {
            var showTimeRemaining = Settings.get('showTimeRemaining');
            //  Toggle showTimeRemaining and then read the new state and apply it.
            Settings.set('showTimeRemaining', !showTimeRemaining);

            if (!showTimeRemaining) {
                this.ui.timeElapsedLabel.attr('title', chrome.i18n.getMessage('timeRemaining'));
            } else {
                this.ui.timeElapsedLabel.attr('title', chrome.i18n.getMessage('elapsedTime'));
            }

            this.ui.timeElapsedLabel.toggleClass('timeRemaining', !showTimeRemaining);
            this.updateProgress();
        },
        
        enable: function () {
            this.ui.timeRange.removeClass('disabled');
        },
        
        clearOnEmpty: function () {
            if (StreamItems.length === 0) {
                this.clear();
            }
        },
        
        clear: function () {
            this.setCurrentTime(0);
            this.setTotalTime(0);
            this.ui.timeRange.addClass('disabled');
        },
        
        restart: function () {
            //  Disable auto-updates here because there's a split second while changing songs that a timer tick makes things flicker weirdly.
            this.autoUpdate = false;

            this.setCurrentTime(0);
            this.setTotalTime(this.getCurrentSongDuration());

            this.autoUpdate = true;
        },
        
        setCurrentTime: function (currentTime) {
            this.ui.timeRange.val(currentTime);
            this.updateProgress();
        },

        setTotalTime: function (totalTime) {
            this.ui.timeRange.prop('max', totalTime);
            this.updateProgress();
        },
        
        updateCurrentTime: function () {
            if (this.autoUpdate) {
                this.setCurrentTime(this.model.get('currentTime'));
            }
        },

        //  Repaints the progress bar's filled-in amount based on the % of time elapsed for current song.
        //  Keep separate from render because render is based on the player's values and updateProgress is based on the progress bar's values.
        //  This is an important distinction because when the user is dragging the progress bar -- the player won't be updating -- but progress bar
        //  values need to be re-rendered.
        updateProgress: function () {
            var currentTime = parseInt(this.ui.timeRange.val());
            var totalTime = parseInt(this.ui.timeRange.prop('max'));

            //  Don't divide by 0.
            var progressPercent = totalTime === 0 ? 0 : currentTime * 100 / totalTime;
            this.ui.progress.width(progressPercent + '%');
            
            if (Settings.get('showTimeRemaining')) {
                //  Calculate the time remaining from the current time and show that instead.
                var timeRemaining = totalTime - currentTime;
                this.ui.timeElapsedLabel.text(Utility.prettyPrintTime(timeRemaining));
            } else {
                this.ui.timeElapsedLabel.text(Utility.prettyPrintTime(currentTime));
            }

            this.ui.durationLabel.text(Utility.prettyPrintTime(totalTime));
        },

        //  Return 0 or active song's duration.
        getCurrentSongDuration: function () {
            var duration = 0;

            if (StreamItems.length > 0) {
                var activeStreamItem = StreamItems.getActiveItem();
                duration = activeStreamItem.get('song').get('duration');
            }

            return duration;
        }
    });

    return TimeProgressView;
});