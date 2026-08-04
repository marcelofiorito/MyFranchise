sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";
    return Controller.extend("myfranchise.sacoverview.controller.Main", {
        onAfterRendering: function () {
            var iframe = document.getElementById("sac-iframe");
            if (iframe) {
                var h = window.innerHeight - iframe.getBoundingClientRect().top - 10;
                iframe.style.height = Math.max(h, 500) + "px";
            }
            window.addEventListener("resize", function () {
                var el = document.getElementById("sac-iframe");
                if (el) {
                    var h = window.innerHeight - el.getBoundingClientRect().top - 10;
                    el.style.height = Math.max(h, 500) + "px";
                }
            });
        }
    });
});
