import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fromIni } from '@aws-sdk/credential-providers';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import {
  envelopeSchema,
  environmentSchema,
  type Environment,
  type ReaderRequest,
} from './contract';

export interface ReaderTransport {
  invoke(request: ReaderRequest): Promise<unknown>;
}

export type ReaderConfig = {
  environment: Environment;
  region: string;
  functionArn: string;
  roleArn?: string;
  profile?: string;
  timeoutMs: number;
};

export function readerConfig(env: NodeJS.ProcessEnv = process.env): ReaderConfig {
  const parsedEnvironment = environmentSchema.safeParse(env.AWS_READER_ENVIRONMENT);
  if (!parsedEnvironment.success) throw new Error('AWS_READER_ENVIRONMENT must be dev or prod');
  const environment = parsedEnvironment.data;
  const region = env.AWS_READER_REGION;
  const functionArn = env.AWS_READER_FUNCTION_ARN;
  const roleArn = env.AWS_READER_ROLE_ARN;
  const profile = env.AWS_READER_PROFILE;
  const timeoutMs = Number(env.AWS_READER_TIMEOUT_MS ?? 10000);
  if (
    !region ||
    !functionArn ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 30000
  ) {
    throw new Error('Missing or invalid AWS build reader configuration');
  }
  const arn = /^arn:aws:lambda:([^:]+):(\d{12}):function:[A-Za-z0-9-_]+(?::[A-Za-z0-9-_]+)?$/.exec(
    functionArn
  );
  if (!arn || arn[1] !== region) throw new Error('AWS reader function ARN/Region mismatch');
  if (env.VERCEL_OIDC_TOKEN) {
    if (!roleArn || !new RegExp(`^arn:aws:iam::${arn[2]}:role/.+`).test(roleArn)) {
      throw new Error('AWS reader invoke role must match the function account');
    }
  } else if (roleArn || environment !== 'dev' || !profile) {
    throw new Error('Local reader access requires a temporary dev invoke-only profile');
  }
  return { environment, region, functionArn, roleArn, profile, timeoutMs };
}

export class ReaderFailure extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly snapshotRetry = false
  ) {
    super(message);
  }
}

function transportFailure(error: unknown): ReaderFailure {
  const value = error as { name?: string; code?: string; $metadata?: { httpStatusCode?: number } };
  const status = value?.$metadata?.httpStatusCode;
  if (status === 401 || status === 403 || value?.name === 'AccessDeniedException') {
    return new ReaderFailure('Build reader access denied');
  }
  const retryable =
    status === 429 ||
    (status !== undefined && status >= 500) ||
    [
      'AbortError',
      'TimeoutError',
      'ThrottlingException',
      'TooManyRequestsException',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ].includes(value?.name ?? value?.code ?? '');
  return new ReaderFailure('Build reader transport failed', retryable);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Send = (
  command: InvokeCommand,
  abortSignal: AbortSignal
) => Promise<{
  StatusCode?: number;
  FunctionError?: string;
  Payload?: Uint8Array;
}>;

export function createReaderClient(
  config: ReaderConfig = readerConfig(),
  send?: Send
): ReaderTransport {
  if (!send) {
    const credentials = config.roleArn
      ? awsCredentialsProvider({ roleArn: config.roleArn })
      : fromIni({ profile: config.profile });
    const client = new LambdaClient({ region: config.region, credentials, maxAttempts: 1 });
    send = (command, abortSignal) => client.send(command, { abortSignal });
  }
  const invokeSend = send;

  async function once(request: ReaderRequest): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const result = await invokeSend(
        new InvokeCommand({
          FunctionName: config.functionArn,
          InvocationType: 'RequestResponse',
          Payload: Buffer.from(JSON.stringify(request)),
        }),
        controller.signal
      );
      if (result.FunctionError || result.StatusCode !== 200 || !result.Payload) {
        throw new ReaderFailure('Build reader invocation failed');
      }
      let decoded: unknown;
      try {
        decoded = JSON.parse(Buffer.from(result.Payload).toString('utf8'));
      } catch {
        throw new ReaderFailure('Malformed build reader response');
      }
      const envelope = envelopeSchema.safeParse(decoded);
      if (!envelope.success || envelope.data.environment !== config.environment) {
        throw new ReaderFailure('Build reader version/environment mismatch');
      }
      if (!envelope.data.ok) {
        const error = envelope.data.error;
        if (!error || envelope.data.data !== undefined)
          throw new ReaderFailure('Malformed build reader error');
        throw new ReaderFailure(
          `Build reader ${error.code}`,
          error.retryable && (error.code === 'THROTTLED' || error.code === 'UNAVAILABLE'),
          error.code === 'VERSION_CONFLICT'
        );
      }
      if (envelope.data.error || envelope.data.data === undefined) {
        throw new ReaderFailure('Malformed build reader success');
      }
      return envelope.data.data;
    } catch (error) {
      if (error instanceof ReaderFailure) throw error;
      throw transportFailure(error);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async invoke(request) {
      if (request.version !== 1 || request.environment !== config.environment) {
        throw new ReaderFailure('Build reader request environment mismatch');
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await once(request);
        } catch (error) {
          if (!(error instanceof ReaderFailure) || !error.retryable || attempt === 2) throw error;
          await delay(150 * 2 ** attempt);
        }
      }
      throw new ReaderFailure('Build reader retries exhausted');
    },
  };
}
