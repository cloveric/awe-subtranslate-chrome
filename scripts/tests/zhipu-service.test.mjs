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

  const service = new ZhipuTranslate({ zhipuApiKey: 'test-key' });
  const results = await service.translate(['hello', 'world'], 'auto', 'zh-CN');

  assert.equal(capturedUrl, 'https://open.bigmodel.cn/api/paas/v4/chat/completions');
  assert.equal(capturedBody.model, 'glm-4.7-flash');
  assert.deepEqual(results, ['你好', '世界']);
}

async function run() {
  await testDefaultEndpointAndModel();
  console.log('zhipu-service.test: ok');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
