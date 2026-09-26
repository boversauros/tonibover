import { describe, expect, it, vi } from 'vitest';
import { createReaderClient, readerConfig, type ReaderConfig } from './client';

const config: ReaderConfig = {
  environment: 'dev',
  region: 'eu-west-1',
  functionArn: 'arn:aws:lambda:eu-west-1:123456789012:function:site-reader-dev',
  profile: 'temporary-invoke-only',
  timeoutMs: 20,
};
const request = {
  version: 1 as const,
  environment: 'dev' as const,
  operation: 'revision' as const,
};
const response = (value: unknown) => ({
  StatusCode: 200,
  Payload: Buffer.from(JSON.stringify(value)),
});

describe('build reader client', () => {
  it('requires the exact function Region and temporary local profile', () => {
    const env = {
      AWS_READER_ENVIRONMENT: 'dev',
      AWS_READER_REGION: 'eu-west-1',
      AWS_READER_FUNCTION_ARN: config.functionArn,
    };
    expect(() => readerConfig(env)).toThrow(/temporary.*profile/);
    expect(readerConfig({ ...env, AWS_READER_PROFILE: 'temp' }).profile).toBe('temp');
    expect(() =>
      readerConfig({ ...env, AWS_READER_PROFILE: 'temp', AWS_READER_REGION: 'us-east-1' })
    ).toThrow(/Region mismatch/);
  });

  it('accepts a versioned response only for the selected environment', async () => {
    const client = createReaderClient(config, async () =>
      response({
        version: 1,
        environment: 'dev',
        ok: true,
        data: { revision: 3 },
      })
    );
    await expect(client.invoke(request)).resolves.toEqual({ revision: 3 });
    const wrong = createReaderClient(config, async () =>
      response({
        version: 1,
        environment: 'prod',
        ok: true,
        data: { revision: 3 },
      })
    );
    await expect(wrong.invoke(request)).rejects.toThrow(/environment mismatch/);
  });

  it.each([401, 403])('fails fast on IAM status %i', async (status) => {
    const send = vi.fn(async () => {
      throw { $metadata: { httpStatusCode: status } };
    });
    await expect(createReaderClient(config, send).invoke(request)).rejects.toThrow(/access denied/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503])('exhausts transient HTTP %i after bounded retries', async (status) => {
    const send = vi.fn(async () => {
      throw { $metadata: { httpStatusCode: status } };
    });
    await expect(createReaderClient(config, send).invoke(request)).rejects.toThrow(
      /transport failed/
    );
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('retries only the reader transient error codes', async () => {
    const throttled = vi.fn(async () =>
      response({
        version: 1,
        environment: 'dev',
        ok: false,
        error: { code: 'THROTTLED', retryable: true },
      })
    );
    await expect(createReaderClient(config, throttled).invoke(request)).rejects.toThrow(
      /THROTTLED/
    );
    expect(throttled).toHaveBeenCalledTimes(3);
    const missing = vi.fn(async () =>
      response({
        version: 1,
        environment: 'dev',
        ok: false,
        error: { code: 'NOT_FOUND', retryable: false },
      })
    );
    await expect(createReaderClient(config, missing).invoke(request)).rejects.toThrow(/NOT_FOUND/);
    expect(missing).toHaveBeenCalledTimes(1);
  });

  it('fails on a malformed or function-error response', async () => {
    const malformed = createReaderClient(config, async () => response({ nope: true }));
    await expect(malformed.invoke(request)).rejects.toThrow(/version\/environment mismatch/);
    const failed = createReaderClient(config, async () => ({
      ...response({}),
      FunctionError: 'Unhandled',
    }));
    await expect(failed.invoke(request)).rejects.toThrow(/invocation failed/);
  });

  it('times out and exhausts retry attempts', async () => {
    const send = vi.fn(
      (_command, signal: AbortSignal): Promise<never> =>
        new Promise((_resolve, reject) =>
          signal.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            { once: true }
          )
        )
    );
    await expect(createReaderClient(config, send).invoke(request)).rejects.toThrow(
      /transport failed/
    );
    expect(send).toHaveBeenCalledTimes(3);
  });
});
