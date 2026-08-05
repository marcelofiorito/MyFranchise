sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";

    var STORY_URL = "https://demo-presalesbrazil.us10.sapanalytics.cloud/sap/fpa/ui/tenants/78e94/bo/story/2AC0BD802424A3FE4EDEA8C056538AB0?mode=embed&pagebar=disable&shellMode=embed&view=view";

    return Controller.extend("myfranchise.sacoverview.controller.Main", {

        onAfterRendering: function () {
            var container = document.getElementById("sac-widget-container");
            if (!container) return;
            var h = Math.max(window.innerHeight - container.getBoundingClientRect().top - 10, 500);
            container.innerHTML = '<iframe src="' + STORY_URL + '" style="width:100%;height:' + h + 'px;border:none;display:block;" frameborder="0"></iframe>';
            window.addEventListener("resize", function () {
                var iframe = container.querySelector("iframe");
                if (iframe) {
                    var newH = Math.max(window.innerHeight - container.getBoundingClientRect().top - 10, 500);
                    iframe.style.height = newH + "px";
                }
            });
        }
    });
});
