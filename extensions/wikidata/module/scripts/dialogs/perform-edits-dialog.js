var PerformEditsDialog = {};

PerformEditsDialog.launch = function(logged_in_username, max_severity) {
  var self = this;
  var elmts = this._elmts;
  var frame = this.frame;

  if (this.missingSchema) {
    return;
  }

  this._level = DialogSystem.showDialog(frame);

  this._elmts.dialogHeader.text($.i18n._('perform-wikidata-edits')["dialog-header"]);
  this._elmts.reviewYourEdits.html($.i18n._('perform-wikidata-edits')["review-your-edits"]);
  this._elmts.loggedInAs.text($.i18n._('perform-wikidata-edits')["logged-in-as"]);
  this._elmts.editSummaryLabel.text($.i18n._('perform-wikidata-edits')["edit-summary-label"]);
  this._elmts.editSummary.attr('placeholder', $.i18n._('perform-wikidata-edits')["edit-summary-placeholder"]);
  this._elmts.performEditsButton.text($.i18n._('perform-wikidata-edits')["perform-edits"]);
  this._elmts.cancelButton.text($.i18n._('perform-wikidata-edits')["cancel"]);

  var dismiss = function() {
    DialogSystem.dismissUntil(self._level - 1);
  };

  elmts.loggedInUsername
   .text(logged_in_username)
   .attr('href','https://www.wikidata.org/wiki/User:'+logged_in_username);
  
  frame.find('.cancel-button').click(function() {
     dismiss();
  });

  if (max_severity === 'CRITICAL') {
      elmts.performEditsButton.prop("disabled",true).addClass("button-disabled");
  } else {
    elmts.performEditsButton.click(function() {
        if(elmts.editSummary.val().length == 0) {
            elmts.editSummary.focus();
        } else {
            Refine.postProcess(
            "wikidata",
            "perform-wikibase-edits",
            {},
            {
                summary: elmts.editSummary.val(),
            },
            { includeEngine: true, cellsChanged: true, columnStatsChanged: true },
            { onDone:
                function() {
                dismiss();
                }
            });
        }
    });
  }
};

PerformEditsDialog._updateWarnings = function(data) {
   var warnings = data.warnings;
   var mainDiv = this._elmts.warningsArea;

   // clear everything
   mainDiv.empty();

   var table = $('<table></table>').appendTo(mainDiv);
   for (var i = 0; i != warnings.length; i++) {
      var rendered = WarningsRenderer._renderWarning(warnings[i]);
      rendered.appendTo(table);
   }   
}

PerformEditsDialog.checkAndLaunch = function () {
  var self = this;
  this.frame = $(DOM.loadHTML("wikidata", "scripts/dialogs/perform-edits-dialog.html"));
  this._elmts = DOM.bind(this.frame);
  this.missingSchema = false;

  if (SchemaAlignmentDialog.isSetUp() && SchemaAlignmentDialog._hasUnsavedChanges) {
     SchemaAlignmentDialog._save();
  }

   ManageAccountDialog.ensureLoggedIn(function(logged_in_username) {
       if (logged_in_username) {
            var discardWaiter = DialogSystem.showBusy($.i18n._('perform-wikidata-edits')["analyzing-edits"]);
            $.post(
                "command/wikidata/preview-wikibase-schema?" + $.param({ project: theProject.id }),
                { engine: JSON.stringify(ui.browsingEngine.getJSON()) },
                function(data) {
                   discardWaiter();
                   if(data['code'] != 'error') {
                       PerformEditsDialog._updateWarnings(data);
                       PerformEditsDialog.launch(logged_in_username, data['max_severity']);
                   } else {
                       SchemaAlignmentDialog.launch(
                           PerformEditsDialog.checkAndLaunch);
                   }
                },
                "json"
            );
       }
   });
};
