export function adjustColWidths(scope: HTMLElement) {
    scope.querySelectorAll<HTMLElement>("td.gtaskname").forEach((element) => {
        element.style.minWidth = "285px";
    });

    scope.querySelectorAll<HTMLElement>("td.gresource").forEach((element) => {
        element.style.minWidth = "100px";
    });

    scope
        .querySelectorAll<HTMLElement>(
            '[id$="glisthead"], [id$="glistbody"]'
        )
        .forEach((element) => {
            element.style.width = "820px";
        });
}
type BoundGanttElements = {
    chartBody: HTMLElement;
    chartHead: HTMLElement;
    gridBody: HTMLElement;
};

export function enableGanttDragScroll(elements: BoundGanttElements) {
    const { chartBody, chartHead, gridBody } = elements;

    chartBody.dataset.ganttInteractionsBound = "true";
    chartHead.dataset.ganttInteractionsBound = "true";
    gridBody.dataset.ganttInteractionsBound = "true";

    let activeElement: HTMLElement | null = null;
    let startX = 0;
    let scrollLeft = 0;

    const stopDrag = () => {
        activeElement?.classList.remove("dragging");
        activeElement = null;
    };

    const moveDrag = (event: MouseEvent) => {
        if (!activeElement) return;

        event.preventDefault();

        activeElement.scrollLeft =
            scrollLeft - (event.pageX - startX);

        if (activeElement === chartBody) {
            chartHead.scrollLeft = activeElement.scrollLeft;
        }

        if (activeElement === chartHead) {
            chartBody.scrollLeft = activeElement.scrollLeft;
        }
    };

    const startDrag = (
        event: MouseEvent,
        element: HTMLElement
    ) => {
        if (event.button !== 0) return;

        activeElement = element;
        startX = event.pageX;
        scrollLeft = element.scrollLeft;

        element.classList.add("dragging");
    };

    const onChartBodyMouseDown = (event: MouseEvent) =>
        startDrag(event, chartBody);

    const onChartHeadMouseDown = (event: MouseEvent) =>
        startDrag(event, chartHead);

    const onGridScroll = () => {
        chartBody.scrollTop = gridBody.scrollTop;
    };

    const onChartBodyScroll = () => {
        gridBody.scrollTop = chartBody.scrollTop;
        chartHead.scrollLeft = chartBody.scrollLeft;
    };

    const onChartHeadScroll = () => {
        chartBody.scrollLeft = chartHead.scrollLeft;
    };

    chartBody.addEventListener("mousedown", onChartBodyMouseDown);
    chartHead.addEventListener("mousedown", onChartHeadMouseDown);

    chartBody.addEventListener("mouseleave", stopDrag);
    chartHead.addEventListener("mouseleave", stopDrag);

    document.addEventListener("mousemove", moveDrag);
    document.addEventListener("mouseup", stopDrag);

    gridBody.addEventListener("scroll", onGridScroll);

    chartBody.addEventListener("scroll", onChartBodyScroll);

    chartHead.addEventListener("scroll", onChartHeadScroll);

    return () => {
        delete chartBody.dataset.ganttInteractionsBound;
        delete chartHead.dataset.ganttInteractionsBound;
        delete gridBody.dataset.ganttInteractionsBound;

        chartBody.removeEventListener(
            "mousedown",
            onChartBodyMouseDown
        );

        chartHead.removeEventListener(
            "mousedown",
            onChartHeadMouseDown
        );

        chartBody.removeEventListener("mouseleave", stopDrag);
        chartHead.removeEventListener("mouseleave", stopDrag);

        gridBody.removeEventListener("scroll", onGridScroll);

        chartBody.removeEventListener(
            "scroll",
            onChartBodyScroll
        );

        chartHead.removeEventListener(
            "scroll",
            onChartHeadScroll
        );

        document.removeEventListener("mousemove", moveDrag);
        document.removeEventListener("mouseup", stopDrag);
    };
}

// type BoundGanttElements = {
//     chartBody: HTMLElement;
//     chartHead: HTMLElement;
//     gridBody: HTMLElement;
// };

// export function enableGanttDragScroll(elements: BoundGanttElements) {
//     const { chartBody, chartHead, gridBody } = elements;

//     chartBody.dataset.ganttInteractionsBound = "true";
//     chartHead.dataset.ganttInteractionsBound = "true";
//     gridBody.dataset.ganttInteractionsBound = "true";


//     let activeElement: HTMLElement | null = null;
//     let startX = 0;
//     let scrollLeft = 0;

//     const stopDrag = () => {
//         activeElement?.classList.remove("dragging");
//         activeElement = null;
//     };

//     const moveDrag = (event: MouseEvent) => {
//         if (!activeElement) return;

//         event.preventDefault();

//         activeElement.scrollLeft =
//             scrollLeft - (event.pageX - startX);

//         if (activeElement === chartBody) {
//             chartHead.scrollLeft = activeElement.scrollLeft;
//         }

//         if (activeElement === chartHead) {
//             chartBody.scrollLeft = activeElement.scrollLeft;
//         }
//     };

//     const startDrag = (
//         event: MouseEvent,
//         element: HTMLElement
//     ) => {
//         if (event.button !== 0) return;

//         activeElement = element;
//         startX = event.pageX;
//         scrollLeft = element.scrollLeft;

//         element.classList.add("dragging");
//     };

//     chartBody.addEventListener("mousedown", (event) =>
//         startDrag(event, chartBody)
//     );

//     chartHead.addEventListener("mousedown", (event) =>
//         startDrag(event, chartHead)
//     );

//     chartBody.addEventListener("mouseleave", stopDrag);
//     chartHead.addEventListener("mouseleave", stopDrag);

//     document.addEventListener("mousemove", moveDrag);
//     document.addEventListener("mouseup", stopDrag);

//     gridBody.addEventListener("scroll", () => {
//         chartBody.scrollTop = gridBody.scrollTop;
//     });

//     chartBody.addEventListener("scroll", () => {
//         gridBody.scrollTop = chartBody.scrollTop;
//         chartHead.scrollLeft = chartBody.scrollLeft;
//     });

//     chartHead.addEventListener("scroll", () => {
//         chartBody.scrollLeft = chartHead.scrollLeft;
//     });

//     return () => {

//      delete chartBody.dataset.ganttInteractionsBound;
//      delete chartHead.dataset.ganttInteractionsBound;
//      delete gridBody.dataset.ganttInteractionsBound;

//         document.removeEventListener("mousemove", moveDrag);
//         document.removeEventListener("mouseup", stopDrag);
//     };
// }