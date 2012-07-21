(function(Snipt) {

    Snipt.SniptModel = Backbone.Model.extend({
        toSafe: function() {
            var snipt = this.toJSON();
            snipt.code = this.escape('code');
            snipt.title = this.escape('title');
            snipt.tags_list = this.escape('tags_list');

            if (typeof snipt.tags === 'object') {
                for (var i; i < snipt.tags.length; i++) {
                    snipt.tags[i].name = _.escape(snipt.tags[i].name);
                }
            }

            return snipt;
        }
    });
    Snipt.SniptView = Backbone.View.extend({

        tagName: 'article',

        initialize: function() {
            this.model.view = this;
            this.model.bind('change', this.render, this);

            this.template     = _.template($('#snipt').html());
            this.editTemplate = _.template($('#edit').html());

            this.initLocalVars();
        },
        events: {
            'click a.copy':     'copyFromClick',
            'click a.edit':     'edit',
            'click a.favorite': 'favoriteToggle',
            'click a.embed':    'embedFromClick',
            'click a.expand':   'expand',
            'click .container': 'selectFromClick',
            'copyClose':        'copyClose',
            'copyRaw':          'copy',
            'detail':           'detail',
            'deselect':         'deselect',
            'destroy':          'destroy',
            'edit':             'edit',
            'embed':            'embed',
            'embedClose':       'embedClose',
            'expand':           'expand',
            'fadeAndRemove':    'fadeAndRemove',
            'goToAuthor':       'goToAuthor',
            'next':             'next',
            'prev':             'prev',
            'selectSnipt':      'select'
        },

        copy: function() {
            $('textarea', this.$copyModal).remove();

            window.ui_halted = true;

            this.$copyModalBody.append('<textarea class="raw"></textarea>');
            $textarea = $('textarea.raw', this.$copyModalBody).val(this.model.get('code'));

            this.$copyModal.modal('show');
            $textarea.select();
        },
        copyClose: function() {
            $('textarea', this.$copyModal).remove();
        },
        copyFromClick: function() {
            this.copy();
            return false;
        },
        deselect: function() {
            this.$el.removeClass('selected');
            window.$selected = false;
        },
        detail: function() {
            window.location = this.model.get('absolute_url');
        },
        destroy: function() {
            this.model.destroy();
        },
        edit: function() {

            window.editing = true;
            window.ui_halted = true;

            this.select();

            that = this;
            var editPane = this.editTemplate({snipt: this.model.toSafe()});

            // Init main view
            window.site.$main.hide();
            window.site.$body.addClass('detail editing');
            window.site.$main_edit.html(editPane);

            // Select lexer
            $('option[value="' + this.model.get('lexer') + '"]', window.site.$main_edit).attr('selected', 'selected');

            // Init chosen
            var $selectLexer = $('select#id_lexer', window.site.$main_edit);
            $selectLexer.chosen();

            // Blog post
            $('label.blog-post input', window.site.$main_edit).on('change', function() {
                var $checkbox = $(this);
                var $label = $checkbox.parent();
                var $publish_date = $label.siblings('label.publish-date');

                if ($checkbox.attr('checked')) {
                    $label.removeClass('is-not-blog-post').addClass('is-blog-post');
                    $publish_date.show();
                } else {
                    $label.addClass('is-not-blog-post').removeClass('is-blog-post');
                    $publish_date.hide();
                }
                return false;
            }).trigger('change');

            // Public / private
            $('label.public input', window.site.$main_edit).on('change', function() {
                var $checkbox = $(this);
                var $label = $checkbox.parent();

                if ($checkbox.attr('checked')) {
                    $label.removeClass('is-private').addClass('is-public');
                } else {
                    $label.addClass('is-private').removeClass('is-public');
                }
                return false;
            }).trigger('change');

            window.site.$main_edit.show();

            // CodeMirror editor
            var $editor = $('div#editor', window.site.$main_edit);

            window.editor = CodeMirror($editor.get(0), {
                autofocus: true,
                fixedGutter: true,
                gutter: true,
                indentUnit: 4,
                lineNumbers: true,
                matchBrackets: true,
                mode: that.guessCodeMirrorLexer($selectLexer.val()),
                value: that.model.get('code')
            });
            $selectLexer.change(function() {
                var $selectedLexer = $('option:selected', $selectLexer);
                window.editor.setOption('mode', that.guessCodeMirrorLexer($selectedLexer.val()));
            });

            window.editor.setSize('100%', $(window).height() - 147);

            $('textarea, input', window.site.$main_edit).bind('keydown', 'esc', function(e) {
                $(this).blur();
                return false;
            });

            // Edit buttons
            $('button.delete', window.site.$main_edit).on('click', function() {
                if (confirm('Are you sure you want to delete this snipt?')) {
                    that.model.destroy();
                    window.site.snipt_list.escapeUI(true);
                }
                return false;
            });
            $('button.cancel', window.site.$main_edit).on('click', function() {
                window.site.snipt_list.escapeUI();
                return false;
            });
            $('button.save', window.site.$main_edit).on('click', function() {
                $('button.cancel').text('Close');
                that.save();
                return false;
            });
            $('button.save-and-close', window.site.$main_edit).on('click', function() {
                that.save();
                window.site.snipt_list.escapeUI();
                return false;
            });

            window.scrollTo(0, 0);

            return false;
        },
        embed: function() {
            $('textarea', this.$embedModal).remove();

            window.ui_halted = true;

            this.$embedModalBody.append('<textarea class="raw"></textarea>');
            $textarea = $('textarea.raw', this.$embedModalBody).val('<script type="text/javascript" src="' + this.model.get('embed_url') + '"></script>');

            this.$embedModal.modal('show');
            $textarea.select();
        },
        embedFromClick: function() {
            this.embed();
            return false;
        },
        embedClose: function() {
            $('textarea', this.$embedModal).remove();
        },
        expand: function() {
            this.$container.toggleClass('expanded', 100);
            this.$tags.toggleClass('expanded');
            this.select();
            return false;
        },
        fadeAndRemove: function() {

            var $toRemove = $(this.el);
            var $nextSnipt = $toRemove.next('article.snipt');

            window.$selected = false;
            $toRemove.fadeOut('fast', function() {
                $(this).remove();
                $nextSnipt.trigger('selectSnipt');
            });

            return false;
        },
        goToAuthor: function() {
            window.location = this.model.get('user').absolute_url;
        },
        guessCodeMirrorLexer: function(val) {
            if (val === 'html') { return 'htmlmixed'; }
            if (val === 'js') return 'javascript';
            if (val === 'rb') return 'ruby';
            return val;
        },
        favoriteToggle: function() {

            var that = this;

            if (this.$el.hasClass('favorited')) {
                $.ajax('/api/private/favorite/' + this.model.get('favorite_id') + '/', {
                    type: 'delete',
                    success: function() {
                        that.$el.removeClass('favorited');
                        that.$favorite.text('Favorite');
                    },
                    headers: {
                        'Authorization': 'ApiKey ' + window.user + ':' + window.api_key
                    }
                });
            } else {
                $.ajax('/api/private/favorite/', {
                    data: '{"snipt": ' + this.model.get('id') + '}',
                    contentType: 'application/json',
                    type: 'post',
                    success: function(resp) {
                        that.$el.addClass('favorited');
                        that.model.set({'favorite_id': resp.id}, {'silent': true});
                        that.$favorite.text('Favorited');
                    },
                    headers: {
                        'Authorization': 'ApiKey ' + window.user + ':' + window.api_key
                    }
                });
            }
            return false;
        },
        initLocalVars: function() {
            this.$aside = $('aside', this.$el);
            this.$container = $('div.container', this.$el);

            this.$copyModal = $('div.copy-modal', this.$el);
            this.$copyModalBody = $('div.modal-body', this.$copyModal);
            this.$embedModal = $('div.embed-modal', this.$el);
            this.$embedModalBody = $('div.modal-body', this.$embedModal);
            this.$favorite = $('a.favorite', this.$el);

            this.$h1 = $('header h1 a', this.$el);
            this.$tags = $('section.tags ul', this.$aside);

            this.$copyModal.on('hidden', function(e) {
                $(this).parent().trigger('copyClose');
                window.ui_halted = false;
                window.from_modal = true;
            });
            this.$embedModal.on('hidden', function(e) {
                $(this).parent().trigger('embedClose');
                window.ui_halted = false;
                window.from_modal = true;
            });
        },
        next: function() {
            if (!window.ui_halted) {
                nextSnipt = this.$el.next('article.snipt');
                if (nextSnipt.length) {
                    return nextSnipt.trigger('selectSnipt');
                }
            }
        },
        prev: function() {
            if (!window.ui_halted) {
                prevSnipt = this.$el.prev('article.snipt');
                if (prevSnipt.length) {
                    return prevSnipt.trigger('selectSnipt');
                }
            }
        },
        remove: function() {
            return false;
        },
        render: function() {

            this.$el.html(this.template({snipt: this.model.toSafe()}));
            this.initLocalVars();

            if (this.model.get('blog_post') === true) {
                this.$el.addClass('blog-post');
            } else {
                this.$el.removeClass('blog-post');
            }

            if (this.model.get('public') === true) {
                this.$el.removeClass('private-snipt');
            } else {
                this.$el.addClass('private-snipt');
            }

            if (this.model.get('user').username === window.user) {
                this.$el.addClass('editable');
            } else {
                this.$el.removeClass('editable');
            }

            if (this.model.get('line_count') > 8 && !window.detail) {
                this.$el.addClass('expandable');
            } else {
                this.$el.removeClass('expandable');
            }

            $('script#disqus').remove();
            window.site.$body.append('<script id="disqus" type="text/javascript">' + $('script#disqus-template').text() + '</script>');

            // For new snipts.
            if (this.$el.attr('id') === 'new-snipt') {
                this.$el.fadeIn('fast');
                this.$el.attr('id', 'snipt-' + this.model.get('id'));
            }

            return this;
        },
        save: function() {

            $('button.save, button.save-and-close, button.delete, button.cancel',
                    window.site.$main_edit).attr('disabled', 'disabled');

            that.model.save({
                'title': $('input#snipt_title').val(),
                'tags': $('label.tags textarea').val(),
                'tags_list': $('label.tags textarea').val(),
                'lexer': $('select[name="lexer"]').val(),
                'lexer_name': $('select[name="lexer"] option:selected').text(),
                'code': window.editor.getValue(),
                'blog_post': $('label.blog-post input').is(':checked'),
                'publish_date': $('label.publish-date input').val(),
                'public': $('label.public input').is(':checked')
                }, {
                success: function(model, response) {
                    $('button.save, button.save-and-close, button.delete, button.cancel',
                            window.site.$main_edit).removeAttr('disabled');
                },
                error: function(model, response) {
                    alert('There was a problem saving your snipt. We\'ve been notified. Sorry about that!');
                }
            });
        },
        select: function(fromClick) {

            $('article.selected', window.site.snipt_list.$el).removeClass('selected');
            this.$el.addClass('selected');

            if (fromClick !== true) {
                if (window.site.$snipts.index(this.$el) === 0) {
                    window.scrollTo(0, 0);
                } else {
                    window.site.$html_body.animate({
                        scrollTop: this.$el.offset().top - 50
                    }, 0);
                }
            }

            window.$selected = this.$el;
        },
        selectFromClick: function(e) {
            this.select(true);
            e.stopPropagation();
            window.site.$aside_nav.removeClass('open');
        }
    });
    Snipt.SniptListView = Backbone.View.extend({
        el: 'section#snipts',

        initialize: function(opts) {

            var that = this;

            opts.snipts.each(this.addExistingSnipt);

            this.keyboardShortcuts();

            var cmd;
            if (navigator.platform == 'MacPPC' ||
                navigator.platform == 'MacIntel') {
                cmd = 'Cmd';
            }
            else {
                cmd = 'Ctrl';
            }
            $('span.cmd-ctrl').text(cmd);

            // This should probably be handled more traditionally
            // (in a backbone view / events)
            $('button#add-snipt').click(function() {
                that.addNewSnipt();
            });
        },

        addExistingSnipt: function() {

            var $el = $(this);
            var $created = $('li.created', $el);
            var $h1 = $('header h1 a', $el);
            var $public = $('div.public', $el);
            var $blog_post = $('div.blog-post', $el);
            var $publish_date = $('div.publish-date', $el);
            var $user = $('li.author a', $el);

            var is_public = $public.text() === 'True' ? true : false;
            var is_blog_post = $blog_post.text() === 'True' ? true : false;

            var tag_lis = $('section.tags li', $el);
            var tags = [];

            for (var i=0; i < tag_lis.length; i++) {
                var $tag = $('a', tag_lis.eq(i));
                tags[i] = {
                    name: $tag.text(),
                    absolute_url: $tag.attr('href')
                };
            }

            var data = {
                code: $('textarea.raw', $el).text(),
                created: $created.attr('title'),
                created_formatted: $created.text(),
                embed_url: $('div.embed-url', $el).text(),
                absolute_url: $h1.attr('href'),
                favorite_id: $el.data('favorite-id'),
                id: parseInt($el.attr('id').replace('snipt-', ''), 0),
                key: $('div.key', $el).text(),
                lexer: $('div.lexer', $el).text(),
                lexer_name: $('div.lexer-name', $el).text(),
                line_count: parseInt($('div.line-count', $el).text(), 0),
                modified: $('div.modified', $el).text(),
                resource_uri: $('div.resource-uri', $el).text(),
                slug: $('div.slug', $el).text(),
                stylized: $('div.stylized', $el).text(),
                tags: tags,
                publish_date: $publish_date.text(),
                tags_list: $('div.tags-list', $el).text(),
                title: $h1.text(),
                user: {
                    absolute_url: $user.attr('href'),
                    username: $user.text()
                }
            };
            data['public'] = is_public;
            data.blog_post = is_blog_post;

            var view = new Snipt.SniptView({
                el: this,
                model: new Snipt.SniptModel(data)
            });
        },
        addNewSnipt: function() {

            var $articleNewSnipt = $('article#new-snipt');

            if ($articleNewSnipt.length === 0) {
                window.site.snipt_list.$el.prepend('<article id="new-snipt" class="hidden snipt"></article>');

                var data = {
                    id: '',
                    code: '',
                    tags: [],
                    tags_list: '',
                    title: '',
                    lexer: 'text',
                    lexer_name: 'Text only',
                    new_from_js: true,
                    user: {
                        username: ''
                    }
                };
                data['public'] = false;
                data.blog_post = false;

                var newSniptView = new Snipt.SniptView({
                    el: $('article#new-snipt'),
                    model: new Snipt.SniptModel(data)
                });

                newSniptView.edit();
            } else {
                $articleNewSnipt.trigger('edit');
            }

            return false;
        },
        escapeUI: function(destroyed) {
            if (window.editing || destroyed) {
                if (!window.site.$html.hasClass('detail')) {
                    window.site.$body.removeClass('detail');
                }
                window.site.$main_edit.hide();
                window.site.$body.removeClass('editing');
                window.site.$main.show();

                window.editing = true;
                window.ui_halted = false;

                if (window.site.$snipts.index(window.$selected) === 0) {
                    window.scrollTo(0, 0);
                } else {
                    window.site.$html_body.animate({
                        scrollTop: window.$selected.offset().top - 50
                    }, 0);
                }

                if (destroyed) {
                    window.$selected.trigger('fadeAndRemove');
                }
            } else {
                if (!window.ui_halted) {
                    if ($selected) {
                        $selected.trigger('deselect');
                    }
                    window.site.$aside_nav.removeClass('open');
                }
            }
        },
        keyboardShortcuts: function() {

            var that = this;

            $selected = window.selected;
            $document = $(document);

            $document.bind('keydown', 'j', function() {
                if (!window.ui_halted) {
                    if (!$selected) {
                        window.site.$snipts.eq(0).trigger('selectSnipt');
                    } else {
                        $selected.trigger('next');
                    }
                }
            });
            $document.bind('keydown', 'k', function() {
                if (!window.ui_halted) {
                    if (!$selected) {
                        window.site.$snipts.eq(0).trigger('selectSnipt');
                    } else {
                        $selected.trigger('prev');
                    }
                }
            });
            $document.bind('keydown', 'c', function(e) {
                if (!window.ui_halted && !window.blog_post) {
                    if ($selected) {
                        e.preventDefault();
                        $selected.trigger('copyRaw');
                    }
                }
            });
            $document.bind('keydown', 'Ctrl+e', function() {
                if (!window.ui_halted) {
                    if ($selected) {
                        if ($selected.hasClass('editable')) {
                            $selected.trigger('edit');
                        }
                    }
                }
            });
            $document.bind('keydown', 'Ctrl+backspace', function() {
                if (!window.ui_halted || window.editing) {
                    if ($selected) {
                        if ($selected.hasClass('editable')) {
                            if (confirm('Are you sure you want to delete this snipt?')) {
                                $selected.trigger('destroy');
                                window.site.snipt_list.escapeUI(true);
                            }
                        }
                    }
                }
            });
            $document.bind('keydown', 'Ctrl+del', function() {
                if (!window.ui_halted || window.editing) {
                    if ($selected) {
                        if ($selected.hasClass('editable')) {
                            if (confirm('Are you sure you want to delete this snipt?')) {
                                $selected.trigger('destroy');
                                window.site.snipt_list.escapeUI(true);
                            }
                        }
                    }
                }
            });
            $document.bind('keydown', 'Alt+n', function() {
                if (!window.ui_halted) {
                    that.addNewSnipt();
                }
            });
            $document.bind('keydown', 'Ctrl+n', function() {
                if (!window.ui_halted) {
                    that.addNewSnipt();
                }
            });
            $document.bind('keydown', 'Ctrl+s', function() {
                if (window.editing) {
                    if ($selected) {
                        if ($selected.hasClass('editable')) {
                            $('button.save').click();
                        }
                    }
                }
            });
            $document.bind('keydown', 'Ctrl+c', function() {
                if (window.editing) {
                    if ($selected) {
                        if ($selected.hasClass('editable')) {
                            $('button.save-and-close').click();
                        }
                    }
                }
            });
            $document.bind('keydown', 'esc', function() {
                that.escapeUI();
            });
            $document.bind('keydown', 'g', function() {
                if (!window.ui_halted) {
                    if (window.$selected) {
                        window.$selected.trigger('deselect');
                    }
                    window.scrollTo(0, 0);
                }
            });
            $document.bind('keydown', 'Shift+g', function() {
                if (!window.ui_halted) {
                    if (window.$selected) {
                        window.$selected.trigger('deselect');
                    }
                    window.scrollTo(0, document.body.scrollHeight);
                }
            });
            $document.bind('keydown', 'n', function() {
                if (!window.ui_halted) {
                    var $anc = $('li.next a');
                    if ($anc.length) {
                        if ($anc.attr('href') !== '#') {
                            window.location = $anc.attr('href');
                        }
                    }
                }
            });
            $document.bind('keydown', 'e', function() {
                if (!window.ui_halted) {
                    if ($selected) {
                        if ($selected.hasClass('expandable')) {
                            $selected.trigger('expand');
                        }
                    }
                }
            });
            $document.bind('keydown', 'u', function() {
                if (!window.ui_halted) {
                    if ($selected) {
                        $selected.trigger('goToAuthor');
                    }
                }
            });
            $document.bind('keydown', 'p', function() {
                if (!window.ui_halted) {
                    var $anc = $('li.prev a');
                    if ($anc.length) {
                        if ($anc.attr('href') !== '#') {
                            window.location = $anc.attr('href');
                        }
                    }
                }
            });
            $document.bind('keydown', 'v', function(e) {
                if (!window.ui_halted && !window.blog_post) {
                    if ($selected) {
                        e.preventDefault();
                        $selected.trigger('embed');
                    }
                }
            });
            $document.bind('keydown', 'o', function() {
                if (!window.ui_halted) {
                    if ($selected) {
                        $selected.trigger('detail');
                    }
                }
            });
            $document.bind('keydown', 'return', function() {
                if (!window.ui_halted) {
                    if ($selected) {
                        $selected.trigger('detail');
                    }
                }
            });
        }
    });

})(snipt.module('snipt'));
