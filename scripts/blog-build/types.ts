export type PlanAction = 'render' | 'skip';

export interface BuildOptions {
  force: boolean;
  clean: boolean;
  planOnly: boolean;
  specificFile?: string;
}

export interface ToolchainInfo {
  pipelineVersion: string;
  quartoVersion: string;
  pandocVersion: string;
}

export interface TrackedOutputs {
  markdown: string;
  images: string[];
}

export interface ManifestPostEntry {
  fingerprint: string;
  dependencies: string[];
  dependencyDigests: Record<string, string>;
  outputs: TrackedOutputs;
  builtAt: string;
}

export interface BuildManifest {
  version: number;
  toolchain: ToolchainInfo;
  posts: Record<string, ManifestPostEntry>;
}

export interface PostInfo {
  postKey: string;
  qmdPath: string;
  mdPath: string;
  postDir: string;
  year: string;
  slug: string;
}

export interface DependencyRecord {
  path: string;
  source: 'qmd' | 'quarto-config' | 'transform-script' | 'frontmatter' | 'content-link';
}

export interface FingerprintResult {
  fingerprint: string;
  dependencyDigests: Record<string, string>;
}

export interface PlanDecision {
  post: PostInfo;
  action: PlanAction;
  reason: string;
  dependencies: string[];
  fingerprint: string;
  dependencyDigests: Record<string, string>;
  outputsHint: TrackedOutputs;
}

export interface BuildPlan {
  decisions: PlanDecision[];
  deletedPostKeys: string[];
}

export type RenderResult =
  | {
      ok: true;
      tempPostDir: string;
      transformedMarkdown: string;
      referencedImages: string[];
      producedImages: string[];
      consumedExternalAssetDirs: string[];
      sourceImageHashesBefore: Record<string, string>;
    }
  | {
      ok: false;
      error: string;
      tempPostDir: string;
      sourceImageHashesBefore: Record<string, string>;
    };

export type RenderSuccessResult = Extract<RenderResult, { ok: true }>;

export interface BuildStats {
  rendered: number;
  cached: number;
  failed: number;
  pruned: number;
}
