import assert from 'node:assert/strict';
import { ZhipuTranslate } from '../../src/services/zhipu.js';

async function testDefaultEndpointAndModel() {
  let capturedUrl = '';
  let capturedBody = null;

  globalThis.fetch = async (url, options = {}) => {
    capturedUrl = String(url || '');
    capturedBody = JSON.parse(options.body || '{}');
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: '[0] 你好\n[1] 世界',
              },
            },
          ],
        };
      },
    };
  };

  const service = new ZhipuTranslate({
    zhipuApiKey: 'test-key',
    zhipuMinIntervalMs: 0,
  });
  const results = await service.translate(['hello', 'world'], 'auto', 'zh-CN');

  assert.equal(capturedUrl, 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  assert.equal(capturedBody.model, 'glm-4.7-flash');
  assert.deepEqual(results, ['你好', '世界']);
}

async function testRetryOnRateLimit() {
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return {
        ok: false,
        status: 429,
        async text() {
          return JSON.stringify({
            error: { code: '1302', message: 'rate limited' },
          });
        },
      };
    }
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: '[0] 通过',
              },
            },
          ],
        };
      },
    };
  };

  const service = new ZhipuTranslate({
    zhipuApiKey: 'test-key',
    zhipuRetryDelaysMs: [0],
    zhipuMinIntervalMs: 0,
  });
  const results = await service.translate(['ok'], 'auto', 'zh-CN');

  assert.equal(callCount, 2);
  assert.deepEqual(results, ['通过']);
}

async function run() {
  await testDefaultEndpointAndModel();
  await testRetryOnRateLimit();
  console.log('zhipu-service.test: ok');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
