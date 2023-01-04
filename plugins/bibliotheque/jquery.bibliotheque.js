//https://scotch.io/tutorials/building-your-own-javascript-modal-plugin

(function (window, $) {
    String.prototype.trunc = String.prototype.trunc ||
        function (n) {
            return (this.length > n) ? this.substr(0, n - 1) + '&hellip;' : this;
        };

    var Bibliotheque;

    noop = function () {
    };
    Bibliotheque = (function () {
        function Bibliotheque(elem, options) {
            this.elem = elem;
            this.$elem = $(elem);
            this.options = options;
            this.metadata = this.$elem.data('plugin-options');
        }

        Bibliotheque.prototype = {
            defaults: {
                dom: [['nav', 'search'], ['options'], ['tree', 'content', 'modalimg'], ['infos']],
                folders: {},
                root: null,
                allowUpload: true,
                urlUpload: null,
                allowDownload: true,
                ajax: null,
                icons: {
                    picture: '/assets/picture.png',
                    doc: '/assets/doc.png',
                    pdf: '/assets/pdf.png',
                    xls: '/assets/xls.png',
                    zip: '/assets/zip.png',
                    txt: '/assets/txt.png'
                },
                onRenameFile: noop,
                onDeleteFile: noop,
                onRenameFolder: noop,
                onFileDblClicked: noop,
                onFileSelected: noop,
                onMoveFile: noop,
                onAddFolder: null,
                actions: [],
                multiple: false,
                selected: []
            },
            __variables: {
                folderActive: null,
                renderMode: 'default'
            },
            init: function () {
                _this = this;
                this.emitter = new EventEmitter();
                this.hide();
                this.config = $.extend({}, this.defaults, this.options, this.metadata);

                if (is.not.include(this.config.icons.picture, this.config.root)) {
                    this.config.icons.picture = this.config.root + this.config.icons.picture;
                }

                this.$elem.addClass('bbl-wrapper');
                this.__bindDOM();
                this.__bindEvents();
                this.__bindSearch();
                //this.__bindStack();

                /*_this.__stackAction({
                    action: 'enter',
                    folder: _this.__variables.folderActive
                });*/

                if (is.not.null(this.config.ajax)) {
                    this.__loadAjax();
                } else {
                    this.setFolders(this.config.folders);
                    this.show();
                }
                return this;
            },
            addAlerte: function (msg, type) {
                __this = this;
                if (!$.trim(msg).length) {
                    return false;
                }

                if (is.undefined(type)) {
                    type = "success";
                }

                function guid() {
                    function s4() {
                        return Math.floor((1 + Math.random()) * 0x10000)
                            .toString(16)
                            .substring(1);
                    }

                    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                        s4() + '-' + s4() + s4() + s4();
                }

                var idalert = guid();

                var data = {
                    Id: idalert,
                    State: 'alert-' + type,
                    Content: msg
                };

                var tmpl = Bibliotheque.templates.alert;

                $.each(data, function (k, v) {
                    tmpl = tmpl.replace('${' + k + '}', v);
                });

                __this.$elem.append(tmpl);

                setTimeout(function () {
                    __this.$elem.find('#' + idalert).fadeOut(300, function () {
                        $(this).remove();
                    });
                }, 5000);
            },
            show: function () {
                this.$elem.show();
                this.draw();
            },
            draw: function () {
                if ($('#tree').length > 0) {
                    this.__drawTree();
                }
                if ($('#content').length > 0) {
                    $.get(_this.getPath('/templates/browse.mst'), function (template) {
                        var variables = Array;
                        variables.multiple = _this.config.multiple;
                        var rendered = Mustache.render(template, variables);
                        var elements = $('#search');
                        elements.after(rendered);
                        _this.__drawContent();
                    });
                }
                if (_this.config.allowUpload) {
                    _this.__initDropZone();
                }
            },
            hide: function () {
                this.$elem.hide();
            },
            setFolders: function (folders) {
                this.config.folders = folders;
                for (i in folders) {
                    if (is.truthy(folders[i].active))
                        this.__variables.folderActive = folders[i];
                }
            },
            __bindDOM: function () {
                _this = this;
                if ($.isArray(this.config.dom)) {
                    $.each(this.config.dom, function (index, value) {
                        div = $('<div>').addClass('bbl-inner');
                        if ($.isArray(value)) {
                            $.each(value, function (index2, value2) {
                                div.append(Bibliotheque.templates[value2]);
                            });
                        }
                        _this.$elem.append(div);
                    });
                } else
                    console.error('Le DOM n\'est pas correct');
            },
            __loadAjax: function () {
                _this = this;
                $.ajax({
                    method: 'POST',
                    url: _this.config.ajax,
                    dataType: 'json',
                    success: function (data, statut) {
                        _this.setFolders(data);
                        _this.show();
                    },
                    error: function (xhr, status, error) {
                        console.log(error);
                    }
                });
            },
            __drawTree: function () {

                var bibliotheque = this;
                if ($('#tree').length > 0) {
                    $tree = bibliotheque.$elem.find('#tree');
                    $tree.html('');

                    function addSubFolders(childrens, appendTo) {
                        if (is.not.undefined(childrens)) {
                            var ul = Bibliotheque.createElement('<ul></ul>');
                            for (var i in childrens) {
                                if (is.not.undefined(childrens[i])) {
                                    var li = Bibliotheque.createElement('<li></li>');
                                    $(li).html('<span>' + childrens[i].name + '</span>');
                                    $(li).find('span').prepend('<i class="fa fa-folder"></i>');
                                    $(li).data('id', childrens[i].id);
                                    if (is.truthy(childrens[i].active)) {
                                        bibliotheque.__activeFolder($(li));
                                    }
                                    if (is.truthy(childrens[i].open)) {
                                        bibliotheque.__openFolder($(li));
                                    }
                                    $(ul).append($(li));
                                    var child_current = bibliotheque.__getChildFolders(childrens[i].id);
                                    if (is.not.empty(child_current)) {
                                        if ($(li).find('.expandable').length === 0) {
                                            $(li).prepend('<div class="expandable"><i class="fa fa-caret-right"></i></div>');
                                            $(li).addClass('parent');
                                        }
                                        addSubFolders(child_current, $(li));
                                    }
                                }
                            }
                            appendTo.append($(ul));
                        }
                    }

                    var child = bibliotheque.__getChildFolders(null);
                    addSubFolders(child, $tree);
                    bibliotheque.__treeEventListener();
                }
            },
            __getChildFolders: function (parent) {
                child = [];
                for (var i in this.config.folders) {
                    folder = this.config.folders[i];
                    if (folder.parent === parent)
                        child.push(folder);
                }
                return child;
            },
            __getFiles: function (folder) {
                $('#search-input').val("");
                return folder.files;
            },
            __treeEventListener: function () {
                $tree = this.$elem.find('#tree');
                $tree.off();
                _this = this;
                $tree.on('click', 'div.expandable', function () {
                    if ($(this).parent('li').hasClass('open'))
                        _this.__closeFolder($(this).parent('li'));
                    else
                        _this.__openFolder($(this).parent('li'));
                });
                $tree.on('click', 'li span', function () {
                    if ($(this).parent('li').hasClass('active'))
                        noop;
                    else {
                        /*_this.__stackAction({
                            action: 'enter',
                            folder: _this.__variables.folderActive
                        });*/

                        _this.__deactiveFolder();
                        _this.__activeFolder($(this).parent('li'));
                        _this.__drawContent();
                    }
                });
            },
            __openFolder: function (folder) {
                if (folder.find('.expandable').length === 0) {
                    folder.prepend('<div class="expandable"><i class="fa fa-caret-down"></i></div>');
                }
                folder.find('.expandable i').first().removeClass('fa-caret-right').addClass('fa-caret-down');
                folder.find('span i').first().removeClass('fa-folder').addClass('fa-folder-open');
                folder.addClass('open');
            },
            __closeFolder: function (folder) {
                folder.find('.expandable i').first().removeClass('fa-caret-down').addClass('fa-caret-right');
                folder.find('span i').first().removeClass('fa-folder-open').addClass('fa-folder');
                folder.removeClass('open');
            },
            __activeFolder: function (folder) {
                var _this = this;

                var new_folder = _this.__getFolderById(folder.data('id'));
                new_folder.active = true;
                this.__variables.folderActive = new_folder;
                folder.addClass('active');
                //pixlr.settings.target = _this.config.pixlrUrl + '/' + folder.data('id');
            },
            __deactiveFolder: function () {
                var old_folder = this.__getFolderById(this.__variables.folderActive.id);
                old_folder.active = false;
                this.__variables.folderActive = null;
                $tree = this.$elem.find('#tree');
                $tree.find('li').removeClass('active');
            },
            __getFolderById: function (id) {
                for (var i in this.config.folders) {
                    folder = this.config.folders[i];
                    if (folder.id === id)
                        return folder;
                }
                return false;
            },
            __getFileById: function (id) {
                for (var i in this.config.folders) {
                    files = _this.__getFiles(this.config.folders[i]);
                    if (is.not.undefined(files)) {
                        for (var j in files) {
                            if (files[j].id === id)
                                return files[j];
                        }
                    }

                }
                return false;
            },
            __drawContent: function () {
                _this = this;
                $content = this.$elem.find('#content');
                $content.html('');
                folders = _this.__getChildFolders(_this.__variables.folderActive.id);
                for (var i in folders) {
                    folder = Bibliotheque.createElement(Bibliotheque.render[_this.__variables.renderMode].folders);
                    $(folder).attr('title', folders[i].name);
                    $(folder).data('id', folders[i].id);
                    $(folder).data('title', folders[i].name);
                    $(folder).find('[data-bbl-title]').html(folders[i].name);
                    $content.append(folder);
                    _this.__bindEventsFolderInContent(folder);
                }
                files = _this.__getFiles(_this.__variables.folderActive);

                this.__bindOpenfolder();
                this.__bindZoom();
                this.__bindValid();

                if (is.not.undefined(files)) {
                    for (var j in files) {
                        file = Bibliotheque.createElement(Bibliotheque.render[_this.__variables.renderMode].files);
                        $(file).attr('title', files[j].name);
                        $(file).data('id', files[j].id);
                        $(file).data('title', files[j].name);
                        $(file).data('url', files[j].url);
                        $(file).find('[data-bbl-title]').html(files[j].name.trunc(17));

                        $(file).find('[data-bbl-img]').append('<img src="' + _this.defaults.icons.picture + '" data-src="' + _this.__getThumb($(file).data('url')) + '" />');
                        if (_this.__isSelected(files[j].id)) {
                            $(file).addClass('active');
                        }

                        $content.append(file);

                        _this.__bindEventsFileInContent(file);
                    }
                    $('#content').find('[data-bbl-img] img').unveil();
                }

                this.__bindSort();
                $('#content').find('[data-bbl-img] img').trigger("unveil");

                $("#content").niceScroll({
                    cursorcolor: "#424A4D",
                    background: "#c1c1c1",
                    cursorborderradius: 0,
                    cursorborder: "none",
                    cursorwidth: "10px",
                    cursoropacitymin: 0.4
                });
            },
            __initDropZone: function () {
                var bibliotheque = this;
                var target_folder = bibliotheque.__variables.folderActive;

                try {
                    var myDropzone = Dropzone.forElement("#content");
                    if (is.not.undefined(myDropzone)) {
                        myDropzone.destroy();
                    }
                } catch (e) {

                }

                var dz = new Dropzone('#content', {
                    url: bibliotheque.config.urlUpload,
                    previewsContainer: "#infos",
                    clickable: false,
                    previewTemplate: Bibliotheque.render[_this.__variables.renderMode].previewFile,
                    resizeWidth: 1920
                });
                dz.on("drop", function (e) {
                    var $elmt = $(e.toElement);
                    if ($elmt.hasClass('folder'))
                        target_folder = bibliotheque.__getFolderById($elmt.data('id'));
                    else {
                        if ($elmt.parents('.folder').length > 0) {
                            target_folder = bibliotheque.__getFolderById($elmt.parents('.folder').data('id'));
                        } else {
                            target_folder = bibliotheque.__variables.folderActive;
                        }
                    }
                });
                dz.on("addedfile", function (file) {
                    // console.log(file);
                });
                dz.on("complete", function (file) {
                    file.previewElement.remove();
                });
                dz.on("success", function (file, json) {
                    if (json.result === "fail") {
                        console.log(json.reponse);
                    }
                    if (json.result === "success") {
                        //console.log(json.reponse);
                        var parent = bibliotheque.__getFolderById(json.file.parent);
                        var f = {id: json.file.id, name: json.file.name, url: json.file.url};
                        if (is.undefined(parent.files))
                            parent.files = [];
                        parent.files.push(f);
                        bibliotheque.__drawContent();

                        bibliotheque.addAlerte(Bibliotheque.lang.sucessUploadFile);
                    }
                });

                dz.on("error", function (response) {
                    console.log(response.xhr.responseText);
                });

                if (is.not.null(_this.config.onSendingFile)) {
                    dz.on("sending", function (file, xhr, formData) {
                        _this.config.onSendingFile(file, target_folder, xhr, formData);
                    });
                }
            },
            __checkVisibility: function (file) {
                var vpH = $('#content').outerHeight(), // Viewport Height
                    st = $('#content').scrollTop(), // Scroll Top
                    y = $(file).offset().top, // element top
                    h = $(file).outerHeight(); // element height
                return (0 < (y - st) && (y - st) < vpH);

            },
            __loadImage: function (file) {
                _this = this;
                var $file = $(file);
                $file.find('[data-bbl-img] img').trigger("unveil");
            },
            __renameFile: function (bibliotheque, file) {
                _this = bibliotheque;
                BootstrapDialog.show({
                    title: Bibliotheque.lang.titleRenameFile,
                    message: function (dialog) {
                        var form = Bibliotheque.createElement('<div class="form-group"><label for="title">Libéllé</label><input type="text" class="form-control" id="title" placeholder="Libéllé"></div>');
                        $(form).find('#title').attr('value', $(file).data('title'));
                        return form;
                    },
                    buttons: [{
                        label: 'Annuler',
                        cssClass: 'btn-default',
                        action: function (dialogItself) {
                            dialogItself.close();
                        }
                    }, {
                        label: 'Renommer',
                        cssClass: 'btn-primary',

                        action: function (dialogItself) {
                            var title = dialogItself.getModalBody().find('#title').val();
                            $(file).attr('title', title);
                            $(file).data('title', title);
                            $(file).find('[data-bbl-title]').html(title);
                            var f = _this.__getFileById($(file).data('id'));
                            f.name = title;
                            _this.config.onRenameFile(f);
                            _this.__bindSort();
                            _this.__bindZoom();
                            _this.__bindValid();
                            _this.addAlerte(Bibliotheque.lang.sucessRenameFile);
                            dialogItself.close();
                        }
                    }]
                });
            },
            __moveFile: function (bibliotheque, file) {
                _this = bibliotheque;
                //var file = _this.__getFileById($elmt.data('id'));

                BootstrapDialog.show({
                    title: '<i class="fa fa-arrows"></i> Déplacer le fichier',
                    message: function (dialog) {
                        function addSubFolders(childrens, appendTo) {
                            if (is.not.undefined(childrens)) {
                                var ul = $('<div></div>').addClass('move-folder-list');
                                $.each(childrens, function (k, child) {
                                    if (is.not.undefined(child)) {
                                        var li = $('<div></div>');
                                        $(li).html('<div class="move-folder-folder" data-id="' + child.id + '">' + child.name + '</div>');
                                        if (is.truthy(child.active)) {
                                            _this.__activeFolder($(li));
                                        }
                                        $(ul).append($(li));
                                        var child_current = _this.__getChildFolders(child.id);
                                        if (is.not.empty(child_current)) {
                                            addSubFolders(child_current, $(li));
                                        }
                                    }
                                });
                                appendTo.append($(ul));
                            }
                        }

                        var $message = $('<div>');
                        var root = _this.__getChildFolders(null);
                        addSubFolders(root, $message);

                        $($message).find('.move-folder-folder').each(function () {
                            $(this).click(function () {
                                $($message).find('.active').each(function () {
                                    $(this).removeClass('active');
                                });
                                $(this).parent().addClass('active');
                            });
                        });

                        return $message;
                    },
                    buttons: [{
                        label: 'Déplacer',
                        icon: 'fa fa-move',
                        action: function (dialog) {
                            var folder = dialog.getModalBody().find('.move-folder-list div.active .move-folder-folder').first().data('id');
                            if (is.not.null(folder) && is.not.undefined(folder)) {
                                $.when(_this.config.onMoveFile(_this.__getFileById($(file).data('id')), _this.__getFolderById(folder))).then(function () {
                                    _this.addAlerte(Bibliotheque.lang.sucessUploadFile);
                                    $.ajax({
                                        method: 'POST',
                                        url: _this.config.ajax,
                                        dataType: 'json',
                                        success: function (data, statut) {
                                            _this.setFolders(data);
                                            $(file).remove();
                                            dialog.close();
                                        },
                                        error: function (xhr, status, error) {
                                            console.log(error);
                                        }
                                    });
                                });
                            }
                        }
                    }]
                });
            },
            __deleteFile: function ($elmt) {
                var _this = this;
                var file = _this.__getFileById($elmt.data('id'));
                BootstrapDialog.show({
                    type: BootstrapDialog.TYPE_DANGER,
                    size: BootstrapDialog.SIZE_SMALL,
                    title: '<i class="fa fa-exclamation-triangle"></i> Supprimer le fichier ?',
                    message: 'Êtes-vous sur de vouloir supprimer le fichier : <strong>' + file.name + '</strong>',
                    buttons: [{
                        autospin: true,
                        icon: 'fa fa-ban',
                        label: 'Annuler',
                        action: function (dialog) {
                            dialog.close();
                        }
                    }, {
                        autospin: true,
                        icon: 'fa fa-trash',
                        label: 'Supprimer',
                        cssClass: 'btn-danger',
                        action: function (dialogItself) {
                            _this.config.onDeleteFile(file);
                            $elmt.remove();
                            dialogItself.close();
                        }
                    }]
                });

            },
            __renameFolder: function (bibliotheque, folder) {
                var _this = bibliotheque;

                BootstrapDialog.show({
                    title: '<i class="fa fa-pencil-square-o" aria-hidden="true"></i>' + Bibliotheque.lang.titleRenameFolder,
                    message: function (dialog) {
                        var form = Bibliotheque.createElement('<div class="form-group"><label for="title">Libellé</label><input type="text" class="form-control" id="title" placeholder="Libellé"></div>');
                        $(form).find('#title').attr('value', $(folder).data('title'));
                        return form;
                    },
                    buttons: [{
                        label: 'Annuler',
                        cssClass: 'btn-default',
                        action: function (dialogItself) {
                            dialogItself.close();
                        }
                    }, {
                        icon: 'fa fa-edit',
                        label: 'Renommer',
                        cssClass: 'btn-primary',
                        hotkey: 13,
                        action: function (dialogItself) {
                            var title = dialogItself.getModalBody().find('#title').val();
                            $(folder).attr('title', title);
                            $(folder).data('title', title);
                            $(folder).find('[data-bbl-title]').html(title);
                            f = _this.__getFolderById($(folder).data('id'));
                            f.name = title;
                            _this.config.onRenameFolder(f);
                            _this.__drawTree();
                            _this.addAlerte(Bibliotheque.lang.sucessRenameFolder);
                            dialogItself.close();
                        }
                    }]
                });
            },
            __addFolder: function () {
                var _this = this;
                var dialog = new BootstrapDialog();
                dialog.setTitle(Bibliotheque.lang.titleAddFolder);
                var form = Bibliotheque.createElement('<form><div class="form-group"><label for="title">Libellé</label><input type="text" class="form-control" id="title" placeholder="Libellé"></div></form>');
                dialog.setMessage(form);
                dialog.setButtons([
                    {
                        label: 'Annuler',
                        cssClass: 'btn-default',
                        action: function (dialogItself) {
                            dialogItself.close();
                        }
                    },
                    {
                        autospin: true,
                        icon: 'fa fa-plus',
                        label: 'Ajouter',
                        cssClass: 'btn-primary',
                        action: function (dialogItself) {
                            var modalBody = dialogItself.getModalBody();
                            var title = modalBody.find('#title').val();
                            modalBody.find('.help-block').remove();
                            if (title.length > 0) {
                                modalBody.find('#title').parent().removeClass('has-error').addClass('has-success');

                                if (is.not.null(_this.config.onAddFolder)) {
                                    function sAddFolder(response) {
                                        //console.log(response);
                                        _this.emitter.emitEvent("addFolder", [_this, _this.__variables.folderActive, title, response.id]);

                                        _this.__initDropZone();

                                        dialogItself.close();
                                    }

                                    function eAddFolder(jqxhr) {
                                        //console.log(jqxhr.responseText);
                                        modalBody.find('#title').parent().addClass('has-error');
                                        modalBody.find('#title').after('<span class="help-block">Erreur lors de la création du dossier</span>');
                                    }

                                    var promise = _this.config.onAddFolder(_this.__variables.folderActive, title);
                                    promise.then(sAddFolder, eAddFolder);
                                }
                                else {
                                    id = Math.floor(Math.random() * (1000000 - 50000 + 1)) + 50000;
                                    _this.emitter.emitEvent("addFolder", [_this, _this.__variables.folderActive, title, id]);
                                    dialogItself.close();
                                }
                            } else {
                                modalBody.find('#title').parent().addClass('has-error');
                                modalBody.find('#title').after('<span class="help-block">Veuillez entrer un libellé</span>');
                            }
                        }
                    }]);
                dialog.open();
            },
            __createFolder: function (bibliotheque, parent, name, id) {
                var _this = bibliotheque;

                var f = {id: id, name: name, type: 'folder', parent: parent.id, active: false, open: false};
                _this.config.folders.push(f);
                folder = Bibliotheque.createElement(Bibliotheque.render[_this.__variables.renderMode].folders);
                $(folder).attr('title', f.name);
                $(folder).data('id', f.id);
                $(folder).data('title', f.name);
                $(folder).find('[data-bbl-title]').html(f.name);
                $content.append(folder);
                _this.__bindEventsFolderInContent(folder);
                _this.__drawTree();
                return f;
            },
            __bindContextMenuFolder: function ($folder) {
                var _this = this;
                // var folder = _this.__getFolderById($folder.data('id'));
                return {
                    items: {
                        'rename': {
                            name: "Renommer",
                            icon: "edit",
                            callback: function (itemKey, opt) {
                                _this.__renameFolder(_this, $folder);
                            }
                        }
                    }
                };
            },
            __bindContextMenuContent: function () {
                var _this = this;
                return {
                    items: {
                        'add_folder': {
                            name: "Nouveau dossier",
                            icon: "add",
                            accesskey: 'n',
                            callback: function (itemKey, opt) {
                                _this.__addFolder();
                            }
                        }
                    }
                };
            },
            __bindContextMenuFile: function ($file) {
                var _this = this;
                return {
                    items: {
                        /*'edit_file': {
                            name: "Modifier",
                            icon: "edit",
                            accesskey: 'm',
                            callback: function (itemKey, opt) {
                                var img = $file.find('img').attr('src');

                                pixlr.settings.target = _this.config.pixlrUrl + '/' + _this.__variables.folderActive.id + '/' + $file.data('id');
                                pixlr.overlay.show({image:img, title: $file.attr('title')});
                                //window.location = "javascript:pixlr.overlay.show({image:'" + $(file).find('img').data('src') + "', title:'Example image 1', service:'editor'});";
                                //window.location = "javascript:pixlr.overlay.show({image:'http://developer.pixlr.com/_image/example1_thumb.jpg', title:'Example image 1', service:'editor'});";
                            }
                        },*/
                        'rename_file': {
                            name: "Renommer",
                            icon: "edit",
                            accesskey: 'r',
                            callback: function (itemKey, opt) {
                                _this.__renameFile(_this, $file);
                            }
                        },
                        'move_file': {
                            name: "Déplacer",
                            icon: "cut",
                            accesskey: 'd',
                            callback: function (itemKey, opt) {
                                _this.__moveFile(_this, $file);
                            }
                        }/*,
                        'delete_file': {
                            name: "Supprimer",
                            icon: "delete",
                            accesskey: 's',
                            callback: function (itemKey, opt) {
                                _this.__deleteFile($file);
                            }
                        }*/,
                        'copy_file': {
                            name: "Copier le lien",
                            icon: 'fa-link',
                            accesskey: 'c',
                            callback: function (itemKey, opt) {
                                var url = $file.data('url');
                                var aux = document.createElement("input");
                                aux.setAttribute("value", url);
                                document.body.appendChild(aux);
                                aux.select();
                                document.execCommand("copy");
                                aux.remove();
                            }
                        }
                    }
                };
            },
            __bindEventsFolderInContent: function (folder) {
                var _this = this;
                var $folder = $(folder);
                $folder.on('dblclick', '*', function (e) {
                    e.stopPropagation();
                    $folder.addClass('opening');
                    _this.__deactiveFolder();
                    _this.__activeFolder($folder);
                    _this.__drawTree();
                    _this.__drawContent();
                });
                $folder.on("click", "*", function (e) {
                    e.stopPropagation();
                    if (!$folder.hasClass('active')) {
                        $('#content').find('*').removeClass('active');
                        $folder.addClass('active');
                    }
                });

                _this.emitter.addListener('renameFolder', _this.__renameFolder);
            },
            __bindEventsFileInContent: function (file) {
                _this = this;
                var $file = $(file)/*, file = file*/;
                if (_this.__checkVisibility(file)) {
                    $file.data('appear', true);
                    _this.__loadImage(file);
                }
                $('#content').scroll(function () {
                    if ($file.data('appear') !== true && _this.__checkVisibility(file)) {
                        $file.data('appear', true);
                        _this.__loadImage(file);
                    }
                });
                $file.on("click", "*", function (e) {
                    e.stopPropagation();
                    if (!$file.hasClass('active')) {
                        if (is.falsy(_this.config.multiple)) {
                            $('#content').find('*').removeClass('active');
                        }
                        $file.addClass('active');
                        time = $.now();
                    } else {
                        if (_this.config.multiple) {
                            $file.removeClass('active');
                        }
                    }
                });
                if (is.falsy(_this.config.multiple)) {
                    $file.on('dblclick', '*', function (e) {
                        e.stopPropagation();
                        _this.config.onFileDblClicked(_this.__getFileById($file.data('id')));
                    });
                }

                _this.emitter.addListener('renameFile', _this.__renameFile);
            },
            __bindEvents: function () {
                var _this = this;
                $('#content').on("click", function (e) {
                    $(this).find('.file').removeClass('active');
                    $(this).find('.folder').removeClass('active');
                });
                _this.emitter.addListener('addFolder', _this.__createFolder);
                $.contextMenu({
                    selector: '#content',
                    build: function ($trigger, e) {
                        var $elmt = $(e.toElement);
                        if ($elmt.hasClass('folder')) {
                            return _this.__bindContextMenuFolder($elmt);
                        }
                        if ($elmt.parents('.folder').length > 0) {
                            return _this.__bindContextMenuFolder($elmt.parents('.folder'));
                        }
                        if ($elmt.is("#content")) {
                            return _this.__bindContextMenuContent();
                        }
                        if ($elmt.hasClass('file')) {
                            return _this.__bindContextMenuFile($elmt);
                        }
                        if ($elmt.parents('.file').length > 0) {
                            return _this.__bindContextMenuFile($elmt.parents('.file'));
                        }
                    }
                });
            },
            __bindSearch: function () {
                _this = this;
                var input = $('#search-input');
                var content = $('#content');

                input.keyup(function () {
                    var val = $(this).val();
                    content.find('[data-bbl-title]').each(function () {
                        if ($(this).text().toUpperCase().search(val.toUpperCase()) >= 0) {
                            $(this).parent().show(100);
                        } else {
                            $(this).parent().hide(100);
                        }
                    });
                });
            },
            __bindSort: function () {
                _this = this;
                var browse = $('#browse');
                var content = $('#content');

                var asc = true;

                browse.find('.btn-sort').each(function () {
                    $(this).unbind('click');
                });
                browse.find('.btn-sort').click(function () {
                    browse.find('.btn-sort').each(function () {
                        $(this).removeClass('active');
                    });
                    $(this).addClass('active');
                    asc = !!($(this).hasClass('asc'));
                    content.find('.file').sort(sortFiles).appendTo('#content');
                });

                content.find('.file').sort(sortFiles).appendTo('#content');

                function sortFiles(a, b) {
                    var t1 = $($(a).find('[data-bbl-title]').get(0)).text().toUpperCase();
                    var t2 = $($(b).find('[data-bbl-title]').get(0)).text().toUpperCase();
                    if (asc) {
                        return (t1 < t2) ? -1 : 1;
                    }
                    return (t1 > t2) ? -1 : 1;
                }
            },
            __bindOpenfolder: function () {
                _this = this;

                var browse = $('#browse');
                browse.find('.open-folder').each(function () {
                    $(this).unbind('click');
                });

                browse.find('.open-folder').click(function () {
                    $('#content').find('.folder').each(function () {
                        if ($(this).hasClass('active')) {
                            $(this).addClass('opening');
                            _this.__deactiveFolder();
                            _this.__activeFolder($(this));
                            _this.__drawTree();
                            _this.__drawContent();
                        }
                    });
                });

            },
            __bindZoom: function () {
                _this = this;

                var browse = $('#browse');
                browse.find('.zoom-file').each(function () {
                    $(this).unbind('click');
                });

                browse.find('.zoom-file').click(function () {
                    $('#content').find('.file.active').each(function () {
                        var modal = $('#modal-zoom-img');
                        var modalImg = $('#modal-zoom-img-content');
                        modal.show();
                        modalImg.attr('src', $(this).find('img').attr('src'));
                        modal.click(function () {
                            modalImg.addClass('out');
                            setTimeout(function () {
                                modal.hide();
                                modalImg.removeClass('out');
                            }, 50);
                            modal.unbind('click');
                        });

                    });
                });
            },
            __bindValid: function () {
                var browse = $('#browse');
                browse.find('.add-file').each(function () {
                    $(this).unbind('click');
                });

                browse.find('.add-file').click(function () {
                    var files = [];
                    $('#content').find('.file.active').each(function () {
                        files.push(_this.__getFileById($(this).data('id')));
                    });

                    files.sort(function (a, b) {
                        return parseFloat(a.id) > parseFloat(b.id);
                    });

                    _this.config.onFileSelected(files);
                });
            },
            __getThumb: function (file) {
                _this = this;
                switch (true) {
                    case /pdf/.test(file):
                        return _this.config.root + _this.defaults.icons.pdf;
                        break;
                    case /doc/.test(file):
                        return _this.config.root + _this.defaults.icons.doc;
                        break;
                    case /xls/.test(file):
                        return _this.config.root + _this.defaults.icons.xls;
                        break;
                    case /zip/.test(file):
                        return _this.config.root + _this.defaults.icons.zip;
                        break;
                    case /txt/.test(file):
                        return _this.config.root + _this.defaults.icons.txt;
                        break;
                    default:
                        return file;
                        break;
                }
            },
            __isSelected: function (file) {
                _this = this;
                var hasValue = false;
                $.each(_this.config.selected, function (i, obj) {
                    if (parseInt(obj) === file) {
                        hasValue = true;
                    }
                });
                return hasValue;
            },
            __bindStack: function () {
                _this = this;
                $('#unstack').click(function () {
                    var action = _this.__unstackAction();

                    console.log(action.action);

                    if (action !== "undefined") {
                        //console.log(action);
                        switch (action.action) {
                            case 'enter':
                                _this.__variables.folderActive = action.folder;
                                _this.__drawContent();
                                break;
                        }
                    } else {
                        $('#unstack').addClass('disabled');
                        $(this).unbind('click');
                    }
                });
            },
            __stackAction: function (action) {
                _this = this;
                _this.config.actions.push(action);
                $('#unstack').removeClass('disabled');
            },
            __unstackAction: function () {
                _this = this;
                return _this.config.actions.pop();
            },
            emit: function (event, variable) {
                _this.emitter.emitEvent(event, variable);
            },
            destroy: function () {
                this.$elem.html('');
                delete this;
            },
            getPath: function (path) {
                return this.config.root + path;
            }
        };
        return Bibliotheque;
    })();
    Bibliotheque.createElement = function (string) {
        var div;
        div = document.createElement("div");
        div.innerHTML = string;
        return div.childNodes[0];
    };
    Bibliotheque.defaults = Bibliotheque.prototype.defaults;
    Bibliotheque.templates = {
        'nav': '',
        'browse': '<div id="browse"><div class="btn-group" role="group"><button type="button" class="btn btn-default btn-sort asc active"><i class="fa fa-sort-alpha-asc" aria-hidden="true"></i></button><button type="button" class="btn btn-default btn-sort desc"><i class="fa fa-sort-alpha-desc" aria-hidden="true"></i></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default open-folder"><i class="fa fa-folder-open fa-rotate-90" aria-hidden="true"></i></button></div><div class="btn-group" role="group"><button type="button" class="btn btn-default zoom-file"><i class="fa fa-search" aria-hidden="true"></i></button></div></div>',
        'search': '<div id="search" class="pull-right"><input type="text" class="form-control" id="search-input" placeholder="Rechercher un fichier"> </div>',
        'options': '<div id="options"></div>',
        'tree': '<div id="tree"></div>',
        'content': '<div id="content"></div>',
        'infos': '<div id="infos"></div>',
        'modalimg': '<div id="modal-zoom-img" class="modal"><img class="modal-content" id="modal-zoom-img-content"></div>',
        alert: '<div id="${Id}" class="alert alert-dismissable bbl-alert ${State}"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><p>${Content}</p></div>'
    };
    Bibliotheque.render = {
        'default': {
            'folders': '<div class="folder"><span class="fa fa-folder"></span><span class="title" data-bbl-title></span></div>',
            'files': '<div class="file"><div data-bbl-img></div><span class="title" data-bbl-title></span></div>',
            'previewFile': '<div class="dz-preview dz-file-preview"><div class="dz-details"><img data-dz-thumbnail /><div class="dz-filename"><span data-dz-name></span></div></div><div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div></div>'
        }
    };
    Bibliotheque.lang = {
        'titleRenameFile': 'Renommer le fichier',
        'titleRenameFolder': 'Renommer le dossier',
        'titleAddFolder': 'Ajouter un dossier',
        sucessRenameFile: "Le fichier a bien été renommé",
        sucessRenameFolder: "Le dossier a bien été renommé",
        sucessUploadFile: "Le fichier a bien été envoyé",
        sucessMoveFile: "Le fichier a bien été déplacé"
    };
    $.fn.bibliotheque = function (options) {
        return this.each(function () {
            new Bibliotheque(this, options).init();
        });
    };
    window.Bibliotheque = Bibliotheque;
})(window, jQuery);