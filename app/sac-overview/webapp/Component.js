sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
    "use strict";
    return UIComponent.extend("myfranchise.sacoverview.Component", {
        metadata: {
            manifest: "json"
        },
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            // Force full height
            document.documentElement.style.height = "100%";
            document.body.style.height = "100%";
            document.body.style.overflow = "hidden";
        }
    });
});
