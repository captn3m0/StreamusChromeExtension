﻿define([
    'foreground/model/genericPrompt',
    'foreground/view/noPlayEmbeddedView',
    'foreground/view/prompt/genericPromptView'
], function (GenericPrompt, NoPlayEmbeddedView, GenericPromptView) {
    'use strict';

    var NoPlayEmbeddedPromptView = GenericPromptView.extend({
        initialize: function () {
            this.model = new GenericPrompt({
                title: chrome.i18n.getMessage('errorEncountered'),
                okButtonText: chrome.i18n.getMessage('reload'),
                view: new NoPlayEmbeddedView()
            });
            
            GenericPromptView.prototype.initialize.apply(this, arguments);
        }
    });

    return NoPlayEmbeddedPromptView;
});