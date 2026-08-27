import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const dataDir = import.meta.dirname;
const schemaSource = readFileSync(join(dataDir, 'providers.schema.ts'), 'utf8');
const transpiledSchema = ts
  .transpileModule(schemaSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2023,
    },
  })
  .outputText.replace("from 'zod'", `from '${import.meta.resolve('zod')}'`);

const schemaModuleUrl = `data:text/javascript;base64,${Buffer.from(transpiledSchema).toString('base64')}`;
const { providerModelSchema, providersDataSchema } = await import(schemaModuleUrl);

test('accepts the bundled providers catalog with boolean experimental markers', () => {
  const providersData = JSON.parse(readFileSync(join(dataDir, 'providers.json'), 'utf8'));
  const parsed = providersDataSchema.parse(providersData);

  assert.equal(parsed.providers.deepseek.models[0].experimental, true);
});

test('accepts structured experimental mode configuration', () => {
  const parsed = providerModelSchema.parse({
    id: 'claude-example',
    experimental: {
      modes: {
        fast: {
          cost: { input: 1, output: 2 },
          provider: { body: { speed: 'fast' } },
        },
      },
    },
  });

  assert.equal(parsed.experimental.modes.fast.cost.input, 1);
});
