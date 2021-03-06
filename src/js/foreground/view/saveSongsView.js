﻿define([
    'text!template/saveSongs.html'
], function (SaveSongsTemplate) {
    'use strict';

    var Playlists = chrome.extension.getBackgroundPage().Playlists;

    var SaveSongsView = Backbone.Marionette.ItemView.extend({
        className: 'save-songs',
        template: _.template(SaveSongsTemplate),

        templateHelpers: {
            typeToCreateOrFilterPlaylistsMessage: chrome.i18n.getMessage('typeToCreateOrFilterPlaylists')
        },
        
        ui: {
            playlistSelect: '.submittable',
            selectizeTitle: '.selectize-input .title'
        },

        onRender: function () {
            var playlistOptions = Playlists.map(function (playlist) {
                return {
                    id: playlist.get('id'),
                    title: playlist.get('title'),
                    displayInfo: playlist.get('displayInfo')
                };
            });

            var activePlaylistId = Playlists.getActivePlaylist().get('id');
            
            this.ui.playlistSelect.selectize({
                //  If false, items created by the user will not show up as available options once they are unselected.
                persist: false,
                maxItems: 1,
                mode: 'multi',
                //  The name of the property to use as the "value" when an item is selected.
                valueField: 'id',
                //  The name of the property to render as an option / item label.
                labelField: 'title',
                //  An array of property names to analyze when filtering options.
                searchField: ['title'],
                options: playlistOptions,
                //  This plugin adds classic a classic remove button to each item for behavior that mimics Select2 and Chosen.
                plugins: ['remove_button'],
                render: {
                    item: function (item, escape) {
                        return '<div>' + '<span class="title">' + escape(item.title) + '</span>' + '</div>';
                    },
                    option: function (item, escape) {

                        var className = item.id === activePlaylistId ? 'selected' : '';
                        var option = '<div class="' + className + '">';

                        option += '<span class="label">' + escape(item.title) + '</span>';
                        option += '<span class="caption">' + escape(item.displayInfo) + '</span>';

                        option += '</div>';

                        return option;
                    }
                },
                create: function (input) {
                    var createResult = false;
                    var trimmedInput = $.trim(input);

                    if (trimmedInput !== '') {
                        createResult = {
                            id: _.uniqueId('newPlaylist_'),
                            title: trimmedInput
                        };
                    }

                    this.model.set('creating', true);

                    return createResult;
                }.bind(this),
                onItemAdd: function() {
                    //  Rebind UI elements after adding an element to selectize control in order to capture the appended DOM elements.
                    this.bindUIElements();
                }.bind(this),
                onDelete: function() {
                    this.model.set('creating', false);
                }.bind(this)
            });

            //  Default the control to the active playlist since this is the most common need.
            this.ui.playlistSelect[0].selectize.setValue(Playlists.getActivePlaylist().get('id'));

            //  Rebind UI elements after initializing selectize control in order to capture the appended DOM elements.
            this.bindUIElements();
        },
        
        validate: function() {
            var selectedPlaylistId = this.ui.playlistSelect.val();
            var isValid = selectedPlaylistId !== null && selectedPlaylistId.length > 0;

            return isValid;
        },
        
        doOk: function () {
            var selectedPlaylistId = this.ui.playlistSelect.val();

            if (this.model.get('creating')) {
                var playlistTitle = this.ui.selectizeTitle.text();
                Playlists.addPlaylistWithSongs(playlistTitle, this.model.get('songs'));
            } else {
                var selectedPlaylist = Playlists.get(selectedPlaylistId);
                selectedPlaylist.get('items').addSongs(this.model.get('songs'));
            }
        }
    });

    return SaveSongsView;
});