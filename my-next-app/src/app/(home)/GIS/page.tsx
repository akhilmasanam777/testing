"use client";

import { useEffect, useRef } from "react";

declare global {
    interface Window {
        JwtHelper: any;
        currentRegionId: any;
        getBOQFiles: any;
        openSLD: any;
        sldLoaded: boolean;
        map: any;
         oltData: any;
    ontData: any;
    jcData: any;
    ofcData: any;
    }
}

export default function MapPage() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const BASE = "https://bnpapp.traxion.in";

        // JWT HELPER
        window.JwtHelper = {
            api: async (url: string, method = "GET") => {
                const token = document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("token="))
                    ?.split("=")[1];

                const res = await fetch(BASE + url, {
                    method,
                    headers: { Authorization: "Bearer " + token },
                });
                return res.json();
            },
        };

        // FIX PATHS (SVG / IMAGES)
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            if (typeof input === "string") {

                //  already full URL → proxy it
                if (input.startsWith("http")) {
                    return originalFetch(`/api/proxy?url=${encodeURIComponent(input)}`, init);
                }

                //  relative path → attach base + proxy
                if (input.startsWith("/")) {
                    return originalFetch(
                        `/api/proxy?url=${encodeURIComponent(BASE + input)}`,
                        init
                    );
                }
            }

            return originalFetch(input, init);
        };

        // FIX IMG TAGS
        const observer = new MutationObserver(() => {
            document.querySelectorAll("img").forEach((img) => {
                if (img.src && img.src.startsWith(window.location.origin)) {
                    const path = img.src.replace(window.location.origin, "");
                    img.src = BASE + path;
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // LOAD SCRIPTS
        const scripts = [
            "https://code.jquery.com/jquery-3.6.0.min.js",
            BASE + "/JS/MapLibre/all.min.js",
            BASE + "/JS/MapLibre/maplibre-gl.js",
            BASE + "/JS/MapLibre/turf6.min.js",
            BASE + "/JS/MapLibre/SingleMapLibreMainv2.js",
        ];

        loadScripts(scripts).then(() => {
            // CREATE MAP
            setTimeout(() => {
                if (window.onload) {
                    (window.onload as any)(new Event("load"));
                }
            }, 1500);
            // WAIT FOR MAP READY
            waitForMapReady();

        });

        function loadScripts(urls: string[]) {
            return urls.reduce((p, url) => {
                return p.then(
                    () =>
                        new Promise<void>((resolve) => {
                            if (document.querySelector(`script[src="${url}"]`)) {
                                resolve();
                                return;
                            }
                            const s = document.createElement("script");
                            s.src = url;
                            s.async = false;
                            s.onload = () => resolve();
                            document.body.appendChild(s);
                        })
                );
            }, Promise.resolve());
        }

        function waitForMapReady() {
            const interval = setInterval(() => {

                if (window.map && typeof window.map.on === "function") {

                    clearInterval(interval);

                    // WAIT FOR STYLE LOAD
                    window.map.on("load", () => {

                        injectSLDOverride();
                        attachMapClick();
                    });
                }

            }, 300);
        }

        // OVERRIDE API + SLD
        function injectSLDOverride() {

            window.getBOQFiles = async function (regionId: string) {
                const res = await fetch(`/api/gis?regionId=${regionId}`);
                const data = await res.json();

                return data;
            };

            const originalOpenSLD = window.openSLD;

            window.openSLD = async function (regionId: string) {
                try {
                    console.log(" Loading SLD for:", regionId);

                    //  RESET FLAG
                    window.sldLoaded = false;

                    const { olt, ont, joint, ofc } =
                        await window.getBOQFiles(regionId);

                    //  SET DATA
                    window.oltData = olt;
                    window.ontData = ont;
                    window.jcData = joint;
                    window.ofcData = ofc;

                    //  CALL ORIGINAL
                    originalOpenSLD(regionId);

                } catch (e) {
                    console.error("SLD error", e);
                }
            };
        }

        // CLICK EVENT (MAIN FIX)
        function attachMapClick() {
            const interval = setInterval(() => {

                //  CHECK VALID MAP OBJECT
                if (window.map && typeof window.map.on === "function") {

                    clearInterval(interval);

                    window.map.on("click", function (e:any) {
                        const features = window.map.queryRenderedFeatures(e.point);

                        if (!features.length) return;

                        const feature = features[0];

                        const regionId =
                            feature.properties?.regionId ||
                            feature.properties?.region_id;

                        if (!regionId) return;

                        console.log(" Clicked region:", regionId);

                        window.currentRegionId = regionId;
                        window.sldLoaded = false;

                        window.openSLD(regionId);
                    });
                }

            }, 500);
        }


        return () => {
            window.fetch = originalFetch;
        };

    }, []);

    return (
        <div>

            <link
                href="https://bnpapp.traxion.in/JS/MapLibre/maplibre-gl.css" rel="stylesheet" />
            <link
                href="https://bnpapp.traxion.in/JS/MapLibre/SingleMapLibreStylev2.css" rel="stylesheet" />

            <div className="card">
                <div className="my-tabs">
                    <button className="my-tab-button active">Map View</button>

                    {/* <button className="my-tab-button">SLD View</button> */}
                </div>

                <div className="map-wrapper">
                    <div id="map" className="map" />
                    <div id="colorBarLegend" className="color-bar-legend">
                        <div id="colorBar" className="color-bar" />
                        <div className="label-bar">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <div id="tasknamecls" className="tasknamecls">
                        <div className="tasknamelabel"><span></span></div>
                    </div>

                    <div id="regionnamecls" className="regionnamecls">
                        <div className="regionlabel"><span></span></div>
                    </div>

                    <div id="layerPanel" className="gispanel" title="Base Layer" />

                    <div id="menuDockRow">
                        <div id="sideMenuContainer" />
                        <div id="tasksideMenuContainer" />
                        <div id="taskwisesideMenuContainer" />
                    </div>

                    <div id="zoomInfo" className="info-box">
                        Zoom level: --
                    </div>

                    <div id="blocker" className="blocker" />
                    <div id="loadingDiv" className="loadingDiv">
                        ⏳ Please wait, loading map points...
                    </div>
                </div>
            </div>
        </div>
    );
}

