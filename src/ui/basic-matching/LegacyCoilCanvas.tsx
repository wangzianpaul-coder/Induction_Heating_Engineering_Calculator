import { useEffect, useRef } from "react";

import type { UiLegacyBasicCalculatorResult } from "../ui-model.js";

function display(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "--";
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute < 0.0001 || absolute >= 1e8)) return value.toExponential(3);
  return value.toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  result: UiLegacyBasicCalculatorResult,
): void {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10) return;
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = rect.height || 260;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const context = canvas.getContext("2d");
  if (context === null) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fbfcfa";
  context.fillRect(0, 0, width, height);
  if (!result.valid) {
    context.fillStyle = "#607078";
    context.font = "14px Microsoft YaHei, sans-serif";
    context.fillText("请输入有效的线圈几何参数", 22, 38);
    return;
  }

  context.font = "14px Microsoft YaHei, sans-serif";
  context.fillStyle = "#1d272b";
  context.textAlign = "left";
  context.fillText(`N = ${display(result.input.turns, 2)}`, 22, 27);
  context.textAlign = "right";
  context.fillText(`Dm = ${display(result.geometry.meanDiameterMm, 1)} mm`, width - 22, 27);
  context.textAlign = "center";
  context.fillStyle = "#7a3f55";
  context.fillText(`工件 D2 = ${display(result.input.workpieceDiameterMm, 1)} mm`, width / 2, 49);

  const maxWidth = Math.max(150, width - 170);
  const maxHeight = 122;
  const scale = Math.min(
    maxWidth / result.input.coilLengthMm,
    maxHeight / result.geometry.meanDiameterMm,
  );
  const coilWidth = Math.max(88, Math.min(maxWidth, result.input.coilLengthMm * scale));
  const coilHeight = Math.max(60, Math.min(maxHeight, result.geometry.meanDiameterMm * scale));
  const x0 = (width - coilWidth) / 2;
  const y0 = 66 + (maxHeight - coilHeight) / 2;
  const centerY = y0 + coilHeight / 2;

  const workpieceLengthRatio = result.input.workpieceLengthMm > 0
    ? Math.min(1.28, result.input.workpieceLengthMm / result.input.coilLengthMm)
    : 0;
  const workpieceDiameterRatio = result.input.workpieceDiameterMm > 0
    ? Math.min(1.15, result.input.workpieceDiameterMm / result.geometry.meanDiameterMm)
    : 0;
  const workpieceWidth = Math.max(0, coilWidth * workpieceLengthRatio);
  const workpieceHeight = Math.max(0, coilHeight * 0.42 * workpieceDiameterRatio);
  const workpieceX = (width - workpieceWidth) / 2;
  context.fillStyle = result.input.workpieceDiameterMm >= result.input.coilInnerDiameterMm ? "#df8a78" : "#d6a060";
  context.fillRect(workpieceX, centerY - workpieceHeight / 2, workpieceWidth, workpieceHeight);
  context.fillStyle = "#f7c777";
  context.fillRect(
    workpieceX + 4,
    centerY - Math.max(2, workpieceHeight * 0.13),
    Math.max(0, workpieceWidth - 8),
    Math.max(4, workpieceHeight * 0.26),
  );
  context.fillStyle = "rgba(224, 231, 227, 0.58)";
  context.fillRect(x0, y0 + coilHeight * 0.2, coilWidth, coilHeight * 0.6);

  const cycles = Math.max(5, Math.min(26, Math.round(result.input.turns)));
  const steps = cycles * 28;
  const amplitude = coilHeight * 0.43;
  const drawingContext: CanvasRenderingContext2D = context;
  function helix(color: string, lineWidth: number, phase: number, yOffset: number, alpha: number): void {
    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.strokeStyle = color;
    drawingContext.lineWidth = lineWidth;
    drawingContext.lineCap = "round";
    drawingContext.lineJoin = "round";
    drawingContext.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const fraction = i / steps;
      const x = x0 + coilWidth * fraction;
      const y = centerY + Math.sin(fraction * cycles * Math.PI * 2 + phase) * amplitude + yOffset;
      if (i === 0) drawingContext.moveTo(x, y);
      else drawingContext.lineTo(x, y);
    }
    drawingContext.stroke();
    drawingContext.restore();
  }
  helix("#70b8b0", 2.3, Math.PI, 0, 0.78);
  helix("#147a73", 3.2, 0, 0, 1);
  if (result.input.coilType === "multi") {
    context.strokeStyle = "#b36b22";
    context.lineWidth = 3.2;
    context.strokeRect(x0 - 7, y0 - 7, coilWidth + 14, coilHeight + 14);
    helix("#0d5550", 2.2, Math.PI / 3, 7, 0.84);
    helix("#b36b22", 2, Math.PI * 1.15, -7, 0.8);
  }

  const dimensionY = height - 42;
  context.strokeStyle = "#607078";
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(x0, dimensionY);
  context.lineTo(x0 + coilWidth, dimensionY);
  context.moveTo(x0, dimensionY - 5);
  context.lineTo(x0, dimensionY + 5);
  context.moveTo(x0 + coilWidth, dimensionY - 5);
  context.lineTo(x0 + coilWidth, dimensionY + 5);
  context.moveTo(x0 + coilWidth + 21, y0);
  context.lineTo(x0 + coilWidth + 21, y0 + coilHeight);
  context.moveTo(x0 + coilWidth + 16, y0);
  context.lineTo(x0 + coilWidth + 26, y0);
  context.moveTo(x0 + coilWidth + 16, y0 + coilHeight);
  context.lineTo(x0 + coilWidth + 26, y0 + coilHeight);
  context.stroke();
  context.fillStyle = "#1d272b";
  context.font = "14px Microsoft YaHei, sans-serif";
  context.textAlign = "center";
  context.fillText(`l = ${display(result.input.coilLengthMm, 1)} mm`, width / 2, height - 14);
}

export function LegacyCoilCanvas({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    const draw = (): void => renderCanvas(canvas, result);
    draw();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", draw);
      return () => window.removeEventListener("resize", draw);
    }
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [result]);
  return <canvas aria-label="线圈与工件几何示意" className="basic-matching-canvas" height={260} ref={canvasRef} width={820} />;
}
