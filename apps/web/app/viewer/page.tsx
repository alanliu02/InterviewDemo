"use client";

import { useEffect, useRef, useState } from "react";

let CustomTileSource: any; // 动态导入时定义 CustomTileSource

if (typeof window !== "undefined") {
  const { TileSource } = require("openseadragon");

  CustomTileSource = class extends TileSource {
    baseURL: string;

    constructor(
      width: number,
      height: number,
      tileSize: number,
      tileOverlap: number,
      minLevel: number,
      maxLevel: number,
      baseURL: string
    ) {
      super({
        width: width,
        height: height,
        tileSize: tileSize,
        tileOverlap: tileOverlap,
        minLevel: minLevel,
        maxLevel: maxLevel,
      });
      this.baseURL = baseURL;
    }

    getTileUrl(level: number, x: number, y: number): string {
      return `${this.baseURL}/${level}/${x}_${y}.jpeg`;
    }
  };
}

export default function ViewerPage() {
  const viewerRef = useRef<HTMLDivElement | null>(null); // 修复 viewerRef 的类型定义
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Sidebar visibility state
  const [sidebarContent, setSidebarContent] = useState(null);

  useEffect(() => {
    // Function to initialize OpenSeadragon
    const initOpenSeadragon = async () => {
      if (typeof window !== 'undefined' && viewerRef.current) {
        const OSD = (await import('openseadragon'));
        function load_OpenSeadragon(
          svs_width: number,
          svs_height: number,
          tile_size: number,
          maxLevel: number
        ) {
          if (!viewerRef.current) return;
          const viewer = OSD.default({
            id: viewerRef.current.id,
            showNavigator: true,
            wrapHorizontal: false,
            prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
            tileSources: new CustomTileSource(
              /* width */ svs_width / 2 ** (6 - maxLevel),
              /* height */ svs_height / 2 ** (6 - maxLevel),
              /* tileSize */ tile_size,
              /* tileOverlap */ 0,
              /* minLevel */ 0,
              /* maxLevel */ maxLevel,
              /* baseURL */ "http://127.0.0.1:8000/slide"
            ),
            gestureSettingsMouse: {
              flickEnabled: true,
              clickToZoom: true,
              dblClickToZoom: false,
            },
            showRotationControl: true,
            rotationIncrement: 30,
            animationTime: 0,
            springStiffness: 100,
            zoomPerSecond: 1,
            zoomPerScroll: 1.5,
            loadTilesWithAjax: true,
            timeout: 1000000,
          });

          viewer.addHandler("canvas-click", function (event) {
            var webPoint = event.position;
            var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
            var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
          });

          viewer.addHandler("canvas-enter", function (event) {
            var webPoint = event.position;
            var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
            var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
          });
          console.log("OpenSeadragon viewer initialized successfully.");
        }

        // Use setTimeout to wait for the Flask server to start.
        // setTimeout(function () {
          // svs_width = 460000(dimension of the image) * 4
          // svs_height = 329914(dimension of the image) * 4
          const svs_width = 184000;
          const svs_height = 131656;
          const tile_size = 512;
          const maxLevel = 8;
          load_OpenSeadragon(svs_width, svs_height, tile_size, maxLevel);
        // }, 2000);
      }
    };
    initOpenSeadragon();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">WSI Viewer</h2>
      <div
        id="osd-viewer"
        ref={viewerRef} // 绑定 ref 到 div 元素
        style={{ width: "100%", height: "80vh" }}
      />
    </div>
  );
}
