/// <reference lib="webworker" />
import { installWorker } from '@fpx/engine/worker-scope';
import { lookupCodeRung } from './index.js';

// The concrete worker entry lives here rather than in the engine, because this is the
// package that knows the content. The engine stays framework-free and content-free.
installWorker(lookupCodeRung);
