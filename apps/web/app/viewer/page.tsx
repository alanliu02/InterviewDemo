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
  const viewerInstanceRef = useRef<OpenSeadragon.Viewer | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null); // Define overlayCanvasRef
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
          // Create and configure the overlay canvas
          const canvas = document.createElement("canvas");
          canvas.id = "overlay-canvas";
          canvas.style.position = "absolute";
          canvas.style.top = "0";
          canvas.style.left = "0";
          canvas.style.pointerEvents = "none";
          canvas.width = viewer.container.clientWidth;
          canvas.height = viewer.container.clientHeight;
          const osdCanvasLayer = viewer.canvas;
          osdCanvasLayer.appendChild(canvas);
          // const controlContainer = viewer.container.querySelector(".openseadragon-controls");
          // if (controlContainer) {
          //   viewer.container.insertBefore(canvas, controlContainer);
          // }
          // else {
          //   viewer.container.appendChild(canvas)
          // }
          overlayCanvasRef.current = canvas; // Store the canvas reference
          viewerInstanceRef.current = viewer;
        }

        // Fetch dimensions dynamically from the server or a configuration
        const response = await fetch("http://127.0.0.1:8000/slide/dimensions");
        const { width: svs_width, height: svs_height } = await response.json();
        const tile_size = 512;
        const maxLevel = 8;
        console.log("WSI dimensions:", svs_width, svs_height);
        load_OpenSeadragon(svs_width * 4, svs_height * 4, tile_size, maxLevel);

        // Initialize the overlay canvas
        const viewer = viewerInstanceRef.current;
        if (!viewer) return;
        let centroids: number[][] = [];
        let contours: number[][][] = [];
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d")!;
        canvas.width = viewer.container.clientWidth;
        canvas.height = viewer.container.clientHeight;

        const DRAW_THRESHOLD = 5;

        async function fetchSegmentationData() {
          const res1 = await fetch("http://127.0.0.1:8000/segmentation/centroids");
          const data1 = await res1.json();
          centroids = data1.centroids;
          const res2 = await fetch("http://127.0.0.1:8000/segmentation/contours");
          const data2 = await res2.json();
          contours = data2.contours;
        }

        function renderOverlay() {
          const viewer = viewerInstanceRef.current;
          if (!viewer) return;
          if (!canvas) return;
          context.clearRect(0, 0, canvas.width, canvas.height);
          const zoom = viewer.viewport.getZoom(true);
          console.log("Current zoom level:", zoom);
          const toScreen = (x: number, y: number) => {
            const pt = viewer.viewport.imageToViewerElementCoordinates(new OSD.Point(x, y));
            return [pt.x, pt.y];
          };

          const filteredCentroids = centroids.filter(([x, y]) => {
            if (x == null || y == null) return false;
            const cx = x * 16;
            const cy = y * 16;

            return viewer && cx >= 0 && cy >= 0 && cx <= viewer.world.getItemAt(0).getContentSize().x && cy <= viewer.world.getItemAt(0).getContentSize().y;
          });

          if (zoom < DRAW_THRESHOLD) {
            const arcSize = 0.5 * zoom;
            const viewWidth = canvas.width;
            const viewHeight = canvas.height;
            const MIN_VISIBLE_RADIUS = 0.01;

            let batchIndex = 0;
            const batchSize = 10000; // 每批次绘制的点数量

            function drawBatch() {
              const start = batchIndex * batchSize;
              const end = Math.min(start + batchSize, filteredCentroids.length);

              context.beginPath();

              for (const [x, y] of filteredCentroids.slice(start, end)) {
                const cx = (x ?? 0) * 16;
                const cy = (y ?? 0) * 16;

                const [sx, sy] = toScreen(cx, cy);
                if (
                  sx == null || sy == null ||
                  sx < -arcSize || sy < -arcSize || sx > viewWidth + arcSize || sy > viewHeight + arcSize
                ) continue;

                context.moveTo(sx + arcSize, sy);
                context.arc(sx, sy, Math.max(MIN_VISIBLE_RADIUS, arcSize), 0, 2 * Math.PI);
              }

              context.fillStyle = "green";
              context.fill();

              batchIndex++;
              if (batchIndex * batchSize < filteredCentroids.length) {
                requestAnimationFrame(drawBatch); // 下一帧继续绘制
              } else {
                console.log("All centroids drawn.");
              }
            }
            drawBatch(); // 开始绘制第一批次
          }
        }

        await fetchSegmentationData();
        viewer.addHandler("viewport-change", renderOverlay);
        viewer.addHandler("resize", () => {
          canvas.width = viewer.container.clientWidth;
          canvas.height = viewer.container.clientHeight;
          renderOverlay();
        });
      };
    }
    initOpenSeadragon();
  }, []);

  return (
    <div className="p-4">
      <div
        id="osd-viewer"
        ref={viewerRef}
        style={{
          width: '100%',
          height: 'calc(100vh - 66px)',
          position: 'relative',
        }}
      >
      </div>
    </div>
  );
}
