import { BASE_URL } from "@/config/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function html() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${BASE_URL}/" />
    <link href="${BASE_URL}/jsgantt-improved-master/main.css" rel="stylesheet" type="text/css" />
    <link href="${BASE_URL}/jsgantt-improved-master/jsgantt.css" rel="stylesheet" type="text/css" />
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script>
        if (window.jQuery) {
            window.jQuery.fn.scrollspy = window.jQuery.fn.scrollspy || function () {
                return this;
            };
        }
    </script>
    <script src="${BASE_URL}/jsgantt-improved-master/main.js" type="text/javascript"></script>
    <script src="${BASE_URL}/jsgantt-improved-master/jsgantt.js" type="text/javascript"></script>
    <style>
        html,
        body {
            min-height: 100%;
            margin: 0;
            background: #ffffff;
            color: #000000;
            font-family: Arial, sans-serif;
        }

        body { 
            padding: 16px;
            overflow: auto;
        }

        #myInput {
            width: min(100%, 384px);
            box-sizing: border-box;
            margin-bottom: 16px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            background: #f9fafb;
            color: #000000;
            padding: 8px;
            font-size: 14px;
        }

        #demo {
            width: 100%;
            overflow-x: auto;
        }

        #embedded-Gantt {
            min-width: 100%;
        }

        .glistlbl {
            width: 1020px;
            float: left;
            padding: 0;
            background-color: #ffffff;
            overflow: hidden;
        }

        .glistgrid {
            width: 1020px;
            float: left;
            padding: 0;
            background-color: #ffffff;
            overflow: hidden;
        }

        .gastart div,
        .gastart,
        .gaMilestone div,
        .gaMilestone {
            text-align: center;
            min-width: 70px;
            max-width: 70px;
            width: 70px;
            font-size: 10px;
        }

        .gaMilestone,
        .gtaskheading,
        .gname,
        .gtaskname,
        .gresource,
        .gduration,
        .gpccomplete,
        .gstartdate,
        .genddate,
        .gastart {
            height: 18px;
            white-space: nowrap;
            border: #efefef 1px solid;
        }

        [id$="gchartbody"].dragging,
        [id$="gcharthead"].dragging {
            cursor: grabbing;
            user-select: none;
        }

        .gantt-message {
            margin-top: 4px;
            color: #6b7280;
            font-size: 13px;
        }

        .gantt-error {
            display: none;
            margin-top: 4px;
            max-width: 900px;
            border: 1px solid #fecaca;
            border-radius: 4px;
            background: #fef2f2;
            color: #b91c1c;
            padding: 10px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <input id="myInput" type="text" placeholder="Search.." />
    <div id="ganttMessage" class="gantt-message">Loading Gantt data...</div>
    <div id="ganttError" class="gantt-error"></div>
    <div id="demo">
        <div id="embedded-Gantt">
            <div id="GanttChartDIV"></div>
        </div>
    </div>

    <script>
        (function () {
            var initialCollapseApplied = false;

            function adjustColWidths() {
                var taskNames = document.querySelectorAll("td.gtaskname");
                var resources = document.querySelectorAll("td.gresource");
                var listBlocks = document.querySelectorAll('[id$="glisthead"], [id$="glistbody"]');

                taskNames.forEach(function (element) {
                    element.style.minWidth = "285px";
                });

                resources.forEach(function (element) {
                    element.style.minWidth = "100px";
                });

                listBlocks.forEach(function (element) {
                    element.style.width = "820px";
                });
            }

            function getFirstByIdsOrSuffix(ids, suffix) {
                for (var i = 0; i < ids.length; i++) {
                    var found = document.getElementById(ids[i]);
                    if (found) return found;
                }

                return document.querySelector('[id$="' + suffix + '"]');
            }

            function enableGanttDragScroll() {
                var chartBody = getFirstByIdsOrSuffix(
                    [
                        "embedded-Ganttgchartbody",
                        "embedded-Ganttchartbody",
                        "GanttChartDIVgchartbody",
                        "GanttChartDIVchartbody"
                    ],
                    "gchartbody"
                );
                var chartHead = getFirstByIdsOrSuffix(
                    [
                        "embedded-Ganttgcharthead",
                        "embedded-Ganttcharthead",
                        "GanttChartDIVgcharthead",
                        "GanttChartDIVcharthead"
                    ],
                    "gcharthead"
                );
                var gridBody = getFirstByIdsOrSuffix(
                    [
                        "embedded-Ganttglistbody",
                        "embedded-Ganttlistbody",
                        "GanttChartDIVglistbody",
                        "GanttChartDIVlistbody"
                    ],
                    "glistbody"
                );

                if (!chartBody || !chartHead || !gridBody) return false;
                if (chartBody.dataset.ganttInteractionsBound === "true") return true;

                chartBody.dataset.ganttInteractionsBound = "true";
                chartHead.dataset.ganttInteractionsBound = "true";
                gridBody.dataset.ganttInteractionsBound = "true";

                var activeElement = null;
                var startX = 0;
                var scrollLeft = 0;

                function startDrag(event, element) {
                    if (event.button !== 0) return;
                    activeElement = element;
                    startX = event.pageX;
                    scrollLeft = element.scrollLeft;
                    element.classList.add("dragging");
                }

                function stopDrag() {
                    if (activeElement) activeElement.classList.remove("dragging");
                    activeElement = null;
                }

                function moveDrag(event) {
                    if (!activeElement) return;
                    event.preventDefault();
                    activeElement.scrollLeft = scrollLeft - (event.pageX - startX);

                    if (activeElement === chartBody) {
                        chartHead.scrollLeft = activeElement.scrollLeft;
                    }

                    if (activeElement === chartHead) {
                        chartBody.scrollLeft = activeElement.scrollLeft;
                    }
                }

                chartBody.addEventListener("mousedown", function (event) {
                    startDrag(event, chartBody);
                });
                chartHead.addEventListener("mousedown", function (event) {
                    startDrag(event, chartHead);
                });
                chartBody.addEventListener("mouseleave", stopDrag);
                chartHead.addEventListener("mouseleave", stopDrag);
                document.addEventListener("mousemove", moveDrag);
                document.addEventListener("mouseup", stopDrag);

                gridBody.addEventListener("scroll", function () {
                    chartBody.scrollTop = gridBody.scrollTop;
                });
                chartBody.addEventListener("scroll", function () {
                    gridBody.scrollTop = chartBody.scrollTop;
                    chartHead.scrollLeft = chartBody.scrollLeft;
                });
                chartHead.addEventListener("scroll", function () {
                    chartBody.scrollLeft = chartHead.scrollLeft;
                });

                return true;
            }

            function applySearch() {
                var input = document.getElementById("myInput");
                var value = (input.value || "").toLowerCase();
                var listBody = document.querySelector('[id$="glistbody"]') || document.getElementById("demo");
                var rows = listBody.querySelectorAll("tr");
                var gantt = findGanttInstance();
                var taskList =
                    gantt && typeof gantt.getList === "function"
                        ? gantt.getList()
                        : [];

                function getTaskForRow(row) {
                    for (var i = 0; i < taskList.length; i++) {
                        var task = taskList[i];

                        if (
                            task &&
                            typeof task.getListChildRow === "function" &&
                            task.getListChildRow() === row
                        ) {
                            return task;
                        }
                    }

                    return null;
                }

                rows.forEach(function (row) {
                    var isHeading = row.classList.contains("gtaskheading") || row.querySelector(".gtaskheading");
                    var task = getTaskForRow(row);
                    var hiddenByGantt =
                        task &&
                        typeof task.getVisible === "function" &&
                        task.getVisible() === 0;

                    if (hiddenByGantt) {
                        row.style.display = "none";
                        return;
                    }

                    if (!value || isHeading) {
                        row.style.display = "";
                        return;
                    }

                    row.style.display = (row.textContent || "").toLowerCase().indexOf(value) > -1 ? "" : "none";
                });
            }

            function findGanttInstance() {
                if (window.g && typeof window.g.Draw === "function") {
                    return window.g;
                }

                for (var key in window) {
                    try {
                        var value = window[key];
                        if (
                            value &&
                            typeof value.Draw === "function" &&
                            (value.clearDependencies || value.getDivId)
                        ) {
                            return value;
                        }
                    } catch (error) {
                    }
                }

                return null;
            }

            function patchJSGanttConstructor() {
                if (!window.JSGantt) {
                    return;
                }

                if (
                    window.JSGantt.GanttChart &&
                    !window.JSGantt.__traxionGanttChartPatched
                ) {
                    var OriginalGanttChart = window.JSGantt.GanttChart;

                    window.JSGantt.GanttChart = function (pDiv, pFormat) {
                        if (typeof pDiv === "string") {
                            pDiv = document.getElementById(pDiv);
                        }

                        return new OriginalGanttChart(pDiv, pFormat);
                    };

                    window.JSGantt.GanttChart.prototype = OriginalGanttChart.prototype;
                    window.JSGantt.__traxionGanttChartPatched = true;
                }

                if (
                    window.JSGantt.TaskItem &&
                    !window.JSGantt.__traxionTaskItemPatched
                ) {
                    var OriginalTaskItem = window.JSGantt.TaskItem;

                    window.JSGantt.TaskItem = function () {
                        var args = Array.prototype.slice.call(arguments);
                        var group = parseInt(args[9], 10);

                        if (group === 1) {
                            args[11] = 0;
                        }

                        return new (Function.prototype.bind.apply(
                            OriginalTaskItem,
                            [null].concat(args)
                        ))();
                    };

                    window.JSGantt.TaskItem.prototype = OriginalTaskItem.prototype;
                    window.JSGantt.__traxionTaskItemPatched = true;
                }

                window.JSGantt.__traxionPatched = true;
            }

            function hasRenderedGantt() {
                return Boolean(document.querySelector('[id$="glistbody"]'));
            }

            function isExpandableGroup(task) {
                return Boolean(
                    task &&
                    typeof task.getGroup === "function" &&
                    parseInt(task.getGroup(), 10) === 1
                );
            }

            function collapseInitialGroups() {
                if (initialCollapseApplied) {
                    return true;
                }

                var gantt = findGanttInstance();

                if (!gantt || typeof gantt.getList !== "function") {
                    return false;
                }

                var taskList = gantt.getList();

                if (!taskList || !taskList.length) {
                    return false;
                }

                taskList.forEach(function (task) {
                    if (isExpandableGroup(task) && typeof task.setOpen === "function") {
                        task.setOpen(0);
                    }
                });

                initialCollapseApplied = true;

                if (!hasRenderedGantt()) {
                    return true;
                }

                taskList.forEach(function (task) {
                    if (!isExpandableGroup(task)) {
                        return;
                    }

                    var groupSpan =
                        typeof task.getGroupSpan === "function"
                            ? task.getGroupSpan()
                            : null;

                    if (groupSpan) {
                        groupSpan.textContent = "+";
                    }

                    if (
                        window.JSGantt &&
                        typeof window.JSGantt.hide === "function" &&
                        typeof task.getID === "function"
                    ) {
                        window.JSGantt.hide(task.getID(), gantt);
                    }
                });

                if (typeof gantt.clearDependencies === "function") {
                    gantt.clearDependencies();
                }

                if (typeof gantt.DrawDependencies === "function") {
                    gantt.DrawDependencies();
                }

                return true;
            }

            function ensureGanttDrawn() {
                var gantt = findGanttInstance();

                if (!gantt) {
                    return;
                }

                collapseInitialGroups();

                if (!hasRenderedGantt()) {
                    gantt.Draw();
                }
            }

            function enhanceChart() {
                adjustColWidths();
                applySearch();
                enableGanttDragScroll();

                var message = document.getElementById("ganttMessage");
                if (message && hasRenderedGantt()) {
                    message.style.display = "none";
                }

                if (hasRenderedGantt()) {
                    clearError();
                }
            }

            function clearError() {
                var errorBox = document.getElementById("ganttError");

                if (errorBox) {
                    errorBox.textContent = "";
                    errorBox.style.display = "none";
                }
            }

            function showError(message) {
                var loadingMessage = document.getElementById("ganttMessage");
                var errorBox = document.getElementById("ganttError");

                if (hasRenderedGantt()) {
                    clearError();
                    return;
                }

                if (loadingMessage) loadingMessage.style.display = "none";
                if (errorBox) {
                    errorBox.textContent = message;
                    errorBox.style.display = "block";
                }
            }

            function normalizeScriptText(text) {
                var scriptText = (text || "").trim();

                try {
                    if (
                        scriptText.charAt(0) === '"' ||
                        scriptText.charAt(0) === "{"
                    ) {
                        var parsed = JSON.parse(scriptText);

                        if (typeof parsed === "string") {
                            scriptText = parsed.trim();
                        } else if (parsed && typeof parsed.script === "string") {
                            scriptText = parsed.script.trim();
                        } else if (parsed && typeof parsed.data === "string") {
                            scriptText = parsed.data.trim();
                        }
                    }
                } catch (error) {
                }

                var scriptMatch = scriptText.match(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/i);

                if (scriptMatch) {
                    scriptText = scriptMatch[1].trim();
                }

                return scriptText;
            }

            function shouldIgnoreRuntimeError(message, filename) {
                if (hasRenderedGantt()) {
                    return true;
                }

                if (message === "Script error.") {
                    return true;
                }

                return Boolean(
                    filename &&
                    (
                        filename.indexOf("/jsgantt-improved-master/main.js") !== -1 ||
                        filename.indexOf("/jsgantt-improved-master/jsgantt.js") !== -1 ||
                        filename.indexOf("/jquery") !== -1
                    )
                );
            }

            window.addEventListener("error", function (event) {
                if (shouldIgnoreRuntimeError(event.message, event.filename)) {
                    return;
                }

                window.setTimeout(function () {
                    showError(event.message || "A Gantt script error stopped the chart from rendering.");
                }, 0);
            });

            window.addEventListener("unhandledrejection", function (event) {
                if (hasRenderedGantt()) {
                    clearError();
                    return;
                }

                var reason = event.reason;

                window.setTimeout(function () {
                    showError(
                        reason && reason.message
                            ? reason.message
                            : "A Gantt script error stopped the chart from rendering."
                    );
                }, 0);
            });

            window.adjustColWidths = adjustColWidths;
            window.DivLoader = window.DivLoader || function () {};
            window.DivLoaderHide = window.DivLoaderHide || function () {};

            document.getElementById("myInput").addEventListener("keyup", applySearch);
            patchJSGanttConstructor();

            document.addEventListener("DOMContentLoaded", function () {
                patchJSGanttConstructor();

                fetch(location.origin + "/api/gantt/script", { credentials: "same-origin", cache: "no-store" })
                    .then(function (response) {
                        return response.text().then(function (text) {
                            if (!response.ok) {
                                throw new Error(text || "Unable to load Gantt data.");
                            }

                            return text;
                        });
                    })
                    .then(function (scriptText) {
                        var target = document.getElementById("embedded-Gantt");
                        var script = document.createElement("script");

                        scriptText = normalizeScriptText(scriptText);

                        if (!scriptText) {
                            showError("Backend returned an empty Gantt script.");
                            return;
                        }

                        target.innerHTML = '<div id="GanttChartDIV"></div>';
                        script.type = "text/javascript";
                        script.text = scriptText;

                        try {
                            target.appendChild(script);
                        } catch (error) {
                            showError(error.message || "Unable to execute the Gantt data script.");
                            return;
                        }

                        window.setTimeout(function () {
                            ensureGanttDrawn();
                            enhanceChart();
                        }, 0);

                        var tries = 0;
                        var timer = window.setInterval(function () {
                            tries += 1;
                            ensureGanttDrawn();
                            enhanceChart();

                            if (hasRenderedGantt() || tries >= 30) {
                                window.clearInterval(timer);

                                if (!hasRenderedGantt()) {
                                    showError("Gantt data loaded, but the chart did not render. Check the browser console for the backend script error.");
                                }
                            }
                        }, 250);
                    })
                    .catch(function (error) {
                        showError(error.message || "Unable to load Gantt data.");
                    });
            });
        })();
    </script>
</body>
</html>`;
}

export async function GET() {
    return new NextResponse(html(), {
        status: 200,
        headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
