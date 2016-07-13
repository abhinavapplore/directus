//  Many To One core UI component
//  Directus 6.0

//  (c) RANGER
//  Directus may be freely distributed under the GNU license.
//  For all details and documentation:
//  http://www.getdirectus.com
/*jshint multistr: true */

define(['app', 'backbone', 'handlebars', 'core/UIComponent', 'core/UIView', 'utils', 'core/t'], function(app, Backbone, Handlebars, UIComponent, UIView, Utils, __t) {

  'use strict';

  var template = '<input type="text" value="{{value}}" class="for_display_only {{size}}" {{#if readonly}}readonly{{/if}}/> \
                  <div id="formattedValue">{{formattedValue}}</div>{{#if formattedValue}}<span class="clear">×</span>{{/if}} \
                  <style> \
                    .tt-hint {padding:14px;} \
                    #edit_field_{{name}} .twitter-typeahead {\
                      width:100%;\
                    }\
                    #edit_field_{{name}} .tt-dropdown-menu { \
                      padding: 3px 0; \
                      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); \
                      -webkit-border-radius: 2px; \
                      -moz-border-radius: 2px; \
                      border-radius: 2px; \
                      background-color: #fff; \
                  } \
                  #edit_field_{{name}} .tt-suggestions { \
                    margin-right: 0 !important; \
                  } \
                  \
                  #edit_field_{{name}} .tt-suggestion { \
                    display: block; \
                    padding: 0px 20px; \
                    clear: both; \
                    font-weight: normal; \
                    white-space: nowrap; \
                    font-size: 12px; \
                    margin-right: 0 !important; \
                } \
                \
                #edit_field_{{name}} .tt-is-under-cursor { \
                    color: white; \
                    background-color: black; \
                }\
                </style>';

  var Input = UIView.extend({
    events: {
      'click .clear': function() {
        this.model.get(this.name).clear();
        this.render();
      }
    },

    templateSource: template,

    serialize: function() {
      var relatedModel = this.model.get(this.name);
      var value = relatedModel.get(this.visibleColumn);

      return {
        name: this.options.name,
        size: this.columnSchema.options.get('size'),
        readonly: false,
        comment: this.options.schema.get('comment'),
        formattedValue: this.getFormattedValue(),
        value: value
      };
    },

    afterRender: function () {
      var template = this.columnSchema.options.get('template');
      var self = this;
      var url = app.API_URL + 'tables/' + this.collection.table.id + '/typeahead/';
      var params = {};

      if(this.visibleColumn) {
        params['columns'] = this.visibleColumn;
      }

      if(1 === parseInt(this.includeInactives, 10)) {
        params['include_inactive'] = 1;
      }

      var urlParams = Utils.encodeQueryParams(params);
      if(urlParams) {
        url += '?' + urlParams;
      }

      var fetchItems = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        prefetch: {
          url: url,
          ttl: 0
        },
        remote: Utils.addParam(url, 'q', '%QUERY', true, false),
        dupDetector: function(remoteMatch, localMatch) {
          return remoteMatch.value === localMatch.value;
        }
      });

      fetchItems.initialize();
      // fetchItems.clearPrefetchCache();
      // engine.clearRemoteCache();
      this.$(".for_display_only").typeahead({
        minLength: 1,
        items: 5,
      }, {
        source: fetchItems.ttAdapter()
      });

      this.$('.for_display_only').on('typeahead:selected', function(e, datum) {
        var model = self.model.get(self.name);
        var selectedId = parseInt(datum.id,10);

        model.clear();
        model.set({id: selectedId});
        model.fetch({success:  function() {
          self.updateFormattedValue();
          self.render();
          // clear after fetch
          model.clear();
          model.set({id: selectedId});
        }});
      });
    },

    getFormattedValue: function() {
      var relatedModel = this.model.get(this.name);
      var templateSource = this.columnSchema.options.get('template');
      var formattedValue = '';

      if (templateSource && !relatedModel.isNew()) {
        var template = Handlebars.compile(templateSource);
        formattedValue = template(relatedModel.toJSON());
      }

      return formattedValue;
    },

    updateFormattedValue: function() {
      this.$el.find('#formattedValue').html(this.getFormattedValue());
    },

    initialize: function(options) {
      this.visibleColumn = this.columnSchema.options.get('visible_column');
      this.includeInactives = this.columnSchema.options.get('include_inactive');
      var value = this.model.get(this.name);
      this.collection = value.collection.getNewInstance({omit: ['preferences']});
    }
  });

  var Component = UIComponent.extend({
    id: 'many_to_one_typeahead',
    dataTypes: ['INT'],
    variables: [
      {id: 'visible_column', ui: 'textinput', comment: __t('m2o_typeahead_visible_column_comment'), char_length: 64, required: true},
      {id: 'size', ui: 'select', options: {options: {'large':__t('size_large'),'medium':__t('size_medium'),'small':__t('size_small')} }, comment: __t('m2o_typeahead_size_comment')},
      {id: 'template', ui: 'textinput', comment: __t('m2o_typeahead_template_comment')},
      {id: 'include_inactive', ui: 'checkbox', def: '0', comment: __t('m2o_typeahead_include_inactive_comment'), required: false}
    ],
    Input: Input,
    list: function(options) {
      if (options.value === undefined) return '';
      if (options.value instanceof Backbone.Model) return options.value.get(options.settings.get('visible_column'));

      return options.value;
    }
  });

  return Component;
});
