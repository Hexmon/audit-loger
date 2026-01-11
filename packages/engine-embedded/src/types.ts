export type Effect = 'allow' | 'deny';
export type FieldViolationMode = 'deny' | 'omit';

export type Operand = { kind: 'path'; path: string } | { kind: 'value'; value: unknown };

export type Condition =
  | { op: 'eq' | 'neq' | 'in' | 'contains'; left: Operand; right: Operand }
  | { op: 'and' | 'or'; conditions: Condition[] }
  | { op: 'not'; condition: Condition };

export interface FieldSpec {
  allow?: string[];
  deny?: string[];
  mask?: string[];
  omit?: string[];
}

export interface RuleObligations {
  maskFields?: string[];
  omitFields?: string[];
  log?: boolean;
  stepUpAuth?: boolean;
}

export interface Rule {
  id: string;
  effect: Effect;
  tenantScope?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  priority?: number;
  principals?: string[];
  roles?: string[];
  conditions?: Condition[];
  fields?: FieldSpec;
  obligations?: RuleObligations;
  description?: string;
}

export interface RolePermission {
  id?: string;
  tenantScope?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  priority?: number;
  conditions?: Condition[];
  fields?: FieldSpec;
  obligations?: RuleObligations;
  description?: string;
}

export interface RoleDefinition {
  name: string;
  inherits?: string[];
  permissions: RolePermission[];
}

export interface PolicyIR {
  version?: string;
  rules: Rule[];
  roles?: Record<string, RoleDefinition>;
}

export interface Principal {
  id: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface Action {
  name: string;
  fields?: string[];
  [key: string]: unknown;
}

export interface Resource {
  type: string;
  id?: string;
  [key: string]: unknown;
}

export interface EvaluationInput {
  tenantId?: string;
  principal: Principal;
  action: Action;
  resource: Resource;
  fields?: string[];
  context?: Record<string, unknown>;
}

export interface DecisionReason {
  ruleId: string;
  effect: Effect;
  scope: 'action' | 'field';
  fields?: string[];
  message?: string;
  source?: 'policy' | 'role';
  roleName?: string;
}

export interface Obligations {
  maskFields: string[];
  omitFields: string[];
  log: boolean;
  stepUpAuth: boolean;
}

export interface DecisionTrace {
  evaluated: string[];
  denyEvaluated: number;
  allowEvaluated: number;
}

export interface DecisionMeta {
  engine: string;
  policyVersion?: string;
  cached: boolean;
  evaluationCount: number;
}

export interface Decision {
  allow: boolean;
  traceId: string;
  reasons: DecisionReason[];
  obligations: Obligations;
  trace: DecisionTrace;
  meta: DecisionMeta;
}

export interface EngineOptions {
  mode?: 'single' | 'multi';
  fieldViolation?: FieldViolationMode;
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttlMs?: number;
  };
  engineName?: string;
}

export interface EngineStats {
  evaluations: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface CoreEngine {
  evaluate(input: EvaluationInput): Decision;
  setPolicy(ir: PolicyIR): void;
}
