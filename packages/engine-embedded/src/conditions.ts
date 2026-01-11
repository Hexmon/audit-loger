import { Condition, Operand } from './types';

export interface ConditionData {
  principal: Record<string, unknown>;
  resource: Record<string, unknown>;
  context: Record<string, unknown>;
  action: Record<string, unknown>;
}

export function evaluateCondition(condition: Condition, data: ConditionData): boolean {
  switch (condition.op) {
    case 'eq':
      return resolveOperand(condition.left, data) === resolveOperand(condition.right, data);
    case 'neq':
      return resolveOperand(condition.left, data) !== resolveOperand(condition.right, data);
    case 'in': {
      const left = resolveOperand(condition.left, data);
      const right = resolveOperand(condition.right, data);
      if (Array.isArray(right)) {
        return right.includes(left);
      }
      return false;
    }
    case 'contains': {
      const left = resolveOperand(condition.left, data);
      const right = resolveOperand(condition.right, data);
      if (typeof left === 'string' && typeof right === 'string') {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return false;
    }
    case 'and':
      return condition.conditions.every((child) => evaluateCondition(child, data));
    case 'or':
      return condition.conditions.some((child) => evaluateCondition(child, data));
    case 'not':
      return !evaluateCondition(condition.condition, data);
    default:
      return false;
  }
}

export function collectContextPaths(condition: Condition, paths: Set<string>): void {
  switch (condition.op) {
    case 'and':
    case 'or':
      for (const child of condition.conditions) {
        collectContextPaths(child, paths);
      }
      return;
    case 'not':
      collectContextPaths(condition.condition, paths);
      return;
    default:
      addOperandPath(condition.left, paths);
      addOperandPath(condition.right, paths);
  }
}

function addOperandPath(operand: Operand, paths: Set<string>): void {
  if (operand.kind !== 'path') {
    return;
  }
  if (operand.path.startsWith('context.')) {
    paths.add(operand.path);
  }
}

function resolveOperand(operand: Operand, data: ConditionData): unknown {
  if (operand.kind === 'value') {
    return operand.value;
  }
  return getPathValue(data, operand.path);
}

function getPathValue(data: ConditionData, path: string): unknown {
  const parts = path.split('.');
  const root = parts.shift();
  if (!root) {
    return undefined;
  }

  let value: unknown;
  switch (root) {
    case 'principal':
      value = data.principal;
      break;
    case 'resource':
      value = data.resource;
      break;
    case 'context':
      value = data.context;
      break;
    case 'action':
      value = data.action;
      break;
    default:
      return undefined;
  }

  for (const key of parts) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}
