sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";

    var SAC_BASE_URL = "https://demo-presalesbrazil.us10.sapanalytics.cloud/sap/fpa/ui";
    var STORY_ID = "30A0BD802422836E3B9C1743AC9A913D";
    var WIDGET_ID = "Chart_1";

    return Controller.extend("myfranchise.sacoverview.controller.Main", {

        onInit: function () {
            var script = document.createElement("script");
            script.src = "https://assets.sapanalytics.cloud/production/api/widget/sac-widget-embed.js";
            script.onload = this._renderWidget.bind(this);
            script.onerror = this._fallbackIframe.bind(this);
            document.head.appendChild(script);
        },

        _renderWidget: function () {
            var that = this;
            setTimeout(function () {
                try {
                    sap.sac.api.widget.setup({
                        theme: "sap_horizon",
                        useHostTheme: true,
                        language: "en"
                    });
                    sap.sac.api.widget.renderWidget(
                        "sac-widget-container",
                        SAC_BASE_URL,
                        STORY_ID,
                        WIDGET_ID
                    );
                } catch (e) {
                    that._fallbackIframe();
                }
            }, 500);
        },

        _fallbackIframe: function () {
            var container = document.getElementById("sac-widget-container");
            if (container) {
                container.innerHTML =
                    '<iframe src="' + SAC_BASE_URL +
                    '/tenants/78e94/bo/story/' + STORY_ID +
                    '?mode=embed&pagebar=disable&shellMode=embed&view=view' +
                    '" style="width:100%;height:700px;border:none;" frameborder="0"></iframe>';
            }
        }
    });
});
