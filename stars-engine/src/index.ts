export * from "./types.ts";
export { ingest, renderIngestion, parseDegree, nakshatraOf, dignityOf, fmtDegree } from "./ingest.ts";
export { auditGate, isolateQuery } from "./gate.ts";
export { execute, connects, aspectsHouse, compoundRelation } from "./engine.ts";
export type { EngineResult, Matrix, StepRecord, Contradiction } from "./engine.ts";
export { renderExecution } from "./render.ts";
