// #McpServer
// TamedTable MCP: the server that runs TamedTable inside Claude and ChatGPT.
// Today it holds the tool contract and the server instructions; the table store,
// tool handlers and transports come next. Spec: spec/packages/mcp-server/.

export {
  tools, modelTools, applyPlanInputSchema, operationsSchema, stepSchema, columnSchema,
  APPLY_PLAN_DESCRIPTION, type ToolDef, type JsonSchema,
} from './tools.ts';
export { serverInstructions, plannerKnowledge, type InstructionsVariant } from './instructions.ts';
