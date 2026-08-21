sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
    "use strict";

    var STORY_URL = "https://demo-presalesbrazil.us10.sapanalytics.cloud/sap/fpa/ui/tenants/78e94/bo/story/9A882502E6061CAE771E71FD454EE272?mode=embed&pagebar=disable&shellMode=embed&view=view";

    return Controller.extend("myfranchise.sacStory.controller.Main", {
        onAfterRendering: function () {
            var container = document.getElementById("sac-widget-container");
            if (!container) return;
            var top = container.getBoundingClientRect().top;
            var h = Math.max(window.innerHeight - top - 10, 600);
            container.style.height = h + "px";
            container.innerHTML = '<iframe src="' + STORY_URL + '" style="width:100%;height:' + h + 'px;border:none;display:block;" frameborder="0"></iframe>';
            window.addEventListener("resize", function () {
                var iframe = container.querySelector("iframe");
                if (iframe) {
                    var newTop = container.getBoundingClientRect().top;
                    var newH = Math.max(window.innerHeight - newTop - 10, 600);
                    container.style.height = newH + "px";
                    iframe.style.height = newH + "px";
                }
            });
        }
    });
});
